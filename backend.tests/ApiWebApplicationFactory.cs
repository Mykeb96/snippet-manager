using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace backend.tests;

/// <summary>
/// Boots your real API in-process (no separate process). We override config so tests use a temp SQLite file
/// and a fixed JWT secret—never your machine or production secrets.
/// </summary>
public sealed class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    internal readonly string DbPath = Path.Combine(Path.GetTempPath(), $"snippet-test-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // UseSetting is applied early enough for minimal-host Program.cs to read Jwt/connection strings.
        builder.UseSetting("Jwt:Key", new string('a', 32));
        builder.UseSetting("ConnectionStrings:DefaultConnection", $"Data Source={DbPath}");
        builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:5173");
        builder.UseSetting("AdminSeed:Email", "admin@test.local");
        builder.UseSetting("AdminSeed:Username", "admin");
        builder.UseSetting("AdminSeed:Password", "AdminPassword1!");
    }
}
