import {describe, expect, it} from 'vitest';
import {normalizeTeam} from './team';

describe('normalizeTeam', () => {
  it('normalizes Intel team names and short keys', () => {
    expect(normalizeTeam('ENLIGHTENED')).toBe('E');
    expect(normalizeTeam('e')).toBe('E');
    expect(normalizeTeam('RESISTANCE')).toBe('R');
    expect(normalizeTeam('r')).toBe('R');
    expect(normalizeTeam('NEUTRAL')).toBe('N');
    expect(normalizeTeam('n')).toBe('N');
  });

  it('normalizes Machina aliases', () => {
    expect(normalizeTeam('MACHINA')).toBe('M');
    expect(normalizeTeam('ALIENS')).toBe('M');
    expect(normalizeTeam('__MACHINA__')).toBe('M');
  });

  it('uses fallback for missing or unknown teams', () => {
    expect(normalizeTeam(undefined)).toBe('N');
    expect(normalizeTeam('unknown')).toBe('N');
    expect(normalizeTeam('unknown', {fallback: 'unknown'})).toBe('unknown');
  });
});
