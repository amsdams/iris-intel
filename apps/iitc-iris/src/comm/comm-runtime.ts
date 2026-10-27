import type {Map as LeafletMap} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisCommState, type IitcIrisMessage, type IitcIrisRequestDiagnostics} from '../messages';
import {getCsrfToken, extractVersion, looksLikeHtml, isIitcAuthError, createIitcAuthError, type IntelRequest} from '../intel/intel-request';
import type {IitcIrisMapLifetime} from '../map/map-runtime-lifetime';
import {
  createIitcCommChannelData,
  genIitcCommSendPlextPostData,
  getIitcCommChannelMessages,
  renderIitcCommMarkup,
  planIitcCommRequest,
  applyIitcCommResponse,
  createIitcCommAuthState,
  createIitcCommErrorState,
  createIitcCommLoadingState,
  createIitcCommSuccessState,
  type IitcCommChannel,
  type IitcCommChannelData,
  type IitcCommMessage,
} from '@iris/iitc-core';

interface CommRuntimeOptions {
  getMap: () => Pick<LeafletMap, 'getBounds'> | undefined;
  getLifetime: () => Pick<IitcIrisMapLifetime, 'signal'> | undefined;
  getMapCenterE6: () => {latE6: number; lngE6: number} | undefined;
  fetchIitcEndpointText: IntelRequest['fetchIitcEndpointText'];
  getIitcRequestDiagnostics: () => IitcIrisRequestDiagnostics;
  onPublicMessages: (messages: IitcCommMessage[]) => void;
}

interface CommRuntime {
  getState: () => IitcIrisCommState;
  refreshComm: (tab?: IitcCommChannel, getOlderMsgs?: boolean) => Promise<void>;
  sendComm: (tab: IitcCommChannel, message: unknown) => Promise<void>;
  cancelActiveCommFetch: () => void;
  getPlayerTrackerCommRequest: () => ((signal: AbortSignal) => Promise<unknown>) | undefined;
  applyPlayerTrackerCommResponse: (response: unknown) => IitcCommMessage[];
}

const COMM_TAB_STORAGE_KEY = 'iitc-chat-tab';

export function normalizeCommTab(tab: unknown): IitcCommChannel {
  return tab === 'faction' || tab === 'alerts' ? tab : 'all';
}

