import {isIitcAuthError} from '../intel/intel-request';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisRequestDiagnostics, type IitcIrisScoresState} from '../messages';

interface ScoresRuntimeOptions {
  getMapCenterE6: () => {latE6: number; lngE6: number} | undefined;
  postIntelEndpoint: (endpoint: string, payload: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;
  getIitcRequestDiagnostics: () => IitcIrisRequestDiagnostics;
}

interface ScoresRuntime {
  getState: () => IitcIrisScoresState;
  refreshScores: () => Promise<void>;
  cancelActiveScoresFetch: () => void;
}

export function createScoresRuntime(options: ScoresRuntimeOptions): ScoresRuntime {
  const {getMapCenterE6, postIntelEndpoint, getIitcRequestDiagnostics} = options;
  let currentScoresAbortController: AbortController | undefined;
  let latestScoresState: IitcIrisScoresState = {status: 'idle', requestState: 'idle', region: {status: 'idle'}};

  function cancelActiveScoresFetch(): void {
    currentScoresAbortController?.abort();
    currentScoresAbortController = undefined;
  }

  function postScoresState(): void {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.scoresStatus,
      scores: latestScoresState,
      requestDiagnostics: getIitcRequestDiagnostics(),
    } satisfies IitcIrisMessage, '*');
  }

  function numberFromUnknown(value: unknown): number | undefined {
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN;
    return Number.isFinite(number) ? number : undefined;
  }

  function parseGameScoreResponse(response: unknown): NonNullable<IitcIrisScoresState['game']> | undefined {
    const result = response && typeof response === 'object' ? (response as {result?: unknown}).result : undefined;
    if (!Array.isArray(result)) return undefined;
    const enlightened = numberFromUnknown(result[0]);
    const resistance = numberFromUnknown(result[1]);
    if (enlightened === undefined || resistance === undefined) return undefined;
    const total = Math.max(1, enlightened + resistance);
    return {
      enlightened,
      resistance,
      enlightenedPercent: (enlightened / total) * 100,
      resistancePercent: (resistance / total) * 100,
    };
  }

  function parseRegionScoreResponse(response: unknown, center: NonNullable<IitcIrisScoresState['region']>['center']): NonNullable<IitcIrisScoresState['region']> {
    const result = response && typeof response === 'object' ? (response as {result?: unknown}).result : undefined;
    if (!result || typeof result !== 'object') return {status: 'empty', center};
    const region = result as {
      regionName?: unknown;
      gameScore?: unknown;
      scoreHistory?: unknown;
      topAgents?: unknown;
    };
    const gameScore = Array.isArray(region.gameScore) ? region.gameScore : [];
    const scoreHistory = Array.isArray(region.scoreHistory) ? region.scoreHistory : [];
    const topAgents = Array.isArray(region.topAgents) ? region.topAgents : [];
    const topAgentList = topAgents
      .map((agent) => {
        const candidate = agent && typeof agent === 'object' ? agent as {nick?: unknown; team?: unknown} : {};
        const team = candidate.team === 'RESISTANCE'
          ? 'R'
          : candidate.team === 'ENLIGHTENED'
            ? 'E'
            : candidate.team === 'MACHINA'
              ? 'M'
              : 'N';
        return typeof candidate.nick === 'string' ? {nick: candidate.nick, team} : undefined;
      })
      .filter((agent): agent is {nick: string; team: 'E' | 'R' | 'N' | 'M'} => agent !== undefined);
    const checkpointIndexes = scoreHistory
      .map((entry) => Array.isArray(entry) ? numberFromUnknown(entry[0]) : undefined)
      .filter((value): value is number => value !== undefined);

    return {
      status: 'ready',
      name: typeof region.regionName === 'string' ? region.regionName : undefined,
      enlightenedAvg: numberFromUnknown(gameScore[0]),
      resistanceAvg: numberFromUnknown(gameScore[1]),
      checkpoints: scoreHistory.length,
      lastCheckpoint: checkpointIndexes.length > 0 ? Math.max(...checkpointIndexes) : undefined,
      topAgents: topAgents.length,
      topAgentList,
      center,
    };
  }

  async function refreshScores(): Promise<void> {
    cancelActiveScoresFetch();
    const center = getMapCenterE6();
    if (!center) {
      latestScoresState = {status: 'error', requestState: 'error', region: {status: 'error'}, error: 'missing map center'};
      postScoresState();
      return;
    }

    const abortController = new AbortController();
    currentScoresAbortController = abortController;
    const startedAt = performance.now();
    latestScoresState = {
      ...latestScoresState,
      status: 'loading',
      requestState: 'loading',
      error: undefined,
      region: {
        ...(latestScoresState.region ?? {status: 'idle'}),
        status: 'loading',
        center,
        error: undefined,
      },
    };
    postScoresState();

    try {
      const [gameResponse, regionResponse] = await Promise.all([
        postIntelEndpoint('getGameScore', {}, abortController.signal),
        postIntelEndpoint('getRegionScoreDetails', center, abortController.signal),
      ]);
      abortController.signal.throwIfAborted();
      const game = parseGameScoreResponse(gameResponse);
      const region = parseRegionScoreResponse(regionResponse, center);
      latestScoresState = {
        status: game || region.status === 'ready' ? 'ready' : 'empty',
        requestState: 'ready',
        game,
        region,
        elapsedMs: performance.now() - startedAt,
      };
      postScoresState();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const status = isIitcAuthError(error) ? 'auth' : 'error';
      latestScoresState = {
        ...latestScoresState,
        status,
        requestState: status,
        elapsedMs: performance.now() - startedAt,
        region: {
          ...(latestScoresState.region ?? {status: 'idle'}),
          status,
          center,
          error: error instanceof Error ? error.message : String(error),
        },
        error: error instanceof Error ? error.message : String(error),
      };
      postScoresState();
    } finally {
      if (currentScoresAbortController === abortController) currentScoresAbortController = undefined;
    }
  }

  return {getState: () => latestScoresState, refreshScores, cancelActiveScoresFetch};
}
