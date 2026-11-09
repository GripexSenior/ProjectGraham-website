using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectGraham.Api.Data;
using ProjectGraham.Api.Models;

namespace ProjectGraham.Api.Controllers;

[ApiController]
[Route("api/goals")]
public class GoalsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public GoalsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<List<MonthlyGoalDto>>> GetMonthlyGoals(
        [FromQuery] string? groupId = null,
        [FromQuery] string? monthKey = null,
        [FromQuery] string? userId = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedGroupId = ResolveGroupId(groupId);

        var query = _dbContext.MonthlyGoalItems
            .AsNoTracking()
            .Where(g => g.GroupId == resolvedGroupId);

        if (!string.IsNullOrWhiteSpace(monthKey))
        {
            query = query.Where(g => g.MonthKey == monthKey);
        }

        if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(userId, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(g => g.UserId == userId);
        }

        var goals = await query
            .OrderBy(g => g.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(goals.Select(g => g.ToDto()).ToList());
    }

    [HttpGet("settlements")]
    public async Task<ActionResult<List<MonthSettlementStatusDto>>> GetMonthSettlements(
        [FromQuery] string? groupId = null,
        [FromQuery] string? monthKey = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedGroupId = ResolveGroupId(groupId);

        var query = _dbContext.MonthlyGoalBatches
            .AsNoTracking()
            .Where(b => b.GroupId == resolvedGroupId);

        if (!string.IsNullOrWhiteSpace(monthKey))
        {
            query = query.Where(b => b.MonthKey == monthKey);
        }

        var batches = await query
            .OrderBy(b => b.MonthKey)
            .ThenBy(b => b.UserId)
            .ToListAsync(cancellationToken);

        return Ok(batches.Select(b => b.ToSettlementDto()).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<MonthlyGoalDto>> CreateMonthlyGoal(
        [FromBody] CreateMonthlyGoalRequestDto request,
        [FromQuery] string? groupId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.MonthKey))
        {
            return BadRequest(new { message = "Tytuł celu oraz klucz miesiąca (YYYY-MM) są wymagane." });
        }

        var resolvedGroupId = ResolveGroupId(request.GroupId ?? groupId);

        var batch = await _dbContext.MonthlyGoalBatches.FirstOrDefaultAsync(
            b => b.GroupId == resolvedGroupId && b.UserId == request.UserId && b.MonthKey == request.MonthKey,
            cancellationToken);

        if (batch is null)
        {
            batch = new MonthlyGoalBatch
            {
                Id = $"batch-{request.MonthKey}-{request.UserId}",
                GroupId = resolvedGroupId,
                UserId = request.UserId,
                MonthKey = request.MonthKey,
                IsSettled = false,
                SettledAt = null,
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.MonthlyGoalBatches.AddAsync(batch, cancellationToken);
        }

        var clampedProgress = Math.Clamp(request.InitialProgressPercentage ?? 0, 0, 100);

        var newGoal = new MonthlyGoalItem
        {
            Id = DomainMapper.GenerateEntityId("goal"),
            BatchId = batch.Id,
            GroupId = resolvedGroupId,
            UserId = request.UserId,
            MonthKey = request.MonthKey,
            Title = request.Title.Trim(),
            Domain = request.Domain,
            TargetMetricDescription = request.TargetMetricDescription.Trim(),
            ProgressPercentage = clampedProgress,
            AuditStatus = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        await _dbContext.MonthlyGoalItems.AddAsync(newGoal, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetMonthlyGoals), new { id = newGoal.Id }, newGoal.ToDto());
    }

    [HttpPatch("{id}/progress")]
    [HttpPatch("progress")]
    public async Task<ActionResult<MonthlyGoalDto>> UpdateGoalProgress(
        [FromRoute] string? id,
        [FromBody] UpdateGoalProgressRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var targetGoalId = !string.IsNullOrWhiteSpace(id) ? id : request.GoalId;
        var goal = await _dbContext.MonthlyGoalItems.FirstOrDefaultAsync(
            g => g.Id == targetGoalId,
            cancellationToken);

        if (goal is null)
        {
            return NotFound(new { message = $"Nie znaleziono celu miesięcznego o ID {targetGoalId}." });
        }

        goal.ProgressPercentage = Math.Clamp(request.ProgressPercentage, 0, 100);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(goal.ToDto());
    }

    [HttpPost("audit-settlement")]
    public async Task<ActionResult<SubmitMonthAuditResponseDto>> SubmitMonthAudit(
        [FromBody] SubmitMonthAuditRequestDto request,
        [FromQuery] string? groupId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.UserId) || string.IsNullOrWhiteSpace(request.MonthKey))
        {
            return BadRequest(new { message = "Identyfikator użytkownika oraz klucz rozliczanego miesiąca są wymagane." });
        }

        var resolvedGroupId = ResolveGroupId(request.GroupId ?? groupId);
        var nowUtc = DateTime.UtcNow;

        var userMonthGoals = await _dbContext.MonthlyGoalItems
            .Where(g => g.GroupId == resolvedGroupId && g.UserId == request.UserId && g.MonthKey == request.MonthKey)
            .ToListAsync(cancellationToken);

        foreach (var entry in request.Entries)
        {
            var goal = userMonthGoals.FirstOrDefault(g => g.Id == entry.GoalId);
            if (goal is not null)
            {
                goal.AuditStatus = entry.AuditStatus;
                goal.ProgressPercentage = Math.Clamp(entry.FinalPercentage, 0, 100);
                goal.AuditConclusion = entry.AuditConclusion.Trim();
                goal.AuditedAt = nowUtc;
            }
        }

        var batch = await _dbContext.MonthlyGoalBatches.FirstOrDefaultAsync(
            b => b.GroupId == resolvedGroupId && b.UserId == request.UserId && b.MonthKey == request.MonthKey,
            cancellationToken);

        if (batch is null)
        {
            batch = new MonthlyGoalBatch
            {
                Id = $"batch-{request.MonthKey}-{request.UserId}",
                GroupId = resolvedGroupId,
                UserId = request.UserId,
                MonthKey = request.MonthKey,
                IsSettled = true,
                SettledAt = nowUtc,
                CreatedAt = nowUtc
            };
            await _dbContext.MonthlyGoalBatches.AddAsync(batch, cancellationToken);
        }
        else
        {
            batch.IsSettled = true;
            batch.SettledAt = nowUtc;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = new SubmitMonthAuditResponseDto(
            UpdatedGoals: userMonthGoals.OrderBy(g => g.CreatedAt).Select(g => g.ToDto()).ToList(),
            Settlement: batch.ToSettlementDto()
        );

        return Ok(response);
    }

    private static string ResolveGroupId(string? groupId) =>
        string.IsNullOrWhiteSpace(groupId) ? DomainMapper.DefaultGroupId : groupId.Trim();
}