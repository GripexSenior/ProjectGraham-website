using Microsoft.EntityFrameworkCore;
using ProjectGraham.Api.Models;

namespace ProjectGraham.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Group> Groups => Set<Group>();
    public DbSet<User> Users => Set<User>();
    public DbSet<FeedPost> FeedPosts => Set<FeedPost>();
    public DbSet<MonthlyGoalBatch> MonthlyGoalBatches => Set<MonthlyGoalBatch>();
    public DbSet<MonthlyGoalItem> MonthlyGoalItems => Set<MonthlyGoalItem>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalComment> JournalComments => Set<JournalComment>();
    public DbSet<WorkoutSession> WorkoutSessions => Set<WorkoutSession>();
    public DbSet<WorkoutExercise> WorkoutExercises => Set<WorkoutExercise>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Group>(entity =>
        {
            entity.HasKey(g => g.Id);
            entity.Property(g => g.Name).IsRequired().HasMaxLength(160);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.GroupId);

            entity.HasOne(u => u.Group)
                .WithMany(g => g.Users)
                .HasForeignKey(u => u.GroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FeedPost>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.HasIndex(p => new { p.GroupId, p.CreatedAt });

            entity.HasOne(p => p.Group)
                .WithMany(g => g.FeedPosts)
                .HasForeignKey(p => p.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(p => p.Author)
                .WithMany(u => u.AuthoredPosts)
                .HasForeignKey(p => p.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MonthlyGoalBatch>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.HasIndex(b => new { b.GroupId, b.UserId, b.MonthKey }).IsUnique();

            entity.HasOne(b => b.Group)
                .WithMany(g => g.MonthlyGoalBatches)
                .HasForeignKey(b => b.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(b => b.User)
                .WithMany(u => u.MonthlyGoalBatches)
                .HasForeignKey(b => b.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MonthlyGoalItem>(entity =>
        {
            entity.HasKey(i => i.Id);
            entity.HasIndex(i => new { i.GroupId, i.MonthKey, i.UserId });

            entity.HasOne(i => i.Batch)
                .WithMany(b => b.GoalItems)
                .HasForeignKey(i => i.BatchId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(i => i.Group)
                .WithMany(g => g.MonthlyGoalItems)
                .HasForeignKey(i => i.GroupId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(i => i.User)
                .WithMany(u => u.MonthlyGoalItems)
                .HasForeignKey(i => i.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<JournalEntry>(entity =>
        {
            entity.HasKey(j => j.Id);
            entity.HasIndex(j => new { j.GroupId, j.EntryDate });

            entity.HasOne(j => j.Group)
                .WithMany(g => g.JournalEntries)
                .HasForeignKey(j => j.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(j => j.User)
                .WithMany(u => u.JournalEntries)
                .HasForeignKey(j => j.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<JournalComment>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.HasIndex(c => c.JournalEntryId);

            entity.HasOne(c => c.JournalEntry)
                .WithMany(j => j.Comments)
                .HasForeignKey(c => c.JournalEntryId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Author)
                .WithMany(u => u.JournalComments)
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WorkoutSession>(entity =>
        {
            entity.HasKey(w => w.Id);
            entity.HasIndex(w => new { w.GroupId, w.WorkoutDate });

            entity.HasOne(w => w.Group)
                .WithMany(g => g.WorkoutSessions)
                .HasForeignKey(w => w.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(w => w.User)
                .WithMany(u => u.WorkoutSessions)
                .HasForeignKey(w => w.UserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WorkoutExercise>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.WorkoutSessionId);

            entity.HasOne(e => e.WorkoutSession)
                .WithMany(w => w.Exercises)
                .HasForeignKey(e => e.WorkoutSessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        SeedInitialData(modelBuilder);
    }

    private static void SeedInitialData(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Group>().HasData(GetSeedGroup());
        modelBuilder.Entity<User>().HasData(GetSeedUsers());
    }

    public async Task ResetToSeedDataAsync(CancellationToken cancellationToken = default)
    {
        WorkoutExercises.RemoveRange(WorkoutExercises);
        WorkoutSessions.RemoveRange(WorkoutSessions);
        JournalComments.RemoveRange(JournalComments);
        JournalEntries.RemoveRange(JournalEntries);
        MonthlyGoalItems.RemoveRange(MonthlyGoalItems);
        MonthlyGoalBatches.RemoveRange(MonthlyGoalBatches);
        FeedPosts.RemoveRange(FeedPosts);
        Users.RemoveRange(Users);
        Groups.RemoveRange(Groups);

        await SaveChangesAsync(cancellationToken);

        await Groups.AddAsync(GetSeedGroup(), cancellationToken);
        await Users.AddRangeAsync(GetSeedUsers(), cancellationToken);

        await SaveChangesAsync(cancellationToken);
    }

    public static Group GetSeedGroup() => new()
    {
        Id = DomainMapper.DefaultGroupId,
        Name = "Projekt Graham — Dymitr & Franek",
        Description = "Współdzielona grupa odpowiedzialności, celów miesięcznych, dziennika wieczornego i treningów dla Dymitra i Franka.",
        CreatedAt = DateTime.Parse("2026-11-01T00:00:00Z").ToUniversalTime()
    };

    public static List<User> GetSeedUsers() => new()
    {
        new User
        {
            Id = "user-dymitr",
            GroupId = DomainMapper.DefaultGroupId,
            Name = "Dymitr",
            Handle = "@dymitr",
            RoleTitle = "Współzałożyciel · Projekt Graham",
            AvatarInitials = "DY",
            AccentColor = "indigo"
        },
        new User
        {
            Id = "user-franek",
            GroupId = DomainMapper.DefaultGroupId,
            Name = "Franek",
            Handle = "@franek",
            RoleTitle = "Współzałożyciel · Projekt Graham",
            AvatarInitials = "FR",
            AccentColor = "emerald"
        }
    };
}