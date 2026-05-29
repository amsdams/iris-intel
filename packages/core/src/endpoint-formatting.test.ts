import {describe, expect, it} from 'vitest';
import {
  formatCompactEndpointStateLabel,
  formatCompactEndpointActivityMessage,
  formatEndpointErrorActivityMessage,
  formatEndpointCountdown,
  formatEndpointRequestActivityMessage,
  formatEndpointSuccessActivityMessage,
  formatFutureDelay,
  formatRelativeTime,
  getCompactEndpointStateKind,
  getDerivedEndpointStatus,
  sortEndpointDiagnostics,
} from './endpoint-formatting';
import type {EndpointDiagnostics} from './store';

function endpoint(partial: Partial<EndpointDiagnostics> & Pick<EndpointDiagnostics, 'key'>): EndpointDiagnostics {
  return {
    key: partial.key,
    status: partial.status ?? 'idle',
    lastRequestAt: partial.lastRequestAt ?? null,
    lastSuccessAt: partial.lastSuccessAt ?? null,
    lastErrorAt: partial.lastErrorAt ?? null,
    lastErrorStatus: partial.lastErrorStatus ?? null,
    lastErrorText: partial.lastErrorText ?? null,
    lastUrl: partial.lastUrl ?? '',
    nextAutoRefreshAt: partial.nextAutoRefreshAt ?? null,
    lastRefreshReason: partial.lastRefreshReason ?? null,
    lastSkipReason: partial.lastSkipReason ?? null,
    lastActiveSuccessAt: partial.lastActiveSuccessAt ?? null,
    lastPassiveSuccessAt: partial.lastPassiveSuccessAt ?? null,
    lastCoverageKey: partial.lastCoverageKey ?? null,
    lastPassId: partial.lastPassId ?? null,
    lastPassStartedAt: partial.lastPassStartedAt ?? null,
    lastPassReason: partial.lastPassReason ?? null,
    lastPassGeneration: partial.lastPassGeneration ?? null,
    lastPassTotalTiles: partial.lastPassTotalTiles ?? 0,
    lastPassRequestedTiles: partial.lastPassRequestedTiles ?? 0,
    lastPassFreshTiles: partial.lastPassFreshTiles ?? 0,
    lastPassBatchCount: partial.lastPassBatchCount ?? 0,
    lastPassDataZoom: partial.lastPassDataZoom ?? null,
    inFlightCount: partial.inFlightCount ?? 0,
    staleQueuedDropCount: partial.staleQueuedDropCount ?? 0,
    staleResponseIgnoreCount: partial.staleResponseIgnoreCount ?? 0,
  };
}

describe('endpoint formatting helpers', () => {
  it('formats future delays and relative times', () => {
    expect(formatFutureDelay(101_000, 100_000)).toBe('1s');
    expect(formatFutureDelay(170_000, 100_000)).toBe('1m 10s');
    expect(formatRelativeTime(40_000, 100_000)).toBe('1m ago');
    expect(formatRelativeTime(0, 100_000)).toBe('never');
  });

  it('derives stale endpoint status from last success age', () => {
    expect(getDerivedEndpointStatus(endpoint({
      key: 'entities',
      status: 'success',
      lastSuccessAt: 10_000,
    }), {entities: 60_000}, 100_000)).toBe('stale');
  });

  it('formats endpoint countdown labels', () => {
    expect(formatEndpointCountdown(endpoint({
      key: 'plexts',
      nextAutoRefreshAt: 130_000,
    }), {plexts: 'next auto refresh'}, 100_000)).toBe('30s');
    expect(formatEndpointCountdown(endpoint({
      key: 'plexts',
      status: 'in_flight',
      nextAutoRefreshAt: 130_000,
    }), {plexts: 'next auto refresh'}, 100_000)).toBe('refreshing now');
  });

  it('sorts active and scheduled endpoints first', () => {
    const sorted = sortEndpointDiagnostics([
      endpoint({key: 'inventory'}),
      endpoint({key: 'entities', nextAutoRefreshAt: 150_000}),
      endpoint({key: 'plexts', status: 'in_flight'}),
    ], {entities: 'refresh'}, ['entities', 'plexts', 'inventory']);

    expect(sorted.map((entry) => entry.key)).toEqual(['plexts', 'entities', 'inventory']);
  });

  it('formats compact Mini-IRIS endpoint state labels', () => {
    expect(getCompactEndpointStateKind({status: 'in_flight'})).toBe('active');
    expect(formatCompactEndpointStateLabel({status: 'in_flight', inFlightCount: 2})).toBe('Ax2');
    expect(formatCompactEndpointStateLabel({status: 'error', cooldownUntil: 130_000}, 100_000)).toBe('E 30s');
    expect(formatCompactEndpointStateLabel({status: 'idle', lastSkipReason: 'fresh', nextRefreshAt: 130_000}, 100_000)).toBe('F 30s');
  });

  it('formats endpoint activity log messages', () => {
    expect(formatEndpointRequestActivityMessage('/r/getEntities')).toBe('request getEntities');
    expect(formatEndpointSuccessActivityMessage('/r/getEntities', true)).toBe('success getEntities active');
    expect(formatEndpointSuccessActivityMessage('/r/getEntities', false)).toBe('success getEntities passive');
    expect(formatEndpointErrorActivityMessage(500, 'Server Error')).toBe('error 500 Server Error');
  });

  it('formats compact endpoint activity log messages', () => {
    expect(formatCompactEndpointActivityMessage('portalDetails', {status: 'in_flight', inFlightCount: 3})).toBe('NET portalDetails: in-flight x3');
    expect(formatCompactEndpointActivityMessage('plexts', {status: 'error', lastSkipReason: 'HTTP 500', cooldownUntil: 130_000}, 100_000)).toBe('NET plexts: error (HTTP 500); backoff 30s');
    expect(formatCompactEndpointActivityMessage('inventory', {status: 'idle', lastSkipReason: 'fresh', nextRefreshAt: 130_000}, 100_000)).toBe('NET inventory: skipped fresh; next 30s');
    expect(formatCompactEndpointActivityMessage('inventory', {status: 'idle'})).toBe(null);
  });
});
