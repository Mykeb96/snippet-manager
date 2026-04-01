using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    private const int MaxPageSize = 100;

    protected int? GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var userId) ? userId : null;
    }

    protected ActionResult? RequireCurrentUserId(out int currentUserId)
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

    protected ActionResult? ValidateAndNormalizePagination(
        int page,
        int pageSize,
        out int skip,
        out int take)
    {
        if (page <= 0)
        {
            skip = 0;
            take = 0;
            return BadRequest("Page must be greater than 0.");
        }

        if (pageSize <= 0 || pageSize > MaxPageSize)
        {
            skip = 0;
            take = 0;
            return BadRequest($"PageSize must be between 1 and {MaxPageSize}.");
        }

        skip = (page - 1) * pageSize;
        take = pageSize;
        return null;
    }
}

