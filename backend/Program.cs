using backend.Data;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Text;
using System.Security.Claims;
using backend.Models;
using backend.Security;

var builder = WebApplication.CreateBuilder(args);

var jwtSettings = BuildJwtSettings(builder.Configuration, builder.Environment);
var connectionString = BuildConnectionString(builder.Configuration, builder.Environment);
var corsAllowedOrigins = BuildCorsAllowedOrigins(builder.Configuration, builder.Environment);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter JWT token. Example: Bearer {your token}"
    });

});

builder.Services
    .AddIdentityCore<User>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireDigit = true;
        options.Password.RequireUppercase = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireNonAlphanumeric = false;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole<int>>()
    .AddEntityFrameworkStores<AppDbContext>()
    // Required for GeneratePasswordResetTokenAsync / email confirmation tokens if you use them.
    .AddDefaultTokenProviders();

builder.Services.AddSingleton(jwtSettings);
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateIssuerSigningKey = true,
        ValidateLifetime = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = signingKey,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(corsAllowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .WithExposedHeaders("X-Total-Count", "X-Page", "X-Page-Size");
        });
});

// Integration tests use environment "Testing" and skip rate limiting so limits do not flake tests.
if (!builder.Environment.IsEnvironment("Testing"))
{
    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

        options.OnRejected = async (context, cancellationToken) =>
        {
            if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            {
                context.HttpContext.Response.Headers.RetryAfter =
                    ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
            }

            await context.HttpContext.Response.WriteAsync(
                "Too many requests. Please try again later.",
                cancellationToken);
        };

        options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: GetClientKey(httpContext),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 100,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));

        options.AddPolicy("WritePolicy", httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: GetClientKey(httpContext),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 20,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));

        options.AddPolicy("RegisterPolicy", httpContext =>
            RateLimitPartition.GetFixedWindowLimiter(
                partitionKey: GetClientKey(httpContext),
                factory: _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = 5,
                    Window = TimeSpan.FromMinutes(1),
                    QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));
    });
}

static string GetClientKey(HttpContext context)
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!string.IsNullOrWhiteSpace(userId))
    {
        return $"user:{userId}";
    }

    return $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
}

static JwtSettings BuildJwtSettings(IConfiguration configuration, IWebHostEnvironment environment)
{
    var issuer = configuration["Jwt:Issuer"] ?? "snippet-manager-api";
    var audience = configuration["Jwt:Audience"] ?? "snippet-manager-client";
    var key = configuration["Jwt:Key"];

    if (string.IsNullOrWhiteSpace(key))
    {
        if (environment.IsDevelopment())
        {
            throw new InvalidOperationException(
                "Jwt:Key is missing. Set it via environment variable (Jwt__Key) or user secrets: " +
                "dotnet user-secrets set \"Jwt:Key\" \"<at-least-32-char-secret>\".");
        }

        throw new InvalidOperationException("Jwt:Key must be configured for all non-development environments.");
    }

    if (key.Length < 32)
    {
        throw new InvalidOperationException("Jwt:Key is too short. Use at least 32 characters.");
    }

    return new JwtSettings
    {
        Issuer = issuer,
        Audience = audience,
        Key = key
    };
}

static string BuildConnectionString(IConfiguration configuration, IWebHostEnvironment _)
{
    var configuredConnection = configuration.GetConnectionString("DefaultConnection");
    if (string.IsNullOrWhiteSpace(configuredConnection))
    {
        throw new InvalidOperationException("ConnectionStrings:DefaultConnection must be configured for all environments.");
    }

    return configuredConnection;
}

static string[] BuildCorsAllowedOrigins(IConfiguration configuration, IWebHostEnvironment _)
{
    var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
    if (origins is { Length: > 0 })
    {
        return origins;
    }

    throw new InvalidOperationException("Cors:AllowedOrigins must be configured for all environments.");
}

