using Microsoft.AspNetCore.Mvc;
using backend.Data;
using backend.Models;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SnippetsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SnippetsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult GetAll()
    {
        var snippets = _context.Snippets.ToList();
        return Ok(snippets);
    }

    [HttpPost]
    public IActionResult Create(Snippet snippet)
    {
        _context.Snippets.Add(snippet);
        _context.SaveChanges();

        return Ok(snippet);
    }
}