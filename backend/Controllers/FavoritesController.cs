using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using backend.Data;
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

    public record SnippetSummaryResponse(int Id, string Title, string Code, string Language);

    public record CreateFavoriteRequest(int SnippetId);

    public record FavoriteResponse(
        int UserId,
        int SnippetId,
        SnippetsController.UserSummaryResponse User,
        SnippetSummaryResponse Snippet);

    // GET: api/favorites
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FavoriteResponse>>> GetFavorites([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (ValidateAndNormalizePagination(page, pageSize, out var skip, out var take) is ActionResult pagingError)
        {
            return pagingError;
        }

        var list = await _context.Favorites
            .OrderByDescending(f => f.Snippet.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(f => new FavoriteResponse(
                f.UserId,
                f.SnippetId,
                new SnippetsController.UserSummaryResponse(f.User.Id, f.User.UserName ?? string.Empty),
                new SnippetSummaryResponse(f.Snippet.Id, f.Snippet.Title, f.Snippet.Code, f.Snippet.Language)))
            .ToListAsync();

        return list;
    }

    // GET: api/favorites/user/5
    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<IEnumerable<FavoriteResponse>>> GetFavoritesByUser(int userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (ValidateAndNormalizePagination(page, pageSize, out var skip, out var take) is ActionResult pagingError)
        {
            return pagingError;
        }

        var list = await _context.Favorites
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.Snippet.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(f => new FavoriteResponse(
                f.UserId,
                f.SnippetId,
                new SnippetsController.UserSummaryResponse(f.User.Id, f.User.UserName ?? string.Empty),
                new SnippetSummaryResponse(f.Snippet.Id, f.Snippet.Title, f.Snippet.Code, f.Snippet.Language)))
            .ToListAsync();

        return list;
    }

    // GET: api/favorites/user/1/snippet/5
    [HttpGet("user/{userId:int}/snippet/{snippetId:int}")]
    public async Task<ActionResult<FavoriteResponse>> GetFavorite(int userId, int snippetId)
    {
        var favorite = await _context.Favorites
            .Where(f => f.UserId == userId && f.SnippetId == snippetId)
            .Select(f => new FavoriteResponse(
                f.UserId,
                f.SnippetId,
                new SnippetsController.UserSummaryResponse(f.User.Id, f.User.UserName ?? string.Empty),
                new SnippetSummaryResponse(f.Snippet.Id, f.Snippet.Title, f.Snippet.Code, f.Snippet.Language)))
            .FirstOrDefaultAsync();

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
    public async Task<ActionResult<FavoriteResponse>> CreateFavorite(CreateFavoriteRequest request)
    {
        if (request.SnippetId <= 0)
        {
            return BadRequest("SnippetId must be positive.");
        }

        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        var snippet = await _context.Snippets.FindAsync(request.SnippetId);
        if (snippet is null)
        {
            return NotFound($"Snippet with id={request.SnippetId} was not found.");
        }

        var duplicateFavorite = await _context.Favorites.FindAsync(currentUserId, request.SnippetId);
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
        await _context.SaveChangesAsync();

        var response = await _context.Favorites
            .Where(f => f.UserId == favorite.UserId && f.SnippetId == favorite.SnippetId)
            .Select(f => new FavoriteResponse(
                f.UserId,
                f.SnippetId,
                new SnippetsController.UserSummaryResponse(f.User.Id, f.User.UserName ?? string.Empty),
                new SnippetSummaryResponse(f.Snippet.Id, f.Snippet.Title, f.Snippet.Code, f.Snippet.Language)))
            .FirstAsync();

        return CreatedAtAction(
            nameof(GetFavorite),
            new { userId = currentUserId, snippetId = request.SnippetId },
            response);
    }

    // DELETE: api/favorites/user/1/snippet/5
    [HttpDelete("user/{userId:int}/snippet/{snippetId:int}")]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> DeleteFavorite(int userId, int snippetId)
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

        // Composite key order matches AppDbContext: (UserId, SnippetId)
        var favorite = await _context.Favorites.FindAsync(userId, snippetId);

        if (favorite is null)
        {
            return NotFound();
        }

        _context.Favorites.Remove(favorite);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
