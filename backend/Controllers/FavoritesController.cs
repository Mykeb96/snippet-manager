using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Contracts;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FavoritesController : ApiControllerBase
{
    private readonly AppDbContext _context;

    public FavoritesController(AppDbContext context)
    {
        _context = context;
    }

    public record SnippetSummaryResponse(
        int Id,
        string Title,
        string Code,
        string Language,
        DateTime CreatedAt,
        UserSummaryResponse Author,
        IReadOnlyList<TagResponse> Tags);

    public record CreateFavoriteRequest(int SnippetId);

    public record FavoriteResponse(
        int UserId,
        int SnippetId,
        UserSummaryResponse User,
        SnippetSummaryResponse Snippet);

    // GET: api/favorites (all rows — development / admin tooling)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FavoriteResponse>>> GetFavorites([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        if (ValidateAndNormalizePagination(page, pageSize, out var skip, out var take) is ActionResult pagingError)
        {
            return pagingError;
        }

        var totalCount = await _context.Favorites.AsNoTracking().CountAsync(cancellationToken);
        WritePaginationHeaders(totalCount, page, pageSize);

        var list = await ProjectFavoriteResponse(
                _context.Favorites.AsNoTracking()
                    .OrderByDescending(f => f.Snippet.CreatedAt)
                    .Skip(skip)
                    .Take(take))
            .ToListAsync(cancellationToken);

        return list;
    }

    // GET: api/favorites/me — current user’s favorites (JWT)
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<FavoriteResponse>>> GetMyFavorites(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        return await GetFavoritesPageForUserAsync(currentUserId, page, pageSize, cancellationToken);
    }

    // GET: api/favorites/user/5
    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<IEnumerable<FavoriteResponse>>> GetFavoritesByUser(int userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        return await GetFavoritesPageForUserAsync(userId, page, pageSize, cancellationToken);
    }

    // GET: api/favorites/user/1/snippet/5
    [HttpGet("user/{userId:int}/snippet/{snippetId:int}")]
    public async Task<ActionResult<FavoriteResponse>> GetFavorite(int userId, int snippetId, CancellationToken cancellationToken = default)
    {
        var favorite = await ProjectFavoriteResponse(
                _context.Favorites.AsNoTracking().Where(f => f.UserId == userId && f.SnippetId == snippetId))
            .FirstOrDefaultAsync(cancellationToken);

        if (favorite is null)
        {
            return NotFound();
        }

        return favorite;
    }

    // POST: api/favorites
    [HttpPost]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<ActionResult<FavoriteResponse>> CreateFavorite(CreateFavoriteRequest request, CancellationToken cancellationToken = default)
    {
        if (request.SnippetId <= 0)
        {
            return BadRequest("SnippetId must be positive.");
        }

        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        var snippet = await _context.Snippets.FirstOrDefaultAsync(s => s.Id == request.SnippetId, cancellationToken);
        if (snippet is null)
        {
            return NotFound($"Snippet with id={request.SnippetId} was not found.");
        }

        var duplicateFavorite = await _context.Favorites
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.UserId == currentUserId && f.SnippetId == request.SnippetId, cancellationToken);
        if (duplicateFavorite is not null)
        {
            return Conflict("This snippet is already in the user's favorites.");
        }

        var favorite = new Favorite
        {
            UserId = currentUserId,
            SnippetId = request.SnippetId
        };

        _context.Favorites.Add(favorite);
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return Conflict("This snippet is already in the user's favorites.");
        }

        var response = await ProjectFavoriteResponse(
                _context.Favorites.AsNoTracking().Where(f => f.UserId == favorite.UserId && f.SnippetId == favorite.SnippetId))
            .FirstAsync(cancellationToken);

        return CreatedAtAction(
            nameof(GetFavorite),
            new { userId = currentUserId, snippetId = request.SnippetId },
            response);
    }

    // DELETE: api/favorites/me/snippet/5
    [HttpDelete("me/snippet/{snippetId:int}")]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> DeleteMyFavorite(int snippetId, CancellationToken cancellationToken = default)
    {
        if (snippetId <= 0)
        {
            return BadRequest("SnippetId must be positive.");
        }

        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        var favorite = await _context.Favorites.FirstOrDefaultAsync(
            f => f.UserId == currentUserId && f.SnippetId == snippetId,
            cancellationToken);

        if (favorite is null)
        {
            return NotFound();
        }

        _context.Favorites.Remove(favorite);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    // DELETE: api/favorites/user/1/snippet/5
    [HttpDelete("user/{userId:int}/snippet/{snippetId:int}")]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> DeleteFavorite(int userId, int snippetId, CancellationToken cancellationToken = default)
    {
        if (userId <= 0 || snippetId <= 0)
        {
            return BadRequest("UserId and SnippetId must be positive.");
        }

        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        if (userId != currentUserId)
        {
            return Forbid();
        }

        var favorite = await _context.Favorites.FirstOrDefaultAsync(
            f => f.UserId == userId && f.SnippetId == snippetId,
            cancellationToken);

        if (favorite is null)
        {
            return NotFound();
        }

        _context.Favorites.Remove(favorite);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task<ActionResult<IEnumerable<FavoriteResponse>>> GetFavoritesPageForUserAsync(
        int userId,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        if (ValidateAndNormalizePagination(page, pageSize, out var skip, out var take) is ActionResult pagingError)
        {
            return pagingError;
        }

        var totalCount = await _context.Favorites
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .CountAsync(cancellationToken);
        WritePaginationHeaders(totalCount, page, pageSize);

        var list = await ProjectFavoriteResponse(
                _context.Favorites.AsNoTracking()
                    .Where(f => f.UserId == userId)
                    .OrderByDescending(f => f.Snippet.CreatedAt)
                    .Skip(skip)
                    .Take(take))
            .ToListAsync(cancellationToken);

        return list;
    }

    private static IQueryable<FavoriteResponse> ProjectFavoriteResponse(IQueryable<Favorite> query) =>
        query.Select(f => new FavoriteResponse(
            f.UserId,
            f.SnippetId,
            new UserSummaryResponse(f.User.Id, f.User.UserName ?? string.Empty),
            new SnippetSummaryResponse(
                f.Snippet.Id,
                f.Snippet.Title,
                f.Snippet.Code,
                f.Snippet.Language,
                f.Snippet.CreatedAt,
                new UserSummaryResponse(f.Snippet.User.Id, f.Snippet.User.UserName ?? string.Empty),
                f.Snippet.SnippetTags
                    .OrderBy(st => st.Tag.Name)
                    .Select(st => new TagResponse(st.Tag.Id, st.Tag.Name))
                    .ToList())));
}
