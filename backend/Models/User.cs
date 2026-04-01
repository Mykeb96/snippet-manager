using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;

namespace backend.Models;

public class User : IdentityUser<int>
{
    // Avoid JSON reference cycles: Snippet -> User -> Snippets -> User -> ...
    [JsonIgnore]
    public List<Snippet> Snippets { get; set; } = new();

    [JsonIgnore]
    public List<Favorite> Favorites { get; set; } = new();
}