using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.RegularExpressions;

namespace ProjectGraham.Api.Models;

// ============================================================================
// 1. ENCJE BAZODANOWE (ENTITY FRAMEWORK CORE)
// ============================================================================

public class Group
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Relacje nawigacyjne
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<FeedPost> FeedPosts { get; set; } = new List<FeedPost>();
    public ICollection<MonthlyGoalBatch> MonthlyGoalBatches { get; set; } = new List<MonthlyGoalBatch>();
    public ICollection<MonthlyGoalItem> MonthlyGoalItems { get; set; } = new List<MonthlyGoalItem>();
    public ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();
    public ICollection<WorkoutSession> WorkoutSessions { get; set; } = new List<WorkoutSession>();
}

public class User
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string GroupId { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Handle { get; set; } = string.Empty;

    [Required]
    [MaxLength(160)]
    public string RoleTitle { get; set; } = string.Empty;

    [Required]
    [MaxLength(8)]
    public string AvatarInitials { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string AccentColor { get; set; } = "indigo"; // "indigo" | "emerald" | "amber"

    // Relacje nawigacyjne
    [ForeignKey(nameof(GroupId))]
    public Group? Group { get; set; }

    public ICollection<FeedPost> AuthoredPosts { get; set; } = new List<FeedPost>();
    public ICollection<MonthlyGoalBatch> MonthlyGoalBatches { get; set; } = new List<MonthlyGoalBatch>();
    public ICollection<MonthlyGoalItem> MonthlyGoalItems { get; set; } = new List<MonthlyGoalItem>();
    public ICollection<JournalEntry> JournalEntries { get; set; } = new List<JournalEntry>();
    public ICollection<JournalComment> JournalComments { get; set; } = new List<JournalComment>();
    public ICollection<WorkoutSession> WorkoutSessions { get; set; } = new List<WorkoutSession>();
}

public class FeedPost
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string GroupId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string AuthorId { get; set; } = string.Empty;

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Summary { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string Category { get; set; } = "Artykuły"; // "YouTube" | "Artykuły" | "Ciekawostki" | "Rozwój"

    [MaxLength(1000)]
    public string? Url { get; set; }

    [MaxLength(32)]
    public string? YoutubeVideoId { get; set; }

    [MaxLength(1000)]
    public string? ThumbnailUrl { get; set; }

    public bool IsFeaturedHero { get; set; }

    public int? ReadTimeMinutes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(1000)]
    public string UpvotedByUserIdsCsv { get; set; } = string.Empty;

    [ForeignKey(nameof(GroupId))]
    public Group? Group { get; set; }

    [ForeignKey(nameof(AuthorId))]
    public User? Author { get; set; }

    public List<string> GetUpvotedUserIds()
    {
        if (string.IsNullOrWhiteSpace(UpvotedByUserIdsCsv))
        {
            return new List<string>();
        }

        return UpvotedByUserIdsCsv
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct()
            .ToList();
    }

    public void SetUpvotedUserIds(IEnumerable<string> userIds)
    {
        UpvotedByUserIdsCsv = string.Join(",", userIds.Where(u => !string.IsNullOrWhiteSpace(u)).Distinct());
    }
}

public class MonthlyGoalBatch
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string GroupId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string MonthKey { get; set; } = string.Empty;

    public bool IsSettled { get; set; }

    public DateTime? SettledAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(GroupId))]
    public Group? Group { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    public ICollection<MonthlyGoalItem> GoalItems { get; set; } = new List<MonthlyGoalItem>();
}

public class MonthlyGoalItem
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string BatchId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string GroupId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string MonthKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(300)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Domain { get; set; } = "Sylwetka i Zdrowie";

    [Required]
    [MaxLength(500)]
    public string TargetMetricDescription { get; set; } = string.Empty;

    [Range(0, 100)]
    public int ProgressPercentage { get; set; }

    [Required]
    [MaxLength(40)]
    public string AuditStatus { get; set; } = "Pending"; // "Pending" | "Completed" | "PartiallyCompleted" | "Failed"

    [MaxLength(1500)]
    public string? AuditConclusion { get; set; }

    public DateTime? AuditedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(BatchId))]
    public MonthlyGoalBatch? Batch { get; set; }

    [ForeignKey(nameof(GroupId))]
    public Group? Group { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }
}

