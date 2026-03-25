using Microsoft.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Snippet> Snippets => Set<Snippet>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<SnippetTag> SnippetTags => Set<SnippetTag>();
    public DbSet<Favorite> Favorites => Set<Favorite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<SnippetTag>()
            .HasKey(st => new { st.SnippetId, st.TagId });

        modelBuilder.Entity<Favorite>()
            .HasKey(f => new { f.UserId, f.SnippetId });
    }
}