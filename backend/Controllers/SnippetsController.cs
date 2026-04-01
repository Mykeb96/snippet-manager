using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SnippetsController : ApiControllerBase
{
    private readonly AppDbContext _context;

    public SnippetsController(AppDbContext context)
    {
        _context = context;
    }

    public record CreateSnippetRequest(string Title, string Code, string Language);
    public record UserSummaryResponse(int Id, string Username, string Email);
    public record SnippetResponse(
        int Id,
        string Title,
        string Code,
        string Language,
        DateTime CreatedAt,
        int UserId,
        UserSummaryResponse User
    );

    // GET: api/snippets
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SnippetResponse>>> GetSnippets([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (ValidateAndNormalizePagination(page, pageSize, out var skip, out var take) is ActionResult pagingError)
        {
            return pagingError;
        }

        return await _context.Snippets
            .OrderByDescending(s => s.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(s => new SnippetResponse(
                s.Id,
                s.Title,
                s.Code,
                s.Language,
                s.CreatedAt,
                s.UserId,
                new UserSummaryResponse(s.User.Id, s.User.UserName ?? string.Empty, s.User.Email ?? string.Empty)
            ))
            .ToListAsync();
    }

    // GET: api/snippets/5
    [HttpGet("{id}")]
    public async Task<ActionResult<SnippetResponse>> GetSnippet(int id)
    {
        var snippet = await _context.Snippets
            .Where(s => s.Id == id)
            .Select(s => new SnippetResponse(
                s.Id,
                s.Title,
                s.Code,
                s.Language,
                s.CreatedAt,
                s.UserId,
                new UserSummaryResponse(s.User.Id, s.User.UserName ?? string.Empty, s.User.Email ?? string.Empty)
            ))
            .FirstOrDefaultAsync();

        if (snippet is null)
        {
            return NotFound();
        }

        return snippet;
    }

    // POST: api/snippets
    [HttpPost]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<ActionResult<SnippetResponse>> CreateSnippet(CreateSnippetRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.Code) ||
            string.IsNullOrWhiteSpace(request.Language))
        {
            return BadRequest("Title, Code, and Language are required.");
        }

        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        var snippet = new Snippet
        {
            Title = request.Title.Trim(),
            Code = request.Code,
            Language = request.Language.Trim(),
            UserId = currentUserId
        };

        _context.Snippets.Add(snippet);
        await _context.SaveChangesAsync();

        var response = await _context.Snippets
            .Where(s => s.Id == snippet.Id)
            .Select(s => new SnippetResponse(
                s.Id,
                s.Title,
                s.Code,
                s.Language,
                s.CreatedAt,
                s.UserId,
                new UserSummaryResponse(s.User.Id, s.User.UserName ?? string.Empty, s.User.Email ?? string.Empty)
            ))
            .FirstAsync();

        return CreatedAtAction(nameof(GetSnippet), new { id = snippet.Id }, response);
    }

    // DELETE: api/snippets/5
    [HttpDelete("{id}")]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> DeleteSnippet(int id)
    {
        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        var snippet = await _context.Snippets.FindAsync(id);

        if (snippet is null)
        {
            return NotFound();
        }

        if (snippet.UserId != currentUserId)
        {
            return Forbid();
        }

        _context.Snippets.Remove(snippet);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}