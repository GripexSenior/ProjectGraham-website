import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl,
  getPreviousMonthKey,
  hasUnsettledPreviousMonth,
  calculateGymTotalVolumeKg,
  calculateCardioPace,
} from './domainUtils';
import { MonthlyGoalDto, MonthSettlementStatusDto } from '../types';

test('extractYouTubeVideoId extracts 11-char ID from watch, short, and youtu.be URLs', () => {
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  );
  assert.equal(
    extractYouTubeVideoId('https://youtu.be/tlFGOSEI_lo?si=12345'),
    'tlFGOSEI_lo'
  );
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/shorts/Hc16Y9k3LzA'),
    'Hc16Y9k3LzA'
  );
  assert.equal(extractYouTubeVideoId('https://example.com/article'), null);
});

test('getYouTubeThumbnailUrl returns maxresdefault URL', () => {
  assert.equal(
    getYouTubeThumbnailUrl('dQw4w9WgXcQ'),
    'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
  );
});

test('getPreviousMonthKey computes previous YYYY-MM accurately', () => {
  assert.equal(getPreviousMonthKey('2026-11'), '2026-10');
  assert.equal(getPreviousMonthKey('2026-01'), '2025-12');
});

test('hasUnsettledPreviousMonth detects pending goals and respects settlement flag', () => {
  const sampleGoals: MonthlyGoalDto[] = [
    {
      id: 'g1',
      groupId: 'grp-1',
      userId: 'user-ja',
      monthKey: '2026-10',
      title: 'Przebiec 100 km',
      domain: 'Sylwetka i Zdrowie',
      targetMetricDescription: '100 km w październiku',
      progressPercentage: 85,
      auditStatus: 'Pending',
      createdAt: '2026-10-01T10:00:00Z',
    },
  ];

  const unsettledList: MonthSettlementStatusDto[] = [
    { userId: 'user-ja', monthKey: '2026-10', isSettled: false },
  ];

  const settledList: MonthSettlementStatusDto[] = [
    { userId: 'user-ja', monthKey: '2026-10', isSettled: true, settledAt: '2026-11-02T12:00:00Z' },
  ];

  assert.equal(
    hasUnsettledPreviousMonth('user-ja', '2026-10', sampleGoals, unsettledList),
    true
  );
  assert.equal(
    hasUnsettledPreviousMonth('user-ja', '2026-10', sampleGoals, settledList),
    false
  );
  assert.equal(
    hasUnsettledPreviousMonth('user-marek', '2026-10', sampleGoals, unsettledList),
    false
  );
});

test('calculateGymTotalVolumeKg computes sets * reps * weight sum', () => {
  const volume = calculateGymTotalVolumeKg([
    { id: '1', exerciseName: 'Wyciskanie sztangi leżąc', sets: 4, reps: 8, weightKg: 90 },
    { id: '2', exerciseName: 'Przysiad ze sztangą', sets: 4, reps: 6, weightKg: 120 },
  ]);
  // 4*8*90 = 2880, 4*6*120 = 2880 => 5760
  assert.equal(volume, 5760);
});

test('calculateCardioPace formats min:sec /km accurately', () => {
  assert.equal(calculateCardioPace(10, 48.5), '4:51 /km');
  assert.equal(calculateCardioPace(5, 25), '5:00 /km');
});
