using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProjectGraham.Api.Data;
using ProjectGraham.Api.Models;

namespace ProjectGraham.Api.Controllers;

[ApiController]
[Route("api/feed")]
[Route("api/discoveries")]
public class FeedController : ControllerBase
{
    private readonly AppDbContext _dbContext;

    public FeedController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("/api/groups/{groupId}/snapshot")]
    [HttpGet("/api/groups/current/snapshot")]
    public async Task<ActionResult<HubDatabaseSnapshotDto>> GetGroupSnapshot(
        [FromRoute] string? groupId = null,
        [FromQuery] string? queryGroupId = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedGroupId = ResolveGroupId(groupId ?? queryGroupId);

        var users = await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.GroupId == resolvedGroupId)
            .OrderBy(u => u.Id)
            .Select(u => u.ToDto())
            .ToListAsync(cancellationToken);

        var discoveries = await _dbContext.FeedPosts
            .AsNoTracking()
            .Where(p => p.GroupId == resolvedGroupId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        var monthlyGoals = await _dbContext.MonthlyGoalItems
            .AsNoTracking()
            .Where(g => g.GroupId == resolvedGroupId)
            .OrderBy(g => g.CreatedAt)
            .ToListAsync(cancellationToken);

        var monthBatches = await _dbContext.MonthlyGoalBatches
            .AsNoTracking()
            .Where(b => b.GroupId == resolvedGroupId)
            .OrderBy(b => b.MonthKey)
            .ThenBy(b => b.UserId)
            .ToListAsync(cancellationToken);

        var journalEntries = await _dbContext.JournalEntries
            .AsNoTracking()
            .Include(j => j.Comments)
            .Where(j => j.GroupId == resolvedGroupId)
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(cancellationToken);

        var workouts = await _dbContext.WorkoutSessions
            .AsNoTracking()
            .Include(w => w.Exercises)
            .Where(w => w.GroupId == resolvedGroupId)
            .OrderByDescending(w => w.WorkoutDate)
            .ThenByDescending(w => w.CreatedAt)
            .ToListAsync(cancellationToken);

        var snapshot = new HubDatabaseSnapshotDto(
            GroupId: resolvedGroupId,
            Users: users,
            Discoveries: discoveries.Select(d => d.ToDto()).ToList(),
            MonthlyGoals: monthlyGoals.Select(g => g.ToDto()).ToList(),
            MonthSettlements: monthBatches.Select(b => b.ToSettlementDto()).ToList(),
            JournalEntries: journalEntries.Select(j => j.ToDto()).ToList(),
            Workouts: workouts.Select(w => w.ToDto()).ToList()
        );

        return Ok(snapshot);
    }

    [HttpPost("/api/groups/{groupId}/reset-seed")]
    [HttpPost("/api/groups/current/reset-seed")]
    public async Task<ActionResult<HubDatabaseSnapshotDto>> ResetDemoDatabase(
        [FromRoute] string? groupId = null,
        CancellationToken cancellationToken = default)
    {
        await _dbContext.ResetToSeedDataAsync(cancellationToken);
        return await GetGroupSnapshot(groupId ?? DomainMapper.DefaultGroupId, null, cancellationToken);
    }

    [HttpGet]
    public async Task<ActionResult<List<DiscoveryItemDto>>> GetFeedPosts(
        [FromQuery] string? groupId = null,
        [FromQuery] string? category = null,
        [FromQuery] string? authorId = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedGroupId = ResolveGroupId(groupId);

        var query = _dbContext.FeedPosts
            .AsNoTracking()
            .Where(p => p.GroupId == resolvedGroupId);

        if (!string.IsNullOrWhiteSpace(category) && !string.Equals(category, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(authorId) && !string.Equals(authorId, "ALL", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(p => p.AuthorId == authorId);
        }

        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(posts.Select(p => p.ToDto()).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<DiscoveryItemDto>> CreateFeedPost(
        [FromBody] CreateDiscoveryRequestDto request,
        [FromQuery] string? groupId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Summary))
        {
            return BadRequest(new { message = "Tytuł oraz podsumowanie znaleziska są wymagane." });
        }

        var resolvedGroupId = ResolveGroupId(request.GroupId ?? groupId);
        var youtubeId = DomainMapper.ExtractYouTubeVideoId(request.Url);

        var resolvedThumbnail = !string.IsNullOrWhiteSpace(request.ImageUrl)
            ? request.ImageUrl.Trim()
            : null;

        if (!string.IsNullOrWhiteSpace(youtubeId) && string.IsNullOrWhiteSpace(resolvedThumbnail))
        {
            resolvedThumbnail = DomainMapper.GetYouTubeThumbnailUrl(youtubeId);
        }

        if (string.IsNullOrWhiteSpace(resolvedThumbnail))
        {
            resolvedThumbnail = request.Category switch
            {
                "Rozwój" => DomainMapper.HeroStudyImage,
                "Ciekawostki" => DomainMapper.ArticleVo2MaxImage,
                _ => DomainMapper.ArticleDotnetImage
            };
        }

        if (request.SetAsFeaturedHero == true)
        {
            var currentHeroes = await _dbContext.FeedPosts
                .Where(p => p.GroupId == resolvedGroupId && p.IsFeaturedHero)
                .ToListAsync(cancellationToken);

            foreach (var hero in currentHeroes)
            {
                hero.IsFeaturedHero = false;
            }
        }

        var newPost = new FeedPost
        {
            Id = DomainMapper.GenerateEntityId("disc"),
            GroupId = resolvedGroupId,
            AuthorId = request.AuthorId,
            Title = request.Title.Trim(),
            Summary = request.Summary.Trim(),
            Category = !string.IsNullOrWhiteSpace(youtubeId) ? "YouTube" : request.Category,
            Url = string.IsNullOrWhiteSpace(request.Url) ? null : request.Url.Trim(),
            YoutubeVideoId = youtubeId,
            ThumbnailUrl = resolvedThumbnail,
            IsFeaturedHero = request.SetAsFeaturedHero == true,
            ReadTimeMinutes = !string.IsNullOrWhiteSpace(youtubeId) ? 12 : 6,
            CreatedAt = DateTime.UtcNow
        };
        newPost.SetUpvotedUserIds(new[] { request.AuthorId });

        await _dbContext.FeedPosts.AddAsync(newPost, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetFeedPosts), new { id = newPost.Id }, newPost.ToDto());
    }

    [HttpPost("{id}/toggle-upvote")]
    public async Task<ActionResult<DiscoveryItemDto>> ToggleUpvote(
        [FromRoute] string id,
        [FromBody] ToggleDiscoveryUpvoteRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var post = await _dbContext.FeedPosts.FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
        if (post is null)
        {
            return NotFound(new { message = $"Nie znaleziono wpisu o identyfikatorze {id}." });
        }

        var upvoters = post.GetUpvotedUserIds();
        if (upvoters.Contains(request.UserId))
        {
            upvoters.Remove(request.UserId);
        }
        else
        {
            upvoters.Add(request.UserId);
        }

        post.SetUpvotedUserIds(upvoters);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(post.ToDto());
    }

    private static string ResolveGroupId(string? groupId)
    {
        if (string.IsNullOrWhiteSpace(groupId) || string.Equals(groupId, "current", StringComparison.OrdinalIgnoreCase))
        {
            return DomainMapper.DefaultGroupId;
        }

        return groupId.Trim();
    }
}