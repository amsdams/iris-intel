import type {IitcIrisPortalDetailsState, IitcIrisSelectedPortal, IitcIrisRenderPortal} from '../messages';
import {getCsrfToken, extractVersion, looksLikeHtml, isIitcAuthError, createIitcAuthError, type IntelRequest} from '../intel/intel-request';
import {
  applyIitcPortalDetailsResponse,
  createIitcPortalDetailsAuthState,
  createIitcPortalDetailsErrorState,
  createIitcPortalDetailsLoadingState,
  getIitcCachedPortalDetails,
  type IitcPortalDetailsCache,
  type IitcPortalDetailsResponse,
  writeIitcPortalDetailsCache,
  type IitcPortalDetails,
} from '@iris/iitc-core';

interface PortalDetailsOptions {
  getSelectedPortalGuid: () => string | undefined;
  getSelectedPortal: () => IitcIrisSelectedPortal | null;
  portalHistoryByGuid: Map<string, NonNullable<IitcIrisRenderPortal['history']>>;
  fetchIitcEndpointText: IntelRequest['fetchIitcEndpointText'];
  repostLatestEntityStatus: () => void;
  onDetailsLoaded: (details: IitcPortalDetails, state: IitcIrisPortalDetailsState) => void;
}

/** Retain detail cache/history across maps; only current, uncancelled selection may promote entities. */
export function createPortalDetailsRuntime({getSelectedPortalGuid, getSelectedPortal, portalHistoryByGuid,
  fetchIitcEndpointText, repostLatestEntityStatus, onDetailsLoaded}: PortalDetailsOptions): {
  getState: () => IitcIrisPortalDetailsState | null;
  clearState: () => void;
  cancelActivePortalDetailsFetch: typeof cancelActivePortalDetailsFetch;
  refreshSelectedPortalDetails: typeof refreshSelectedPortalDetails;
} {
  let latestPortalDetails: IitcIrisPortalDetailsState | null = null;
  let currentPortalDetailsAbortController: AbortController | undefined;
  const portalDetailsCache: IitcPortalDetailsCache = new Map();

  function cancelActivePortalDetailsFetch(): void {
    currentPortalDetailsAbortController?.abort();
    currentPortalDetailsAbortController = undefined;
  }

  async function fetchPortalDetails(guid: string, version: string, signal?: AbortSignal): Promise<IitcPortalDetailsResponse> {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new Error('getPortalDetails missing csrftoken');

    const {response, text} = await fetchIitcEndpointText('getPortalDetails', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({guid, v: version}),
    }, 'portal-details');

    if (looksLikeHtml(text)) {
      throw createIitcAuthError('getPortalDetails', response);
    }

    const parsed = JSON.parse(text) as IitcPortalDetailsResponse;
    if (parsed.error) throw new Error(parsed.error);
    return parsed;
  }

  async function refreshSelectedPortalDetails(guid: string): Promise<void> {
    cancelActivePortalDetailsFetch();
    const cachedDetails = getIitcCachedPortalDetails(portalDetailsCache, guid);
    if (cachedDetails) {
      latestPortalDetails = cachedDetails;
      repostLatestEntityStatus();
    }
    const version = extractVersion();
    if (!version) {
      latestPortalDetails = createIitcPortalDetailsAuthState(guid, 'missing Intel version');
      repostLatestEntityStatus();
      return;
    }

    const abortController = new AbortController();
    currentPortalDetailsAbortController = abortController;
    const startedAt = performance.now();
    if (!cachedDetails) {
      latestPortalDetails = createIitcPortalDetailsLoadingState(guid);
      repostLatestEntityStatus();
    }

    try {
      const response = await fetchPortalDetails(guid, version, abortController.signal);
      abortController.signal.throwIfAborted();
      if (getSelectedPortalGuid() !== guid) return;
      const linkCount = getSelectedPortal()?.links.count ?? 0;
      const applyResult = applyIitcPortalDetailsResponse({
        response,
        guid,
        linkCount,
        elapsedMs: performance.now() - startedAt,
      });
      const details = applyResult.details;
      if (!details) {
        latestPortalDetails = applyResult.state;
      } else {
        latestPortalDetails = applyResult.state;
        writeIitcPortalDetailsCache(portalDetailsCache, guid, latestPortalDetails);
        if (latestPortalDetails.history) portalHistoryByGuid.set(guid, latestPortalDetails.history);
        onDetailsLoaded(details, latestPortalDetails);
      }
      repostLatestEntityStatus();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const elapsedMs = performance.now() - startedAt;
      const errorMessage = error instanceof Error ? error.message : String(error);
      latestPortalDetails = isIitcAuthError(error)
        ? createIitcPortalDetailsAuthState(guid, errorMessage)
        : createIitcPortalDetailsErrorState(guid, elapsedMs, errorMessage);
      repostLatestEntityStatus();
    } finally {
      if (currentPortalDetailsAbortController === abortController) currentPortalDetailsAbortController = undefined;
    }
  }

  return {getState: () => latestPortalDetails, clearState: (): void => {latestPortalDetails = null;},
    cancelActivePortalDetailsFetch, refreshSelectedPortalDetails};
}
