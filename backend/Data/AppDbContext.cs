using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using backend.Models;

namespace backend.Data;

public class AppDbContext : IdentityDbContext<User, IdentityRole<int>, int>
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Snippet> Snippets => Set<Snippet>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<SnippetTag> SnippetTags => Set<SnippetTag>();
    public DbSet<Favorite> Favorites => Set<Favorite>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().ToTable("Users");
        modelBuilder.Entity<IdentityRole<int>>().ToTable("Roles");
        modelBuilder.Entity<IdentityUserRole<int>>().ToTable("UserRoles");
        modelBuilder.Entity<IdentityUserClaim<int>>().ToTable("UserClaims");
        modelBuilder.Entity<IdentityUserLogin<int>>().ToTable("UserLogins");
        modelBuilder.Entity<IdentityRoleClaim<int>>().ToTable("RoleClaims");
        modelBuilder.Entity<IdentityUserToken<int>>().ToTable("UserTokens");

        modelBuilder.Entity<User>()
            .Property(u => u.UserName)
            .HasColumnName("Username");

        modelBuilder.Entity<SnippetTag>()
            .HasKey(st => new { st.SnippetId, st.TagId });

        modelBuilder.Entity<Favorite>()
            .HasKey(f => new { f.UserId, f.SnippetId });

        modelBuilder.Entity<Tag>()
            .HasIndex(t => t.Name)
            .IsUnique();
    }
}