public class JournalEntry
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string GroupId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string EntryDate { get; set; } = string.Empty;

    [Range(1, 10)]
    public int DayRating { get; set; } = 8;

    [Required]
    [MaxLength(2000)]
    public string CompletedTasksText { get; set; } = string.Empty;

    [Required]
    [MaxLength(3000)]
    public string SummaryAndLessons { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string ImprovementsText { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(GroupId))]
    public Group? Group { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    public ICollection<JournalComment> Comments { get; set; } = new List<JournalComment>();
}

public class JournalComment
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string JournalEntryId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string AuthorId { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(JournalEntryId))]
    public JournalEntry? JournalEntry { get; set; }

    [ForeignKey(nameof(AuthorId))]
    public User? Author { get; set; }
}

public class WorkoutSession
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string GroupId { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string WorkoutDate { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(32)]
    public string WorkoutType { get; set; } = "GYM"; // "GYM" | "CARDIO" | "OTHER"

    public bool IsPlannedOnly { get; set; }

    // Pola specyficzne dla treningu CARDIO
    public double? CardioDistanceKm { get; set; }
    public int? CardioDurationMinutes { get; set; }
    [MaxLength(32)]
    public string? CardioAveragePaceMinPerKm { get; set; }
    public int? CardioAverageHeartRateBpm { get; set; }

    // Pola specyficzne dla treningu OTHER (Sztuki walki, Basen, Mobilność)
    [MaxLength(160)]
    public string? OtherActivityName { get; set; }
    public int? OtherDurationMinutes { get; set; }
    public int? OtherIntensityRpe { get; set; }
    [MaxLength(2000)]
    public string? OtherDetailedNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey(nameof(GroupId))]
    public Group? Group { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    public ICollection<WorkoutExercise> Exercises { get; set; } = new List<WorkoutExercise>();
}

public class WorkoutExercise
{
    [Key]
    [MaxLength(64)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(64)]
    public string WorkoutSessionId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string ExerciseName { get; set; } = string.Empty;

    public int Sets { get; set; } = 1;

    public int Reps { get; set; } = 1;

    public double WeightKg { get; set; }

    public int OrderIndex { get; set; }

    [ForeignKey(nameof(WorkoutSessionId))]
    public WorkoutSession? WorkoutSession { get; set; }
}

// ============================================================================
// 2. KONTRAKTY DTO (1:1 Z PLIKIEM FRONTENDOWYM src/types.ts)
// ============================================================================

public record UserDto(
    string Id,
    string GroupId,
    string Name,
    string Handle,
    string RoleTitle,
    string AvatarInitials,
    string AccentColor
);

public record DiscoveryItemDto(
    string Id,
    string GroupId,
    string AuthorId,
    string Title,
    string Summary,
    string Category,
    string? Url,
    string? YoutubeVideoId,
    string? ThumbnailUrl,
    bool IsFeaturedHero,
    int? ReadTimeMinutes,
    string CreatedAt,
    List<string> UpvotedByUserIds
);

public record CreateDiscoveryRequestDto(
    string AuthorId,
    string Title,
    string Summary,
    string Category,
    string? Url,
    string? ImageUrl,
    bool? SetAsFeaturedHero,
    string? GroupId = null
);

public record ToggleDiscoveryUpvoteRequestDto(
    string UserId
);

public record MonthlyGoalDto(
    string Id,
    string GroupId,
    string UserId,
    string MonthKey,
    string Title,
    string Domain,
    string TargetMetricDescription,
    int ProgressPercentage,
    string AuditStatus,
    string? AuditConclusion,
    string? AuditedAt,
    string CreatedAt
);

public record CreateMonthlyGoalRequestDto(
    string UserId,
    string MonthKey,
    string Title,
    string Domain,
    string TargetMetricDescription,
    int? InitialProgressPercentage,
    string? GroupId = null
);

public record UpdateGoalProgressRequestDto(
    string GoalId,
    int ProgressPercentage
);

