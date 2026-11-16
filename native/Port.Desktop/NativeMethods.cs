using System.Runtime.InteropServices;

namespace Port.Desktop;

internal static partial class NativeMethods
{
    private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;
    private const int DWMWA_BORDER_COLOR = 34;
    private const int DWMWA_CAPTION_COLOR = 35;
    private const int DWMWA_TEXT_COLOR = 36;

    [LibraryImport("dwmapi.dll")]
    private static partial int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    /// <summary>Title bar in the Port UI window colour (Windows 11; ignored elsewhere).</summary>
    public static void StyleTitleBar(IntPtr hwnd, ShellTheme theme)
    {
        if (hwnd == IntPtr.Zero) return;
        var bg = theme.Background;
        var text = theme.Text;
        Set(hwnd, DWMWA_USE_IMMERSIVE_DARK_MODE, theme.Dark ? 1 : 0);
        Set(hwnd, DWMWA_CAPTION_COLOR, ColorRef(bg.R, bg.G, bg.B));
        Set(hwnd, DWMWA_BORDER_COLOR, ColorRef(bg.R, bg.G, bg.B));
        Set(hwnd, DWMWA_TEXT_COLOR, ColorRef(text.R, text.G, text.B));
    }

    private static readonly IntPtr HWND_TOP = IntPtr.Zero;
    private static readonly IntPtr HWND_BOTTOM = new(1);
    private const uint SWP_NOSIZE = 0x0001, SWP_NOMOVE = 0x0002, SWP_NOACTIVATE = 0x0010;

    [LibraryImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool SetWindowPos(IntPtr hwnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);

    /// <summary>Puts a child window above its siblings (page views must sit over the UI view).</summary>
    public static void BringToTop(IntPtr hwnd)
    {
        if (hwnd != IntPtr.Zero) SetWindowPos(hwnd, HWND_TOP, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
    }

    public static void SendToBottom(IntPtr hwnd)
    {
        if (hwnd != IntPtr.Zero) SetWindowPos(hwnd, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE);
    }

    private static int ColorRef(byte r, byte g, byte b) => r | (g << 8) | (b << 16);

    private static void Set(IntPtr hwnd, int attribute, int value) =>
        _ = DwmSetWindowAttribute(hwnd, attribute, ref value, sizeof(int));
}
