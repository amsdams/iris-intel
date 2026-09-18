import {useState} from 'preact/hooks';
import {
  type IitcIrisLifecycleSettings,
} from './messages';
import {
  type ScenarioRun,
  type ScenarioSnapshot,
  isScenarioSettled,
} from './content-scenarios';
import {
  appendScenarioSnapshot,
  finishScenarioRunState,
} from './content-scenario-management';
import {
  createScenarioSnapshotObject,
  getScenarioDerivedState,
  SCENARIO_EXPECTED_STEPS,
  serializeScenarioHistory,
} from './content-scenario-actions';
import type {createDockDiagnostics} from './content-dock-diagnostics';

export interface UseScenarioWorkflowParams {
  lifecycleSettings: IitcIrisLifecycleSettings;
  dockDiagnostics: ReturnType<typeof createDockDiagnostics>;
  canPan: boolean;
  panMap: (direction: 'south') => void;
  setLifecycleSettings: (settings: IitcIrisLifecycleSettings) => void;
}

export interface UseScenarioWorkflowResult {
  scenarioRuns: ScenarioRun[];
  activeScenarioRun: ScenarioRun | null;
  latestScenarioRun: ScenarioRun | null;
  scenarioSnapCount: number;
  scenarioStatus: string;
  scenarioProgressRun: ScenarioRun | null;
  scenarioProgressLabels: Set<string>;
  scenarioExpectedSteps: readonly string[];
  startScenarioRun: (name: string, overrides: Partial<IitcIrisLifecycleSettings>) => void;
  captureScenarioSnapshot: (label: string) => void;
  panScenarioSouth: () => void;
  finishScenarioRun: () => void;
  clearScenarioRuns: () => void;
  copyScenarioRun: () => void;
  createScenarioSnapshot: (label: string, settings?: IitcIrisLifecycleSettings) => ScenarioSnapshot;
}

export function useScenarioWorkflow(params: UseScenarioWorkflowParams): UseScenarioWorkflowResult {
  const {
    lifecycleSettings,
    dockDiagnostics,
    canPan,
    panMap,
    setLifecycleSettings,
  } = params;

  const [scenarioRuns, setScenarioRuns] = useState<ScenarioRun[]>([]);
  const [activeScenarioRunId, setActiveScenarioRunId] = useState<string | null>(null);
  const [scenarioStatus, setScenarioStatus] = useState('');

  const setScenarioStatusBriefly = (value: string): void => {
    setScenarioStatus(value);
    window.setTimeout(() => setScenarioStatus(''), 1800);
  };

  const createScenarioSnapshot = (label: string, settings = lifecycleSettings): ScenarioSnapshot =>
    createScenarioSnapshotObject(label, dockDiagnostics, settings);

  const {
    activeScenarioRun,
    latestScenarioRun,
    scenarioSnapCount,
    scenarioProgressRun,
    scenarioProgressLabels,
  } = getScenarioDerivedState(scenarioRuns, activeScenarioRunId);

  const scenarioExpectedSteps = SCENARIO_EXPECTED_STEPS;

  const startScenarioRun = (name: string, overrides: Partial<IitcIrisLifecycleSettings>): void => {
    if (activeScenarioRun) {
      setScenarioStatusBriefly('finish current run first');
      return;
    }
    const nextSettings: IitcIrisLifecycleSettings = { ...lifecycleSettings, ...overrides };
    const runId = `${name}-${Date.now()}`;
    setLifecycleSettings(nextSettings);
    setScenarioRuns((current) => [...current, {
      id: runId,
      name,
      startedAt: new Date().toISOString(),
      status: 'running',
      lifecycleSettings: nextSettings,
      snapshots: [createScenarioSnapshot('previous', nextSettings)],
    }]);
    setActiveScenarioRunId(runId);
    setScenarioStatusBriefly(`${name}: previous captured`);
  };

  const captureScenarioSnapshot = (label: string): void => {
    const runId = activeScenarioRunId;
    if (!runId) {
      setScenarioStatusBriefly('start a scenario first');
      return;
    }
    setScenarioRuns((current) =>
      appendScenarioSnapshot(current, runId, createScenarioSnapshot(label, activeScenarioRun?.lifecycleSettings))
    );
    setScenarioStatusBriefly(`${label} captured`);
  };

  const panScenarioSouth = (): void => {
    if (!canPan || !activeScenarioRun) return;
    captureScenarioSnapshot('before-pan-south');
    panMap('south');
  };

  const finishScenarioRun = (): void => {
    const run = activeScenarioRun;
    if (!run) {
      setScenarioStatusBriefly('no active run');
      return;
    }
    const finalLabel = isScenarioSettled(dockDiagnostics) ? 'done' : 'done-active';
    const finishedAt = new Date().toISOString();
    const finalSnapshot = createScenarioSnapshot(finalLabel, run.lifecycleSettings);
    setScenarioRuns((current) => finishScenarioRunState(current, run.id, finalSnapshot, finishedAt));
    setActiveScenarioRunId(null);
    setScenarioStatusBriefly(finalLabel === 'done' ? `${run.name} finished` : `${run.name} captured active finish`);
  };

  const clearScenarioRuns = (): void => {
    setScenarioRuns([]);
    setActiveScenarioRunId(null);
    setScenarioStatusBriefly('scenario history cleared');
  };

  const copyScenarioRun = (): void => {
    const json = serializeScenarioHistory(
      scenarioRuns,
      activeScenarioRunId,
      createScenarioSnapshot('current'),
      lifecycleSettings
    );
    void navigator.clipboard.writeText(json)
      .then(() => setScenarioStatusBriefly('scenario history copied'))
      .catch(() => setScenarioStatusBriefly('copy failed'));
  };

  return {
    scenarioRuns,
    activeScenarioRun,
    latestScenarioRun,
    scenarioSnapCount,
    scenarioStatus,
    scenarioProgressRun,
    scenarioProgressLabels,
    scenarioExpectedSteps,
    startScenarioRun,
    captureScenarioSnapshot,
    panScenarioSouth,
    finishScenarioRun,
    clearScenarioRuns,
    copyScenarioRun,
    createScenarioSnapshot,
  };
}
