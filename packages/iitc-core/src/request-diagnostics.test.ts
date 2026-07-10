import {describe, expect, it} from 'vitest';
import {
  beginIitcRequestDiagnostics,
  createIitcRequestDiagnosticsSnapshot,
  createIitcRequestDiagnosticsState,
  finishIitcRequestDiagnostics,
} from './request-diagnostics';

describe('IITC request diagnostics facade', () => {
  it('starts with no active requests', () => {
    expect(createIitcRequestDiagnosticsSnapshot(createIitcRequestDiagnosticsState(), 1000)).toEqual({
      activeRequests: 0,
      activeByEndpoint: {},
      active: [],
    });
  });

  it('tracks active requests by id, endpoint, group, and rounded elapsed time', () => {
    const first = beginIitcRequestDiagnostics(createIitcRequestDiagnosticsState(), 'getEntities', 100, 'map');
    const second = beginIitcRequestDiagnostics(first.state, 'getEntities', 125.4, 'retry');
    const third = beginIitcRequestDiagnostics(second.state, 'getPlexts', 200);

    expect(first.request.id).toBe(1);
    expect(second.request.id).toBe(2);
    expect(third.request.id).toBe(3);
    expect(createIitcRequestDiagnosticsSnapshot(third.state, 251)).toEqual({
      activeRequests: 3,
      activeByEndpoint: {
        getEntities: 2,
        getPlexts: 1,
      },
      active: [
        {id: 1, endpoint: 'getEntities', group: 'map', elapsedMs: 151},
        {id: 2, endpoint: 'getEntities', group: 'retry', elapsedMs: 126},
        {id: 3, endpoint: 'getPlexts', group: undefined, elapsedMs: 51},
      ],
    });
  });

  it('finishes requests immutably and ignores stale finish calls', () => {
    const first = beginIitcRequestDiagnostics(createIitcRequestDiagnosticsState(), 'getEntities', 100);
    const second = beginIitcRequestDiagnostics(first.state, 'getPlexts', 200);

    const finished = finishIitcRequestDiagnostics(second.state, first.request.id);
    expect(createIitcRequestDiagnosticsSnapshot(finished, 250)).toMatchObject({
      activeRequests: 1,
      activeByEndpoint: {getPlexts: 1},
      active: [{id: second.request.id, endpoint: 'getPlexts', elapsedMs: 50}],
    });

    expect(finishIitcRequestDiagnostics(finished, first.request.id)).toBe(finished);
  });
});
