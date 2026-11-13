using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Port.Desktop;

/// <summary>
/// Maps each space to its own WebView2 profile, so every space has separate
/// cookies, sign-ins and site storage. Profiles are persistent: sign-ins
/// survive restarts. The mapping is saved so a space keeps its profile.
/// </summary>
/// <remarks>
/// Before per-space profiles existed, every page used the default profile.
/// The first space that opens a page after upgrading inherits that profile,
/// so the sign-ins made there are kept.
/// </remarks>
internal sealed partial class ProfileStore
{
    /// <summary>Profile name for the default profile (passed as no profile).</summary>
    public const string DefaultProfile = "";

    private readonly string file;
    private readonly State state;

    private sealed class State
    {
        public Dictionary<string, string> Spaces { get; set; } = new();
        public bool DefaultClaimed { get; set; }
    }

    public ProfileStore(string dataFolder)
    {
        file = Path.Combine(dataFolder, "profiles.json");
        try
        {
            state = JsonSerializer.Deserialize<State>(File.ReadAllText(file)) ?? new State();
        }
        catch
        {
            state = new State();
        }
    }

    /// <summary>The profile for a space, assigning one the first time.</summary>
    public string ForSpace(string? spaceId)
    {
        if (string.IsNullOrEmpty(spaceId)) return DefaultProfile;
        if (state.Spaces.TryGetValue(spaceId, out var existing)) return existing;

        string profile;
        if (!state.DefaultClaimed)
        {
            profile = DefaultProfile;
            state.DefaultClaimed = true;
        }
        else
        {
            var safe = Unsafe().Replace(spaceId, "");
            profile = "space-" + (safe.Length > 40 ? safe[..40] : safe);
        }
        state.Spaces[spaceId] = profile;
        Save();
        return profile;
    }

    /// <summary>The profile a space already has, without assigning one.</summary>
    public string? Existing(string spaceId) =>
        state.Spaces.TryGetValue(spaceId, out var profile) ? profile : null;

    private void Save()
    {
        try
        {
            File.WriteAllText(file, JsonSerializer.Serialize(state));
        }
        catch
        {
            // The mapping is rebuilt next time; worst case a space signs in again.
        }
    }

    [GeneratedRegex("[^A-Za-z0-9-]")]
    private static partial Regex Unsafe();
}
