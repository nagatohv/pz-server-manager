import { describe, it, expect } from 'vitest';
import { formatUptime } from '../utils/uptime.js';

describe('formatUptime', () => {
  it('formats zero as "0s"', () => {
    expect(formatUptime(0)).toBe('0s');
  });

  it('formats sub-minute durations as seconds only', () => {
    expect(formatUptime(45)).toBe('45s');
  });

  it('formats minute-level durations as minutes and seconds', () => {
    expect(formatUptime(125)).toBe('2m 5s');
  });

  it('formats hour-level durations as hours and minutes (no seconds shown)', () => {
    expect(formatUptime(3725)).toBe('1h 2m');
  });

  it('formats day-level durations as days, hours, minutes and seconds', () => {
    expect(formatUptime(90061)).toBe('1d 1h 1m 1s');
  });

  it('clamps negative input to zero', () => {
    expect(formatUptime(-100)).toBe('0s');
  });

  it('floors fractional seconds', () => {
    expect(formatUptime(59.9)).toBe('59s');
  });
});
