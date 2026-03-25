namespace backend.Models;

public class Snippet
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;

    public string Language { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int UserId { get; set; }

    public User user { get; set; } = null!;
}