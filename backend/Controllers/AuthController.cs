using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using backend.Models;
using backend.Security;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<User> _userManager;
    private readonly JwtSettings _jwtSettings;

    public AuthController(UserManager<User> userManager, JwtSettings jwtSettings)
    {
        _userManager = userManager;
        _jwtSettings = jwtSettings;
    }

    public record RegisterRequest(string Username, string Email, string Password);
    public record LoginRequest(string Email, string Password);
    public record AuthResponse(int UserId, string Username, string Email, string AccessToken, DateTime ExpiresAtUtc);

    // POST: api/auth/register
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("RegisterPolicy")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Username, Email, and Password are required.");
        }

        var normalizedEmail = request.Email.Trim();
        var normalizedUsername = request.Username.Trim();

        var duplicate = await _userManager.FindByEmailAsync(normalizedEmail);
        if (duplicate is not null)
        {
            return Conflict("A user with that email already exists.");
        }

        var duplicateUsername = await _userManager.FindByNameAsync(normalizedUsername);
        if (duplicateUsername is not null)
        {
            return Conflict("A user with that username already exists.");
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

        var response = await BuildAuthResponseAsync(user);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    // POST: api/auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("WritePolicy")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("Email and Password are required.");
        }

        var email = request.Email.Trim();
        var user = await _userManager.FindByEmailAsync(email);
        if (user is null)
        {
            return Unauthorized("Invalid credentials.");
        }

        var validPassword = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!validPassword)
        {
            return Unauthorized("Invalid credentials.");
        }

        return Ok(await BuildAuthResponseAsync(user));
    }

    private async Task<AuthResponse> BuildAuthResponseAsync(User user)
    {
        var expires = DateTime.UtcNow.AddMinutes(30);
        var roles = await _userManager.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName ?? string.Empty),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.UserName ?? string.Empty)
        };
        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.Key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);

        return new AuthResponse(
            user.Id,
            user.UserName ?? string.Empty,
            user.Email ?? string.Empty,
            accessToken,
            expires);
    }
}

