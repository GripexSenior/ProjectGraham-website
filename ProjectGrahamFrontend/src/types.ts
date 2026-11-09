export type UserId = 'user-dymitr' | 'user-franek';

export type GroupFilter = 'ALL' | UserId;

export type AppModule = 'LANDING' | 'DISCOVERIES' | 'GOALS' | 'JOURNAL' | 'WORKOUTS';

export interface UserDto {
  id: UserId;
  groupId: string;
  name: string;
  handle: string;
  roleTitle: string;
  avatarInitials: string;
  accentColor: 'indigo' | 'emerald' | 'amber';
}

// ==========================================
// 1. DASHBOARD CIEKAWOSTEK (DISCOVERIES)
// ==========================================

export type DiscoveryCategory = 'YouTube' | 'Artykuły' | 'Ciekawostki' | 'Rozwój';

export interface DiscoveryItemDto {
  id: string;
  groupId: string;
  authorId: UserId;
  title: string;
  summary: string;
  category: DiscoveryCategory;
  url?: string;
  youtubeVideoId?: string;
  thumbnailUrl?: string;
  isFeaturedHero: boolean;
  readTimeMinutes?: number;
  createdAt: string; // ISO string
  upvotedByUserIds: UserId[];
}

export interface CreateDiscoveryRequestDto {
  authorId: UserId;
  title: string;
  summary: string;
  category: DiscoveryCategory;
  url?: string;
  imageUrl?: string;
  setAsFeaturedHero?: boolean;
}

// ==========================================
// 2. CELE MIESIĘCZNE & FORMULARZ KONTROLNY
// ==========================================

export type GoalAuditStatus = 'Pending' | 'Completed' | 'PartiallyCompleted' | 'Failed';

export type GoalDomain = 'Sylwetka i Zdrowie' | 'Kariera i Finanse' | 'Umysł i Nawyk' | 'Relacje i Projekt';

export interface MonthlyGoalDto {
  id: string;
  groupId: string;
  userId: UserId;
  monthKey: string; // e.g., "2026-10" or "2026-11"
  title: string;
  domain: GoalDomain;
  targetMetricDescription: string;
  progressPercentage: number; // 0 - 100
  auditStatus: GoalAuditStatus;
  auditConclusion?: string;
  auditedAt?: string;
  createdAt: string;
}

export interface CreateMonthlyGoalRequestDto {
  userId: UserId;
  monthKey: string;
  title: string;
  domain: GoalDomain;
  targetMetricDescription: string;
  initialProgressPercentage?: number;
}

export interface UpdateGoalProgressRequestDto {
  goalId: string;
  progressPercentage: number;
}

export interface GoalAuditEntryDto {
  goalId: string;
  auditStatus: Exclude<GoalAuditStatus, 'Pending'>;
  finalPercentage: number;
  auditConclusion: string;
}

export interface SubmitMonthAuditRequestDto {
  userId: UserId;
  monthKey: string;
  entries: GoalAuditEntryDto[];
}

export interface MonthSettlementStatusDto {
  userId: UserId;
  monthKey: string; // e.g., "2026-10"
  isSettled: boolean;
  settledAt?: string;
}

// ==========================================
// 3. WIECZORNY DZIENNIK (DAILY JOURNAL)
// ==========================================

export interface JournalCommentDto {
  id: string;
  journalEntryId: string;
  authorId: UserId;
  content: string;
  createdAt: string;
}

export interface JournalEntryDto {
  id: string;
  groupId: string;
  userId: UserId;
  entryDate: string; // YYYY-MM-DD
  dayRating: number; // 1 - 10
  completedTasksText: string; // Zrealizowane dzisiaj karteczki
  summaryAndLessons: string; // Główne podsumowanie dnia / wnioski
  improvementsText: string; // Co dzisiaj zrobiłem źle / mogłem zrobić lepiej
  createdAt: string;
  comments: JournalCommentDto[];
}

export interface CreateJournalEntryRequestDto {
  userId: UserId;
  entryDate: string;
  dayRating: number;
  completedTasksText: string;
  summaryAndLessons: string;
  improvementsText: string;
}

export interface AddJournalCommentRequestDto {
  journalEntryId: string;
  authorId: UserId;
  content: string;
}

// ==========================================
// 4. UNIWERSALNY PLANER I DZIENNIK TRENINGOWY
// ==========================================

export type WorkoutType = 'GYM' | 'CARDIO' | 'OTHER';

export interface GymExerciseSetDto {
  id: string;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
}

export interface CardioMetricsDto {
  distanceKm: number;
  durationMinutes: number;
  averagePaceMinPerKm: string; // e.g. "4:52 /km"
  averageHeartRateBpm?: number;
}

export interface OtherActivityMetricsDto {
  activityName: string;
  durationMinutes: number;
  intensityRpe: number; // 1 - 10
  detailedNotes: string;
}

export interface WorkoutSessionDto {
  id: string;
  groupId: string;
  userId: UserId;
  workoutDate: string; // YYYY-MM-DD
  title: string;
  workoutType: WorkoutType;
  isPlannedOnly: boolean;
  gymExercises?: GymExerciseSetDto[];
  cardioMetrics?: CardioMetricsDto;
  otherMetrics?: OtherActivityMetricsDto;
  createdAt: string;
}

export interface CreateWorkoutSessionRequestDto {
  userId: UserId;
  workoutDate: string;
  title: string;
  workoutType: WorkoutType;
  isPlannedOnly?: boolean;
  gymExercises?: Omit<GymExerciseSetDto, 'id'>[];
  cardioMetrics?: CardioMetricsDto;
  otherMetrics?: OtherActivityMetricsDto;
}

// ==========================================
// 5. SNAPSHOT CAŁEJ BAZY (DLA SYNCHRONIZACJI)
// ==========================================

export interface HubDatabaseSnapshotDto {
  groupId: string;
  users: UserDto[];
  discoveries: DiscoveryItemDto[];
  monthlyGoals: MonthlyGoalDto[];
  monthSettlements: MonthSettlementStatusDto[];
  journalEntries: JournalEntryDto[];
  workouts: WorkoutSessionDto[];
}