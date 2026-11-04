import type {Map as LeafletMap} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisCommState, type IitcIrisMessage, type IitcIrisRequestDiagnostics} from '../messages';
import {getCsrfToken, extractVersion, looksLikeHtml, isIitcAuthError, createIitcAuthError, type IntelRequest} from '../intel/intel-request';
import type {IitcIrisMapLifetime} from '../map/map-runtime-lifetime';
import {
  createIitcCommChannelData,
  hasIitcCommBoundsChanged, getIitcCommRefreshDelayMs,
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
  getMap: () => Pick<LeafletMap, 'getBounds'> & Partial<Pick<LeafletMap, 'getZoom'>> | undefined;
  getLifetime: () => Pick<IitcIrisMapLifetime, 'signal' | 'schedule' | 'cancelScheduled'> | undefined;
  getMapCenterE6: () => {latE6: number; lngE6: number} | undefined;
  fetchIitcEndpointText: IntelRequest['fetchIitcEndpointText'];
  getIitcRequestDiagnostics: () => IitcIrisRequestDiagnostics;
  onPublicMessages: (messages: IitcCommMessage[]) => void;
  isPublicChannelInterested?: () => boolean;
  isIdle?: () => boolean;
  isAuthRecoveryActive?: () => boolean;
}

interface CommRuntime {
  getState: () => IitcIrisCommState;
  refreshComm: (tab?: IitcCommChannel, getOlderMsgs?: boolean) => Promise<void>;
  sendComm: (tab: IitcCommChannel, message: unknown) => Promise<void>;
  cancelActiveCommFetch: () => void;
  setPanelVisibility: (visible: boolean) => void;
  scheduleRefresh: (delayMs?: number) => void;
  mapMoved: () => void;
  dispose: () => void;
}

const COMM_TAB_STORAGE_KEY = 'iitc-chat-tab';

export function normalizeCommTab(tab: unknown): IitcCommChannel {
  return tab === 'faction' || tab === 'alerts' ? tab : 'all';
}

