import {describe, expect, it} from 'vitest';
import {buildPlextDebugSnapshot} from './plext-debug';
import type {Plext} from './store';

describe('buildPlextDebugSnapshot', () => {
  it('formats raw and parsed plext debug copy with refresh hints', () => {
    const plexts: Plext[] = [{
      id: 'plext-1',
      time: 1000,
      text: 'agent captured Portal A',
      team: 'E',
      type: 'SYSTEM_BROADCAST',
      categories: 1,
      markup: [
        ['PLAYER', {plain: 'agent', team: 'ENLIGHTENED'}],
        ['TEXT', {plain: ' captured '}],
        ['PORTAL', {name: 'Portal A', latE6: 52000000, lngE6: 4000000}],
      ],
    }];

    const snapshot = buildPlextDebugSnapshot({result: []}, {tab: 'all'}, plexts, {
      title: 'Test COMM parsed snapshot',
      maxAgeMs: Number.MAX_SAFE_INTEGER,
      capturedAt: '12:00:00',
    });

    expect(snapshot.capturedAt).toBe('12:00:00');
    expect(snapshot.raw).toContain('"capturedAt": "12:00:00"');
    expect(snapshot.parsed).toContain('Test COMM parsed snapshot @ 12:00:00');
    expect(snapshot.parsed).toContain('refreshHints 1');
    expect(snapshot.parsed).toContain('PORTAL:Portal A @ 52000000,4000000');
  });
});
