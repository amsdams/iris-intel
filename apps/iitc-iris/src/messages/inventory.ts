import type {IitcIrisSubscriptionState} from './agent';

export interface IitcIrisInventoryState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  requestState: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  subscription?: IitcIrisSubscriptionState;
  items: number;
  rawItems?: number;
  keys: number;
  portalsWithKeys: number;
  capsules: number;
  selectedPortalGuid?: string;
  selectedPortalTitle?: string;
  portalKeysForSelectedPortal: null | {
    total: number;
    capsule: number;
    loose: number;
    capsules: Record<string, number>;
  };
  topItems?: {
    label: string;
    type: string;
    count: number;
    level?: number;
    rarity?: string;
  }[];
  topKeys?: {
    portalGuid: string;
    portalTitle?: string;
    count: number;
    capsule: number;
  }[];
  elapsedMs?: number;
  error?: string;
}
