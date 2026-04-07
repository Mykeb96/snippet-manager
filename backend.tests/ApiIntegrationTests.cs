using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace backend.tests;

/// <summary>
/// Integration tests call the API over HTTP (like a real client) while the server runs in the same process.
/// That exercises routing, middleware, auth, EF Core, and your controllers together—what employers want to see.
/// </summary>
public sealed class ApiIntegrationTests : IClassFixture<ApiWebApplicationFactory>, IAsyncLifetime
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly ApiWebApplicationFactory _factory;
    private HttpClient _client = null!;

    public ApiIntegrationTests(ApiWebApplicationFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        _client = _factory.CreateClient();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetTags_Anonymous_Returns200()
    {
        var response = await _client.GetAsync("/api/tags");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task PostSnippet_WithoutToken_Returns401()
    {
        var body = JsonSerializer.Serialize(new { title = "t", code = "c", language = "csharp" }, JsonOptions);
        var response = await _client.PostAsync(
            "/api/snippets",
            new StringContent(body, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetUsers_WithValidJwt_Returns200()
    {
        var token = await LoginAdminAsync();
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task DeleteSnippet_AsNonOwner_Returns403()
    {
        var owner = await RegisterAndLoginAsync("owner", "owner403@test.local", "Ownerpassword1!");
        var other = await RegisterAndLoginAsync("other", "other403@test.local", "Otherpassword1!");

        var snippetId = await CreateSnippetAsync(owner, "s", "code", "csharp");

        var request = new HttpRequestMessage(HttpMethod.Delete, $"/api/snippets/{snippetId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", other);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostTag_AsNonAdmin_Returns403_AsAdmin_Returns201()
    {
        var userToken = await RegisterAndLoginAsync("user", "user403tag@test.local", "Userpassword1!");
        var adminToken = await LoginAdminAsync();

        var createBody = JsonSerializer.Serialize(new { name = $"tag-{Guid.NewGuid():N}" }, JsonOptions);

        var userRequest = new HttpRequestMessage(HttpMethod.Post, "/api/tags")
        {
            Content = new StringContent(createBody, Encoding.UTF8, "application/json"),
        };
        userRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
        var forbidden = await _client.SendAsync(userRequest);
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var adminRequest = new HttpRequestMessage(HttpMethod.Post, "/api/tags")
        {
            Content = new StringContent(createBody, Encoding.UTF8, "application/json"),
        };
        adminRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var created = await _client.SendAsync(adminRequest);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
    }

    [Fact]
    public async Task DuplicateTag_Returns409()
    {
        var adminToken = await LoginAdminAsync();
        var name = $"dup-{Guid.NewGuid():N}";
        var body = JsonSerializer.Serialize(new { name }, JsonOptions);

        static HttpRequestMessage TagRequest(string token, string json)
        {
            var r = new HttpRequestMessage(HttpMethod.Post, "/api/tags")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            };
            r.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return r;
        }

        Assert.Equal(HttpStatusCode.Created, (await _client.SendAsync(TagRequest(adminToken, body))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(TagRequest(adminToken, body))).StatusCode);
    }

    [Fact]
    public async Task DuplicateFavorite_Returns409()
    {
        var user = await RegisterAndLoginAsync("fav", "fav409@test.local", "Favpassword1!");
        var snippetId = await CreateSnippetAsync(user, "t", "c", "csharp");

        var body = JsonSerializer.Serialize(new { snippetId }, JsonOptions);

        static HttpRequestMessage FavoriteRequest(string token, string json)
        {
            var r = new HttpRequestMessage(HttpMethod.Post, "/api/favorites")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            };
            r.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return r;
        }

        Assert.Equal(HttpStatusCode.Created, (await _client.SendAsync(FavoriteRequest(user, body))).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(FavoriteRequest(user, body))).StatusCode);
    }

    [Fact]
    public async Task GetTags_PaginationHeaders_AreSet()
    {
        var response = await _client.GetAsync("/api/tags?page=2&pageSize=5");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("X-Total-Count", out var total));
        Assert.True(response.Headers.TryGetValues("X-Page", out var page));
        Assert.True(response.Headers.TryGetValues("X-Page-Size", out var pageSize));
        Assert.Equal("2", Assert.Single(page));
        Assert.Equal("5", Assert.Single(pageSize));
        _ = Assert.Single(total);
    }

    private async Task<string> LoginAdminAsync()
    {
        var body = JsonSerializer.Serialize(new
        {
            email = "admin@test.local",
            password = "AdminPassword1!",
        }, JsonOptions);

        var response = await _client.PostAsync(
            "/api/auth/login",
            new StringContent(body, Encoding.UTF8, "application/json"));

        response.EnsureSuccessStatusCode();
        var auth = await DeserializeAsync<AuthResponseDto>(response);
        return auth.AccessToken;
    }

    private async Task<string> RegisterAndLoginAsync(string username, string email, string password)
    {
        var registerBody = JsonSerializer.Serialize(new { username, email, password }, JsonOptions);
        var reg = await _client.PostAsync(
            "/api/auth/register",
            new StringContent(registerBody, Encoding.UTF8, "application/json"));
        reg.EnsureSuccessStatusCode();

        var loginBody = JsonSerializer.Serialize(new { email, password }, JsonOptions);
        var login = await _client.PostAsync(
            "/api/auth/login",
            new StringContent(loginBody, Encoding.UTF8, "application/json"));
        login.EnsureSuccessStatusCode();
        var auth = await DeserializeAsync<AuthResponseDto>(login);
        return auth.AccessToken;
    }

    private async Task<int> CreateSnippetAsync(string bearerToken, string title, string code, string language)
    {
        var body = JsonSerializer.Serialize(new { title, code, language }, JsonOptions);
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/snippets")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var snippet = await DeserializeAsync<SnippetResponseDto>(response);
        return snippet.Id;
    }

    private static async Task<T> DeserializeAsync<T>(HttpResponseMessage response)
    {
        await using var stream = await response.Content.ReadAsStreamAsync();
        var result = await JsonSerializer.DeserializeAsync<T>(stream, JsonOptions);
        if (result is null)
        {
            throw new InvalidOperationException("Failed to deserialize response.");
        }

        return result;
    }

    private sealed record AuthResponseDto(int UserId, string Username, string Email, string AccessToken, DateTime ExpiresAtUtc);

    private sealed record SnippetResponseDto(int Id);
}
