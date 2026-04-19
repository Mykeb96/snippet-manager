using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Owner")]
public class UsersController : ApiControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<User> _userManager;

    public UsersController(AppDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public record UserResponse(int Id, string Username, string Email, bool IsAdmin, bool IsOwner);

    // GET: api/users
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (ValidateAndNormalizePagination(page, pageSize, out var skip, out var take) is ActionResult pagingError)
        {
            return pagingError;
        }

        var totalCount = await _context.Users.AsNoTracking().CountAsync(cancellationToken);
        WritePaginationHeaders(totalCount, page, pageSize);

        var adminRoleId = await _context.Roles.AsNoTracking()
            .Where(r => r.Name == "Admin")
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var ownerRoleId = await _context.Roles.AsNoTracking()
            .Where(r => r.Name == "Owner")
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var users = await _context.Users
            .AsNoTracking()
            .OrderBy(u => u.UserName)
            .Skip(skip)
            .Take(take)
            .Select(u => new { u.Id, Username = u.UserName ?? string.Empty, Email = u.Email ?? string.Empty })
            .ToListAsync(cancellationToken);

        HashSet<int> adminIds;
        HashSet<int> ownerIds;
        if (users.Count == 0)
        {
            adminIds = new HashSet<int>();
            ownerIds = new HashSet<int>();
        }
        else
        {
            var userIds = users.Select(u => u.Id).ToList();
            adminIds = adminRoleId == 0
                ? new HashSet<int>()
                : await _context.Set<IdentityUserRole<int>>()
                    .AsNoTracking()
                    .Where(ur => userIds.Contains(ur.UserId) && ur.RoleId == adminRoleId)
                    .Select(ur => ur.UserId)
                    .ToHashSetAsync(cancellationToken);
            ownerIds = ownerRoleId == 0
                ? new HashSet<int>()
                : await _context.Set<IdentityUserRole<int>>()
                    .AsNoTracking()
                    .Where(ur => userIds.Contains(ur.UserId) && ur.RoleId == ownerRoleId)
                    .Select(ur => ur.UserId)
                    .ToHashSetAsync(cancellationToken);
        }

        var responses = users
            .Select(u => new UserResponse(u.Id, u.Username, u.Email, adminIds.Contains(u.Id), ownerIds.Contains(u.Id)))
            .ToList();

        return responses;
    }

    // GET: api/users/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserResponse>> GetUser(int id, CancellationToken cancellationToken = default)
    {
        var adminRoleId = await _context.Roles.AsNoTracking()
            .Where(r => r.Name == "Admin")
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var ownerRoleId = await _context.Roles.AsNoTracking()
            .Where(r => r.Name == "Owner")
            .Select(r => r.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var row = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == id)
            .Select(u => new { u.Id, Username = u.UserName ?? string.Empty, Email = u.Email ?? string.Empty })
            .FirstOrDefaultAsync(cancellationToken);

        if (row is null)
        {
            return NotFound();
        }

        var isAdmin = adminRoleId != 0 &&
                      await _context.Set<IdentityUserRole<int>>().AsNoTracking()
                          .AnyAsync(ur => ur.UserId == row.Id && ur.RoleId == adminRoleId, cancellationToken);
        var isOwner = ownerRoleId != 0 &&
                      await _context.Set<IdentityUserRole<int>>().AsNoTracking()
                          .AnyAsync(ur => ur.UserId == row.Id && ur.RoleId == ownerRoleId, cancellationToken);

        return new UserResponse(row.Id, row.Username, row.Email, isAdmin, isOwner);
    }

    // POST: api/users/5/admin — grant Admin role (Owners only; idempotent if already admin)
    [HttpPost("{id:int}/admin")]
    [Authorize(Roles = "Owner")]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> PromoteToAdmin(int id, CancellationToken cancellationToken = default)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound();
        }

        if (await _userManager.IsInRoleAsync(user, "Admin"))
        {
            return NoContent();
        }

        var result = await _userManager.AddToRoleAsync(user, "Admin");
        if (!result.Succeeded)
        {
            return BadRequest(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        return NoContent();
    }

    // DELETE: api/users/5 — removes user, snippets (cascade), favorites, and Identity data
    [HttpDelete("{id:int}")]
    [EnableRateLimiting("WritePolicy")]
    public async Task<IActionResult> DeleteUser(int id, CancellationToken cancellationToken = default)
    {
        if (RequireCurrentUserId(out var currentUserId) is ActionResult authError)
        {
            return authError;
        }

        if (id == currentUserId)
        {
            return Conflict("You cannot delete your own account.");
        }

        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null)
        {
            return NotFound();
        }

        if (await _userManager.IsInRoleAsync(user, "Owner"))
        {
            if (!User.IsInRole("Owner"))
            {
                return Forbid();
            }

            var owners = await _userManager.GetUsersInRoleAsync("Owner");
            if (owners.Count <= 1)
            {
                return Conflict("Cannot delete the only owner.");
            }
        }
        else if (await _userManager.IsInRoleAsync(user, "Admin"))
        {
            var admins = await _userManager.GetUsersInRoleAsync("Admin");
            if (admins.Count <= 1)
            {
                return Conflict("Cannot delete the only administrator.");
            }
        }

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(string.Join(" ", result.Errors.Select(e => e.Description)));
        }

        return NoContent();
    }
}
