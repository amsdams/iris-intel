export interface IitcIrisAgentState {
  status: 'idle' | 'ready' | 'missing';
  nickname?: string;
  team?: 'E' | 'R' | 'N';
  level?: number;
  ap?: number;
  energy?: number;
  xmCapacity?: number;
  availableInvites?: number;
  minApForCurrentLevel?: number;
  minApForNextLevel?: number;
  xmPercent?: number;
  levelPercent?: number;
  apToNextLevel?: number;
  maxLevel?: boolean;
  staticFromPage?: boolean;
  subscription?: IitcIrisSubscriptionState;
}

export interface IitcIrisSubscriptionState {
  status: 'unknown' | 'loading' | 'active' | 'inactive' | 'error' | 'auth';
  hasActive?: boolean;
  elapsedMs?: number;
  checkedAt?: number;
  error?: string;
}