var app = builder.Build();

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    await SeedDevelopmentDataAsync(app);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
if (!app.Environment.IsEnvironment("Testing"))
{
    app.UseRateLimiter();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static async Task SeedDevelopmentDataAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    await SeedTagsAsync(db);

    var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<int>>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

    const string adminRole = "Admin";
    const string ownerRole = "Owner";
    if (!await roleManager.RoleExistsAsync(adminRole))
    {
        await roleManager.CreateAsync(new IdentityRole<int>(adminRole));
    }

    if (!await roleManager.RoleExistsAsync(ownerRole))
    {
        await roleManager.CreateAsync(new IdentityRole<int>(ownerRole));
    }

    var adminEmail = "admin@snippet.local";
    var adminUsername = "admin";
    var adminPassword = "MyAdmin1";

    var adminUser = await userManager.FindByEmailAsync(adminEmail);
    if (adminUser is null)
    {
        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            Console.WriteLine("WARNING: AdminSeed:Password is not configured. Skipping development admin user creation.");
            return;
        }

        adminUser = new User
        {
            UserName = adminUsername,
            Email = adminEmail,
            EmailConfirmed = true
        };

        var createResult = await userManager.CreateAsync(adminUser, adminPassword);
        if (!createResult.Succeeded)
        {
            var errors = string.Join("; ", createResult.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to seed development admin user: {errors}");
        }
    }
    else if (!string.IsNullOrWhiteSpace(adminPassword))
    {
        // User already exists: CreateAsync was skipped, so appsettings password was never applied.
        // RemovePasswordAsync + AddPasswordAsync can fail on some stores or leave the account with
        // no password if remove succeeds but add does not. Hash + UpdateAsync always persists a
        // password the PasswordHasher can verify (same path CheckPasswordAsync uses).
        foreach (var validator in userManager.PasswordValidators)
        {
            var vr = await validator.ValidateAsync(userManager, adminUser, adminPassword);
            if (!vr.Succeeded)
            {
                throw new InvalidOperationException(
                    $"AdminSeed:Password does not meet policy: {string.Join("; ", vr.Errors.Select(e => e.Description))}");
            }
        }

        adminUser.PasswordHash = userManager.PasswordHasher.HashPassword(adminUser, adminPassword);
        var updateResult = await userManager.UpdateAsync(adminUser);
        if (!updateResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"AdminSeed: could not save password hash: {string.Join("; ", updateResult.Errors.Select(e => e.Description))}");
        }

        var stampResult = await userManager.UpdateSecurityStampAsync(adminUser);
        if (!stampResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"AdminSeed: could not refresh security stamp: {string.Join("; ", stampResult.Errors.Select(e => e.Description))}");
        }
    }

    if (!await userManager.IsInRoleAsync(adminUser, adminRole))
    {
        await userManager.AddToRoleAsync(adminUser, adminRole);
    }

    if (!await userManager.IsInRoleAsync(adminUser, ownerRole))
    {
        await userManager.AddToRoleAsync(adminUser, ownerRole);
    }
}

/// <summary>
/// Inserts a small set of global tags (lowercase names, same convention as <see cref="backend.Controllers.TagsController"/>).
/// Topics/frameworks — not programming languages; use <see cref="Snippet.Language"/> for syntax.
/// Safe to run repeatedly: only missing names are added.
/// </summary>
static async Task SeedTagsAsync(AppDbContext db)
{
    // Matches frontend mock tag list for offline demo (ids 1..N on a fresh database).
    string[] tagNames =
    [
        "react",
        "nextjs",
        "aspnet",
        "vite",
        "nodejs",
        "docker",
        "testing",
        "api",
        "patterns",
        "security"
    ];

    foreach (var name in tagNames)
    {
        var exists = await db.Tags.AsNoTracking().AnyAsync(t => t.Name == name);
        if (!exists)
        {
            db.Tags.Add(new Tag { Name = name });
        }
    }

    await db.SaveChangesAsync();
}