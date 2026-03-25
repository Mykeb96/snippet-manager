public class Favorite
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int SnippetId { get; set; }
    public Snippet Snippet { get; set; } = null!;
}