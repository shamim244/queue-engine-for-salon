import { describe, it, expect } from 'bun:test';
import { calculateLiveTimerStats } from '../components/live-service-timer';

describe('Client-Side Live Service Timer Math', () => {
  it('formats elapsed time MM:SS accurately from anchor timestamp', () => {
    const now = 1700000000000;
    // 3 minutes and 25 seconds ago
    const started = new Date(now - (3 * 60 + 25) * 1000).toISOString();
    const stats = calculateLiveTimerStats(started, 15, now);

    expect(stats.elapsedSeconds).toBe(205);
    expect(stats.formattedElapsed).toBe('03:25');
  });

  it('calculates progress percentage and remaining time within estimated duration', () => {
    const now = 1700000000000;
    // 10 minutes into a 20-minute service (50% progress)
    const started = new Date(now - 10 * 60 * 1000).toISOString();
    const stats = calculateLiveTimerStats(started, 20, now);

    expect(stats.progressPercent).toBe(50);
    expect(stats.isOvertime).toBe(false);
    expect(stats.remainingSeconds).toBe(600);
    expect(stats.formattedRemaining).toBe('10:00');
  });

  it('detects overtime and caps progress bar at 100% when service exceeds duration', () => {
    const now = 1700000000000;
    // 25 minutes into a 20-minute service (+5 minutes overtime)
    const started = new Date(now - 25 * 60 * 1000).toISOString();
    const stats = calculateLiveTimerStats(started, 20, now);

    expect(stats.progressPercent).toBe(100);
    expect(stats.isOvertime).toBe(true);
    expect(stats.overtimeSeconds).toBe(300);
    expect(stats.remainingSeconds).toBe(0);
    expect(stats.formattedElapsed).toBe('25:00');
  });

  it('formats elapsed time HH:MM:SS when service exceeds 60 minutes', () => {
    const now = 1700000000000;
    // 5 hours, 30 minutes, and 15 seconds ago (330 minutes and 15 seconds)
    const started = new Date(now - (5 * 3600 + 30 * 60 + 15) * 1000).toISOString();
    const stats = calculateLiveTimerStats(started, 20, now);

    expect(stats.elapsedSeconds).toBe(19815);
    expect(stats.formattedElapsed).toBe('05:30:15');
    expect(stats.isOvertime).toBe(true);
    expect(stats.overtimeSeconds).toBe(19815 - 20 * 60);
  });

  it('handles invalid or future timestamps gracefully without negative values', () => {
    const now = 1700000000000;
    const future = new Date(now + 60000).toISOString();
    const stats = calculateLiveTimerStats(future, 15, now);

    expect(stats.elapsedSeconds).toBe(0);
    expect(stats.formattedElapsed).toBe('00:00');
    expect(stats.isOvertime).toBe(false);
  });
});
