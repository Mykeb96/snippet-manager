using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/snippets/{snippetId:int}/tags")]
public class SnippetTagsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SnippetTagsController(AppDbContext context)
    {
        _context = context;
    }

    public record AddSnippetTagRequest(int TagId);

    public record SnippetTagResponse(int SnippetId, int TagId, TagsController.TagResponse Tag);

    // GET: api/snippets/5/tags
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TagsController.TagResponse>>> GetTagsForSnippet(int snippetId)
    {
        var snippet = await _context.Snippets.FindAsync(snippetId);
        if (snippet is null)
        {
            return NotFound($"Snippet with id={snippetId} was not found.");
        }

        var tags = await _context.SnippetTags
            .Where(st => st.SnippetId == snippetId)
            .OrderBy(st => st.Tag.Name)
            .Select(st => new TagsController.TagResponse(st.Tag.Id, st.Tag.Name))
            .ToListAsync();

        return tags;
    }

    // POST: api/snippets/5/tags
    [HttpPost]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<ActionResult<SnippetTagResponse>> AddTagToSnippet(int snippetId, AddSnippetTagRequest request)
    {
        if (request.TagId <= 0)
        {
            return BadRequest("TagId must be positive.");
        }

        var snippet = await _context.Snippets.FindAsync(snippetId);
        if (snippet is null)
        {
            return NotFound($"Snippet with id={snippetId} was not found.");
        }

        var tag = await _context.Tags.FindAsync(request.TagId);
        if (tag is null)
        {
            return NotFound($"Tag with id={request.TagId} was not found.");
        }

        var duplicateLink = await _context.SnippetTags.FindAsync(snippetId, request.TagId);
        if (duplicateLink is not null)
        {
            return Conflict("This tag is already assigned to the snippet.");
        }

        var link = new SnippetTag
        {
            SnippetId = snippetId,
            TagId = request.TagId
        };

        _context.SnippetTags.Add(link);
        await _context.SaveChangesAsync();

        var response = await _context.SnippetTags
            .Where(st => st.SnippetId == snippetId && st.TagId == request.TagId)
            .Select(st => new SnippetTagResponse(
                st.SnippetId,
                st.TagId,
                new TagsController.TagResponse(st.Tag.Id, st.Tag.Name)))
            .FirstAsync();

        return CreatedAtAction(nameof(GetTagsForSnippet), new { snippetId }, response);
    }

    // DELETE: api/snippets/5/tags/3
    [HttpDelete("{tagId:int}")]
    [Authorize]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> RemoveTagFromSnippet(int snippetId, int tagId)
    {
        if (tagId <= 0)
        {
            return BadRequest("TagId must be positive.");
        }

        var link = await _context.SnippetTags.FindAsync(snippetId, tagId);

        if (link is null)
        {
            return NotFound();
        }

        _context.SnippetTags.Remove(link);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
