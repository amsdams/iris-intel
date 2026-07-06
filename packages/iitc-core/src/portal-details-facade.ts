import type {IitcPortalDetails, IitcPortalDetailsResponse} from './portal-details';
import {parseIitcPortalDetailsResponse} from './portal-details';

export interface IitcPortalDetailsHistoryState {
  visited: boolean;
  captured: boolean;
  scoutControlled: boolean;
}

export interface IitcPortalDetailsRequestState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  guid?: string;
  elapsedMs?: number;
  cached?: boolean;
  error?: string;
  owner?: string;
  mods?: IitcPortalDetails['mods'];
  resonators?: IitcPortalDetails['resonators'];
  history?: IitcPortalDetailsHistoryState;
  mitigation?: IitcPortalDetails['mitigation'];
  hasMissionsStartingHere?: boolean;
}

export interface IitcPortalDetailsApplyDiagnostics {
  guid: string;
  linkCount: number;
  elapsedMs: number;
  parsed: boolean;
  status: IitcPortalDetailsRequestState['status'];
}

export interface IitcPortalDetailsApplyResult {
  state: IitcPortalDetailsRequestState;
  details: IitcPortalDetails | null;
  diagnostics: IitcPortalDetailsApplyDiagnostics;
}

export type IitcPortalDetailsCache = Map<string, IitcPortalDetailsRequestState>;

export function getIitcCachedPortalDetails(
  cache: IitcPortalDetailsCache,
  guid: string,
): IitcPortalDetailsRequestState | null {
  const cachedDetails = cache.get(guid);
  return cachedDetails ? {...cachedDetails, cached: true} : null;
}

export function createIitcPortalDetailsLoadingState(guid: string): IitcPortalDetailsRequestState {
  return {status: 'loading', guid};
}

export function createIitcPortalDetailsAuthState(guid: string, error: string): IitcPortalDetailsRequestState {
  return {status: 'auth', guid, error};
}

export function createIitcPortalDetailsErrorState(
  guid: string,
  elapsedMs: number,
  error: string,
): IitcPortalDetailsRequestState {
  return {status: 'error', guid, elapsedMs, error};
}

export function toIitcPortalDetailsRequestState(
  details: IitcPortalDetails,
  elapsedMs: number,
): IitcPortalDetailsRequestState {
  return {
    status: 'ready',
    guid: details.guid,
    elapsedMs,
    owner: details.owner,
    mods: details.mods,
    resonators: details.resonators,
    history: {
      visited: details.visited,
      captured: details.captured,
      scoutControlled: details.scoutControlled,
    },
    mitigation: details.mitigation,
    hasMissionsStartingHere: details.hasMissionsStartingHere,
  };
}

export function applyIitcPortalDetailsResponse(options: {
  response: IitcPortalDetailsResponse;
  guid: string;
  linkCount?: number;
  elapsedMs: number;
}): IitcPortalDetailsApplyResult {
  const linkCount = options.linkCount ?? 0;
  const details = parseIitcPortalDetailsResponse(options.response, options.guid, linkCount);
  const state = details
    ? toIitcPortalDetailsRequestState(details, options.elapsedMs)
    : createIitcPortalDetailsErrorState(options.guid, options.elapsedMs, 'empty portal details');

  return {
    state,
    details,
    diagnostics: {
      guid: options.guid,
      linkCount,
      elapsedMs: options.elapsedMs,
      parsed: details !== null,
      status: state.status,
    },
  };
}

export function writeIitcPortalDetailsCache(
  cache: IitcPortalDetailsCache,
  guid: string,
  state: IitcPortalDetailsRequestState,
  maxEntries = 12,
): void {
  cache.set(guid, state);
  while (cache.size > maxEntries) {
    const firstKey = cache.keys().next().value as string | undefined;
    if (!firstKey) return;
    cache.delete(firstKey);
  }
}
