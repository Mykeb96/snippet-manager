using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    public record CreateUserRequest(string Username, string Email, string PasswordHash);
    public record UserResponse(int Id, string Username, string Email);

    // GET: api/users
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetUsers()
    {
        var users = await _context.Users
            .Select(u => new UserResponse(u.Id, u.Username, u.Email))
            .ToListAsync();

        return users;
    }

    // GET: api/users/5
    [HttpGet("{id}")]
    public async Task<ActionResult<UserResponse>> GetUser(int id)
    {
        var user = await _context.Users
            .Where(u => u.Id == id)
            .Select(u => new UserResponse(u.Id, u.Username, u.Email))
            .FirstOrDefaultAsync();

        if (user is null)
        {
            return NotFound();
        }

        return user;
    }

    // POST: api/users
    [HttpPost]
    public async Task<ActionResult<UserResponse>> CreateUser(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.PasswordHash))
        {
            return BadRequest("Username, Email, and PasswordHash are required.");
        }

        var normalizedEmail = request.Email.Trim();
        var normalizedUsername = request.Username.Trim();

        var duplicateUser = await _context.Users.FirstOrDefaultAsync(u =>
            u.Email == normalizedEmail || u.Username == normalizedUsername);

        if (duplicateUser is not null)
        {
            return Conflict("A user with the same username or email already exists.");
        }

        var user = new User
        {
            Username = normalizedUsername,
            Email = normalizedEmail,
            PasswordHash = request.PasswordHash
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var response = new UserResponse(user.Id, user.Username, user.Email);
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, response);
    }
}

