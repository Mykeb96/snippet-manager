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
public class SnippetsController : ApiControllerBase
{
    private readonly AppDbContext _context;

    public SnippetsController(AppDbContext context)
    {
        _context = context;
    }

    public record CreateSnippetRequest(string Title, string Code, string Language, int[]? TagIds);
    public record SnippetResponse(
        int Id,
        string Title,
        string Code,
        string Language,
        DateTime CreatedAt,
        int UserId,
        UserSummaryResponse User,
        IReadOnlyList<TagResponse> Tags
    );

    // GET: api/snippets?userId= (optional) filter by author (public; do not use alone for “my snippets” in the app)
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SnippetResponse>>> GetSnippets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] int? userId = null,
        CancellationToken cancellationToken = default)
    {
        return await GetSnippetsPageAsync(page, pageSize, userId, cancellationToken);
    }

    // GET: api/snippets/me — snippets for the authenticated user (JWT). Preferred for Profile → My snippets.
    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<SnippetResponse>>> GetMySnippets(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        return await GetSnippetsPageAsync(page, pageSize, currentUserId, cancellationToken);
    }

    // GET: api/snippets/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<SnippetResponse>> GetSnippet(int id, CancellationToken cancellationToken = default)
    {
        var snippet = await _context.Snippets
            .AsNoTracking()
            .Where(s => s.Id == id)
            .Select(s => new SnippetResponse(
                s.Id,
                s.Title,
                s.Code,
                s.Language,
                s.CreatedAt,
                s.UserId,
                new UserSummaryResponse(s.User.Id, s.User.UserName ?? string.Empty),
                s.SnippetTags
                    .OrderBy(st => st.Tag.Name)
                    .Select(st => new TagResponse(st.Tag.Id, st.Tag.Name))
                    .ToList()
            ))
            .FirstOrDefaultAsync(cancellationToken);

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
    public async Task<ActionResult<SnippetResponse>> CreateSnippet(CreateSnippetRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title) ||
            string.IsNullOrWhiteSpace(request.Code) ||
            string.IsNullOrWhiteSpace(request.Language))
        {
            return BadRequest("Title, Code, and Language are required.");
        }

        var trimmedTitle = request.Title.Trim();
        if (trimmedTitle.Length > SnippetLimits.MaxTitleLength)
        {
            return BadRequest($"Title must be at most {SnippetLimits.MaxTitleLength} characters.");
        }

        if (request.Code.Length > SnippetLimits.MaxCodeLength)
        {
            return BadRequest($"Code must be at most {SnippetLimits.MaxCodeLength} characters.");
        }

        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        var snippet = new Snippet
        {
            Title = trimmedTitle,
            Code = request.Code,
            Language = request.Language.Trim(),
            UserId = currentUserId
        };

        _context.Snippets.Add(snippet);
        await _context.SaveChangesAsync(cancellationToken);

        if (request.TagIds is { Length: > 0 })
        {
            var distinctTagIds = request.TagIds.Where(tid => tid > 0).Distinct().ToArray();
            if (distinctTagIds.Length > 0)
            {
                var existingCount = await _context.Tags.AsNoTracking()
                    .CountAsync(t => distinctTagIds.Contains(t.Id), cancellationToken);
                if (existingCount != distinctTagIds.Length)
                {
                    return BadRequest("One or more tag ids are invalid.");
                }

                foreach (var tagId in distinctTagIds)
                {
                    _context.SnippetTags.Add(new SnippetTag { SnippetId = snippet.Id, TagId = tagId });
                }

                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        var response = await _context.Snippets
            .AsNoTracking()
            .Where(s => s.Id == snippet.Id)
            .Select(s => new SnippetResponse(
                s.Id,
                s.Title,
                s.Code,
                s.Language,
                s.CreatedAt,
                s.UserId,
                new UserSummaryResponse(s.User.Id, s.User.UserName ?? string.Empty),
                s.SnippetTags
                    .OrderBy(st => st.Tag.Name)
                    .Select(st => new TagResponse(st.Tag.Id, st.Tag.Name))
                    .ToList()
            ))
            .FirstAsync(cancellationToken);

        return CreatedAtAction(nameof(GetSnippet), new { id = snippet.Id }, response);
    }

    // DELETE: api/snippets/5
    [HttpDelete("{id:int}")]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> DeleteSnippet(int id, CancellationToken cancellationToken = default)
    {
        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        var snippet = await _context.Snippets.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

        if (snippet is null)
        {
            return NotFound();
        }

        if (snippet.UserId != currentUserId)
        {
            return Forbid();
        }

        _context.Snippets.Remove(snippet);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task<ActionResult<IEnumerable<SnippetResponse>>> GetSnippetsPageAsync(
        int page,
        int pageSize,
        int? filterByUserId,
        CancellationToken cancellationToken)
    {
        if (ValidateAndNormalizePagination(page, pageSize, out var skip, out var take) is ActionResult pagingError)
        {
            return pagingError;
        }

        var query = _context.Snippets.AsNoTracking();
        if (filterByUserId is > 0)
        {
            query = query.Where(s => s.UserId == filterByUserId.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        WritePaginationHeaders(totalCount, page, pageSize);

        return await query
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
                new UserSummaryResponse(s.User.Id, s.User.UserName ?? string.Empty),
                s.SnippetTags
                    .OrderBy(st => st.Tag.Name)
                    .Select(st => new TagResponse(st.Tag.Id, st.Tag.Name))
                    .ToList()
            ))
            .ToListAsync(cancellationToken);
    }
}