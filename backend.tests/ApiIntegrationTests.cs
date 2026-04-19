using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using backend;
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
    public async Task GetUsers_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetUsers_AsNonAdmin_Returns403()
    {
        var userToken = await RegisterAndLoginAsync("noadmin", "noadmin@test.local", "Userpassword1!");

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
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
    public async Task GetFavoritesMe_ReturnsFavorite_IncludesSnippetAuthor_DeleteMe_Removes()
    {
        var fan = await RegisterAndLoginAsync("fanme", "fan-me@test.local", "FanmePassword1!");
        var author = await RegisterAndLoginAsync("authorf", "author-f@test.local", "AuthorfPassword1!");
        var snippetId = await CreateSnippetAsync(author, "Starred", "code", "typescript");

        var body = JsonSerializer.Serialize(new { snippetId }, JsonOptions);
        var post = new HttpRequestMessage(HttpMethod.Post, "/api/favorites")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        post.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fan);
        (await _client.SendAsync(post)).EnsureSuccessStatusCode();

        var get = new HttpRequestMessage(HttpMethod.Get, "/api/favorites/me?page=1&pageSize=20");
        get.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fan);
        var listResponse = await _client.SendAsync(get);
        listResponse.EnsureSuccessStatusCode();
        var list = await DeserializeAsync<List<FavoriteMeListDto>>(listResponse);
        Assert.Single(list);
        Assert.Equal(snippetId, list[0].SnippetId);
        Assert.Equal("authorf", list[0].Snippet.Author.Username);

        var del = new HttpRequestMessage(HttpMethod.Delete, $"/api/favorites/me/snippet/{snippetId}");
        del.Headers.Authorization = new AuthenticationHeaderValue("Bearer", fan);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.SendAsync(del)).StatusCode);

        var empty = await _client.SendAsync(get);
        empty.EnsureSuccessStatusCode();
        var after = await DeserializeAsync<List<FavoriteMeListDto>>(empty);
        Assert.Empty(after);
    }

    [Fact]
    public async Task PostSnippet_WithValidTagIds_ReturnsSnippetWithTags()
    {
        var token = await RegisterAndLoginAsync("tagged", "tagged@test.local", "Taggedpassword1!");

        var tagsResponse = await _client.GetAsync("/api/tags?page=1&pageSize=20");
        tagsResponse.EnsureSuccessStatusCode();
        var tags = await DeserializeAsync<List<TagResponseDto>>(tagsResponse);
        Assert.True(tags.Count >= 2, "Seeded tags should be available.");

        var tagIds = new[] { tags[0].Id, tags[1].Id };
        var body = JsonSerializer.Serialize(
            new { title = "Tagged", code = "x", language = "csharp", tagIds },
            JsonOptions);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/snippets")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var snippet = await DeserializeAsync<SnippetWithTagsDto>(response);
        Assert.Equal(2, snippet.Tags.Count);
        Assert.Contains(snippet.Tags, t => t.Id == tagIds[0]);
        Assert.Contains(snippet.Tags, t => t.Id == tagIds[1]);
    }

    [Fact]
    public async Task PostSnippet_WithInvalidTagId_Returns400()
    {
        var token = await RegisterAndLoginAsync("badtag", "badtag@test.local", "Badtagpassword1!");
        var body = JsonSerializer.Serialize(
            new { title = "x", code = "y", language = "csharp", tagIds = new[] { 999_999 } },
            JsonOptions);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/snippets")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostSnippet_TitleTooLong_Returns400()
    {
        var token = await RegisterAndLoginAsync("longtitle", "longtitle@test.local", "Longtitlepassword1!");
        var longTitle = new string('a', SnippetLimits.MaxTitleLength + 1);
        var body = JsonSerializer.Serialize(
            new { title = longTitle, code = "x", language = "csharp" },
            JsonOptions);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/snippets")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostSnippet_CodeTooLong_Returns400()
    {
        var token = await RegisterAndLoginAsync("longcode", "longcode@test.local", "Longcodepassword1!");
        var longCode = new string('x', SnippetLimits.MaxCodeLength + 1);
        var body = JsonSerializer.Serialize(
            new { title = "ok", code = longCode, language = "csharp" },
            JsonOptions);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/snippets")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json"),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetSnippetsMe_ReturnsOnlyCurrentUserSnippets()
    {
        var userA = await RegisterAndLoginAsync("mineA", "mine-a@test.local", "MineApassword1!");
        var userB = await RegisterAndLoginAsync("mineB", "mine-b@test.local", "MineBpassword1!");

        await CreateSnippetAsync(userA, "From A", "a", "csharp");
        await CreateSnippetAsync(userB, "From B", "b", "csharp");

        var request = new HttpRequestMessage(HttpMethod.Get, "/api/snippets/me?page=1&pageSize=20");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userA);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var snippets = await DeserializeAsync<List<SnippetMineDto>>(response);
        Assert.All(snippets, s => Assert.Equal("mineA", s.User.Username));
        Assert.Contains(snippets, s => s.Title == "From A");
        Assert.DoesNotContain(snippets, s => s.Title == "From B");
    }

    [Fact]
    public async Task ChangePassword_ValidCurrent_Returns204_LoginAcceptsNewPassword()
    {
        const string email = "chgpw@test.local";
        var token = await RegisterAndLoginAsync("chgpw", email, "FirstPass1!");

        var changeBody = JsonSerializer.Serialize(
            new { currentPassword = "FirstPass1!", newPassword = "SecondPass2!" },
            JsonOptions);
        var changeReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/change-password")
        {
            Content = new StringContent(changeBody, Encoding.UTF8, "application/json"),
        };
        changeReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var changeRes = await _client.SendAsync(changeReq);
        Assert.Equal(HttpStatusCode.NoContent, changeRes.StatusCode);

        var oldLoginBody = JsonSerializer.Serialize(new { email, password = "FirstPass1!" }, JsonOptions);
        var oldLogin = await _client.PostAsync(
            "/api/auth/login",
            new StringContent(oldLoginBody, Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLoginBody = JsonSerializer.Serialize(new { email, password = "SecondPass2!" }, JsonOptions);
        var newLogin = await _client.PostAsync(
            "/api/auth/login",
            new StringContent(newLoginBody, Encoding.UTF8, "application/json"));
        newLogin.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task ChangePassword_WithoutToken_Returns401()
    {
        var body = JsonSerializer.Serialize(
            new { currentPassword = "Oldpass1!", newPassword = "NewpassWord2!" },
            JsonOptions);
        var res = await _client.PostAsync(
            "/api/auth/change-password",
            new StringContent(body, Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
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

    private sealed record AuthResponseDto(
        int UserId,
        string Username,
        string Email,
        string AccessToken,
        DateTime ExpiresAtUtc,
        IReadOnlyList<string>? Roles = null);

    private sealed record SnippetResponseDto(int Id);

    private sealed record TagResponseDto(int Id, string Name);

    private sealed record SnippetWithTagsDto(int Id, List<TagResponseDto> Tags);

    private sealed record SnippetMineDto(string Title, UserSummaryDto User);

    private sealed record UserSummaryDto(string Username);

    private sealed record FavoriteMeListDto(int SnippetId, FavoriteSnippetPartDto Snippet);

    private sealed record FavoriteSnippetPartDto(FavoriteAuthorDto Author);

    private sealed record FavoriteAuthorDto(string Username);
}
