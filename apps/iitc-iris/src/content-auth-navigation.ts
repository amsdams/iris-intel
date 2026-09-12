import type {IitcIrisCommTab, IitcIrisMissionSource} from './messages';
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
  if (activeSheet === 'search' && callbacks.searchTerm.trim()) {
    callbacks.requestSearch(callbacks.searchTerm.trim(), false);
    return;
  }
  callbacks.retryMapFetch();
}