/** Own channel buffers for the page lifetime; requests use the current map lifetime. */
export function createCommRuntime({getMap, getLifetime, getMapCenterE6, fetchIitcEndpointText,
  getIitcRequestDiagnostics, onPublicMessages, isPublicChannelInterested = (): boolean => false,
  isIdle = (): boolean => false, isAuthRecoveryActive = (): boolean => false}: CommRuntimeOptions): CommRuntime {
  let activeChannel: IitcCommChannel | undefined;
  let refreshTimer: number | undefined;
  let areaBounds: NonNullable<IitcIrisCommState['bounds']> | undefined;
  let areaGeneration = 0;
  let authBlocked = false;
  let lastAutomaticRefresh = -Infinity;
  interface ChannelRequest {
    controller: AbortController;
    older: boolean;
    promise: Promise<void>;
  }
  const requests = new Map<IitcCommChannel, ChannelRequest>();
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
    activeChannel = undefined;
    for (const [tab, request] of requests) {
      if (tab === 'all' && isPublicChannelInterested() && !request.older) continue;
      request.controller.abort();
      requests.delete(tab);
    }
    if (latestCommState.status === 'loading') publishChannel(latestCommState.tab, false);
    scheduleRefresh();
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
    const next = {
      minLatE6: Math.round(bounds.getSouth() * 1_000_000),
      minLngE6: Math.round(bounds.getWest() * 1_000_000),
      maxLatE6: Math.round(bounds.getNorth() * 1_000_000),
      maxLngE6: Math.round(bounds.getEast() * 1_000_000),
    };
    if (areaBounds && hasIitcCommBoundsChanged(areaBounds, next)) {
      areaGeneration += 1;
      for (const tab of ['all', 'faction'] as const) {
        requests.get(tab)?.controller.abort();
        requests.delete(tab);
        commChannelsData[tab] = createIitcCommChannelData();
      }
      if (latestCommState.tab !== 'alerts') {
        latestCommState = {...latestCommState, status: 'empty', messages: 0, recent: [], bounds: next,
          requestOlder: false, oldMessagesWereAdded: false, error: undefined};
        postCommState();
      }
      areaBounds = next;
    }
    areaBounds ??= next;
    return next;
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
      if (latestCommState.tab === tab) {
        latestCommState = {...latestCommState, sendStatus: 'sent', sendError: undefined};
        postCommState();
      }
      if (activeChannel === tab) await refreshComm(tab);
      else await requestChannel(tab, false, false);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (latestCommState.tab !== tab) return;
      latestCommState = {
        ...latestCommState,
        tab,
        sendStatus: isIitcAuthError(error) ? 'auth' : 'error',
        sendError: error instanceof Error ? error.message : String(error),
      };
      postCommState();
    }
  }

  function publishChannel(tab: IitcCommChannel, older: boolean, elapsedMs = 0): void {
    if (latestCommState.tab !== tab) return;
    const bounds = getCurrentCommBounds();
    const result = applyIitcCommResponse({result: []}, commChannelsData[tab], older, false, tab);
    latestCommState = {...createIitcCommSuccessState({channel: tab, applyResult: result,
      getOlderMsgs: older, elapsedMs, bounds, toPreview: toCommMessagePreview}),
      ...(latestCommState.sendStatus === 'sending' ? {sendStatus: 'sending' as const} : {})};
    postCommState();
  }

  function interestedChannels(): Set<IitcCommChannel> {
    const channels = new Set<IitcCommChannel>();
    if (activeChannel) channels.add(activeChannel);
    if (isPublicChannelInterested()) channels.add('all');
    return channels;
  }

  function scheduleRefresh(delayMs = getIitcCommRefreshDelayMs(getMap()?.getZoom?.() ?? 16)): void {
    const lifetime = getLifetime();
    lifetime?.cancelScheduled(refreshTimer);
    refreshTimer = undefined;
    const interested = interestedChannels();
    for (const [tab, request] of requests) {
      if (interested.has(tab)) continue;
      request.controller.abort();
      requests.delete(tab);
    }
    if (!lifetime || lifetime.signal.aborted || authBlocked || isAuthRecoveryActive() || !interested.size) return;
    refreshTimer = lifetime.schedule(() => {
      refreshTimer = undefined;
      if (isIdle() || isAuthRecoveryActive()) return;
      lastAutomaticRefresh = Date.now();
      void Promise.all([...interestedChannels()].map(tab => requestChannel(tab, false, false)));
    }, Math.max(delayMs, lastAutomaticRefresh + 10_000 - Date.now()));
  }

  async function requestChannel(tab: IitcCommChannel, older: boolean, foreground: boolean): Promise<void> {
    const bounds = getCurrentCommBounds();
    const lifetime = getLifetime();
    if (!lifetime || lifetime.signal.aborted) return;
    const current = requests.get(tab);
    if (current && (current.older === older || !foreground)) return current.promise;
    current?.controller.abort();
    const version = extractVersion();
    if (!version) {
      authBlocked = true;
      if (latestCommState.tab === tab) {
        latestCommState = {...latestCommState, ...createIitcCommAuthState({channel: tab,
          channelData: commChannelsData[tab], getOlderMsgs: older, bounds, error: 'missing Intel version'})};
        postCommState();
      }
      return;
    }
    const controller = new AbortController();
    const generation = areaGeneration;
    const ascending = !older && commChannelsData[tab].newestTimestamp > -1;
    const startedAt = performance.now();
    const entry: ChannelRequest = {controller, older, promise: Promise.resolve()};
    requests.set(tab, entry);
    if (foreground) {
      latestCommState = {...latestCommState, ...createIitcCommLoadingState({channel: tab,
        channelData: commChannelsData[tab], getOlderMsgs: older, bounds, toPreview: toCommMessagePreview})};
      postCommState();
    }
    entry.promise = (async (): Promise<void> => {
      try {
        const response = await fetchComm(version, tab, bounds, older, controller.signal);
        controller.signal.throwIfAborted();
        lifetime.signal.throwIfAborted();
        if (getLifetime()?.signal !== lifetime.signal || (tab !== 'alerts' && generation !== areaGeneration)) return;
        const result = applyIitcCommResponse(response, commChannelsData[tab], older, ascending, tab);
        commChannelsData[tab] = result.channelData;
        if (tab === 'all') onPublicMessages(getIitcCommChannelMessages(commChannelsData.all));
        if (latestCommState.tab === tab) {
          latestCommState = {...createIitcCommSuccessState({channel: tab,
            applyResult: result, getOlderMsgs: older, elapsedMs: performance.now() - startedAt,
            bounds, toPreview: toCommMessagePreview}),
            ...(latestCommState.sendStatus === 'sending' ? {sendStatus: 'sending' as const} : {})};
          postCommState();
        }
      } catch (error) {
        if (controller.signal.aborted || lifetime.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
        const authError = isIitcAuthError(error);
        authBlocked ||= authError;
        if (latestCommState.tab === tab) {
          latestCommState = {...latestCommState, ...createIitcCommErrorState({channel: tab,
            channelData: commChannelsData[tab], getOlderMsgs: older, bounds,
            elapsedMs: performance.now() - startedAt, error: error instanceof Error ? error.message : String(error),
            status: authError ? 'auth' : 'error'})};
          postCommState();
        }
      } finally {
        if (requests.get(tab) === entry) {
          requests.delete(tab);
          if (getLifetime()?.signal === lifetime.signal && !lifetime.signal.aborted) scheduleRefresh();
        }
      }
    })();
    return entry.promise;
  }

  async function refreshComm(tab: IitcCommChannel = normalizeCommTab(latestCommState.tab), getOlderMsgs = false): Promise<void> {
    if (activeChannel !== tab) {
      cancelActiveCommFetch();
      activeChannel = tab;
      latestCommState = {...latestCommState, tab};
      publishChannel(tab, false);
    }
    authBlocked = false;
    // A public request already serving the tracker can also serve the newly opened panel.
    await requestChannel(tab, getOlderMsgs, true);
  }

  return {getState: () => latestCommState, refreshComm, sendComm, cancelActiveCommFetch, scheduleRefresh,
    setPanelVisibility: (visible): void => {
      const tab = latestCommState.tab;
      if (!visible) {
        if (activeChannel) cancelActiveCommFetch();
      } else if (activeChannel !== tab) {
        cancelActiveCommFetch();
        activeChannel = tab;
        latestCommState = {...latestCommState, tab};
        scheduleRefresh(250);
      }
    },
    mapMoved: (): void => { getCurrentCommBounds(); scheduleRefresh(250); },
    dispose: (): void => {
      getLifetime()?.cancelScheduled(refreshTimer);
      refreshTimer = undefined;
      for (const request of requests.values()) request.controller.abort();
      requests.clear();
      activeChannel = undefined;
      authBlocked = false;
      lastAutomaticRefresh = -Infinity;
    }};
}
