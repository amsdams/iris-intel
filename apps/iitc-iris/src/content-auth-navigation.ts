import type {IitcIrisCommTab, IitcIrisMissionSource, IitcIrisPasscodeState} from './messages';
import type {IitcIrisSidePanelId} from './menu-registry';

export interface LocationAdapter {
  origin: string;
  pathname: string;
  reload: () => void;
  assign: (url: string) => void;
}

export function performIntelLoginRedirect(
  storageKey: string,
  bypassMs: number,
  rootElement: HTMLElement | null,
  locationObj: LocationAdapter
): void {
  try {
    sessionStorage.setItem(storageKey, String(Date.now() + bypassMs));
  } catch {
    // Login recovery still works without session storage.
  }
  rootElement?.remove();
  if (locationObj.origin === 'https://intel.ingress.com' && locationObj.pathname === '/intel') {
    locationObj.reload();
    return;
  }
  locationObj.assign('https://intel.ingress.com/intel');
}

export interface RetryAuthCallbacks {
  refreshComm: (tab: IitcIrisCommTab) => void;
  refreshScores: () => void;
  refreshInventory: () => void;
  refreshMissions: (source: IitcIrisMissionSource) => void;
  requestSearch: (term: string, clear: boolean) => void;
  searchTerm: string;
  passcodeDraft: string;
  passcodeState: IitcIrisPasscodeState;
  retryPasscode: (passcode: string) => void;
  retryMapFetch: () => void;
}

export function retryActiveAuthPanelRequest(
  activeSidePanel: IitcIrisSidePanelId | null,
  activeSheet: string,
  commTab: IitcIrisCommTab,
  missionsSource: IitcIrisMissionSource | undefined,
  callbacks: RetryAuthCallbacks
): void {
  if (activeSidePanel === 'comm') {
    callbacks.refreshComm(commTab);
    return;
  }
  if (activeSidePanel === 'scores') {
    callbacks.refreshScores();
    return;
  }
  if (activeSidePanel === 'inventory') {
    callbacks.refreshInventory();
    return;
  }
  if (activeSidePanel === 'missions') {
    callbacks.refreshMissions(missionsSource ?? 'view');
    return;
  }
  if (activeSidePanel === 'passcode' && (callbacks.passcodeDraft.trim() || callbacks.passcodeState.passcode)) {
    callbacks.retryPasscode(callbacks.passcodeDraft.trim() || callbacks.passcodeState.passcode || '');
    return;
  }
  if (activeSheet === 'search' && callbacks.searchTerm.trim()) {
    callbacks.requestSearch(callbacks.searchTerm.trim(), false);
    return;
  }
  callbacks.retryMapFetch();
}

export interface AppAuthStates {
  entityFetch: {authRequired?: boolean};
  selectedPortalDetails?: {status?: string} | null;
  commState: {status?: string; sendStatus?: string};
  scoresState: {status?: string; region?: {status?: string}};
  missionsState: {status?: string; detailsStatus?: string};
  inventoryState: {status?: string; subscription?: {status?: string}};
  passcodeState: {status?: string};
  agentState: {status?: string; subscription?: {status?: string}};
}

export function calculateSidePanelStatus(
  activeSidePanel: IitcIrisSidePanelId | null,
  states: AppAuthStates
): string {
  if (activeSidePanel === 'comm') {
    return states.commState.status === 'auth' || states.commState.sendStatus === 'auth' ? 'auth' : (states.commState.status ?? 'idle');
  }
  if (activeSidePanel === 'scores') {
    return states.scoresState.status === 'auth' || states.scoresState.region?.status === 'auth' ? 'auth' : (states.scoresState.status ?? 'idle');
  }
  if (activeSidePanel === 'missions') {
    return states.missionsState.status === 'auth' || states.missionsState.detailsStatus === 'auth' ? 'auth' : (states.missionsState.status ?? 'idle');
  }
  if (activeSidePanel === 'inventory') {
    return states.inventoryState.status === 'auth' || states.inventoryState.subscription?.status === 'auth' ? 'auth' : (states.inventoryState.status ?? 'idle');
  }
  if (activeSidePanel === 'passcode') {
    return states.passcodeState.status ?? 'idle';
  }
  if (activeSidePanel === 'agent') {
    return states.agentState.status === 'missing' || states.agentState.subscription?.status === 'auth' ? 'auth' : (states.agentState.status ?? 'idle');
  }
  return 'idle';
}

export function getAuthSources(states: AppAuthStates): string[] {
  const sources = [
    states.entityFetch.authRequired ? 'map' : null,
    states.selectedPortalDetails?.status === 'auth' ? 'portal details' : null,
    states.commState.status === 'auth' || states.commState.sendStatus === 'auth' ? 'COMM' : null,
    states.scoresState.status === 'auth' || states.scoresState.region?.status === 'auth' ? 'scores' : null,
    states.missionsState.status === 'auth' || states.missionsState.detailsStatus === 'auth' ? 'missions' : null,
    states.inventoryState.status === 'auth' || states.inventoryState.subscription?.status === 'auth' ? 'inventory' : null,
    states.passcodeState.status === 'auth' ? 'passcode' : null,
    states.agentState.status === 'missing' || states.agentState.subscription?.status === 'auth' ? 'agent' : null,
  ];
  return sources.filter((s): s is string => s !== null);
}

export function formatAuthRecoveryText(authSources: string[]): string {
  if (authSources.length === 0) return '';
  if (authSources.length === 1) return `${authSources[0]} needs an authenticated Intel session`;
  return `${authSources.length} requests need an authenticated Intel session`;
}
