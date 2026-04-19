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
    public record UpdateTagRequest(string Name);
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
    [Authorize(Roles = "Admin,Owner")]
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

    // PUT: api/tags/5
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,Owner")]
    [EnableRateLimiting("WritePolicy")]
    public async Task<ActionResult<TagResponse>> UpdateTag(int id, UpdateTagRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Name is required.");
        }

        var normalizedName = request.Name.Trim().ToLowerInvariant();

        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        if (tag is null)
        {
            return NotFound();
        }

        if (tag.Name != normalizedName)
        {
            var duplicateTag = await _context.Tags.AsNoTracking().FirstOrDefaultAsync(t => t.Name == normalizedName && t.Id != id, cancellationToken);
            if (duplicateTag is not null)
            {
                return Conflict("A tag with the same name already exists.");
            }

            tag.Name = normalizedName;
            try
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                return Conflict("A tag with the same name already exists.");
            }
        }

        return new TagResponse(tag.Id, tag.Name);
    }

    // DELETE: api/tags/5
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,Owner")]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> DeleteTag(int id, CancellationToken cancellationToken = default)
    {
        var tag = await _context.Tags.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (tag is null)
        {
            return NotFound();
        }

        // Remove join rows first so snippets no longer reference this tag, then delete the tag.
        var links = await _context.SnippetTags.Where(st => st.TagId == id).ToListAsync(cancellationToken);
        if (links.Count > 0)
        {
            _context.SnippetTags.RemoveRange(links);
        }

        _context.Tags.Remove(tag);
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
