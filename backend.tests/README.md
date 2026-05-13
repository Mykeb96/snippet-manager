# Backend integration tests

xUnit integration tests for the Snippet Manager API. The suite boots the **real ASP.NET Core app in-process** with `WebApplicationFactory<Program>` and exercises HTTP endpoints over a `HttpClient` — same code path as a real client, no DI surgery, no mocking of controllers.

The goal is to cover the contract the frontend (and any other consumer) relies on: auth, authorization, validation, status codes, response shape, and pagination headers.

---

## Layout

```
backend.tests/
├── ApiWebApplicationFactory.cs   # boots the API with a temp SQLite DB + test config
├── ApiIntegrationTests.cs        # all integration tests (one xUnit class)
└── backend.tests.csproj          # SDK refs: Microsoft.NET.Test.Sdk, xUnit, Mvc.Testing
```

---

## How the host is configured

`ApiWebApplicationFactory` is the only place the test environment differs from production:

```csharp
public sealed class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    internal readonly string DbPath = Path.Combine(
        Path.GetTempPath(),
        $"snippet-test-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.UseSetting("Jwt:Key", new string('a', 32));
        builder.UseSetting("ConnectionStrings:DefaultConnection",
            $"Data Source={DbPath}");
        builder.UseSetting("Cors:AllowedOrigins:0", "http://localhost:5173");
        builder.UseSetting("AdminSeed:Email", "admin@test.local");
        builder.UseSetting("AdminSeed:Username", "admin");
        builder.UseSetting("AdminSeed:Password", "AdminPassword1!");
    }
}
```

Notes:

- **Environment `Testing`** disables rate limiting (`Program.cs` short-circuits the rate limiter outside Development/Production).
- **Isolated SQLite file per test fixture** (`Path.GetTempPath()` + a new `Guid`) — no shared state, no clean-up rituals.
- **JWT key, connection string, CORS, and admin seed** are injected via `UseSetting` so they're applied early enough for `Program.cs` to read them.
- The factory implements `IClassFixture<ApiWebApplicationFactory>` in the test class, so the host is shared **across tests in the class** but the DB is fresh per fixture (cheap, isolated).

In `InitializeAsync`, each fixture migrates the DB before the first test runs:

```csharp
public async Task InitializeAsync()
{
    _client = _factory.CreateClient();
    using var scope = _factory.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}
```

---

## What's covered

| Area | Examples |
|---|---|
| **Auth** | `Login`, `Register`, `ChangePassword` (valid current → 204; new password accepted; old password rejected) |
| **Authorization** | `GET /api/users` → 401 without token, 403 for non-admin, 200 for admin |
| **Snippets** | Create with valid tag ids, validation on title / code length, owner-only delete, admin delete other user's snippet (204) |
| **Tags** | Non-admin create → 403, admin create → 201, duplicate name → 409 |
| **Favorites** | Create → 201, duplicate → 409, list returns rows including author info, `DELETE /me/snippet/{id}` removes the row |
| **Users (admin)** | Promote to admin (Owner-only → 403 for non-Owner admin), delete user (admin, self → 409, other → 204) |
| **Contract** | Pagination headers (`X-Total-Count`, `X-Page`, `X-Page-Size`) populated on list endpoints |

Status codes are asserted **exactly** (`201 Created`, `204 NoContent`, `409 Conflict`, etc.). If a controller silently downgrades a `201` to `200`, the tests fail and surface the regression.

---

## Patterns

### Small auth helpers

A few private helpers in the test class take care of "register, then login, give me back a token":

```csharp
private async Task<string> RegisterAndLoginAsync(string username, string email, string password)
{
    var registerBody = JsonSerializer.Serialize(new { username, email, password }, JsonOptions);
    await _client.PostAsync("/api/auth/register", JsonContent(registerBody));

    var loginBody = JsonSerializer.Serialize(new { email, password }, JsonOptions);
    var login = await _client.PostAsync("/api/auth/login", JsonContent(loginBody));
    var auth = await DeserializeAsync<AuthResponseDto>(login);
    return auth.AccessToken;
}
```

Tests stay focused on the behavior under test instead of restating the auth handshake every time.

### Local DTOs

The test file declares small `private sealed record`s for the JSON shapes it deserializes:

```csharp
private sealed record AuthResponseDto(int UserId, string Username, string Email, string AccessToken, ...);
private sealed record SnippetWithTagsDto(int Id, List<TagResponseDto> Tags);
private sealed record FavoriteMeListDto(int SnippetId, FavoriteSnippetPartDto Snippet);
```

The tests intentionally **don't** import production DTOs. If the controllers ever rename `accessToken` to `token` or change the favorites response shape, the test will fail at deserialization — the test serves as a contract check.

### Reaching into the container when needed

Some tests need to mutate Identity state directly (e.g. add an Admin role without going through the public API):

```csharp
using (var scope = _factory.Services.CreateScope())
{
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
    var u = await userManager.FindByIdAsync(victimAuth.UserId.ToString());
    await userManager.AddToRoleAsync(u!, "Admin");
}
```

Reserved for **arrange** steps; assertions still go through HTTP so they reflect what a real client would see.

### Acting against the same `HttpClient`

`_factory.CreateClient()` returns a client that talks to the in-process server. There's no port binding, no socket — it's wire-compatible HTTP without the wire. Requests are constructed with `HttpRequestMessage` so headers (especially `Authorization`) can be set per call without polluting client defaults.

---

## Running

```bash
dotnet test backend.tests/backend.tests.csproj
```

Useful flags:

```bash
# A single test by name
dotnet test backend.tests/backend.tests.csproj --filter "FullyQualifiedName~DeleteSnippet_AsAdmin"

# Verbose logging (Identity, EF, etc.)
dotnet test backend.tests/backend.tests.csproj --logger "console;verbosity=detailed"
```

No external dependencies are required: each test fixture creates its own SQLite file and tears it down with the process.

---

## Companion: frontend e2e suite

The Playwright suite at `frontend/tests/` covers the same surfaces from the **UI side** — browser → API → DB → API → DOM — with `storageState` auth re-use, deterministic API cleanup, and role-based locators. The two suites together give double-sided coverage: HTTP contract here, user-visible behavior there. See `frontend/tests/README.md` for details.