public record GoalAuditEntryDto(
    string GoalId,
    string AuditStatus,
    int FinalPercentage,
    string AuditConclusion
);

public record SubmitMonthAuditRequestDto(
    string UserId,
    string MonthKey,
    List<GoalAuditEntryDto> Entries,
    string? GroupId = null
);

public record MonthSettlementStatusDto(
    string UserId,
    string MonthKey,
    bool IsSettled,
    string? SettledAt
);

public record SubmitMonthAuditResponseDto(
    List<MonthlyGoalDto> UpdatedGoals,
    MonthSettlementStatusDto Settlement
);

public record JournalCommentDto(
    string Id,
    string JournalEntryId,
    string AuthorId,
    string Content,
    string CreatedAt
);

public record JournalEntryDto(
    string Id,
    string GroupId,
    string UserId,
    string EntryDate,
    int DayRating,
    string CompletedTasksText,
    string SummaryAndLessons,
    string ImprovementsText,
    string CreatedAt,
    List<JournalCommentDto> Comments
);

public record CreateJournalEntryRequestDto(
    string UserId,
    string EntryDate,
    int DayRating,
    string CompletedTasksText,
    string SummaryAndLessons,
    string ImprovementsText,
    string? GroupId = null
);

public record AddJournalCommentRequestDto(
    string JournalEntryId,
    string AuthorId,
    string Content
);

public record GymExerciseSetDto(
    string Id,
    string ExerciseName,
    int Sets,
    int Reps,
    double WeightKg
);

public record CreateGymExerciseSetDto(
    string ExerciseName,
    int Sets,
    int Reps,
    double WeightKg
);

public record CardioMetricsDto(
    double DistanceKm,
    int DurationMinutes,
    string AveragePaceMinPerKm,
    int? AverageHeartRateBpm
);

public record OtherActivityMetricsDto(
    string ActivityName,
    int DurationMinutes,
    int IntensityRpe,
    string DetailedNotes
);

public record WorkoutSessionDto(
    string Id,
    string GroupId,
    string UserId,
    string WorkoutDate,
    string Title,
    string WorkoutType,
    bool IsPlannedOnly,
    List<GymExerciseSetDto>? GymExercises,
    CardioMetricsDto? CardioMetrics,
    OtherActivityMetricsDto? OtherMetrics,
    string CreatedAt
);

public record CreateWorkoutSessionRequestDto(
    string UserId,
    string WorkoutDate,
    string Title,
    string WorkoutType,
    bool? IsPlannedOnly,
    List<CreateGymExerciseSetDto>? GymExercises,
    CardioMetricsDto? CardioMetrics,
    OtherActivityMetricsDto? OtherMetrics,
    string? GroupId = null
);

public record HubDatabaseSnapshotDto(
    string GroupId,
    List<UserDto> Users,
    List<DiscoveryItemDto> Discoveries,
    List<MonthlyGoalDto> MonthlyGoals,
    List<MonthSettlementStatusDto> MonthSettlements,
    List<JournalEntryDto> JournalEntries,
    List<WorkoutSessionDto> Workouts
);

// ============================================================================
// 3. MAPERY DOMENOWE (ENTITY <-> DTO) ORAZ HELPERY YOUTUBE
// ============================================================================

public static class DomainMapper
{
    public const string DefaultGroupId = "grp-wataha-2026";
    public const string HeroStudyImage = "/src/assets/images/hero_neuroscience_focus_1794161962252.jpg";
    public const string ArticleSleepImage = "/src/assets/images/article_sleep_architecture_1794161962499.jpg";
    public const string ArticleVo2MaxImage = "/src/assets/images/article_vo2max_longevity_1794161965752.jpg";
    public const string ArticleDotnetImage = "/src/assets/images/article_dotnet_architecture_1794161966326.jpg";

    public static UserDto ToDto(this User entity) => new(
        entity.Id,
        entity.GroupId,
        entity.Name,
        entity.Handle,
        entity.RoleTitle,
        entity.AvatarInitials,
        entity.AccentColor
    );

