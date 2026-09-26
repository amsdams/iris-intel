import {describe, expect, it} from 'vitest';
import type {ScenarioRun, ScenarioSnapshot} from './content-scenarios';
import {
  appendScenarioSnapshot,
  finishScenarioRunState,
} from './content-scenario-management';

describe('content-scenario-management', () => {
  const dummySnapshot: ScenarioSnapshot = {
    label: 'test',
    capturedAt: '2026-01-01T00:00:00Z',
    diagnostics: {},
  };

  const initialRun: ScenarioRun = {
    id: 'run-1',
    name: 'test-run',
    startedAt: '2026-01-01T00:00:00Z',
    status: 'running',
    lifecycleSettings: {
      iitcMovementDelay: false,
    },
    snapshots: [dummySnapshot],
  };

  it('appends snapshot to active scenario run', () => {
    const newSnapshot = {...dummySnapshot, label: 'pan-south'};
    const updated = appendScenarioSnapshot([initialRun], 'run-1', newSnapshot);
    expect(updated[0].snapshots.length).toBe(2);
    expect(updated[0].snapshots[1].label).toBe('pan-south');
  });

  it('finishes scenario run with final snapshot and timestamp', () => {
    const doneSnapshot = {...dummySnapshot, label: 'done'};
    const updated = finishScenarioRunState([initialRun], 'run-1', doneSnapshot, '2026-01-01T00:01:00Z');
    expect(updated[0].status).toBe('finished');
    expect(updated[0].finishedAt).toBe('2026-01-01T00:01:00Z');
    expect(updated[0].snapshots.length).toBe(2);
  });
});
