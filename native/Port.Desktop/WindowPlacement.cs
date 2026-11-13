using System.IO;
using System.Text.Json;
using System.Windows;

namespace Port.Desktop;

/// <summary>Remembers the window's size, position and maximized state between runs.</summary>
internal sealed record WindowPlacement(double Left, double Top, double Width, double Height, bool Maximized)
{
    private static string FilePath(string dataFolder) => Path.Combine(dataFolder, "window.json");

    public static WindowPlacement? Load(string dataFolder)
    {
        try
        {
            var placement = JsonSerializer.Deserialize<WindowPlacement>(File.ReadAllText(FilePath(dataFolder)));
            if (placement is null || placement.Width < 400 || placement.Height < 300) return null;
            // Drop positions on monitors that are no longer connected.
            var visible = new Rect(
                SystemParameters.VirtualScreenLeft, SystemParameters.VirtualScreenTop,
                SystemParameters.VirtualScreenWidth, SystemParameters.VirtualScreenHeight);
            var titleBar = new Rect(placement.Left, placement.Top, placement.Width, 40);
            return visible.IntersectsWith(titleBar) ? placement : placement with { Left = double.NaN, Top = double.NaN };
        }
        catch
        {
            return null;
        }
    }

    public void Save(string dataFolder)
    {
        try
        {
            Directory.CreateDirectory(dataFolder);
            File.WriteAllText(FilePath(dataFolder), JsonSerializer.Serialize(this));
        }
        catch
        {
            // Losing the window position is not worth an error.
        }
    }
}
