import {getIitcInventoryPortalKeyCount, parseIitcInventoryResponse, summarizeIitcInventory, type IitcInventorySummary} from '@iris/iitc-core';
import {isIitcAuthError} from '../../intel/intel-request';
import {IITC_IRIS_MESSAGES, type IitcIrisInventoryState, type IitcIrisMessage,
  type IitcIrisRequestDiagnostics, type IitcIrisSubscriptionState} from '../../messages';

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

  function cancelActiveInventoryFetch(publish = true): void {
    if (!currentInventoryAbortController) return;
    currentInventoryAbortController?.abort();
    currentInventoryAbortController = undefined;
    const status = latestInventorySummary ? (latestInventorySummary.rawItems > 0 ? 'ready' : 'empty') : 'idle';
    latestInventoryState = {...latestInventoryState, status, requestState: latestInventorySummary ? 'ready' : 'idle', error: undefined};
    if (publish) postInventoryState();
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
    if (typeof result !== 'boolean') throw new Error('Intel returned an unexpected C.O.R.E. response. Try Refresh again.');
    return result;
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
    latestInventoryState = {...createInventoryStateFromSummary(
      latestInventorySummary,
      latestInventoryState.status,
      latestInventoryState.requestState,
      latestInventoryState.elapsedMs,
    ), error: latestInventoryState.error};
  }

  async function waitForRetry(signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    await new Promise<void>((resolve, reject) => {
      const abort = (): void => {
        clearTimeout(timer);
        reject(signal.reason);
      };
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', abort);
        resolve();
      }, 500);
      signal.addEventListener('abort', abort, {once: true});
    });
  }

  async function fetchInventory(signal: AbortSignal): Promise<ReturnType<typeof parseIitcInventoryResponse>> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const response = await postIntelEndpoint('getInventory', {lastQueryTimestamp: 0}, signal);
      signal.throwIfAborted();
      const result = response && typeof response === 'object' ? (response as {result?: unknown}).result : undefined;
      const rawItems = parseIitcInventoryResponse(response);
      const valid = Array.isArray(result) && rawItems.length === result.length;
      if (valid) {
        // IITC inventory plugins treat empty replies as possible throttling, not a reason for rapid retries.
        if (rawItems.length === 0 && latestInventorySummary?.rawItems) {
          throw new Error('Intel returned no inventory items. Requests may be limited. Wait a few minutes before refreshing.');
        }
        return rawItems;
      }
      const problem = 'Intel returned an unexpected inventory response (missing or invalid item list).';
      if (attempt === 3) {
        throw new Error(`${problem} After 3 attempts, inventory could not be refreshed. Try Refresh again.`);
      }
      latestInventoryState = {...latestInventoryState, error: `${problem} Retrying (${attempt + 1}/3)…`};
      postInventoryState();
      await waitForRetry(signal);
    }
    throw new Error('Inventory could not be refreshed.');
  }

  async function refreshInventory(): Promise<void> {
    cancelActiveInventoryFetch(false);
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
      const subscription = await refreshSubscriptionStatus();
      abortController.signal.throwIfAborted();
      if (subscription.status !== 'active') {
        throw new Error(subscription.status === 'inactive'
          ? 'Inventory access requires an active C.O.R.E. subscription.'
          : subscription.error ?? 'Could not verify the C.O.R.E. subscription. Try Refresh again.');
      }
      const rawItems = await fetchInventory(abortController.signal);
      abortController.signal.throwIfAborted();
      latestInventorySummary = summarizeIitcInventory(rawItems);
      latestInventoryState = createInventoryStateFromSummary(
        latestInventorySummary,
        rawItems.length > 0 ? 'ready' : 'empty',
        'ready',
        performance.now() - startedAt,
      );
      postInventoryState();
    } catch (error) {
      if (abortController.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
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
