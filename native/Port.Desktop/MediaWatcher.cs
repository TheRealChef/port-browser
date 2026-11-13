using System.Text.Json;
using System.Windows.Threading;
using Microsoft.Web.WebView2.Core;

namespace Port.Desktop;

/// <summary>
/// Finds out what each tab is playing and controls it, for Port's built-in player.
/// <para>
/// Sites such as YouTube and Spotify describe what they play through the
/// standard Media Session API (title, artist, artwork, position) and register
/// handlers for play, pause, next and previous. A small script added to every
/// page records those handlers so Port can call them later; pages without a
/// media session fall back to their &lt;video&gt;/&lt;audio&gt; element.
/// </para>
/// Pages have no channel to the shell: Port reads the state itself with
/// ExecuteScriptAsync, and everything read is treated as untrusted display data.
/// </summary>
internal sealed class MediaWatcher
{
    private const string Key = "Symbol.for('port.media')";

    private const string InjectedScript = """
        (() => {
          const KEY = Symbol.for('port.media');
          if (window[KEY] || window.top !== window || !('mediaSession' in navigator)) return;
          const ms = navigator.mediaSession;
          const handlers = {};
          let position = null;
          const setHandler = ms.setActionHandler.bind(ms);
          ms.setActionHandler = (action, handler) => {
            handlers[action] = handler;
            return setHandler(action, handler);
          };
          if (ms.setPositionState) {
            const setPosition = ms.setPositionState.bind(ms);
            ms.setPositionState = (state) => {
              position = state ? { ...state, at: performance.now() } : null;
              return setPosition(state);
            };
          }
          const element = () => {
            const all = [...document.querySelectorAll('video, audio')];
            return all.find((e) => !e.paused) || all.find((e) => e.currentTime > 0 && e.duration > 0) || null;
          };
          const api = {
            state() {
              const meta = ms.metadata;
              const el = element();
              if (!meta && !el) return null;
              let pos = null;
              let dur = null;
              if (position && position.duration) {
                const rate = ms.playbackState === 'paused' ? 0 : position.playbackRate || 1;
                dur = position.duration;
                pos = Math.min(dur, (position.position || 0) + (rate * (performance.now() - position.at)) / 1000);
              } else if (el && Number.isFinite(el.duration)) {
                dur = el.duration;
                pos = el.currentTime;
              }
              const playing =
                ms.playbackState === 'playing' || (ms.playbackState !== 'paused' && !!el && !el.paused);
              return {
                title: (meta && meta.title) || document.title,
                artist: (meta && meta.artist) || '',
                album: (meta && meta.album) || '',
                artwork: meta ? [...meta.artwork].map((a) => ({ src: a.src, sizes: a.sizes || '' })) : [],
                playing,
                position: pos,
                duration: dur,
                actions: Object.keys(handlers).filter((k) => handlers[k]),
                element: !!el,
              };
            },
            act(action, time) {
              const handler = handlers[action];
              const el = element();
              if (action === 'seekto') {
                if (handler) handler({ action, seekTime: time, fastSeek: false });
                else if (el) el.currentTime = time;
                return;
              }
              if (handler) {
                handler({ action });
                return;
              }
              if (!el) return;
              if (action === 'play') el.play();
              else if (action === 'pause') el.pause();
            },
          };
          Object.defineProperty(window, KEY, { value: api });
        })();
        """;

    private static readonly HashSet<string> Actions = new()
    {
        "play", "pause", "nexttrack", "previoustrack", "seekto", "seekbackward", "seekforward",
    };

    private readonly Func<IEnumerable<PageView>> pages;
    private readonly Action<object> post;
    private readonly DispatcherTimer timer;
    private int tick;

    public MediaWatcher(Func<IEnumerable<PageView>> pages, Action<object> post)
    {
        this.pages = pages;
        this.post = post;
        timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        timer.Tick += (_, _) => Poll();
        timer.Start();
    }

    public async Task AttachAsync(PageView page, CoreWebView2 core)
    {
        try
        {
            await core.AddScriptToExecuteOnDocumentCreatedAsync(InjectedScript);
        }
        catch
        {
            return; // Without the script there is simply no player for this tab.
        }
        core.IsDocumentPlayingAudioChanged += (_, _) =>
        {
            if (core.IsDocumentPlayingAudio) page.HasMedia = true;
            _ = ReadAsync(page);
        };
        core.IsMutedChanged += (_, _) => _ = ReadAsync(page);
        core.SourceChanged += (_, _) =>
        {
            // A new page: forget the old one's media until the new one plays.
            if (!page.HasMedia) return;
            page.HasMedia = false;
            page.LastMedia = null;
            post(new { type = "media", tabId = page.TabId, state = (object?)null });
        };
    }

