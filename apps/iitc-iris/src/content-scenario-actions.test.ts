import {describe, expect, it} from 'vitest';
import {
  createScenarioSnapshotObject,
  getScenarioDerivedState,
  SCENARIO_EXPECTED_STEPS,
  serializeScenarioHistory,
} from './content-scenario-actions';
import {loadStoredLifecycleSettings} from './content-storage-settings';

describe('content-scenario-actions', () => {
  const mockLifecycleSettings = loadStoredLifecycleSettings();

  it('computes derived scenario state correctly', () => {
    const runs = [
      {
        id: 'run-1',
        name: 'test',
        startedAt: '2026-01-01',
        status: 'running' as const,
        lifecycleSettings: mockLifecycleSettings,
        snapshots: [{label: 'previous', capturedAt: '2026-01-01', diagnostics: {}}],
      },
    ];

    const state = getScenarioDerivedState(runs, 'run-1');
    expect(state.activeScenarioRun?.id).toBe('run-1');
    expect(state.scenarioSnapCount).toBe(1);
    expect(state.scenarioProgressLabels.has('previous')).toBe(true);
    expect(SCENARIO_EXPECTED_STEPS).toContain('previous');
  });

  it('creates scenario snapshot object', () => {
    const snapshot = createScenarioSnapshotObject('previous', {app: 'IRIS'}, mockLifecycleSettings);
    expect(snapshot.label).toBe('previous');
    expect(snapshot.diagnostics).toEqual({
      app: 'IRIS',
      lifecycleSettings: mockLifecycleSettings,
    });
  });

  it('serializes scenario history to valid JSON string', () => {
    const snapshot = createScenarioSnapshotObject('previous', {app: 'IRIS'}, mockLifecycleSettings);
    const json = serializeScenarioHistory([], null, snapshot, mockLifecycleSettings);
    const parsed = JSON.parse(json) as {runs: {name: string}[]};
    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0]?.name).toBe('current');
  });
});
