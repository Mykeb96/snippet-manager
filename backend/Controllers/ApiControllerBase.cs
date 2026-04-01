using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected int? GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var userId) ? userId : null;
    }

    protected IActionResult? RequireCurrentUserId(out int currentUserId)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
        {
            currentUserId = 0;
            return Unauthorized();
        }

        currentUserId = userId.Value;
        return null;
    }
}

