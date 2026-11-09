using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectGraham.Api.Data;
using ProjectGraham.Api.Models;

namespace ProjectGraham.Api.Controllers;

[ApiController]
[Route("api/workouts")]
public class WorkoutsController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public WorkoutsController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public async Task<ActionResult<List<WorkoutSessionDto>>> GetWorkouts(
        [FromQuery] string? groupId = null,
        [FromQuery] string? userId = null,
        [FromQuery] string? workoutType = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedGroupId = ResolveGroupId(groupId);

        var query = _dbContext.WorkoutSessions
            .AsNoTracking()
            .Include(w => w.Exercises)
            .Where(w => w.GroupId == resolvedGroupId);

        if (!string.IsNullOrWhiteSpace(userId) && !string.Equals(userId, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(w => w.UserId == userId);
        }

        if (!string.IsNullOrWhiteSpace(workoutType) && !string.Equals(workoutType, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(w => w.WorkoutType == workoutType);
        }

        var sessions = await query
            .OrderByDescending(w => w.WorkoutDate)
            .ThenByDescending(w => w.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(sessions.Select(w => w.ToDto()).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<WorkoutSessionDto>> CreateWorkoutSession(
        [FromBody] CreateWorkoutSessionRequestDto request,
        [FromQuery] string? groupId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Tytuł treningu jest wymagany." });
        }

        var resolvedGroupId = ResolveGroupId(request.GroupId ?? groupId);
        var normalizedType = request.WorkoutType.Trim().ToUpperInvariant();

        var session = new WorkoutSession
        {
            Id = DomainMapper.GenerateEntityId("wrk"),
            GroupId = resolvedGroupId,
            UserId = request.UserId,
            WorkoutDate = string.IsNullOrWhiteSpace(request.WorkoutDate)
                ? DateTime.UtcNow.ToString("yyyy-MM-dd")
                : request.WorkoutDate.Trim(),
            Title = request.Title.Trim(),
            WorkoutType = normalizedType,
            IsPlannedOnly = request.IsPlannedOnly == true,
            CreatedAt = DateTime.UtcNow
        };

        if (normalizedType == "GYM" && request.GymExercises is not null)
        {
            for (var index = 0; index < request.GymExercises.Count; index++)
            {
                var ex = request.GymExercises[index];
                session.Exercises.Add(new WorkoutExercise
                {
                    Id = DomainMapper.GenerateEntityId($"ex-{index}"),
                    WorkoutSessionId = session.Id,
                    ExerciseName = ex.ExerciseName.Trim(),
                    Sets = Math.Max(1, ex.Sets),
                    Reps = Math.Max(1, ex.Reps),
                    WeightKg = Math.Max(0, ex.WeightKg),
                    OrderIndex = index
                });
            }
        }
        else if (normalizedType == "CARDIO" && request.CardioMetrics is not null)
        {
            session.CardioDistanceKm = Math.Max(0, request.CardioMetrics.DistanceKm);
            session.CardioDurationMinutes = Math.Max(0, request.CardioMetrics.DurationMinutes);
            session.CardioAveragePaceMinPerKm = request.CardioMetrics.AveragePaceMinPerKm;
            session.CardioAverageHeartRateBpm = request.CardioMetrics.AverageHeartRateBpm;
        }
        else if (normalizedType == "OTHER" && request.OtherMetrics is not null)
        {
            session.OtherActivityName = request.OtherMetrics.ActivityName.Trim();
            session.OtherDurationMinutes = Math.Max(0, request.OtherMetrics.DurationMinutes);
            session.OtherIntensityRpe = Math.Clamp(request.OtherMetrics.IntensityRpe, 1, 10);
            session.OtherDetailedNotes = request.OtherMetrics.DetailedNotes.Trim();
        }

        await _dbContext.WorkoutSessions.AddAsync(session, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetWorkouts), new { id = session.Id }, session.ToDto());
    }

    [HttpPatch("{id}/complete-planned")]
    public async Task<ActionResult<WorkoutSessionDto>> MarkPlannedWorkoutCompleted(
        [FromRoute] string id,
        CancellationToken cancellationToken = default)
    {
        var workout = await _dbContext.WorkoutSessions
            .Include(w => w.Exercises)
            .FirstOrDefaultAsync(w => w.Id == id, cancellationToken);

        if (workout is null)
        {
            return NotFound(new { message = $"Nie znaleziono sesji treningowej o ID {id}." });
        }

        workout.IsPlannedOnly = false;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(workout.ToDto());
    }

    private static string ResolveGroupId(string? groupId) =>
        string.IsNullOrWhiteSpace(groupId) ? DomainMapper.DefaultGroupId : groupId.Trim();
}