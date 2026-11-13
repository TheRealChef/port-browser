using System.Windows;
using System.Windows.Media;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace Port.Desktop;

/// <summary>One tab's real browser view. Created hidden; the window positions it.</summary>
internal sealed class PageView
{
    public PageView(string tabId, string profile)
    {
        TabId = tabId;
        Profile = profile;
        View = new WebView2
        {
            Visibility = Visibility.Hidden,
            DefaultBackgroundColor = System.Drawing.Color.White,
            Focusable = true,
        };
        RenderOptions.SetEdgeMode(View, EdgeMode.Aliased);
    }

    public string TabId { get; }
    /// <summary>WebView2 profile (one per space); empty for the default profile.</summary>
    public string Profile { get; }
    public WebView2 View { get; }
    public CoreWebView2? Core => View.CoreWebView2;
    public Task Ready { get; set; } = Task.CompletedTask;
    public bool Disposed { get; set; }

    /// <summary>Whether the view is currently swapped for a snapshot under UI overlays.</summary>
    public bool Covered { get; set; }
}
