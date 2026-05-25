import {describe, expect, it} from 'vitest';
import {evaluateEndpointRequestGate} from './endpoint-request-policy';

describe('evaluateEndpointRequestGate', () => {
  it('skips in-flight keys first', () => {
    expect(evaluateEndpointRequestGate({
      key: 'a',
      now: 100_000,
      inFlightKeys: new Set(['a']),
      cooldownUntil: 130_000,
      freshnessMs: 10_000,
      queued: true,
    })).toEqual({
      shouldRun: false,
      skipReason: 'in-flight',
      nextRefreshAt: null,
    });
  });

  it('skips active cooldowns and returns the next refresh time', () => {
    expect(evaluateEndpointRequestGate({
      key: 'a',
      now: 100_000,
      cooldownUntil: 130_000,
      freshnessMs: 10_000,
    })).toEqual({
      shouldRun: false,
      skipReason: 'cooldown',
      nextRefreshAt: 130_000,
    });
  });

  it('skips fresh matching keys unless forced', () => {
    expect(evaluateEndpointRequestGate({
      key: 'a',
      now: 100_000,
      lastSuccessKey: 'a',
      lastSuccessAt: 95_000,
      freshnessMs: 10_000,
    })).toEqual({
      shouldRun: false,
      skipReason: 'fresh',
      nextRefreshAt: 105_000,
    });

    expect(evaluateEndpointRequestGate({
      key: 'a',
      now: 100_000,
      force: true,
      lastSuccessKey: 'a',
      lastSuccessAt: 95_000,
      freshnessMs: 10_000,
    })).toEqual({
      shouldRun: true,
      skipReason: null,
      nextRefreshAt: null,
    });
  });

  it('skips queued requests after freshness checks', () => {
    expect(evaluateEndpointRequestGate({
      key: 'a',
      now: 100_000,
      lastSuccessKey: 'a',
      lastSuccessAt: 80_000,
      freshnessMs: 10_000,
      queued: true,
    })).toEqual({
      shouldRun: false,
      skipReason: 'queued',
      nextRefreshAt: null,
    });
  });

  it('allows runnable requests', () => {
    expect(evaluateEndpointRequestGate({
      key: 'a',
      now: 100_000,
      freshnessMs: 10_000,
    })).toEqual({
      shouldRun: true,
      skipReason: null,
      nextRefreshAt: null,
    });
  });
});
