using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using backend.Data;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ApiControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }
    public record UserResponse(int Id, string Username, string Email);

    // GET: api/users
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (ValidateAndNormalizePagination(page, pageSize, out var skip, out var take) is ActionResult pagingError)
        {
            return pagingError;
        }

        var users = await _context.Users
            .OrderBy(u => u.UserName)
            .Skip(skip)
            .Take(take)
            .Select(u => new UserResponse(u.Id, u.UserName ?? string.Empty, u.Email ?? string.Empty))
            .ToListAsync();

        return users;
    }

    // GET: api/users/5
    [HttpGet("{id}")]
    public async Task<ActionResult<UserResponse>> GetUser(int id)
    {
        var user = await _context.Users
            .Where(u => u.Id == id)
            .Select(u => new UserResponse(u.Id, u.UserName ?? string.Empty, u.Email ?? string.Empty))
            .FirstOrDefaultAsync();

        if (user is null)
        {
            return NotFound();
        }

        return user;
    }
}

