using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FavoritesController : ControllerBase
{
    private readonly AppDbContext _context;

    public FavoritesController(AppDbContext context)
    {
        _context = context;
    }

    public record SnippetSummaryResponse(int Id, string Title, string Code, string Language);

    public record CreateFavoriteRequest(int UserId, int SnippetId);

    public record FavoriteResponse(
        int UserId,
        int SnippetId,
        SnippetsController.UserSummaryResponse User,
        SnippetSummaryResponse Snippet);

    // GET: api/favorites
    [HttpGet]
    public async Task<ActionResult<IEnumerable<FavoriteResponse>>> GetFavorites()
    {
        var list = await _context.Favorites
            .Select(f => new FavoriteResponse(
                f.UserId,
                f.SnippetId,
                new SnippetsController.UserSummaryResponse(f.User.Id, f.User.UserName ?? string.Empty, f.User.Email ?? string.Empty),
                new SnippetSummaryResponse(f.Snippet.Id, f.Snippet.Title, f.Snippet.Code, f.Snippet.Language)))
            .ToListAsync();

        return list;
    }

    // GET: api/favorites/user/5
    [HttpGet("user/{userId:int}")]
    public async Task<ActionResult<IEnumerable<FavoriteResponse>>> GetFavoritesByUser(int userId)
    {
        var list = await _context.Favorites
            .Where(f => f.UserId == userId)
            .Select(f => new FavoriteResponse(
                f.UserId,
                f.SnippetId,
                new SnippetsController.UserSummaryResponse(f.User.Id, f.User.UserName ?? string.Empty, f.User.Email ?? string.Empty),
                new SnippetSummaryResponse(f.Snippet.Id, f.Snippet.Title, f.Snippet.Code, f.Snippet.Language)))
            .ToListAsync();

        return list;
    }

    // POST: api/favorites
    [HttpPost]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<ActionResult<FavoriteResponse>> CreateFavorite(CreateFavoriteRequest request)
    {
        if (request.UserId <= 0 || request.SnippetId <= 0)
        {
            return BadRequest("UserId and SnippetId must be positive.");
        }

        var user = await _context.Users.FindAsync(request.UserId);
        if (user is null)
        {
            return NotFound($"User with id={request.UserId} was not found.");
        }

        var snippet = await _context.Snippets.FindAsync(request.SnippetId);
        if (snippet is null)
        {
            return NotFound($"Snippet with id={request.SnippetId} was not found.");
        }

        var duplicateFavorite = await _context.Favorites.FindAsync(request.UserId, request.SnippetId);
        if (duplicateFavorite is not null)
        {
            return Conflict("This snippet is already in the user's favorites.");
        }

        var favorite = new Favorite
        {
            UserId = request.UserId,
            SnippetId = request.SnippetId
        };

        _context.Favorites.Add(favorite);
        await _context.SaveChangesAsync();

        var response = await _context.Favorites
            .Where(f => f.UserId == favorite.UserId && f.SnippetId == favorite.SnippetId)
            .Select(f => new FavoriteResponse(
                f.UserId,
                f.SnippetId,
                new SnippetsController.UserSummaryResponse(f.User.Id, f.User.UserName ?? string.Empty, f.User.Email ?? string.Empty),
                new SnippetSummaryResponse(f.Snippet.Id, f.Snippet.Title, f.Snippet.Code, f.Snippet.Language)))
            .FirstAsync();

        return CreatedAtAction(nameof(GetFavoritesByUser), new { userId = request.UserId }, response);
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
