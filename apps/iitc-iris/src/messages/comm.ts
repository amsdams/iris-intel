export type IitcIrisCommTab = 'all' | 'faction' | 'alerts';

export interface IitcIrisCommState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  tab: IitcIrisCommTab;
  messages: number;
  responseMessages?: number;
  addedMessages?: number;
  requestOlder?: boolean;
  oldMessagesWereAdded?: boolean;
  sendStatus?: 'idle' | 'sending' | 'sent' | 'error' | 'auth';
  sendError?: string;
  sendText?: string;
  sendId?: number;
  recent?: IitcIrisCommMessage[];
  elapsedMs?: number;
  error?: string;
  oldestTimestamp?: number;
  newestTimestamp?: number;
  bounds?: {
    minLatE6: number;
    minLngE6: number;
    maxLatE6: number;
    maxLngE6: number;
  };
}

export interface IitcIrisCommMessage {
  id: string;
  time: number;
  text: string;
  team: string;
  type: string;
  public?: boolean;
  secure?: boolean;
  alert?: boolean;
  auto?: boolean;
  narrowcast?: boolean;
  player?: string;
  playerTeam?: string;
  parts: IitcIrisCommMessagePart[];
  portals: {
    guid?: string;
    name?: string;
    address?: string;
    latE6?: number;
    lngE6?: number;
  }[];
  players: string[];
}

export interface IitcIrisCommMessagePart {
  type: 'text' | 'portal' | 'faction' | 'player' | 'unknown';
  text: string;
  team?: string;
  at?: boolean;
  sender?: boolean;
  portal?: {
    name?: string;
    address?: string;
    latE6?: number;
    lngE6?: number;
    guid?: string;
  };
}
