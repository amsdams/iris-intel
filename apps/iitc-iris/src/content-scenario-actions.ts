import type {IitcIrisLifecycleSettings} from './messages';
import type {ScenarioRun, ScenarioSnapshot} from './content-scenarios';
import {createScenarioSnapshotSummary} from './content-scenarios';

export const SCENARIO_EXPECTED_STEPS = ['previous', 'before-pan-south', 'reload', 'in-progress', 'done'] as const;

export function getScenarioDerivedState(
  scenarioRuns: readonly ScenarioRun[],
  activeScenarioRunId: string | null
): {
  activeScenarioRun: ScenarioRun | null;
  latestScenarioRun: ScenarioRun | null;
  scenarioSnapCount: number;
  scenarioProgressRun: ScenarioRun | null;
  scenarioProgressLabels: Set<string>;
} {
  const activeScenarioRun =
    scenarioRuns.find((run) => run.id === activeScenarioRunId && run.status === 'running') ?? null;
  const latestScenarioRun = scenarioRuns.length > 0 ? scenarioRuns[scenarioRuns.length - 1] : null;
  const scenarioSnapCount = scenarioRuns.reduce((total, run) => total + run.snapshots.length, 0);
  const scenarioProgressRun = activeScenarioRun ?? latestScenarioRun;
  const scenarioProgressLabels = scenarioProgressRun
    ? new Set(scenarioProgressRun.snapshots.map((snapshot) => snapshot.label))
    : new Set<string>();

  return {
    activeScenarioRun,
    latestScenarioRun,
    scenarioSnapCount,
    scenarioProgressRun,
    scenarioProgressLabels,
  };
}

export function createScenarioSnapshotObject(
  label: string,
  dockDiagnostics: Record<string, unknown>,
  settings: IitcIrisLifecycleSettings
): ScenarioSnapshot {
  return {
    label,
    capturedAt: new Date().toISOString(),
    diagnostics: {
      ...dockDiagnostics,
      lifecycleSettings: settings,
    },
  };
}

export function serializeScenarioHistory(
  scenarioRuns: readonly ScenarioRun[],
  activeScenarioRunId: string | null,
  currentSnapshot: ScenarioSnapshot,
  lifecycleSettings: IitcIrisLifecycleSettings
): string {
  const summarizeRun = (run: ScenarioRun): ScenarioRun => ({
    ...run,
    snapshots: run.snapshots.map((snapshot) => ({
      ...snapshot,
      summary: createScenarioSnapshotSummary(snapshot.diagnostics),
    })),
  });

  const currentRun: ScenarioRun = {
    id: `current-${Date.now()}`,
    name: 'current',
    startedAt: new Date().toISOString(),
    status: 'finished',
    lifecycleSettings,
    snapshots: [currentSnapshot],
  };

  const runs = (scenarioRuns.length > 0 ? scenarioRuns : [currentRun]).map(summarizeRun);
  const latest = runs.length > 0 ? runs[runs.length - 1] : currentRun;

  return JSON.stringify(
    {
      runs,
      latest,
      activeRunId: activeScenarioRunId,
      copiedAt: new Date().toISOString(),
    },
    null,
    2
  );
}
