using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Windows.Media;

namespace Port.Desktop;

/// <summary>
/// The Port UI theme as the window frame needs it: light or dark, the window
/// body colour (title bar and background, so nothing flashes) and the caption
/// text colour. The UI sends it whenever the theme or preset changes, and the
/// last one is saved so the next start opens in the right colours.
/// </summary>
internal sealed partial record ShellTheme(bool Dark, Color Background, Color Text)
{
    /// <summary>Port UI Stone &amp; Slate, dark: surface-0 and ink.</summary>
    public static readonly ShellTheme Default = new(true, Color.FromRgb(0x13, 0x17, 0x19), Color.FromRgb(0xee, 0xf0, 0xeb));

    private const string FileName = "theme.json";

    public static ShellTheme Load(string dataFolder)
    {
        try
        {
            var path = Path.Combine(dataFolder, FileName);
            if (!File.Exists(path)) return Default;
            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            return FromMessage(doc.RootElement) ?? Default;
        }
        catch
        {
            return Default;
        }
    }

    public void Save(string dataFolder)
    {
        try
        {
            Directory.CreateDirectory(dataFolder);
            File.WriteAllText(Path.Combine(dataFolder, FileName), JsonSerializer.Serialize(new
            {
                dark = Dark,
                background = Hex(Background),
                text = Hex(Text),
            }));
        }
        catch
        {
            // Only affects the colours of the next start.
        }
    }

    /// <summary>Reads a theme message; null when a colour is not a plain #rrggbb value.</summary>
    public static ShellTheme? FromMessage(JsonElement msg)
    {
        if (!msg.TryGetProperty("dark", out var dark) || dark.ValueKind is not (JsonValueKind.True or JsonValueKind.False)) return null;
        var background = ParseHex(msg, "background");
        var text = ParseHex(msg, "text");
        return background is { } b && text is { } t ? new ShellTheme(dark.GetBoolean(), b, t) : null;
    }

    private static Color? ParseHex(JsonElement msg, string name)
    {
        if (!msg.TryGetProperty(name, out var value) || value.ValueKind != JsonValueKind.String) return null;
        var s = value.GetString()!.Trim();
        if (!HexColor().IsMatch(s)) return null;
        return Color.FromRgb(
            Convert.ToByte(s.Substring(1, 2), 16),
            Convert.ToByte(s.Substring(3, 2), 16),
            Convert.ToByte(s.Substring(5, 2), 16));
    }

    private static string Hex(Color c) => $"#{c.R:x2}{c.G:x2}{c.B:x2}";

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColor();
}
