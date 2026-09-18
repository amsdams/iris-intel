import {describe, expect, it} from 'vitest';
import {
  createScenarioSnapshotObject,
  getScenarioDerivedState,
  SCENARIO_EXPECTED_STEPS,
} from './content-scenario-actions';
import type {IitcIrisLifecycleSettings} from './messages';

const DEFAULT_SETTINGS: IitcIrisLifecycleSettings = {
  iitcMovementDelay: false,
};

describe('content-scenario-workflow helpers', () => {
  it('creates scenario snapshot object correctly', () => {
    const snapshot = createScenarioSnapshotObject('test-label', {status: 'ok'}, DEFAULT_SETTINGS);
    expect(snapshot.label).toBe('test-label');
    expect(snapshot.diagnostics).toEqual({status: 'ok', lifecycleSettings: DEFAULT_SETTINGS});
  });

  it('calculates derived scenario state accurately', () => {
    const runs = [{
      id: 'run-1',
      name: 'scenario-1',
      startedAt: '2026-09-18T10:00:00Z',
      status: 'running' as const,
      lifecycleSettings: DEFAULT_SETTINGS,
      snapshots: [createScenarioSnapshotObject('previous', {}, DEFAULT_SETTINGS)],
    }];

    const derived = getScenarioDerivedState(runs, 'run-1');
    expect(derived.activeScenarioRun?.id).toBe('run-1');
    expect(derived.latestScenarioRun?.id).toBe('run-1');
    expect(derived.scenarioSnapCount).toBe(1);
    expect(SCENARIO_EXPECTED_STEPS.length).toBeGreaterThan(0);
  });
});
