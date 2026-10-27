import {IITC_IRIS_MESSAGES, type IitcIrisAgentState, type IitcIrisMessage, type IitcIrisSubscriptionState} from '../messages';

interface IitcPagePlayer {
  ap?: unknown;
  available_invites?: unknown;
  energy?: unknown;
  min_ap_for_current_level?: unknown;
  min_ap_for_next_level?: unknown;
  nickname?: unknown;
  team?: unknown;
  verified_level?: unknown;
  level?: unknown;
  xm_capacity?: unknown;
}

interface AgentRuntime {
  getIitcAgentState: () => IitcIrisAgentState;
  postAgentState: () => void;
}

/** Publish the page's static Intel PLAYER profile with the current subscription snapshot. */
export function createAgentRuntime(getSubscriptionState: () => IitcIrisSubscriptionState): AgentRuntime {
  function toFiniteNumber(value: unknown): number | undefined {
    const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }

  function getAgentTeam(team: unknown): IitcIrisAgentState['team'] {
    if (team === 'ENLIGHTENED' || team === 'E') return 'E';
    if (team === 'RESISTANCE' || team === 'R') return 'R';
    return 'N';
  }

  function getIitcAgentState(): IitcIrisAgentState {
    const player = (window as Window & {PLAYER?: IitcPagePlayer}).PLAYER;
    if (!player || typeof player.nickname !== 'string' || !player.nickname) return {status: 'missing'};

    const level = toFiniteNumber(player.verified_level) ?? toFiniteNumber(player.level);
    const ap = toFiniteNumber(player.ap);
    const minApForCurrentLevel = toFiniteNumber(player.min_ap_for_current_level);
    const minApForNextLevel = toFiniteNumber(player.min_ap_for_next_level);
    const energy = toFiniteNumber(player.energy);
    const xmCapacity = toFiniteNumber(player.xm_capacity);
    const availableInvites = toFiniteNumber(player.available_invites);
    const levelSpan = minApForNextLevel !== undefined && minApForCurrentLevel !== undefined
      ? minApForNextLevel - minApForCurrentLevel
      : 0;
    const maxLevel = minApForNextLevel === undefined || minApForNextLevel <= 0 || levelSpan <= 0;
    const levelPercent = maxLevel || ap === undefined || minApForCurrentLevel === undefined
      ? maxLevel ? 100 : undefined
      : Math.max(0, Math.min(100, Math.round(((ap - minApForCurrentLevel) / levelSpan) * 100)));
    const xmPercent = energy !== undefined && xmCapacity !== undefined && xmCapacity > 0
      ? Math.max(0, Math.min(100, Math.round((energy / xmCapacity) * 100)))
      : undefined;

    return {
      status: 'ready',
      nickname: player.nickname,
      team: getAgentTeam(player.team),
      level,
      ap,
      energy,
      xmCapacity,
      availableInvites,
      minApForCurrentLevel,
      minApForNextLevel,
      xmPercent,
      levelPercent,
      apToNextLevel: maxLevel || ap === undefined || minApForNextLevel === undefined ? undefined : Math.max(0, minApForNextLevel - ap),
      maxLevel,
      staticFromPage: true,
      subscription: getSubscriptionState(),
    };
  }

  function postAgentState(): void {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.agentStatus,
      agent: getIitcAgentState(),
    } satisfies IitcIrisMessage, '*');
  }

  return {getIitcAgentState, postAgentState};
}
