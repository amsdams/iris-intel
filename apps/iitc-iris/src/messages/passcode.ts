export interface IitcIrisPasscodeRewardItem {
  label: string;
  count?: number;
  level?: number;
}

export interface IitcIrisPasscodeState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  requestState: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  passcode?: string;
  ap?: number;
  xm?: number;
  other?: string[];
  items?: IitcIrisPasscodeRewardItem[];
  elapsedMs?: number;
  error?: string;
}
