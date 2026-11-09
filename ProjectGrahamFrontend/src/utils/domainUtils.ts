import {
  GymExerciseSetDto,
  MonthlyGoalDto,
  MonthSettlementStatusDto,
  UserId,
} from '../types';

/**
 * Extracts a standardized 11-character YouTube video ID from common YouTube URL formats
 * (watch?v=, youtu.be/, shorts/, embed/, live/).
 */
export function extractYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Match 11-char ID if passed directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Builds the high-resolution YouTube thumbnail URL from a video ID.
 */
export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Returns the previous month key (YYYY-MM) for a given current month key (YYYY-MM).
 */
export function getPreviousMonthKey(currentMonthKey: string): string {
  const [yearStr, monthStr] = currentMonthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month)) {
    return '2026-10';
  }

  if (month === 1) {
    return `${year - 1}-12`;
  }
  const prevMonth = month - 1;
  return `${year}-${prevMonth < 10 ? `0${prevMonth}` : `${prevMonth}`}`;
}

/**
 * Formats a YYYY-MM key into a Polish readable month label (e.g. "Listopad 2026").
 */
export function formatMonthLabel(monthKey: string): string {
  const monthsPl: Record<string, string> = {
    '01': 'Styczeń',
    '02': 'Luty',
    '03': 'Marzec',
    '04': 'Kwiecień',
    '05': 'Maj',
    '06': 'Czerwiec',
    '07': 'Lipiec',
    '08': 'Sierpień',
    '09': 'Wrzesień',
    '10': 'Październik',
    '11': 'Listopad',
    '12': 'Grudzień',
  };
  const [year, month] = monthKey.split('-');
  return `${monthsPl[month] || month} ${year}`;
}

/**
 * Checks whether a specific user has an unsettled previous month that has goals requiring audit.
 */
export function hasUnsettledPreviousMonth(
  userId: UserId,
  previousMonthKey: string,
  goals: MonthlyGoalDto[],
  settlements: MonthSettlementStatusDto[]
): boolean {
  const userPrevGoals = goals.filter(
    (g) => g.userId === userId && g.monthKey === previousMonthKey
  );
  if (userPrevGoals.length === 0) {
    return false;
  }

  const settlementRecord = settlements.find(
    (s) => s.userId === userId && s.monthKey === previousMonthKey
  );
  if (settlementRecord && settlementRecord.isSettled) {
    return false;
  }

  return userPrevGoals.some((g) => g.auditStatus === 'Pending');
}

/**
 * Calculates total lifted volume (kg) for a list of gym exercise sets.
 */
export function calculateGymTotalVolumeKg(exercises?: GymExerciseSetDto[]): number {
  if (!exercises || exercises.length === 0) return 0;
  return exercises.reduce((acc, item) => {
    const sets = Math.max(0, Number(item.sets) || 0);
    const reps = Math.max(0, Number(item.reps) || 0);
    const weight = Math.max(0, Number(item.weightKg) || 0);
    return acc + sets * reps * weight;
  }, 0);
}

/**
 * Calculates running pace (min:sec /km) given distance in km and duration in minutes.
 */
export function calculateCardioPace(distanceKm: number, durationMinutes: number): string {
  if (!distanceKm || distanceKm <= 0 || !durationMinutes || durationMinutes <= 0) {
    return '0:00 /km';
  }
  const paceDecimal = durationMinutes / distanceKm;
  const paceMinutes = Math.floor(paceDecimal);
  const paceSeconds = Math.round((paceDecimal - paceMinutes) * 60);
  if (paceSeconds === 60) {
    return `${paceMinutes + 1}:00 /km`;
  }
  const paddedSeconds = paceSeconds < 10 ? `0${paceSeconds}` : `${paceSeconds}`;
  return `${paceMinutes}:${paddedSeconds} /km`;
}
