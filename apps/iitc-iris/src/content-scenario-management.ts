import type {ScenarioRun, ScenarioSnapshot} from './content-scenarios';

export function appendScenarioSnapshot(
  runs: ScenarioRun[],
  activeRunId: string,
  snapshot: ScenarioSnapshot
): ScenarioRun[] {
  return runs.map((run) =>
    run.id === activeRunId
      ? {
          ...run,
          snapshots: [...run.snapshots, snapshot],
        }
      : run
  );
}

export function finishScenarioRunState(
  runs: ScenarioRun[],
  activeRunId: string,
  finalSnapshot: ScenarioSnapshot,
  finishedAt: string
): ScenarioRun[] {
  return runs.map((item) =>
    item.id === activeRunId
      ? {
          ...item,
          status: 'finished',
          finishedAt,
          snapshots: [...item.snapshots, finalSnapshot],
        }
      : item
  );
}
