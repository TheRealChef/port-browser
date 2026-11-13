using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;

namespace Port.Desktop;

/// <summary>
/// Tracks downloads from every page view, replaces WebView2's own download
/// flyout with Port's panel, and remembers finished downloads across runs.
/// The UI only ever refers to downloads by id; file paths stay here.
/// </summary>
internal sealed class DownloadManager
{
    private const int Limit = 200;

    private sealed class Record
    {
        public string Id { get; set; } = "";
        public string Url { get; set; } = "";
        public string Path { get; set; } = "";
        public long? TotalBytes { get; set; }
        public long ReceivedBytes { get; set; }
        public string State { get; set; } = "inProgress";
        public string? Reason { get; set; }
        public long StartedAt { get; set; }
        public bool CanResume { get; set; }
    }

    private readonly string file;
    private readonly Action<object> post;
    private readonly List<Record> records;
    private readonly Dictionary<string, CoreWebView2DownloadOperation> live = new();
    private readonly DispatcherTimer flush;
    private bool dirty;
    private bool startedSinceFlush;

    public DownloadManager(string dataFolder, Action<object> post)
    {
        file = System.IO.Path.Combine(dataFolder, "downloads.json");
        this.post = post;
        try
        {
            records = JsonSerializer.Deserialize<List<Record>>(File.ReadAllText(file)) ?? new();
        }
        catch
        {
            records = new();
        }
        // Downloads still running when Port closed did not finish.
        foreach (var r in records.Where(r => r.State is "inProgress" or "paused"))
        {
            r.State = "interrupted";
            r.Reason ??= "ShellClosed";
            r.CanResume = false;
        }
        flush = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(250) };
        flush.Tick += (_, _) => Flush();
        flush.Start();
    }

    public static string DownloadsFolder =>
        System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");

    public void Attach(CoreWebView2 core)
    {
        core.DownloadStarting += (_, e) =>
        {
            e.Handled = true; // Hide WebView2's flyout; Port shows its own panel.
            var op = e.DownloadOperation;
            var record = new Record
            {
                Id = Guid.NewGuid().ToString("N")[..12],
                Url = op.Uri,
                Path = e.ResultFilePath,
                TotalBytes = op.TotalBytesToReceive is { } total && total > 0 ? (long)total : null,
                StartedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            };
            records.Insert(0, record);
            live[record.Id] = op;
            op.BytesReceivedChanged += (_, _) =>
            {
                record.ReceivedBytes = op.BytesReceived;
                if (record.TotalBytes is null && op.TotalBytesToReceive is { } t && t > 0) record.TotalBytes = (long)t;
                dirty = true;
            };
            op.StateChanged += (_, _) =>
            {
                record.ReceivedBytes = op.BytesReceived;
                record.Path = op.ResultFilePath;
                record.CanResume = op.CanResume;
                switch (op.State)
                {
                    case CoreWebView2DownloadState.Completed:
                        record.State = "completed";
                        live.Remove(record.Id);
                        break;
                    case CoreWebView2DownloadState.Interrupted:
                        record.State = op.InterruptReason == CoreWebView2DownloadInterruptReason.UserCanceled
                            ? "interrupted"
                            : op.CanResume ? "paused" : "interrupted";
                        record.Reason = op.InterruptReason.ToString();
                        if (record.State == "interrupted") live.Remove(record.Id);
                        break;
                    default:
                        // A paused download still reports InProgress; keep Port's own paused flag.
                        if (record.State != "paused") record.State = "inProgress";
                        record.Reason = null;
                        break;
                }
                Save();
                dirty = true;
            };
            Trim();
            Save();
            dirty = true;
            startedSinceFlush = true;
        };
    }

    public void SendAll() => dirty = true;

    public void Act(string? id, string? action)
    {
        var record = records.FirstOrDefault(r => r.Id == id);
        if (record is null) return;
        live.TryGetValue(record.Id, out var op);
        try
        {
            switch (action)
            {
                case "pause" when op is not null && record.State == "inProgress":
                    op.Pause();
                    record.State = "paused";
                    break;
                case "resume" when op is not null && op.CanResume:
                    op.Resume();
                    record.State = "inProgress";
                    record.Reason = null;
                    break;
                case "cancel" when op is not null:
                    op.Cancel();
                    break;
                case "open" when record.State == "completed" && File.Exists(record.Path):
                    Process.Start(new ProcessStartInfo(record.Path) { UseShellExecute = true });
                    break;
                case "showInFolder" when File.Exists(record.Path):
                    Process.Start("explorer.exe", $"/select,\"{record.Path}\"");
                    break;
                case "remove" when record.State is "completed" or "interrupted":
                    records.Remove(record);
                    break;
            }
        }
        catch
        {
            // The file may have been removed or the operation already ended.
        }
        Save();
        dirty = true;
    }

    public void ClearFinished()
    {
        records.RemoveAll(r => r.State is "completed" or "interrupted");
        Save();
        dirty = true;
    }

    public static void OpenFolder()
    {
        try
        {
            Process.Start(new ProcessStartInfo(DownloadsFolder) { UseShellExecute = true });
        }
        catch
        {
            // No Downloads folder.
        }
    }

    private void Flush()
    {
        if (!dirty) return;
        dirty = false;
        var started = startedSinceFlush;
        startedSinceFlush = false;
        post(new
        {
            type = "downloads",
            started,
            items = records.Select(r => new
            {
                id = r.Id,
                url = r.Url,
                fileName = System.IO.Path.GetFileName(r.Path),
                totalBytes = r.TotalBytes,
                receivedBytes = r.ReceivedBytes,
                state = r.State,
                reason = r.Reason,
                canResume = r.CanResume || (r.State == "paused" && live.ContainsKey(r.Id)),
                startedAt = r.StartedAt,
                missing = r.State == "completed" && !File.Exists(r.Path),
            }),
        });
    }

    private void Trim()
    {
        while (records.Count > Limit)
        {
            var oldest = records.FindLastIndex(r => r.State is "completed" or "interrupted");
            if (oldest < 0) break;
            records.RemoveAt(oldest);
        }
    }

    private void Save()
    {
        try
        {
            File.WriteAllText(file, JsonSerializer.Serialize(records));
        }
        catch
        {
            // The list is a convenience; losing it is not an error.
        }
    }
}
