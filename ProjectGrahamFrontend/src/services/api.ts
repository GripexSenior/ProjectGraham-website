import {
  AddJournalCommentRequestDto,
  CreateDiscoveryRequestDto,
  CreateJournalEntryRequestDto,
  CreateMonthlyGoalRequestDto,
  CreateWorkoutSessionRequestDto,
  DiscoveryItemDto,
  HubDatabaseSnapshotDto,
  JournalCommentDto,
  JournalEntryDto,
  MonthlyGoalDto,
  MonthSettlementStatusDto,
  SubmitMonthAuditRequestDto,
  UpdateGoalProgressRequestDto,
  UserDto,
  UserId,
  WorkoutSessionDto,
} from '../types';
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
} from '../utils/domainUtils';

export const SHARED_GROUP_ID = 'grp-wataha-2026';
const STORAGE_KEY = 'tribehub_db_v2_clean';

export const CSHARP_API_BASE_URL: string =
  'https://project-graham-api.onrender.com/api';

let useCsharpBackend: boolean =
  typeof import.meta !== 'undefined' &&
  Boolean(
    (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_USE_CSHARP_API === 'true'
  );

export function setUseCsharpBackend(enabled: boolean): void {
  useCsharpBackend = enabled;
}

// Domyślne ilustracje tła dla kategorii, gdy użytkownik nie poda własnego URL ani linku YouTube
const HERO_STUDY_IMAGE = '/src/assets/images/hero_neuroscience_focus_1794161962252.jpg';
const ARTICLE_VO2MAX_IMAGE = '/src/assets/images/article_vo2max_longevity_1794161965752.jpg';
const ARTICLE_DOTNET_IMAGE = '/src/assets/images/article_dotnet_architecture_1794161966326.jpg';

const INITIAL_USERS: UserDto[] = [
  {
    id: 'user-dymitr',
    groupId: SHARED_GROUP_ID,
    name: 'Dymitr',
    handle: '@dymitr',
    roleTitle: 'Współzałożyciel · Projekt Graham',
    avatarInitials: 'DY',
    accentColor: 'indigo',
  },
  {
    id: 'user-franek',
    groupId: SHARED_GROUP_ID,
    name: 'Franek',
    handle: '@franek',
    roleTitle: 'Współzałożyciel · Projekt Graham',
    avatarInitials: 'FR',
    accentColor: 'emerald',
  },
];

function createDefaultSnapshot(): HubDatabaseSnapshotDto {
  return {
    groupId: SHARED_GROUP_ID,
    users: INITIAL_USERS,
    discoveries: [],
    monthlyGoals: [],
    monthSettlements: [],
    journalEntries: [],
    workouts: [],
  };
}

function readDbFromStorage(): HubDatabaseSnapshotDto {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createDefaultSnapshot();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = createDefaultSnapshot();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as HubDatabaseSnapshotDto;
    const hasValidUsers =
      Array.isArray(parsed.users) &&
      parsed.users.length === 2 &&
      parsed.users.some((u) => u.id === 'user-dymitr') &&
      parsed.users.some((u) => u.id === 'user-franek');

    if (!hasValidUsers || !Array.isArray(parsed.discoveries) || !Array.isArray(parsed.monthlyGoals)) {
      const seed = createDefaultSnapshot();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return parsed;
  } catch {
    return createDefaultSnapshot();
  }
}

function writeDbToStorage(db: HubDatabaseSnapshotDto): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function generateEntityId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

async function apiRequest<TResponse>(
  endpoint: string,
  options: RequestInit = {}
): Promise<TResponse> {
  const url = `${CSHARP_API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const errorJson = (await response.json()) as { message?: string; title?: string };
      errorDetail = errorJson.message || errorJson.title || errorDetail;
    } catch {
      // Brak ciała JSON w odpowiedzi błędu
    }
    throw new Error(`HTTP ${response.status} (${endpoint}): ${errorDetail}`);
  }

  return (await response.json()) as TResponse;
}

/**
 * Zunifikowany klient API dla aplikacji Projekt Graham (Dymitr & Franek).
 * Obsługuje zapytania HTTP `fetch()` do backendu C# (.NET 10 Web API)
 * oraz lokalny fallback `localStorage` w środowisku podglądu bez uruchomionego serwera .NET.
 */
export const hubApi = {
  /**
   * GET http://localhost:5000/api/groups/{groupId}/snapshot
   */
  async getHubSnapshot(groupId: string = SHARED_GROUP_ID): Promise<HubDatabaseSnapshotDto> {
    if (useCsharpBackend) {
      return apiRequest<HubDatabaseSnapshotDto>(
        `/groups/${encodeURIComponent(groupId)}/snapshot`
      );
    }
    const db = readDbFromStorage();
    return structuredClone(db);
  },

  /**
   * POST http://localhost:5000/api/groups/{groupId}/reset-seed
   */
  async resetDemoDatabase(groupId: string = SHARED_GROUP_ID): Promise<HubDatabaseSnapshotDto> {
    if (useCsharpBackend) {
      return apiRequest<HubDatabaseSnapshotDto>(
        `/groups/${encodeURIComponent(groupId)}/reset-seed`,
        { method: 'POST' }
      );
    }
    const seed = createDefaultSnapshot();
    writeDbToStorage(seed);
    return structuredClone(seed);
  },

  // ==========================================
  // 1. DASHBOARD CIEKAWOSTEK (FeedController)
  // ==========================================

  /**
   * GET http://localhost:5000/api/feed?groupId=grp-wataha-2026
   */
  async getDiscoveries(
    groupId: string = SHARED_GROUP_ID,
    category?: string,
    authorId?: string
  ): Promise<DiscoveryItemDto[]> {
    if (useCsharpBackend) {
      const params = new URLSearchParams({ groupId });
      if (category) params.set('category', category);
      if (authorId) params.set('authorId', authorId);
      return apiRequest<DiscoveryItemDto[]>(`/feed?${params.toString()}`);
    }

    const db = readDbFromStorage();
    return [...db.discoveries]
      .filter((d) => (!category || d.category === category) && (!authorId || d.authorId === authorId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * POST http://localhost:5000/api/feed?groupId=grp-wataha-2026
   */
  async createDiscovery(
    payload: CreateDiscoveryRequestDto,
    groupId: string = SHARED_GROUP_ID
  ): Promise<DiscoveryItemDto> {
    if (useCsharpBackend) {
      return apiRequest<DiscoveryItemDto>(
        `/feed?groupId=${encodeURIComponent(groupId)}`,
        {
          method: 'POST',
          body: JSON.stringify({ ...payload, groupId }),
        }
      );
    }

    const db = readDbFromStorage();
    const ytId = extractYouTubeVideoId(payload.url);

    let resolvedThumbnail = payload.imageUrl?.trim() || undefined;
    if (ytId && !resolvedThumbnail) {
      resolvedThumbnail = getYouTubeThumbnailUrl(ytId);
    }
    if (!resolvedThumbnail) {
      resolvedThumbnail =
        payload.category === 'Rozwój'
          ? HERO_STUDY_IMAGE
          : payload.category === 'Ciekawostki'
          ? ARTICLE_VO2MAX_IMAGE
          : ARTICLE_DOTNET_IMAGE;
    }

    if (payload.setAsFeaturedHero) {
      db.discoveries = db.discoveries.map((d) => ({
        ...d,
        isFeaturedHero: false,
      }));
    }

    const newDiscovery: DiscoveryItemDto = {
      id: generateEntityId('disc'),
      groupId: db.groupId,
      authorId: payload.authorId,
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      category: ytId ? 'YouTube' : payload.category,
      url: payload.url?.trim() || undefined,
      youtubeVideoId: ytId || undefined,
      thumbnailUrl: resolvedThumbnail,
      isFeaturedHero: Boolean(payload.setAsFeaturedHero),
      readTimeMinutes: ytId ? 12 : 6,
      createdAt: new Date().toISOString(),
      upvotedByUserIds: [payload.authorId],
    };

    db.discoveries.unshift(newDiscovery);
    writeDbToStorage(db);
    return structuredClone(newDiscovery);
  },

  /**
   * POST http://localhost:5000/api/feed/{id}/toggle-upvote
   */
  async toggleDiscoveryUpvote(
    discoveryId: string,
    userId: UserId
  ): Promise<DiscoveryItemDto> {
    if (useCsharpBackend) {
      return apiRequest<DiscoveryItemDto>(
        `/feed/${encodeURIComponent(discoveryId)}/toggle-upvote`,
        {
          method: 'POST',
          body: JSON.stringify({ userId }),
        }
      );
    }

    const db = readDbFromStorage();
    const target = db.discoveries.find((d) => d.id === discoveryId);
    if (!target) {
      throw new Error(`Discovery not found: ${discoveryId}`);
    }

    if (target.upvotedByUserIds.includes(userId)) {
      target.upvotedByUserIds = target.upvotedByUserIds.filter((id) => id !== userId);
    } else {
      target.upvotedByUserIds.push(userId);
    }

    writeDbToStorage(db);
    return structuredClone(target);
  },

  // ==========================================
  // 2. CELE MIESIĘCZNE & AUDYT (GoalsController)
  // ==========================================

  /**
   * GET http://localhost:5000/api/goals?groupId=grp-wataha-2026&monthKey={monthKey}
   */
  async getMonthlyGoals(
    monthKey?: string,
    groupId: string = SHARED_GROUP_ID,
    userId?: string
  ): Promise<MonthlyGoalDto[]> {
    if (useCsharpBackend) {
      const params = new URLSearchParams({ groupId });
      if (monthKey) params.set('monthKey', monthKey);
      if (userId) params.set('userId', userId);
      return apiRequest<MonthlyGoalDto[]>(`/goals?${params.toString()}`);
    }

    const db = readDbFromStorage();
    return structuredClone(
      db.monthlyGoals.filter(
        (g) => (!monthKey || g.monthKey === monthKey) && (!userId || g.userId === userId)
      )
    );
  },

  /**
   * POST http://localhost:5000/api/goals?groupId=grp-wataha-2026
   */
  async createMonthlyGoal(
    payload: CreateMonthlyGoalRequestDto,
    groupId: string = SHARED_GROUP_ID
  ): Promise<MonthlyGoalDto> {
    if (useCsharpBackend) {
      return apiRequest<MonthlyGoalDto>(
        `/goals?groupId=${encodeURIComponent(groupId)}`,
        {
          method: 'POST',
          body: JSON.stringify({ ...payload, groupId }),
        }
      );
    }

    const db = readDbFromStorage();
    const newGoal: MonthlyGoalDto = {
      id: generateEntityId('goal'),
      groupId: db.groupId,
      userId: payload.userId,
      monthKey: payload.monthKey,
      title: payload.title.trim(),
      domain: payload.domain,
      targetMetricDescription: payload.targetMetricDescription.trim(),
      progressPercentage: Math.min(
        100,
        Math.max(0, Number(payload.initialProgressPercentage) || 0)
      ),
      auditStatus: 'Pending',
      createdAt: new Date().toISOString(),
    };

    db.monthlyGoals.push(newGoal);
    writeDbToStorage(db);
    return structuredClone(newGoal);
  },

  /**
   * PATCH http://localhost:5000/api/goals/{id}/progress
   */
  async updateGoalProgress(payload: UpdateGoalProgressRequestDto): Promise<MonthlyGoalDto> {
    if (useCsharpBackend) {
      return apiRequest<MonthlyGoalDto>(
        `/goals/${encodeURIComponent(payload.goalId)}/progress`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );
    }

    const db = readDbFromStorage();
    const goal = db.monthlyGoals.find((g) => g.id === payload.goalId);
    if (!goal) {
      throw new Error(`MonthlyGoal not found: ${payload.goalId}`);
    }
    goal.progressPercentage = Math.min(100, Math.max(0, Math.round(payload.progressPercentage)));
    writeDbToStorage(db);
    return structuredClone(goal);
  },

  /**
   * POST http://localhost:5000/api/goals/audit-settlement?groupId=grp-wataha-2026
   */
  async submitMonthAudit(
    payload: SubmitMonthAuditRequestDto,
    groupId: string = SHARED_GROUP_ID
  ): Promise<{ updatedGoals: MonthlyGoalDto[]; settlement: MonthSettlementStatusDto }> {
    if (useCsharpBackend) {
      return apiRequest<{ updatedGoals: MonthlyGoalDto[]; settlement: MonthSettlementStatusDto }>(
        `/goals/audit-settlement?groupId=${encodeURIComponent(groupId)}`,
        {
          method: 'POST',
          body: JSON.stringify({ ...payload, groupId }),
        }
      );
    }

    const db = readDbFromStorage();
    const nowIso = new Date().toISOString();

    for (const entry of payload.entries) {
      const goal = db.monthlyGoals.find(
        (g) =>
          g.id === entry.goalId &&
          g.userId === payload.userId &&
          g.monthKey === payload.monthKey
      );
      if (goal) {
        goal.auditStatus = entry.auditStatus;
        goal.progressPercentage = Math.min(100, Math.max(0, Math.round(entry.finalPercentage)));
        goal.auditConclusion = entry.auditConclusion.trim();
        goal.auditedAt = nowIso;
      }
    }

    let settlement = db.monthSettlements.find(
      (s) => s.userId === payload.userId && s.monthKey === payload.monthKey
    );

    if (settlement) {
      settlement.isSettled = true;
      settlement.settledAt = nowIso;
    } else {
      settlement = {
        userId: payload.userId,
        monthKey: payload.monthKey,
        isSettled: true,
        settledAt: nowIso,
      };
      db.monthSettlements.push(settlement);
    }

    writeDbToStorage(db);

    const updatedGoals = db.monthlyGoals.filter(
      (g) => g.userId === payload.userId && g.monthKey === payload.monthKey
    );
    return {
      updatedGoals: structuredClone(updatedGoals),
      settlement: structuredClone(settlement),
    };
  },

  // ==========================================
  // 3. WIECZORNY DZIENNIK (JournalController)
  // ==========================================

  /**
   * GET http://localhost:5000/api/journal?groupId=grp-wataha-2026
   */
  async getJournalEntries(
    groupId: string = SHARED_GROUP_ID,
    userId?: string
  ): Promise<JournalEntryDto[]> {
    if (useCsharpBackend) {
      const params = new URLSearchParams({ groupId });
      if (userId) params.set('userId', userId);
      return apiRequest<JournalEntryDto[]>(`/journal?${params.toString()}`);
    }

    const db = readDbFromStorage();
    return [...db.journalEntries]
      .filter((e) => !userId || e.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * POST http://localhost:5000/api/journal?groupId=grp-wataha-2026
   */
  async createJournalEntry(
    payload: CreateJournalEntryRequestDto,
    groupId: string = SHARED_GROUP_ID
  ): Promise<JournalEntryDto> {
    if (useCsharpBackend) {
      return apiRequest<JournalEntryDto>(
        `/journal?groupId=${encodeURIComponent(groupId)}`,
        {
          method: 'POST',
          body: JSON.stringify({ ...payload, groupId }),
        }
      );
    }

    const db = readDbFromStorage();
    const newEntry: JournalEntryDto = {
      id: generateEntityId('jrn'),
      groupId: db.groupId,
      userId: payload.userId,
      entryDate: payload.entryDate,
      dayRating: Math.min(10, Math.max(1, Math.round(payload.dayRating))),
      completedTasksText: payload.completedTasksText.trim(),
      summaryAndLessons: payload.summaryAndLessons.trim(),
      improvementsText: payload.improvementsText.trim(),
      createdAt: new Date().toISOString(),
      comments: [],
    };

    db.journalEntries.unshift(newEntry);
    writeDbToStorage(db);
    return structuredClone(newEntry);
  },

  /**
   * POST http://localhost:5000/api/journal/{id}/comments
   */
  async addJournalComment(payload: AddJournalCommentRequestDto): Promise<JournalCommentDto> {
    if (useCsharpBackend) {
      return apiRequest<JournalCommentDto>(
        `/journal/${encodeURIComponent(payload.journalEntryId)}/comments`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
    }

    const db = readDbFromStorage();
    const entry = db.journalEntries.find((e) => e.id === payload.journalEntryId);
    if (!entry) {
      throw new Error(`JournalEntry not found: ${payload.journalEntryId}`);
    }

    const newComment: JournalCommentDto = {
      id: generateEntityId('cmt'),
      journalEntryId: entry.id,
      authorId: payload.authorId,
      content: payload.content.trim(),
      createdAt: new Date().toISOString(),
    };

    entry.comments.push(newComment);
    writeDbToStorage(db);
    return structuredClone(newComment);
  },

  // ==========================================
  // 4. PLANER TRENINGOWY (WorkoutsController)
  // ==========================================

  /**
   * GET http://localhost:5000/api/workouts?groupId=grp-wataha-2026
   */
  async getWorkouts(
    groupId: string = SHARED_GROUP_ID,
    userId?: string,
    workoutType?: string
  ): Promise<WorkoutSessionDto[]> {
    if (useCsharpBackend) {
      const params = new URLSearchParams({ groupId });
      if (userId) params.set('userId', userId);
      if (workoutType) params.set('workoutType', workoutType);
      return apiRequest<WorkoutSessionDto[]>(`/workouts?${params.toString()}`);
    }

    const db = readDbFromStorage();
    return [...db.workouts]
      .filter((w) => (!userId || w.userId === userId) && (!workoutType || w.workoutType === workoutType))
      .sort((a, b) => new Date(b.workoutDate).getTime() - new Date(a.workoutDate).getTime());
  },

  /**
   * POST http://localhost:5000/api/workouts?groupId=grp-wataha-2026
   */
  async createWorkoutSession(
    payload: CreateWorkoutSessionRequestDto,
    groupId: string = SHARED_GROUP_ID
  ): Promise<WorkoutSessionDto> {
    if (useCsharpBackend) {
      return apiRequest<WorkoutSessionDto>(
        `/workouts?groupId=${encodeURIComponent(groupId)}`,
        {
          method: 'POST',
          body: JSON.stringify({ ...payload, groupId }),
        }
      );
    }

    const db = readDbFromStorage();
    const newWorkout: WorkoutSessionDto = {
      id: generateEntityId('wrk'),
      groupId: db.groupId,
      userId: payload.userId,
      workoutDate: payload.workoutDate,
      title: payload.title.trim(),
      workoutType: payload.workoutType,
      isPlannedOnly: Boolean(payload.isPlannedOnly),
      gymExercises:
        payload.workoutType === 'GYM' && payload.gymExercises
          ? payload.gymExercises.map((ex, idx) => ({
              id: generateEntityId(`ex-${idx}`),
              exerciseName: ex.exerciseName.trim(),
              sets: Number(ex.sets) || 1,
              reps: Number(ex.reps) || 1,
              weightKg: Number(ex.weightKg) || 0,
            }))
          : undefined,
      cardioMetrics:
        payload.workoutType === 'CARDIO' && payload.cardioMetrics
          ? {
              distanceKm: Number(payload.cardioMetrics.distanceKm) || 0,
              durationMinutes: Number(payload.cardioMetrics.durationMinutes) || 0,
              averagePaceMinPerKm: payload.cardioMetrics.averagePaceMinPerKm,
              averageHeartRateBpm: payload.cardioMetrics.averageHeartRateBpm
                ? Number(payload.cardioMetrics.averageHeartRateBpm)
                : undefined,
            }
          : undefined,
      otherMetrics:
        payload.workoutType === 'OTHER' && payload.otherMetrics
          ? {
              activityName: payload.otherMetrics.activityName.trim(),
              durationMinutes: Number(payload.otherMetrics.durationMinutes) || 0,
              intensityRpe: Math.min(
                10,
                Math.max(1, Number(payload.otherMetrics.intensityRpe) || 5)
              ),
              detailedNotes: payload.otherMetrics.detailedNotes.trim(),
            }
          : undefined,
      createdAt: new Date().toISOString(),
    };

    db.workouts.unshift(newWorkout);
    writeDbToStorage(db);
    return structuredClone(newWorkout);
  },

  /**
   * PATCH http://localhost:5000/api/workouts/{id}/complete-planned
   */
  async markPlannedWorkoutCompleted(workoutId: string): Promise<WorkoutSessionDto> {
    if (useCsharpBackend) {
      return apiRequest<WorkoutSessionDto>(
        `/workouts/${encodeURIComponent(workoutId)}/complete-planned`,
        { method: 'PATCH' }
      );
    }

    const db = readDbFromStorage();
    const workout = db.workouts.find((w) => w.id === workoutId);
    if (!workout) {
      throw new Error(`WorkoutSession not found: ${workoutId}`);
    }
    workout.isPlannedOnly = false;
    writeDbToStorage(db);
    return structuredClone(workout);
  },
};