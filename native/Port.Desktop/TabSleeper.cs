using System.Text.Json;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;

namespace Port.Desktop;

/// <summary>
/// Puts tabs you are not looking at to sleep in three steps:
/// <list type="number">
/// <item>As soon as a tab is hidden, the engine is asked to use less memory for it.</item>
/// <item>After <see cref="SuspendAfter"/> hidden it is suspended: no script or timers run, it
/// keeps its page and scroll position and wakes instantly when shown.</item>
/// <item>After <see cref="DiscardAfter"/> hidden its view is released entirely; showing the tab
/// loads the page again (sign-ins live in cookies, so they stay).</item>
/// </list>
/// Tabs playing audio, pinned tabs (never unloaded) and fullscreen pages are left alone.
/// </summary>
internal sealed class TabSleeper
{
    private readonly Func<IEnumerable<PageView>> pages;
    private readonly Func<PageView, bool> isShown;
    private readonly Action<string> discard;
    private readonly Action<string, string> report;
    private readonly DispatcherTimer timer;

    public bool Enabled { get; private set; } = true;
    public TimeSpan SuspendAfter { get; private set; } = TimeSpan.FromMinutes(5);
    /// <summary><see cref="TimeSpan.Zero"/> means never unload.</summary>
    public TimeSpan DiscardAfter { get; private set; } = TimeSpan.FromMinutes(30);
    private HashSet<string> keepLoaded = new();

    public TabSleeper(
        Func<IEnumerable<PageView>> pages,
        Func<PageView, bool> isShown,
        Action<string> discard,
        Action<string, string> report)
    {
        this.pages = pages;
        this.isShown = isShown;
        this.discard = discard;
        this.report = report;
        timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(20) };
        timer.Tick += (_, _) => Tick();
        timer.Start();
    }

    /// <summary>Applies the UI's settings (minutes; 0 unload minutes = never) and its pinned tabs.</summary>
    public void SetPolicy(JsonElement msg)
    {
        Enabled = !msg.TryGetProperty("enabled", out var e) || e.ValueKind != JsonValueKind.False;
        if (msg.TryGetProperty("suspendMinutes", out var s) && s.TryGetDouble(out var sm) && sm is >= 0.25 and <= 24 * 60)
        {
            SuspendAfter = TimeSpan.FromMinutes(sm);
        }
        if (msg.TryGetProperty("discardMinutes", out var d) && d.TryGetDouble(out var dm) && dm is >= 0 and <= 7 * 24 * 60)
        {
            DiscardAfter = TimeSpan.FromMinutes(dm);
        }
        keepLoaded = msg.TryGetProperty("keepLoaded", out var k) && k.ValueKind == JsonValueKind.Array
            ? k.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String).Select(x => x.GetString()!).ToHashSet()
            : new HashSet<string>();
        foreach (var page in pages()) ApplyMemoryLevel(page);
        Tick();
    }

    /// <summary>Called whenever a page is shown or hidden.</summary>
    public void VisibilityChanged(PageView page, bool shown)
    {
        if (shown)
        {
            page.HiddenSince = null;
            if (page.Sleep != SleepState.Awake && page.Core is { } core)
            {
                try
                {
                    core.Resume();
                }
                catch
                {
                    // Already running.
                }
                page.Sleep = SleepState.Awake;
                report(page.TabId, "awake");
            }
        }
        else
        {
            page.HiddenSince ??= DateTime.UtcNow;
        }
        ApplyMemoryLevel(page);
    }

    private void ApplyMemoryLevel(PageView page)
    {
        if (page.Core is not { } core) return;
        try
        {
            core.MemoryUsageTargetLevel = Enabled && !isShown(page)
                ? CoreWebView2MemoryUsageTargetLevel.Low
                : CoreWebView2MemoryUsageTargetLevel.Normal;
        }
        catch
        {
            // Older runtimes without this setting.
        }
    }

    private void Tick()
    {
        if (!Enabled) return;
        var now = DateTime.UtcNow;
        foreach (var page in pages().ToList())
        {
            if (page.Disposed || page.Core is not { } core || isShown(page) || page.HiddenSince is not { } since) continue;
            bool playing;
            try
            {
                playing = core.IsDocumentPlayingAudio;
            }
            catch
            {
                playing = false;
            }
            if (playing)
            {
                page.HiddenSince = now; // Restart the clock once the audio stops.
                continue;
            }
            var hidden = now - since;
            if (DiscardAfter > TimeSpan.Zero && hidden >= DiscardAfter && !keepLoaded.Contains(page.TabId))
            {
                discard(page.TabId);
                report(page.TabId, "discarded");
            }
            else if (hidden >= SuspendAfter && page.Sleep == SleepState.Awake)
            {
                _ = SuspendAsync(page, core);
            }
        }
    }

    private async Task SuspendAsync(PageView page, CoreWebView2 core)
    {
        try
        {
            if (await core.TrySuspendAsync() && !page.Disposed && !isShown(page))
            {
                page.Sleep = SleepState.Suspended;
                report(page.TabId, "suspended");
            }
        }
        catch
        {
            // The page became visible meanwhile, or the runtime refused (e.g. a dialog is open).
        }
    }
}

internal enum SleepState
{
    Awake,
    Suspended,
}
