using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace Port.Desktop;

/// <summary>
/// The Port window: one WebView2 runs the Port UI (the React app) across the
/// whole window, and every tab gets its own WebView2 laid over the content
/// area the UI reports. The two talk only through WebView2 web messages.
/// </summary>
public sealed class MainWindow : Window
{
    /// <summary>Origin the bundled UI is served from. Changing it would orphan saved workspaces.</summary>
    private const string AppHost = "port.example";
    private static readonly string AppOrigin = $"https://{AppHost}";

    private static readonly JsonSerializerOptions Json = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly ShellOptions options;
    private readonly WebView2 ui = new();
    private readonly Canvas pageLayer = new();
    private readonly Dictionary<string, PageView> pages = new();
    private CoreWebView2Environment? environment;

    private string? activeTabId;
    private Rect activeBounds = Rect.Empty;
    private bool covered;
    private PageView? fullscreenPage;
    private (WindowStyle Style, WindowState State, ResizeMode Resize)? beforeFullscreen;

    public MainWindow(ShellOptions options)
    {
        this.options = options;
        Title = "Port";
        Background = new SolidColorBrush(Color.FromRgb(0x1a, 0x22, 0x26));
        MinWidth = 640;
        MinHeight = 420;
        Width = 1440;
        Height = 900;
        WindowStartupLocation = WindowStartupLocation.CenterScreen;
        try
        {
            Icon = BitmapFrame.Create(new Uri("pack://application:,,,/port.ico"));
        }
        catch
        {
            // The window still works without an icon.
        }

        var placement = WindowPlacement.Load(options.DataFolder);
        if (placement is not null)
        {
            Width = placement.Width;
            Height = placement.Height;
            if (!double.IsNaN(placement.Left))
            {
                WindowStartupLocation = WindowStartupLocation.Manual;
                Left = placement.Left;
                Top = placement.Top;
            }
            if (placement.Maximized) WindowState = WindowState.Maximized;
        }

        ui.DefaultBackgroundColor = System.Drawing.Color.FromArgb(0x1a, 0x22, 0x26);
        var root = new Grid();
        root.Children.Add(ui);
        root.Children.Add(pageLayer);
        Content = root;

        pageLayer.SizeChanged += (_, _) => { if (fullscreenPage is not null) LayoutPages(); };
        SourceInitialized += (_, _) => NativeMethods.StyleTitleBar(new WindowInteropHelper(this).Handle);
        Loaded += async (_, _) => await InitializeAsync();
        Closing += (_, _) => SavePlacement();
    }

    // ---------------------------------------------------------------- startup

