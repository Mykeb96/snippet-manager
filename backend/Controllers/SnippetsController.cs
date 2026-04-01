using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SnippetsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SnippetsController(AppDbContext context)
    {
        _context = context;
    }

    public record CreateSnippetRequest(string Title, string Code, string Language, int UserId);
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
    public async Task<ActionResult<IEnumerable<SnippetResponse>>> GetSnippets()
    {
        // Project to a DTO so we don't accidentally serialize the full EF navigation graph
        // (and so we don't return sensitive fields like PasswordHash).
        return await _context.Snippets
            .Select(s => new SnippetResponse(
                s.Id,
                s.Title,
                s.Code,
                s.Language,
                s.CreatedAt,
                s.UserId,
                new UserSummaryResponse(s.user.Id, s.user.Username, s.user.Email)
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
                new UserSummaryResponse(s.user.Id, s.user.Username, s.user.Email)
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
    [EnableRateLimiting("WritePolicy")]
    public async Task<ActionResult<SnippetResponse>> CreateSnippet(CreateSnippetRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.Code) ||
            string.IsNullOrWhiteSpace(request.Language))
        {
            return BadRequest("Title, Code, and Language are required.");
        }

        var user = await _context.Users.FindAsync(request.UserId);
        if (user is null)
        {
            return NotFound($"User with id={request.UserId} was not found.");
        }

        var snippet = new Snippet
        {
            Title = request.Title.Trim(),
            Code = request.Code,
            Language = request.Language.Trim(),
            UserId = request.UserId
        };

        _context.Snippets.Add(snippet);
        await _context.SaveChangesAsync();

        // Re-load just enough data for the DTO response shape.
        var response = await _context.Snippets
            .Where(s => s.Id == snippet.Id)
            .Select(s => new SnippetResponse(
                s.Id,
                s.Title,
                s.Code,
                s.Language,
                s.CreatedAt,
                s.UserId,
                new UserSummaryResponse(s.user.Id, s.user.Username, s.user.Email)
            ))
            .FirstAsync();

        return CreatedAtAction(nameof(GetSnippet), new { id = snippet.Id }, response);
    }

    // DELETE: api/snippets/5
    [HttpDelete("{id}")]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> DeleteSnippet(int id)
    {
        var snippet = await _context.Snippets.FindAsync(id);

        if (snippet is null)
        {
            return NotFound();
        }

        _context.Snippets.Remove(snippet);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}