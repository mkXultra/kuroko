import { describe, it, expect } from 'vitest';
import { Scheduler } from '../scheduler.js';

describe('Scheduler', () => {
  it('should parse valid ISO date string', () => {
    const target = '2025-01-01T10:00:00.000Z';
    const result = Scheduler.calculateNextRun({ type: 'one-shot', value: target });
    expect(result).toBe(target);
  });

  it('should parse cron expression', () => {
    // 毎年1月1日の午前0時
    const cron = '0 0 1 1 *';
    const result = Scheduler.calculateNextRun({ type: 'recurring', value: cron });
    
    const nextRun = new Date(result);
    expect(nextRun.getMonth()).toBe(0); // 0-indexed, Jan
    expect(nextRun.getDate()).toBe(1);
    expect(nextRun.getHours()).toBe(0);
    expect(nextRun.getMinutes()).toBe(0);
    expect(nextRun.getTime()).toBeGreaterThan(Date.now());
  });

  it('should parse interval (e.g. 2h) as one-shot relative to now', () => {
    const now = Date.now();
    const result = Scheduler.calculateNextRun({ type: 'one-shot', value: '2h' });
    const nextRun = new Date(result).getTime();
    
    // 約2時間後（許容誤差を持たせる）
    const diff = nextRun - now;
    const twoHoursMs = 2 * 60 * 60 * 1000;
    
    expect(diff).toBeGreaterThanOrEqual(twoHoursMs);
    expect(diff).toBeLessThan(twoHoursMs + 1000); // 1秒以内の誤差
  });

  it('should throw error for invalid format', () => {
    expect(() => {
      Scheduler.calculateNextRun({ type: 'one-shot', value: 'invalid-date' });
    }).toThrow();
  });
});
