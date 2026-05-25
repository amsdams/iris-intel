import {describe, expect, it} from 'vitest';
import {formatActionPoints, getPlayerLevelProgress} from './player-display';

describe('formatActionPoints', () => {
  it('formats AP with stable separators', () => {
    expect(formatActionPoints(1234567)).toBe('1,234,567');
    expect(formatActionPoints(null)).toBe('0');
  });
});

describe('getPlayerLevelProgress', () => {
  it('calculates clamped progress toward the next level', () => {
    expect(getPlayerLevelProgress({
      ap: 1_500,
      minApForCurrentLevel: 1_000,
      minApForNextLevel: 2_000,
    })).toEqual({
      hasNextLevel: true,
      percent: 50,
    });

    expect(getPlayerLevelProgress({
      ap: 3_000,
      minApForCurrentLevel: 1_000,
      minApForNextLevel: 2_000,
    }).percent).toBe(100);
  });

  it('treats missing next level as max level', () => {
    expect(getPlayerLevelProgress({
      ap: 10_000,
      minApForCurrentLevel: 0,
      minApForNextLevel: 0,
    })).toEqual({
      hasNextLevel: false,
      percent: 100,
    });
  });
});
