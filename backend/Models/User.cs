using System.Text.Json.Serialization;

namespace backend.Models;

public class User
{
    public int Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    // Avoid JSON reference cycles: Snippet -> User -> Snippets -> User -> ...
    [JsonIgnore]
    public List<Snippet> Snippets { get; set; } = new();

    [JsonIgnore]
    public List<Favorite> Favorites { get; set; } = new();
}