/** Own channel buffers for the page lifetime; requests use the current map lifetime. */
export function createCommRuntime({getMap, getLifetime, getMapCenterE6, fetchIitcEndpointText,
  getIitcRequestDiagnostics, onPublicMessages}: CommRuntimeOptions): CommRuntime {
  let currentCommAbortController: AbortController | undefined;
  let latestCommState: IitcIrisCommState = {status: 'idle', tab: loadStoredCommTab(), messages: 0};
  const commChannelsData: Record<IitcCommChannel, IitcCommChannelData> = {
    all: createIitcCommChannelData(),
    faction: createIitcCommChannelData(),
    alerts: createIitcCommChannelData(),
  };

  function loadStoredCommTab(): IitcCommChannel {
    try {
      return normalizeCommTab(window.localStorage.getItem(COMM_TAB_STORAGE_KEY));
    } catch {
      return 'all';
    }
  }

  function cancelActiveCommFetch(): void {
    currentCommAbortController?.abort();
    currentCommAbortController = undefined;
  }

  function postCommState(): void {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.commStatus,
      comm: latestCommState,
      requestDiagnostics: getIitcRequestDiagnostics(),
    } satisfies IitcIrisMessage, '*');
  }

  function getCurrentCommBounds(): NonNullable<IitcIrisCommState['bounds']> | undefined {
    const map = getMap();
    if (!map) return undefined;
    const bounds = map.getBounds();
    return {
      minLatE6: Math.round(bounds.getSouth() * 1_000_000),
      minLngE6: Math.round(bounds.getWest() * 1_000_000),
      maxLatE6: Math.round(bounds.getNorth() * 1_000_000),
      maxLngE6: Math.round(bounds.getEast() * 1_000_000),
    };
  }

  function toCommMessagePreview(message: IitcCommMessage): NonNullable<IitcIrisCommState['recent']>[number] {
    const players = [
      message.player.name,
      ...message.mentions,
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);

    return {
      id: message.guid,
      time: message.time,
      text: message.text,
      team: message.team,
      type: message.type,
      public: message.public,
      secure: message.secure,
      alert: message.alert,
      auto: message.auto,
      narrowcast: message.narrowcast,
      player: message.player.name,
      playerTeam: message.player.team,
      parts: renderIitcCommMarkup(message),
      portals: message.markup
        .filter(([type]) => type === 'PORTAL')
        .map(([, value]) => ({
          name: value.name,
          address: value.address,
          latE6: value.latE6,
          lngE6: value.lngE6,
        })),
      players: [...new Set(players)],
    };
  }

  async function fetchComm(
    version: string,
    tab: IitcCommChannel,
    bounds: NonNullable<IitcIrisCommState['bounds']> | undefined,
    getOlderMsgs: boolean,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new Error('getPlexts missing csrftoken');
    if (!bounds) throw new Error('getPlexts missing map bounds');
    const postData = planIitcCommRequest({
      channel: tab,
      bounds,
      storageHash: commChannelsData[tab],
      getOlderMsgs,
      version,
    });

    const {response, text} = await fetchIitcEndpointText('getPlexts', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(postData),
    }, tab === 'all' ? 'comm-all' : `comm-${tab}`);

    if (looksLikeHtml(text)) {
      throw createIitcAuthError('getPlexts', response);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch (error) {
      if (!response.ok) throw new Error(`getPlexts HTTP ${response.status}`, {cause: error});
      throw error;
    }
    if (!response.ok) throw new Error(`getPlexts HTTP ${response.status}`);
    const error = parsed && typeof parsed === 'object' ? (parsed as {error?: unknown}).error : undefined;
    if (typeof error === 'string' && error) throw new Error(error);
    return parsed;
  }

  async function postSendPlext(payload: NonNullable<ReturnType<typeof genIitcCommSendPlextPostData>>, signal?: AbortSignal): Promise<unknown> {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new Error('sendPlext missing csrftoken');

    const {response, text} = await fetchIitcEndpointText('sendPlext', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify(payload),
    }, `comm-send-${payload.tab}`);

    if (looksLikeHtml(text)) {
      throw createIitcAuthError('sendPlext', response);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch (error) {
      if (!response.ok) throw new Error(`sendPlext HTTP ${response.status}`, {cause: error});
      throw error;
    }
    if (!response.ok) throw new Error(`sendPlext HTTP ${response.status}`);
    const error = parsed && typeof parsed === 'object' ? (parsed as {error?: unknown}).error : undefined;
    if (typeof error === 'string' && error) throw new Error(error);
    return parsed;
  }

  async function sendComm(tab: IitcCommChannel, message: unknown): Promise<void> {
    const lifetime = getLifetime();
    if (!lifetime) return;
    const text = typeof message === 'string' ? message : '';
    const center = getMapCenterE6();
    const payload = center ? genIitcCommSendPlextPostData({
      channel: tab,
      message: text,
      ...center,
    }) : null;
    if (!payload) {
      latestCommState = {
        ...latestCommState,
        tab,
        sendStatus: 'error',
        sendError: tab === 'alerts' ? "can't send to alerts" : 'empty message or missing map center',
      };
      postCommState();
      return;
    }

    const abortController = new AbortController();
    latestCommState = {
      ...latestCommState,
      tab,
      sendStatus: 'sending',
      sendError: undefined,
    };
    postCommState();

    try {
      await postSendPlext(payload, abortController.signal);
      lifetime.signal.throwIfAborted();
      latestCommState = {
        ...latestCommState,
        tab,
        sendStatus: 'sent',
        sendError: undefined,
      };
      postCommState();
      await refreshComm(tab);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      latestCommState = {
        ...latestCommState,
        tab,
        sendStatus: isIitcAuthError(error) ? 'auth' : 'error',
        sendError: error instanceof Error ? error.message : String(error),
      };
      postCommState();
    }
  }

  async function refreshComm(tab: IitcCommChannel = normalizeCommTab(latestCommState.tab), getOlderMsgs = false): Promise<void> {
    cancelActiveCommFetch();
    const version = extractVersion();
    const bounds = getCurrentCommBounds();
    if (!version) {
      latestCommState = createIitcCommAuthState({
        channel: tab,
        channelData: commChannelsData[tab],
        getOlderMsgs,
        bounds,
        error: 'missing Intel version',
      });
      postCommState();
      return;
    }

    const abortController = new AbortController();
    currentCommAbortController = abortController;
    const startedAt = performance.now();
    latestCommState = {
      ...latestCommState,
      ...createIitcCommLoadingState({
        channel: tab,
        channelData: commChannelsData[tab],
        getOlderMsgs,
        bounds,
        toPreview: toCommMessagePreview,
      }),
    };
    postCommState();

    try {
      const response = await fetchComm(version, tab, bounds, getOlderMsgs, abortController.signal);
      abortController.signal.throwIfAborted();
      const elapsedMs = performance.now() - startedAt;
      const isAscendingOrder = !getOlderMsgs && commChannelsData[tab].newestTimestamp > -1;
      const writeResult = applyIitcCommResponse(response, commChannelsData[tab], getOlderMsgs, isAscendingOrder, tab);
      commChannelsData[tab] = writeResult.channelData;
      const commMessages = getIitcCommChannelMessages(commChannelsData[tab]);
      if (tab === 'all') {
        onPublicMessages(commMessages);
      }
      latestCommState = createIitcCommSuccessState({
        channel: tab,
        applyResult: writeResult,
        getOlderMsgs,
        elapsedMs,
        bounds,
        toPreview: toCommMessagePreview,
      });
      postCommState();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      latestCommState = createIitcCommErrorState({
        channel: tab,
        channelData: commChannelsData[tab],
        getOlderMsgs,
        elapsedMs: performance.now() - startedAt,
        bounds,
        error: error instanceof Error ? error.message : String(error),
        status: isIitcAuthError(error) ? 'auth' : 'error',
      });
      postCommState();
    } finally {
      if (currentCommAbortController === abortController) currentCommAbortController = undefined;
    }
  }

  function getPlayerTrackerCommRequest(): ((signal: AbortSignal) => Promise<unknown>) | undefined {
    const version = extractVersion();
    const bounds = getCurrentCommBounds();
    if (!version || !bounds) return undefined;
    return (signal): Promise<unknown> => fetchComm(version, 'all', bounds, false, signal);
  }

  function applyPlayerTrackerCommResponse(response: unknown): IitcCommMessage[] {
    const writeResult = applyIitcCommResponse(response, commChannelsData.all, false, commChannelsData.all.newestTimestamp > -1, 'all');
    commChannelsData.all = writeResult.channelData;
    return getIitcCommChannelMessages(commChannelsData.all);
  }

  return {getState: () => latestCommState, refreshComm, sendComm, cancelActiveCommFetch,
    getPlayerTrackerCommRequest, applyPlayerTrackerCommResponse};
}