    private async Task InitializeAsync()
    {
        try
        {
            Directory.CreateDirectory(options.DataFolder);
            var envOptions = new CoreWebView2EnvironmentOptions { AreBrowserExtensionsEnabled = false };
            environment = await CoreWebView2Environment.CreateAsync(
                null, Path.Combine(options.DataFolder, "Profile"), envOptions);

            await ui.EnsureCoreWebView2Async(environment);
            NativeMethods.SendToBottom(ui.Handle);
            var core = ui.CoreWebView2;
            var settings = core.Settings;
            var dev = options.DevServer is not null;
            settings.AreDevToolsEnabled = dev;
            settings.AreDefaultContextMenusEnabled = true;
            settings.AreBrowserAcceleratorKeysEnabled = false; // Ctrl+R, F5, Ctrl+P etc. belong to the UI.
            settings.IsZoomControlEnabled = false;
            settings.IsStatusBarEnabled = false;
            settings.IsPasswordAutosaveEnabled = false;
            settings.IsGeneralAutofillEnabled = false;
            settings.AreHostObjectsAllowed = false;

            core.NavigationStarting += (_, e) =>
            {
                if (IsUiUrl(e.Uri)) return;
                e.Cancel = true;
                OpenExternal(e.Uri);
            };
            core.NewWindowRequested += (_, e) =>
            {
                e.Handled = true;
                OpenExternal(e.Uri);
            };
            core.WebMessageReceived += OnUiMessage;
            core.ProcessFailed += (_, e) =>
            {
                if (e.ProcessFailedKind is CoreWebView2ProcessFailedKind.RenderProcessExited
                    or CoreWebView2ProcessFailedKind.RenderProcessUnresponsive)
                {
                    core.Reload();
                }
            };

            if (options.DevServer is { } devServer)
            {
                core.Navigate(devServer.ToString());
            }
            else
            {
                core.SetVirtualHostNameToFolderMapping(
                    AppHost, Path.Combine(AppContext.BaseDirectory, "wwwroot"),
                    CoreWebView2HostResourceAccessKind.DenyCors);
                core.Navigate($"{AppOrigin}/index.html");
            }
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, $"Port could not start its browser engine.\n\n{ex.Message}", "Port",
                MessageBoxButton.OK, MessageBoxImage.Error);
            Close();
        }
    }

    private bool IsUiUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return false;
        if (options.DevServer is { } dev)
        {
            return uri.Scheme == dev.Scheme && uri.Host == dev.Host && uri.Port == dev.Port;
        }
        return uri.Scheme == Uri.UriSchemeHttps && uri.Host == AppHost;
    }

    // ------------------------------------------------------- UI -> shell

    private void OnUiMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        if (!IsUiUrl(e.Source)) return;
        try
        {
            using var doc = JsonDocument.Parse(e.WebMessageAsJson);
            var msg = doc.RootElement;
            var type = Str(msg, "type");
            var tabId = Str(msg, "tabId");
            switch (type)
            {
                case "ready":
                    break;
                case "view":
                    _ = ShowViewAsync(tabId, Str(msg, "url"), ReadBounds(msg),
                        msg.TryGetProperty("covered", out var c) && c.ValueKind == JsonValueKind.True);
                    break;
                case "navigate" when tabId is not null:
                    _ = NavigateAsync(tabId, Str(msg, "url"));
                    break;
                case "reload" when tabId is not null:
                    WithPage(tabId, core => core.Reload());
                    break;
                case "back" when tabId is not null:
                    WithPage(tabId, core => { if (core.CanGoBack) core.GoBack(); });
                    break;
                case "forward" when tabId is not null:
                    WithPage(tabId, core => { if (core.CanGoForward) core.GoForward(); });
                    break;
                case "dispose" when tabId is not null:
                    DisposePage(tabId);
                    break;
                case "openExternal":
                    OpenExternal(Str(msg, "url"));
                    break;
            }
        }
        catch (JsonException)
        {
            // Ignore malformed messages.
        }
    }

    private static string? Str(JsonElement msg, string name) =>
        msg.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    private static Rect? ReadBounds(JsonElement msg)
    {
        if (!msg.TryGetProperty("bounds", out var b) || b.ValueKind != JsonValueKind.Object) return null;
        double Num(string name) => b.TryGetProperty(name, out var v) && v.TryGetDouble(out var d) && double.IsFinite(d) ? d : 0;
        return new Rect(Num("x"), Num("y"), Math.Max(0, Num("width")), Math.Max(0, Num("height")));
    }

    private void Post(object message)
    {
        ui.CoreWebView2?.PostWebMessageAsJson(JsonSerializer.Serialize(message, Json));
    }

    // ------------------------------------------------------------ pages

    private async Task ShowViewAsync(string? tabId, string? url, Rect? bounds, bool isCovered)
    {
        activeTabId = tabId;
        if (bounds is { } rect) activeBounds = rect;
        covered = isCovered;

        if (tabId is null)
        {
            LayoutPages();
            return;
        }

        if (!pages.TryGetValue(tabId, out var page))
        {
            page = CreatePage(tabId);
            LayoutPages();
            await page.Ready;
            if (page.Disposed) return;
            if (SafeHttpUrl(url) is { } start) page.Core?.Navigate(start);
        }
        else
        {
            await page.Ready;
        }

        if (page.Disposed || activeTabId != tabId) { LayoutPages(); return; }

        if (covered && !page.Covered)
        {
            // Pages always draw above the UI, so show a still image while overlays are open.
            string? snapshot = null;
            if (page.View.Visibility == Visibility.Visible) snapshot = await CaptureAsync(page);
            if (activeTabId == tabId) Post(new { type = "snapshot", tabId, dataUrl = snapshot });
            page.Covered = covered && activeTabId == tabId;
        }
        else if (!covered)
        {
            page.Covered = false;
        }
        LayoutPages();
    }

    private static async Task<string?> CaptureAsync(PageView page)
    {
        if (page.Core is null) return null;
        try
        {
            using var stream = new MemoryStream();
            await page.Core.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Jpeg, stream);
            return "data:image/jpeg;base64," + Convert.ToBase64String(stream.ToArray());
        }
        catch
        {
            return null;
        }
    }

    /// <summary>Shows only the active page, sized to the UI's content slot (or the whole window in fullscreen).</summary>
    private void LayoutPages()
    {
        foreach (var page in pages.Values)
        {
            var isActive = page.TabId == activeTabId && !page.Covered && !page.Disposed && page.Core is not null;
            if (fullscreenPage is not null) isActive = page == fullscreenPage;

            if (isActive)
            {
                var rect = fullscreenPage is not null
                    ? new Rect(0, 0, pageLayer.ActualWidth, pageLayer.ActualHeight)
                    : Scale(activeBounds);
                Canvas.SetLeft(page.View, Math.Round(rect.X));
                Canvas.SetTop(page.View, Math.Round(rect.Y));
                page.View.Width = Math.Max(1, Math.Round(rect.Width));
                page.View.Height = Math.Max(1, Math.Round(rect.Height));
                if (rect.Width < 1 || rect.Height < 1) isActive = false;
            }

            var visibility = isActive ? Visibility.Visible : Visibility.Hidden;
            if (page.View.Visibility != visibility) page.View.Visibility = visibility;
            // Both views are child windows; Windows keeps whichever was raised last on top,
            // and the UI view can end up above the page. Keep the page in front explicitly.
            if (isActive) NativeMethods.BringToTop(page.View.Handle);
        }
    }

    /// <summary>The UI reports CSS pixels; at zoom 1 those equal WPF device-independent pixels.</summary>
    private Rect Scale(Rect css)
    {
        if (css.IsEmpty) return new Rect(0, 0, 0, 0);
        var zoom = ui.ZoomFactor;
        return new Rect(css.X * zoom, css.Y * zoom, css.Width * zoom, css.Height * zoom);
    }

    private PageView CreatePage(string tabId)
    {
        var page = new PageView(tabId);
        pages[tabId] = page;
        pageLayer.Children.Add(page.View);
        page.Ready = InitializePageAsync(page);
        return page;
    }

    private async Task InitializePageAsync(PageView page)
    {
        await page.View.EnsureCoreWebView2Async(environment);
        if (page.Disposed) return;
        var core = page.Core!;
        var tabId = page.TabId;

        var settings = core.Settings;
        settings.IsWebMessageEnabled = false;
        settings.AreHostObjectsAllowed = false;
        settings.AreDevToolsEnabled = true;
        settings.IsStatusBarEnabled = true;

        core.NavigationStarting += (_, _) => Post(new { type = "loading", tabId, loading = true });
        core.NavigationCompleted += (_, _) =>
        {
            Post(new { type = "loading", tabId, loading = false });
            PostHistory(page);
        };
        core.SourceChanged += (_, _) => Post(new
        {
            type = "navigated",
            tabId,
            url = core.Source,
            canGoBack = core.CanGoBack,
            canGoForward = core.CanGoForward,
        });
        core.HistoryChanged += (_, _) => PostHistory(page);
        core.DocumentTitleChanged += (_, _) => Post(new { type = "title", tabId, title = core.DocumentTitle });
        core.FaviconChanged += (_, _) =>
        {
            var icon = core.FaviconUri;
            Post(new { type = "favicon", tabId, url = string.IsNullOrEmpty(icon) ? null : icon });
        };
        core.WindowCloseRequested += (_, _) => Post(new { type = "closeTab", tabId });
        core.NewWindowRequested += OnNewWindowRequested;
        core.ContainsFullScreenElementChanged += (_, _) => SetFullscreen(page, core.ContainsFullScreenElement);
        core.ProcessFailed += (_, e) =>
        {
            if (e.ProcessFailedKind == CoreWebView2ProcessFailedKind.RenderProcessExited) core.Reload();
        };
        page.View.PreviewKeyDown += (_, e) => ForwardShortcut(e);
    }

    private void PostHistory(PageView page)
    {
        if (page.Core is { } core)
        {
            Post(new { type = "history", tabId = page.TabId, canGoBack = core.CanGoBack, canGoForward = core.CanGoForward });
        }
    }

    /// <summary>Links with target=_blank and window.open() become new tabs that keep their opener.</summary>
    private async void OnNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        var opener = pages.Values.FirstOrDefault(p => p.Core == sender);
        if (opener is null) return;
        if (!string.IsNullOrEmpty(e.Uri) && SafeHttpUrl(e.Uri) is null && e.Uri != "about:blank")
        {
            e.Handled = true; // mailto:, custom protocols etc. are not opened as tabs.
            return;
        }

        var deferral = e.GetDeferral();
        try
        {
            var tabId = Guid.NewGuid().ToString("N")[..12];
            var page = CreatePage(tabId);
            await page.Ready;
            e.NewWindow = page.Core;
            e.Handled = true;
            Post(new { type = "newTab", tabId, url = e.Uri, openerTabId = opener.TabId, background = false });
        }
        finally
        {
            deferral.Complete();
        }
    }

    private async Task NavigateAsync(string tabId, string? url)
    {
        if (SafeHttpUrl(url) is not { } target) return;
        if (!pages.TryGetValue(tabId, out var page))
        {
            page = CreatePage(tabId);
            LayoutPages();
        }
        await page.Ready;
        if (!page.Disposed) page.Core?.Navigate(target);
    }

    private async void WithPage(string tabId, Action<CoreWebView2> action)
    {
        if (!pages.TryGetValue(tabId, out var page)) return;
        await page.Ready;
        if (!page.Disposed && page.Core is { } core) action(core);
    }

    private void DisposePage(string tabId)
    {
        if (!pages.Remove(tabId, out var page)) return;
        page.Disposed = true;
        if (fullscreenPage == page) SetFullscreen(page, false);
        pageLayer.Children.Remove(page.View);
        page.View.Dispose();
    }

    // ------------------------------------------------------- fullscreen

    private void SetFullscreen(PageView page, bool enter)
    {
        if (enter && fullscreenPage is null)
        {
            fullscreenPage = page;
            beforeFullscreen = (WindowStyle, WindowState, ResizeMode);
            WindowStyle = WindowStyle.None;
            ResizeMode = ResizeMode.NoResize;
            if (WindowState == WindowState.Maximized) WindowState = WindowState.Normal;
            WindowState = WindowState.Maximized;
        }
        else if (!enter && fullscreenPage == page)
        {
            fullscreenPage = null;
            if (beforeFullscreen is { } previous)
            {
                WindowStyle = previous.Style;
                ResizeMode = previous.Resize;
                WindowState = previous.State;
            }
            beforeFullscreen = null;
        }
        LayoutPages();
    }

    // ------------------------------------------------------- keyboard

    /// <summary>
    /// Port's own shortcuts still work while a page has focus: the page view
    /// swallows them and the UI handles them as if pressed there.
    /// </summary>
    private void ForwardShortcut(KeyEventArgs e)
    {
        var key = e.Key == Key.System ? e.SystemKey : e.Key;
        var mods = Keyboard.Modifiers;
        var ctrl = mods.HasFlag(ModifierKeys.Control);
        var alt = mods.HasFlag(ModifierKeys.Alt);
        var shift = mods.HasFlag(ModifierKeys.Shift);

        string? name = null;
        string? code = null;
        if (key >= Key.A && key <= Key.Z)
        {
            var letter = (char)('A' + (key - Key.A));
            name = shift ? letter.ToString() : char.ToLowerInvariant(letter).ToString();
            code = $"Key{letter}";
        }
        else if (key >= Key.D1 && key <= Key.D9)
        {
            name = ((char)('1' + (key - Key.D1))).ToString();
            code = $"Digit{name}";
        }
        else if (key == Key.OemComma)
        {
            name = ",";
            code = "Comma";
        }
        if (name is null) return;

        var lower = name.ToLowerInvariant();
        var digit = code!.StartsWith("Digit");
        var forward =
            (ctrl && !alt && !shift && (lower is "t" or "w" or "l" or "k" || name == "," || digit))
            || (ctrl && !alt && shift && lower == "t")
            || (alt && !ctrl && !shift && (lower is "t" or "w" || digit));
        if (!forward) return;

        e.Handled = true;
        ui.Focus();
        Post(new
        {
            type = "key",
            key = name,
            code,
            ctrlKey = ctrl,
            shiftKey = shift,
            altKey = alt,
            metaKey = false,
        });
    }

    // ------------------------------------------------------------ misc

    private static string? SafeHttpUrl(string? url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)
            ? uri.AbsoluteUri
            : null;

    private static void OpenExternal(string? url)
    {
        if (SafeHttpUrl(url) is not { } safe) return;
        try
        {
            Process.Start(new ProcessStartInfo(safe) { UseShellExecute = true });
        }
        catch
        {
            // No default browser configured.
        }
    }

    private void SavePlacement()
    {
        if (fullscreenPage is not null && beforeFullscreen is { } previous)
        {
            WindowStyle = previous.Style;
            WindowState = previous.State;
        }
        var bounds = WindowState == WindowState.Normal ? new Rect(Left, Top, Width, Height) : RestoreBounds;
        new WindowPlacement(bounds.Left, bounds.Top, bounds.Width, bounds.Height, WindowState == WindowState.Maximized)
            .Save(options.DataFolder);
    }
}
