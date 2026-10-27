import {getIitcInventoryPortalKeyCount, parseIitcInventoryResponse, summarizeIitcInventory, type IitcInventorySummary} from '@iris/iitc-core';
import {isIitcAuthError} from '../intel/intel-request';
import {IITC_IRIS_MESSAGES, type IitcIrisInventoryState, type IitcIrisMessage,
  type IitcIrisRequestDiagnostics, type IitcIrisSubscriptionState} from '../messages';

interface InventoryRuntimeOptions {
  getSelectedPortal: () => {guid?: string; title?: string};
  postIntelEndpoint: (endpoint: string, payload: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;
  getIitcRequestDiagnostics: () => IitcIrisRequestDiagnostics;
  postAgentState: () => void;
}

interface InventoryRuntime {
  getState: () => IitcIrisInventoryState;
  getSubscriptionState: () => IitcIrisSubscriptionState;
  getPortalKeyCount: (portalGuid: string) => number | undefined;
  refreshInventory: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<IitcIrisSubscriptionState>;
  selectedPortalChanged: () => void;
  cancelActiveInventoryFetch: () => void;
  dispose: () => void;
}

export function createInventoryRuntime(options: InventoryRuntimeOptions): InventoryRuntime {
  const {postIntelEndpoint, getIitcRequestDiagnostics, postAgentState} = options;
  let currentInventoryAbortController: AbortController | undefined;
  let currentSubscriptionAbortController: AbortController | undefined;
  let currentSubscriptionPromise: Promise<IitcIrisSubscriptionState> | undefined;
  let latestSubscriptionState: IitcIrisSubscriptionState = {status: 'unknown'};
  let latestInventorySummary: IitcInventorySummary | undefined;
  let latestInventoryState: IitcIrisInventoryState = {
    status: 'idle',
    requestState: 'idle',
    subscription: latestSubscriptionState,
    items: 0,
    keys: 0,
    portalsWithKeys: 0,
    capsules: 0,
    portalKeysForSelectedPortal: null,
  };

  function cancelActiveInventoryFetch(): void {
    currentInventoryAbortController?.abort();
    currentInventoryAbortController = undefined;
  }

  function getPortalKeyCount(portalGuid: string): number | undefined {
    if (!latestInventorySummary) return undefined;
    return getIitcInventoryPortalKeyCount(latestInventorySummary, portalGuid)?.count ?? 0;
  }

  function postInventoryState(): void {
    latestInventoryState = {
      ...latestInventoryState,
      subscription: latestSubscriptionState,
    };
    window.postMessage({
      type: IITC_IRIS_MESSAGES.inventoryStatus,
      inventory: latestInventoryState,
      requestDiagnostics: getIitcRequestDiagnostics(),
    } satisfies IitcIrisMessage, '*');
  }

  function setSubscriptionState(nextState: IitcIrisSubscriptionState): void {
    latestSubscriptionState = nextState;
    postAgentState();
    postInventoryState();
  }

  async function refreshSubscriptionStatus(): Promise<IitcIrisSubscriptionState> {
    if (currentSubscriptionPromise) return currentSubscriptionPromise;

    const abortController = new AbortController();
    currentSubscriptionAbortController = abortController;
    const startedAt = performance.now();
    setSubscriptionState({...latestSubscriptionState, status: 'loading', error: undefined});

    currentSubscriptionPromise = (async (): Promise<IitcIrisSubscriptionState> => {
      try {
        const response = await postIntelEndpoint('getHasActiveSubscription', {}, abortController.signal);
        abortController.signal.throwIfAborted();
        const hasActive = parseSubscriptionResponse(response);
        const nextState: IitcIrisSubscriptionState = {
          status: hasActive ? 'active' : 'inactive',
          hasActive,
          elapsedMs: performance.now() - startedAt,
          checkedAt: Date.now(),
        };
        setSubscriptionState(nextState);
        return nextState;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return latestSubscriptionState;
        const status = isIitcAuthError(error) ? 'auth' : 'error';
        const nextState: IitcIrisSubscriptionState = {
          status,
          hasActive: false,
          elapsedMs: performance.now() - startedAt,
          checkedAt: Date.now(),
          error: error instanceof Error ? error.message : String(error),
        };
        setSubscriptionState(nextState);
        return nextState;
      } finally {
        if (currentSubscriptionAbortController === abortController) {
          currentSubscriptionAbortController = undefined;
          currentSubscriptionPromise = undefined;
        }
      }
    })();

    return currentSubscriptionPromise;
  }

  function parseSubscriptionResponse(response: unknown): boolean {
    const result = response && typeof response === 'object' ? (response as {result?: unknown}).result : undefined;
    return result === true;
  }

  function createInventoryStateFromSummary(
    summary: IitcInventorySummary,
    status: IitcIrisInventoryState['status'],
    requestState: IitcIrisInventoryState['requestState'],
    elapsedMs?: number,
  ): IitcIrisInventoryState {
    const {guid: selectedPortalGuid, title: selectedPortalTitle} = options.getSelectedPortal();
    const selectedKeyCount = getIitcInventoryPortalKeyCount(summary, selectedPortalGuid);
    const capsuleKeyTotal = selectedKeyCount
      ? Object.values(selectedKeyCount.capsuleCounts).reduce((sum, count) => sum + count, 0)
      : 0;

    return {
      status,
      requestState,
      subscription: latestSubscriptionState,
      items: summary.totalItems,
      rawItems: summary.rawItems,
      keys: summary.keyCounts.reduce((sum, keyCount) => sum + keyCount.count, 0),
      portalsWithKeys: summary.keyCounts.length,
      capsules: summary.capsuleCounts.length,
      selectedPortalGuid,
      selectedPortalTitle,
      portalKeysForSelectedPortal: selectedKeyCount ? {
        total: selectedKeyCount.count,
        capsule: capsuleKeyTotal,
        loose: selectedKeyCount.count - capsuleKeyTotal,
        capsules: selectedKeyCount.capsuleCounts,
      } : null,
      topItems: summary.itemCounts
        .slice()
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
        .slice(0, 10)
        .map((item) => ({
          label: item.label,
          type: item.type,
          count: item.count,
          level: item.level,
          rarity: item.rarity,
        })),
      topKeys: summary.keyCounts
        .slice()
        .sort((a, b) => b.count - a.count || (a.portalTitle ?? '').localeCompare(b.portalTitle ?? ''))
        .slice(0, 8)
        .map((keyCount) => ({
          portalGuid: keyCount.portalGuid,
          portalTitle: keyCount.portalTitle,
          count: keyCount.count,
          capsule: Object.values(keyCount.capsuleCounts).reduce((sum, count) => sum + count, 0),
        })),
      elapsedMs,
    };
  }

  function refreshInventorySelectedPortalState(): void {
    if (!latestInventorySummary) return;
    latestInventoryState = createInventoryStateFromSummary(
      latestInventorySummary,
      latestInventoryState.status,
      latestInventoryState.requestState,
      latestInventoryState.elapsedMs,
    );
  }

  async function refreshInventory(): Promise<void> {
    cancelActiveInventoryFetch();
    const abortController = new AbortController();
    currentInventoryAbortController = abortController;
    const startedAt = performance.now();
    latestInventoryState = {
      ...latestInventoryState,
      status: 'loading',
      requestState: 'loading',
      error: undefined,
    };
    postInventoryState();

    try {
      void refreshSubscriptionStatus();
      const response = await postIntelEndpoint('getInventory', {lastQueryTimestamp: 0}, abortController.signal);
      abortController.signal.throwIfAborted();
      const rawItems = parseIitcInventoryResponse(response);
      latestInventorySummary = summarizeIitcInventory(rawItems);
      latestInventoryState = createInventoryStateFromSummary(
        latestInventorySummary,
        rawItems.length > 0 ? 'ready' : 'empty',
        'ready',
        performance.now() - startedAt,
      );
      postInventoryState();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const status = isIitcAuthError(error) ? 'auth' : 'error';
      latestInventoryState = {
        ...latestInventoryState,
        status,
        requestState: status,
        elapsedMs: performance.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
      postInventoryState();
    } finally {
      if (currentInventoryAbortController === abortController) currentInventoryAbortController = undefined;
    }
  }

  return {
    getState: () => latestInventoryState,
    getSubscriptionState: () => latestSubscriptionState,
    getPortalKeyCount, refreshInventory, refreshSubscriptionStatus, cancelActiveInventoryFetch,
    selectedPortalChanged: (): void => {
      refreshInventorySelectedPortalState();
      postInventoryState();
    },
    dispose: (): void => {
      cancelActiveInventoryFetch();
      currentSubscriptionAbortController?.abort();
      currentSubscriptionAbortController = undefined;
      currentSubscriptionPromise = undefined;
      if (latestSubscriptionState.status === 'loading') latestSubscriptionState = {status: 'unknown'};
    },
  };
}
