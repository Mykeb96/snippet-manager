using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly UserManager<User> _userManager;

    public UsersController(AppDbContext context, UserManager<User> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public record CreateUserRequest(string Username, string Email, string Password);
    public record UserResponse(int Id, string Username, string Email);

    // GET: api/users
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetUsers()
    {
        var users = await _context.Users
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

    // POST: api/users
    [HttpPost]
    [EnableRateLimiting("RegisterPolicy")]
    public async Task<ActionResult<UserResponse>> CreateUser(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Username, Email, and Password are required.");
        }

        var normalizedEmail = request.Email.Trim();
        var normalizedUsername = request.Username.Trim();
        var duplicateUser = await _context.Users.FirstOrDefaultAsync(u =>
            u.Email == normalizedEmail || u.UserName == normalizedUsername);
        if (duplicateUser is not null)
        {
            return Conflict("A user with the same username or email already exists.");
        }

        var user = new User
        {
            UserName = normalizedUsername,
            Email = normalizedEmail
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors.Select(e => e.Description));
        }

        var response = new UserResponse(user.Id, user.UserName ?? string.Empty, user.Email ?? string.Empty);
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, response);
    }
}

