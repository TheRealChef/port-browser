using System.Diagnostics;
using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;

namespace Port.Desktop;

/// <summary>Command-line and environment options for the shell.</summary>
public sealed record ShellOptions(Uri? DevServer, string DataFolder)
{
    /// <summary>
    /// <c>--dev [url]</c> (or PORT_DEV_SERVER) loads the UI from the Vite dev server
    /// instead of the bundled files. <c>--profile &lt;dir&gt;</c> uses another data folder.
    /// </summary>
    public static ShellOptions Parse(string[] args)
    {
        Uri? dev = null;
        var data = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Port");

        var env = Environment.GetEnvironmentVariable("PORT_DEV_SERVER");
        if (!string.IsNullOrWhiteSpace(env)) dev = LocalHttpUri(env);

        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--dev":
                    var next = i + 1 < args.Length && !args[i + 1].StartsWith("--") ? args[++i] : null;
                    dev = LocalHttpUri(next ?? "http://localhost:5173/");
                    break;
                case "--profile" when i + 1 < args.Length:
                    data = Path.GetFullPath(args[++i]);
                    break;
            }
        }
        return new ShellOptions(dev, data);
    }

    /// <summary>The dev server must be on this machine; anything else is ignored.</summary>
    private static Uri? LocalHttpUri(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttp
        && (uri.IsLoopback || uri.Host == "localhost")
            ? uri
            : null;
}

public static class Program
{
    [STAThread]
    public static int Main(string[] args)
    {
        var options = ShellOptions.Parse(args);
        var app = new Application { ShutdownMode = ShutdownMode.OnMainWindowClose };

        try
        {
            CoreWebView2Environment.GetAvailableBrowserVersionString();
        }
        catch (WebView2RuntimeNotFoundException)
        {
            var open = MessageBox.Show(
                "Port needs the Microsoft Edge WebView2 Runtime, which is not installed.\n\nOpen the download page?",
                "Port", MessageBoxButton.YesNo, MessageBoxImage.Warning);
            if (open == MessageBoxResult.Yes)
            {
                Process.Start(new ProcessStartInfo(
                    "https://developer.microsoft.com/microsoft-edge/webview2/") { UseShellExecute = true });
            }
            return 1;
        }

        if (options.DevServer is null && !File.Exists(Path.Combine(AppContext.BaseDirectory, "wwwroot", "index.html")))
        {
            MessageBox.Show(
                "The Port UI files are missing (wwwroot/index.html).\n\nRun `npm run app:build`, or start with --dev while `npm run dev` is running.",
                "Port", MessageBoxButton.OK, MessageBoxImage.Error);
            return 1;
        }

        return app.Run(new MainWindow(options));
    }
}
