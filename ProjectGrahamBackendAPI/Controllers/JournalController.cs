using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectGraham.Api.Data;
using ProjectGraham.Api.Models;

namespace ProjectGraham.Api.Controllers;

[ApiController]
[Route("api/journal")]
public class JournalController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public JournalController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<List<JournalEntryDto>>> GetJournalEntries(
        [FromQuery] string? groupId = null,
        [FromQuery] string? userId = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedGroupId = ResolveGroupId(groupId);

        var query = _dbContext.JournalEntries
            .AsNoTracking()
            .Include(j => j.Comments)
            .Where(j => j.GroupId == resolvedGroupId);

        if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(userId, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(j => j.UserId == userId);
        }

        var entries = await query
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(entries.Select(e => e.ToDto()).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<JournalEntryDto>> CreateJournalEntry(
        [FromBody] CreateJournalEntryRequestDto request,
        [FromQuery] string? groupId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.SummaryAndLessons))
        {
            return BadRequest(new { message = "Podsumowanie dnia i wnioski są wymagane." });
        }

        var resolvedGroupId = ResolveGroupId(request.GroupId ?? groupId);

        var newEntry = new JournalEntry
        {
            Id = DomainMapper.GenerateEntityId("jrn"),
            GroupId = resolvedGroupId,
            UserId = request.UserId,
            EntryDate = string.IsNullOrWhiteSpace(request.EntryDate)
                ? DateTime.UtcNow.ToString("yyyy-MM-dd")
                : request.EntryDate.Trim(),
            DayRating = Math.Clamp(request.DayRating, 1, 10),
            CompletedTasksText = request.CompletedTasksText.Trim(),
            SummaryAndLessons = request.SummaryAndLessons.Trim(),
            ImprovementsText = request.ImprovementsText.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.JournalEntries.AddAsync(newEntry, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetJournalEntries), new { id = newEntry.Id }, newEntry.ToDto());
    }

    [HttpPost("{id}/comments")]
    [HttpPost("comments")]
    public async Task<ActionResult<JournalCommentDto>> AddJournalComment(
        [FromRoute] string? id,
        [FromBody] AddJournalCommentRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var targetEntryId = !string.IsNullOrWhiteSpace(id) ? id : request.JournalEntryId;

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequest(new { message = "Treść komentarza nie może być pusta." });
        }

        var entryExists = await _dbContext.JournalEntries.AnyAsync(
            e => e.Id == targetEntryId,
            cancellationToken);

        if (!entryExists)
        {
            return NotFound(new { message = $"Nie znaleziono wpisu dziennika o ID {targetEntryId}." });
        }

        var newComment = new JournalComment
        {
            Id = DomainMapper.GenerateEntityId("cmt"),
            JournalEntryId = targetEntryId,
            AuthorId = request.AuthorId,
            Content = request.Content.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.JournalComments.AddAsync(newComment, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(newComment.ToDto());
    }

    private static string ResolveGroupId(string? groupId) =>
        string.IsNullOrWhiteSpace(groupId) ? DomainMapper.DefaultGroupId : groupId.Trim();
}