    /// <summary>Tabs that are playing are read every second, paused ones every few seconds.</summary>
    private void Poll()
    {
        tick++;
        foreach (var page in pages().ToList())
        {
            if (page.Disposed || page.Core is not { } core || page.Sleep != SleepState.Awake) continue;
            bool audible;
            try
            {
                audible = core.IsDocumentPlayingAudio;
            }
            catch
            {
                continue;
            }
            if (audible) page.HasMedia = true;
            if (audible || (page.HasMedia && tick % 3 == 0)) _ = ReadAsync(page);
        }
    }

    private async Task ReadAsync(PageView page)
    {
        if (page.Disposed || page.Core is not { } core || page.Sleep != SleepState.Awake) return;
        string json;
        try
        {
            json = await core.ExecuteScriptAsync($"(window[{Key}] ? window[{Key}].state() : null)");
        }
        catch
        {
            return;
        }
        if (page.Disposed) return;
        var state = Sanitize(json, core);
        var key = state is null ? "null" : JsonSerializer.Serialize(state);
        if (key == page.LastMedia && state is not { Playing: true }) return;
        page.LastMedia = key;
        if (state is not null) page.HasMedia = true;
        post(new { type = "media", tabId = page.TabId, state });
    }

    /// <summary>Runs a player control in the tab, waking it first if it is asleep.</summary>
    public async Task ActAsync(PageView page, string? action, double? time)
    {
        if (page.Core is not { } core) return;
        try
        {
            switch (action)
            {
                case "mute":
                    core.IsMuted = true;
                    break;
                case "unmute":
                    core.IsMuted = false;
                    break;
                case not null when Actions.Contains(action):
                    if (page.Sleep != SleepState.Awake)
                    {
                        core.Resume();
                        page.Sleep = SleepState.Awake;
                    }
                    var t = time is { } v && double.IsFinite(v) && v >= 0 ? v.ToString(System.Globalization.CultureInfo.InvariantCulture) : "0";
                    // The action name is from a fixed list, so it is safe to put into the script.
                    await core.ExecuteScriptAsync($"window[{Key}] && window[{Key}].act('{action}', {t})");
                    break;
            }
        }
        catch
        {
            // The page navigated or closed meanwhile.
        }
        await Task.Delay(250);
        await ReadAsync(page);
    }

    private sealed record Artwork(string Src, string Sizes);

    private sealed record MediaState(
        string Title, string Artist, string Album, Artwork[] Artwork, bool Playing,
        double? Position, double? Duration, string[] Actions, bool Element, bool Audible, bool Muted);

    /// <summary>Everything from the page is display data only: capped, typed, and http(s) artwork only.</summary>
    private static MediaState? Sanitize(string json, CoreWebView2 core)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var s = doc.RootElement;
            if (s.ValueKind != JsonValueKind.Object) return null;
            string Text(string name, int max) =>
                s.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? Clip(v.GetString()!, max) : "";
            double? Num(string name) =>
                s.TryGetProperty(name, out var v) && v.TryGetDouble(out var d) && double.IsFinite(d) && d >= 0 && d < 1e7 ? d : null;
            var artwork = s.TryGetProperty("artwork", out var a) && a.ValueKind == JsonValueKind.Array
                ? a.EnumerateArray()
                    .Where(x => x.ValueKind == JsonValueKind.Object)
                    .Select(x => new Artwork(
                        x.TryGetProperty("src", out var src) && src.ValueKind == JsonValueKind.String ? src.GetString()! : "",
                        x.TryGetProperty("sizes", out var sz) && sz.ValueKind == JsonValueKind.String ? Clip(sz.GetString()!, 40) : ""))
                    .Where(x => x.Src.Length < 2048 && Uri.TryCreate(x.Src, UriKind.Absolute, out var u)
                        && (u.Scheme == Uri.UriSchemeHttps || u.Scheme == Uri.UriSchemeHttp))
                    .Take(8)
                    .ToArray()
                : [];
            var actions = s.TryGetProperty("actions", out var ac) && ac.ValueKind == JsonValueKind.Array
                ? ac.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String)
                    .Select(x => x.GetString()!).Where(Actions.Contains).Distinct().ToArray()
                : [];
            return new MediaState(
                Text("title", 300), Text("artist", 200), Text("album", 200), artwork,
                s.TryGetProperty("playing", out var p) && p.ValueKind == JsonValueKind.True,
                Num("position"), Num("duration"), actions,
                s.TryGetProperty("element", out var el) && el.ValueKind == JsonValueKind.True,
                core.IsDocumentPlayingAudio, core.IsMuted);
        }
        catch
        {
            return null;
        }
    }

    private static string Clip(string value, int max) => value.Length > max ? value[..max] : value;
}
