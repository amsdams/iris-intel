export interface IitcIrisScoresState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  requestState: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  game?: {
    enlightened: number;
    resistance: number;
    enlightenedPercent: number;
    resistancePercent: number;
  };
  region?: {
    status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
    name?: string;
    enlightenedAvg?: number;
    resistanceAvg?: number;
    checkpoints?: number;
    lastCheckpoint?: number;
    topAgents?: number;
    topAgentList?: {
      nick: string;
      team: 'E' | 'R' | 'N' | 'M';
    }[];
    center?: {
      latE6: number;
      lngE6: number;
    };
    error?: string;
  };
  elapsedMs?: number;
  error?: string;
}
