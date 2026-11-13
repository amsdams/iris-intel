import type {IitcTeam} from './types';

export const IITC_CHECKPOINT_COUNT = 35;
export const IITC_CHECKPOINT_DURATION = 5 * 60 * 60 * 1000;
export const IITC_CYCLE_DURATION = IITC_CHECKPOINT_COUNT * IITC_CHECKPOINT_DURATION;
export interface IitcRegionCheckpoint {checkpoint: number; enlightened: number; resistance: number}
export interface IitcRegionScore {
  name: string;
  enlightenedAvg: number;
  resistanceAvg: number;
  scoreHistory: IitcRegionCheckpoint[];
  checkpoints: number;
  lastCheckpoint: number;
  topAgents: number;
  topAgentList: {nick: string; team: IitcTeam}[];
  cycleStart: number;
  receivedAt: number;
}

function score(value: unknown): number | undefined {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}

/** Keep all checkpoint records; totals/forecasts must not be inferred from the server's rounded averages. */
export function parseIitcRegionScoreResponse(response: unknown, now = Date.now()): IitcRegionScore | undefined {
  const result: unknown = response && typeof response === 'object' ? (response as {result?: unknown}).result : undefined;
  if (!result || typeof result !== 'object') return;
  const data = result as Record<string, unknown>;
  const gameScore = Array.isArray(data.gameScore) ? data.gameScore : [];
  const enlightenedAvg = score(gameScore[0]);
  const resistanceAvg = score(gameScore[1]);
  if (typeof data.regionName !== 'string' || enlightenedAvg === undefined || resistanceAvg === undefined
    || !Array.isArray(data.scoreHistory) || !Array.isArray(data.topAgents)) return;
  const history = new Map<number, IitcRegionCheckpoint>();
  for (const entry of data.scoreHistory) {
    if (!Array.isArray(entry)) continue;
    const checkpoint = score(entry[0]);
    const enlightened = score(entry[1]);
    const resistance = score(entry[2]);
    if (checkpoint === undefined || checkpoint < 1 || checkpoint > IITC_CHECKPOINT_COUNT
      || Number(entry[0]) !== checkpoint || enlightened === undefined || resistance === undefined) continue;
    history.set(checkpoint, {checkpoint, enlightened, resistance});
  }
  const scoreHistory = [...history.values()].sort((a, b) => a.checkpoint - b.checkpoint);
  const topAgentList = data.topAgents.flatMap((raw): IitcRegionScore['topAgentList'] => {
    if (!raw || typeof raw !== 'object') return [];
    const agent = raw as Record<string, unknown>;
    if (typeof agent.nick !== 'string') return [];
    return [{nick: agent.nick, team: agent.team === 'RESISTANCE' ? 'R' : agent.team === 'ENLIGHTENED' ? 'E'
      : agent.team === 'MACHINA' ? 'M' : 'N'}];
  });
  return {name: data.regionName, enlightenedAvg, resistanceAvg, scoreHistory, checkpoints: scoreHistory.length,
    lastCheckpoint: scoreHistory.at(-1)?.checkpoint ?? 0, topAgents: topAgentList.length, topAgentList,
    cycleStart: Math.floor(now / IITC_CYCLE_DURATION) * IITC_CYCLE_DURATION, receivedAt: now};
}

/** IITC uses the lower median for even sample counts, rather than averaging the middle two. */
export function getIitcRegionProjection(history: readonly IitcRegionCheckpoint[], checkpoint = IITC_CHECKPOINT_COUNT): {
  enlightened: {total: number; median: number; estimate: number}; resistance: {total: number; median: number; estimate: number};
  requiredMu: number; trailingTeam?: 'E' | 'R';
} {
  const project = (team: 'enlightened' | 'resistance'): {total: number; median: number; estimate: number} => {
    const values = history.filter(row => row.checkpoint <= checkpoint).map(row => row[team]).sort((a, b) => a - b);
    const total = values.reduce((sum, value) => sum + value, 0);
    const allValues = history.map(row => row[team]).sort((a, b) => a - b);
    const median = allValues[Math.floor((allValues.length - 1) / 2)] ?? 0;
    return {total, median, estimate: Math.floor((total + median * (checkpoint - values.length)) / checkpoint)};
  };
  const enlightened = project('enlightened');
  const resistance = project('resistance');
  return {enlightened, resistance, requiredMu: Math.abs(enlightened.estimate - resistance.estimate) * checkpoint + 1,
    trailingTeam: enlightened.estimate < resistance.estimate ? 'E' as const : resistance.estimate < enlightened.estimate ? 'R' as const : undefined};
}

export function getIitcCheckpointTime(cycleStart: number, checkpoint: number): number {
  return cycleStart + checkpoint * IITC_CHECKPOINT_DURATION;
}
