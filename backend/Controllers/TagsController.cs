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
public class TagsController : ApiControllerBase
{
    private readonly AppDbContext _context;

    public TagsController(AppDbContext context)
    {
        _context = context;
    }

    public record CreateTagRequest(string Name);
    // GET: api/tags
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TagResponse>>> GetTags([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        if (ValidateAndNormalizePagination(page, pageSize, out var skip, out var take) is ActionResult pagingError)
        {
            return pagingError;
        }

        var totalCount = await _context.Tags.AsNoTracking().CountAsync(cancellationToken);
        WritePaginationHeaders(totalCount, page, pageSize);

        var tags = await _context.Tags
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .Skip(skip)
            .Take(take)
            .Select(t => new TagResponse(t.Id, t.Name))
            .ToListAsync(cancellationToken);

        return tags;
    }

    // GET: api/tags/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<TagResponse>> GetTag(int id, CancellationToken cancellationToken = default)
    {
        var tag = await _context.Tags
            .AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new TagResponse(t.Id, t.Name))
            .FirstOrDefaultAsync(cancellationToken);

        if (tag is null)
        {
            return NotFound();
        }

        return tag;
    }

    // POST: api/tags
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("WritePolicy")]
    public async Task<ActionResult<TagResponse>> CreateTag(CreateTagRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Name is required.");
        }

        var normalizedName = request.Name.Trim().ToLowerInvariant();

        var duplicateTag = await _context.Tags.AsNoTracking().FirstOrDefaultAsync(t => t.Name == normalizedName, cancellationToken);
        if (duplicateTag is not null)
        {
            return Conflict("A tag with the same name already exists.");
        }

        var tag = new Tag { Name = normalizedName };

        _context.Tags.Add(tag);
        try
        {
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
        {
            return Conflict("A tag with the same name already exists.");
        }

        var response = new TagResponse(tag.Id, tag.Name);
        return CreatedAtAction(nameof(GetTag), new { id = tag.Id }, response);
    }

    // DELETE: api/tags/5
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> DeleteTag(int id, CancellationToken cancellationToken = default)
    {
        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (tag is null)
        {
            return NotFound();
        }

        // Tags are global/shared metadata managed by admins.
        // Deletion is blocked while a tag is still referenced by snippets.
        var inUse = await _context.SnippetTags.AnyAsync(st => st.TagId == id, cancellationToken);
        if (inUse)
        {
            return Conflict("Cannot delete a tag that is currently assigned to snippets.");
        }

        _context.Tags.Remove(tag);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