    public static DiscoveryItemDto ToDto(this FeedPost entity) => new(
        entity.Id,
        entity.GroupId,
        entity.AuthorId,
        entity.Title,
        entity.Summary,
        entity.Category,
        entity.Url,
        entity.YoutubeVideoId,
        entity.ThumbnailUrl,
        entity.IsFeaturedHero,
        entity.ReadTimeMinutes,
        entity.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"),
        entity.GetUpvotedUserIds()
    );

    public static MonthlyGoalDto ToDto(this MonthlyGoalItem entity) => new(
        entity.Id,
        entity.GroupId,
        entity.UserId,
        entity.MonthKey,
        entity.Title,
        entity.Domain,
        entity.TargetMetricDescription,
        entity.ProgressPercentage,
        entity.AuditStatus,
        entity.AuditConclusion,
        entity.AuditedAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"),
        entity.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    );

    public static MonthSettlementStatusDto ToSettlementDto(this MonthlyGoalBatch entity) => new(
        entity.UserId,
        entity.MonthKey,
        entity.IsSettled,
        entity.SettledAt?.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    );

    public static JournalCommentDto ToDto(this JournalComment entity) => new(
        entity.Id,
        entity.JournalEntryId,
        entity.AuthorId,
        entity.Content,
        entity.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    );

    public static JournalEntryDto ToDto(this JournalEntry entity) => new(
        entity.Id,
        entity.GroupId,
        entity.UserId,
        entity.EntryDate,
        entity.DayRating,
        entity.CompletedTasksText,
        entity.SummaryAndLessons,
        entity.ImprovementsText,
        entity.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"),
        entity.Comments
            .OrderBy(c => c.CreatedAt)
            .Select(c => c.ToDto())
            .ToList()
    );

    public static WorkoutSessionDto ToDto(this WorkoutSession entity)
    {
        List<GymExerciseSetDto>? gymExercises = null;
        CardioMetricsDto? cardioMetrics = null;
        OtherActivityMetricsDto? otherMetrics = null;

        if (string.Equals(entity.WorkoutType, "GYM", StringComparison.OrdinalIgnoreCase))
        {
            gymExercises = entity.Exercises
                .OrderBy(e => e.OrderIndex)
                .Select(e => new GymExerciseSetDto(
                    e.Id,
                    e.ExerciseName,
                    e.Sets,
                    e.Reps,
                    e.WeightKg
                ))
                .ToList();
        }
        else if (string.Equals(entity.WorkoutType, "CARDIO", StringComparison.OrdinalIgnoreCase))
        {
            cardioMetrics = new CardioMetricsDto(
                entity.CardioDistanceKm ?? 0,
                entity.CardioDurationMinutes ?? 0,
                entity.CardioAveragePaceMinPerKm ?? "0:00 /km",
                entity.CardioAverageHeartRateBpm
            );
        }
        else if (string.Equals(entity.WorkoutType, "OTHER", StringComparison.OrdinalIgnoreCase))
        {
            otherMetrics = new OtherActivityMetricsDto(
                entity.OtherActivityName ?? "Aktywność uzupełniająca",
                entity.OtherDurationMinutes ?? 0,
                entity.OtherIntensityRpe ?? 5,
                entity.OtherDetailedNotes ?? string.Empty
            );
        }

        return new WorkoutSessionDto(
            entity.Id,
            entity.GroupId,
            entity.UserId,
            entity.WorkoutDate,
            entity.Title,
            entity.WorkoutType,
            entity.IsPlannedOnly,
            gymExercises,
            cardioMetrics,
            otherMetrics,
            entity.CreatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        );
    }

    public static string? ExtractYouTubeVideoId(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        var trimmed = url.Trim();
        if (Regex.IsMatch(trimmed, "^[a-zA-Z0-9_-]{11}$"))
        {
            return trimmed;
        }

        var match = Regex.Match(
            trimmed,
            @"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/|[?&]v=)([a-zA-Z0-9_-]{11})"
        );

        return match.Success ? match.Groups[1].Value : null;
    }

    public static string GetYouTubeThumbnailUrl(string videoId) =>
        $"https://img.youtube.com/vi/{videoId}/maxresdefault.jpg";

    public static string GenerateEntityId(string prefix) =>
        $"{prefix}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..5]}";
}