import type {Map as LeafletMap} from 'leaflet';
import {formatIitcMissionDuration, getIitcMissionBounds, parseIitcMissionDetailsResponse, parseIitcTopMissionsResponse,
  type IitcMissionDetails as CoreIitcMissionDetails, type IitcMissionSummary as CoreIitcMissionSummary} from '@iris/iitc-core';
import {isIitcAuthError} from '../../intel/intel-request';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisMissionDetails, type IitcIrisMissionSource,
  type IitcIrisMissionSummary, type IitcIrisMissionsState, type IitcIrisRequestDiagnostics} from '../../messages';

interface MissionsRuntimeOptions {
  getMap: () => Pick<LeafletMap, 'getBounds'> | undefined;
  getSelectedPortal: () => {guid?: string; title?: string};
  postIntelEndpoint: (endpoint: string, payload: Record<string, unknown>, signal?: AbortSignal) => Promise<unknown>;
  getIitcRequestDiagnostics: () => IitcIrisRequestDiagnostics;
  clearMissionOverlay: () => void;
  renderMissionOverlay: (mission: IitcIrisMissionDetails | undefined) => void;
  panToMissionStart: (mission: IitcIrisMissionDetails | undefined) => void;
}

interface MissionsRuntime {
  getState: () => IitcIrisMissionsState;
  refreshMissions: (source?: IitcIrisMissionSource) => Promise<void>;
  refreshMissionDetails: (guid: unknown) => Promise<void>;
  cancelRequests: () => void;
}

const MISSION_DETAILS_CACHE_MS = 3 * 24 * 60 * 60 * 1000;
const PORTAL_MISSIONS_CACHE_MS = 21 * 24 * 60 * 60 * 1000;
const MISSION_DETAILS_CACHE_STORAGE_KEY = 'iitc-iris:missions:details-cache';
const PORTAL_MISSIONS_CACHE_STORAGE_KEY = 'iitc-iris:missions:portal-cache';
const MISSION_DETAILS_CACHE_STORAGE_MAX_CHARS = 2_000_000;
const PORTAL_MISSIONS_CACHE_STORAGE_MAX_CHARS = 1_000_000;

export function createMissionsRuntime(options: MissionsRuntimeOptions): MissionsRuntime {
  const {postIntelEndpoint, getIitcRequestDiagnostics, clearMissionOverlay, renderMissionOverlay, panToMissionStart} = options;
  let currentMissionsAbortController: AbortController | undefined;
  let currentMissionDetailsAbortController: AbortController | undefined;
  let latestMissionsState: IitcIrisMissionsState = {
    status: 'idle',
    requestState: 'idle',
    missions: [],
    detailsStatus: 'idle',
  };
  interface MissionCacheEntry<T> {time: number; data: T}
  const missionDetailsCache = new Map<string, MissionCacheEntry<IitcIrisMissionDetails>>();
  const portalMissionsCache = new Map<string, MissionCacheEntry<IitcIrisMissionSummary[]>>();

  function postMissionsState(): void {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.missionsStatus,
      missions: latestMissionsState,
      requestDiagnostics: getIitcRequestDiagnostics(),
    } satisfies IitcIrisMessage, '*');
  }

  function toIrisMissionSummary(mission: CoreIitcMissionSummary): IitcIrisMissionSummary {
    return {
      guid: mission.guid,
      title: mission.title,
      image: mission.image,
      ratingE6: mission.ratingE6,
      ratingPercent: mission.ratingE6 === undefined ? undefined : Math.round(mission.ratingE6 / 10_000),
      medianCompletionTimeMs: mission.medianCompletionTimeMs,
      durationLabel: formatIitcMissionDuration(mission.medianCompletionTimeMs),
    };
  }

  function toMissionCacheSummary(mission: IitcIrisMissionSummary): IitcIrisMissionSummary {
    return {
      guid: mission.guid,
      title: mission.title,
      image: mission.image,
      ratingE6: mission.ratingE6,
      ratingPercent: mission.ratingPercent,
      medianCompletionTimeMs: mission.medianCompletionTimeMs,
      durationLabel: mission.durationLabel,
    };
  }

  function toIrisMissionDetails(mission: CoreIitcMissionDetails): IitcIrisMissionDetails {
    return {
      ...toIrisMissionSummary(mission),
      description: mission.description,
      authorNickname: mission.authorNickname,
      authorTeam: mission.authorTeam,
      typeNum: mission.typeNum,
      type: mission.type,
      numUniqueCompletedPlayers: mission.numUniqueCompletedPlayers,
      waypoints: mission.waypoints,
      routeLengthMeters: mission.routeLengthMeters,
      bounds: getIitcMissionBounds(mission) ?? undefined,
    };
  }

  function sortMissionSummaries(missions: IitcIrisMissionSummary[]): IitcIrisMissionSummary[] {
    const collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
    return missions.slice().sort((a, b) => collator.compare(a.title, b.title));
  }

  function getMissionSummaryDetails(missionGuid: string): Partial<IitcIrisMissionSummary> | undefined {
    const details = getFreshMissionDetailsCache(missionGuid);
    if (!details) return undefined;
    return {
      authorNickname: details.authorNickname,
      authorTeam: details.authorTeam,
      typeNum: details.typeNum,
      type: details.type,
      numUniqueCompletedPlayers: details.numUniqueCompletedPlayers,
      waypointCount: details.waypoints.length,
      routeLengthMeters: details.routeLengthMeters,
    };
  }

  function enrichMissionSummariesWithCache(missions: IitcIrisMissionSummary[]): IitcIrisMissionSummary[] {
    return missions.map((mission) => ({
      ...toMissionCacheSummary(mission),
      ...getMissionSummaryDetails(mission.guid),
    }));
  }

  function isMissionCacheEntry<T>(value: unknown, isData: (data: unknown) => data is T): value is MissionCacheEntry<T> {
    if (!value || typeof value !== 'object') return false;
    const entry = value as {time?: unknown; data?: unknown};
    return Number.isFinite(entry.time) && isData(entry.data);
  }

  function isMissionSummaryArray(value: unknown): value is IitcIrisMissionSummary[] {
    return Array.isArray(value);
  }

  function isMissionDetails(value: unknown): value is IitcIrisMissionDetails {
    return !!value && typeof value === 'object' && typeof (value as {guid?: unknown}).guid === 'string';
  }

  function loadMissionCache<T>(
    key: string,
    cache: Map<string, MissionCacheEntry<T>>,
    isData: (data: unknown) => data is T,
  ): void {
    try {
      const stored = window.localStorage.getItem(key);
      if (!stored) return;
      const parsed = JSON.parse(stored) as unknown;
      if (!parsed || typeof parsed !== 'object') return;
      for (const [guid, value] of Object.entries(parsed)) {
        if (isMissionCacheEntry(value, isData)) cache.set(guid, value);
      }
    } catch {
      // Ignore corrupt or inaccessible mission caches; live requests can refill them.
    }
  }

  function pruneMissionCache<T>(cache: Map<string, MissionCacheEntry<T>>, maxAgeMs: number): void {
    const expiredBefore = Date.now() - maxAgeMs;
    for (const [guid, entry] of cache.entries()) {
      if (entry.time <= expiredBefore) cache.delete(guid);
    }
  }

  function trimMissionCacheEntries<T>(cache: Map<string, MissionCacheEntry<T>>, maxEntries: number): void {
    while (cache.size > maxEntries) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].time - b[1].time)[0]?.[0];
      if (!oldest) return;
      cache.delete(oldest);
    }
  }

  function storeMissionCache<T>(key: string, cache: Map<string, MissionCacheEntry<T>>, maxChars: number): void {
    try {
      const entries = [...cache.entries()].sort((a, b) => b[1].time - a[1].time);
      let serialized = JSON.stringify(Object.fromEntries(entries));
      while (serialized.length > maxChars && entries.length > 1) {
        const oldest = entries.pop();
        if (oldest) cache.delete(oldest[0]);
        serialized = JSON.stringify(Object.fromEntries(entries));
      }
      window.localStorage.setItem(key, serialized);
    } catch {
      // Storage quota/private-mode failures should not block mission display.
    }
  }

  function storePortalMissionsCache(): void {
    pruneMissionCache(portalMissionsCache, PORTAL_MISSIONS_CACHE_MS);
    trimMissionCacheEntries(portalMissionsCache, 50);
    storeMissionCache(PORTAL_MISSIONS_CACHE_STORAGE_KEY, portalMissionsCache, PORTAL_MISSIONS_CACHE_STORAGE_MAX_CHARS);
  }

  function storeMissionDetailsCache(): void {
    pruneMissionCache(missionDetailsCache, MISSION_DETAILS_CACHE_MS);
    trimMissionCacheEntries(missionDetailsCache, 100);
    storeMissionCache(MISSION_DETAILS_CACHE_STORAGE_KEY, missionDetailsCache, MISSION_DETAILS_CACHE_STORAGE_MAX_CHARS);
  }

  loadMissionCache(PORTAL_MISSIONS_CACHE_STORAGE_KEY, portalMissionsCache, isMissionSummaryArray);
  loadMissionCache(MISSION_DETAILS_CACHE_STORAGE_KEY, missionDetailsCache, isMissionDetails);
  storePortalMissionsCache();
  storeMissionDetailsCache();

  function getFreshPortalMissionsCache(portalGuid: string): IitcIrisMissionSummary[] | undefined {
    const cached = portalMissionsCache.get(portalGuid);
    if (!cached || cached.time <= Date.now() - PORTAL_MISSIONS_CACHE_MS) {
      if (cached) {
        portalMissionsCache.delete(portalGuid);
        storePortalMissionsCache();
      }
      return undefined;
    }
    return cached.data.slice();
  }

  function setPortalMissionsCache(portalGuid: string, missions: IitcIrisMissionSummary[]): void {
    portalMissionsCache.set(portalGuid, {time: Date.now(), data: missions.map(toMissionCacheSummary)});
    storePortalMissionsCache();
  }

  function getFreshMissionDetailsCache(missionGuid: string): IitcIrisMissionDetails | undefined {
    const cached = missionDetailsCache.get(missionGuid);
    if (!cached || cached.time <= Date.now() - MISSION_DETAILS_CACHE_MS) {
      if (cached) {
        missionDetailsCache.delete(missionGuid);
        storeMissionDetailsCache();
      }
      return undefined;
    }
    return cached.data;
  }

  function setMissionDetailsCache(missionGuid: string, mission: IitcIrisMissionDetails): void {
    missionDetailsCache.set(missionGuid, {time: Date.now(), data: mission});
    storeMissionDetailsCache();
    latestMissionsState = {
      ...latestMissionsState,
      missions: latestMissionsState.missions.map((summary) => summary.guid === missionGuid
        ? {...summary, ...getMissionSummaryDetails(missionGuid)}
        : summary),
    };
  }

  function getCurrentMissionBoundsPayload(): {northE6: number; southE6: number; westE6: number; eastE6: number} | undefined {
    const map = options.getMap();
    if (!map) return undefined;
    const bounds = map.getBounds();
    return {
      northE6: Math.round(bounds.getNorth() * 1_000_000),
      southE6: Math.round(bounds.getSouth() * 1_000_000),
      westE6: Math.round(bounds.getWest() * 1_000_000),
      eastE6: Math.round(bounds.getEast() * 1_000_000),
    };
  }

  function cancelActiveMissionsFetch(): void {
    currentMissionsAbortController?.abort();
    currentMissionsAbortController = undefined;
  }

  function cancelActiveMissionDetailsFetch(): void {
    currentMissionDetailsAbortController?.abort();
    currentMissionDetailsAbortController = undefined;
  }

  async function refreshMissions(source: IitcIrisMissionSource = 'view'): Promise<void> {
    cancelActiveMissionsFetch();
    cancelActiveMissionDetailsFetch();
    clearMissionOverlay();
    const startedAt = performance.now();
    const portalGuid = source === 'portal' ? options.getSelectedPortal().guid : undefined;
    const portalTitle = source === 'portal' ? options.getSelectedPortal().title : undefined;
    const cachedPortalMissions = portalGuid ? getFreshPortalMissionsCache(portalGuid) : undefined;
    if (source === 'portal' && portalGuid && cachedPortalMissions) {
      const missions = enrichMissionSummariesWithCache(cachedPortalMissions);
      latestMissionsState = {
        status: missions.length > 0 ? 'ready' : 'empty',
        requestState: 'ready',
        source,
        caption: `Missions at ${portalTitle || portalGuid}`,
        portalGuid,
        portalTitle,
        missions,
        selectedMission: undefined,
        detailsStatus: 'idle',
        cached: true,
        detailsCached: false,
        elapsedMs: 0,
        error: undefined,
      };
      postMissionsState();
      if (missions.length === 1) void refreshMissionDetails(missions[0].guid);
      return;
    }

    const abortController = new AbortController();
    currentMissionsAbortController = abortController;
    latestMissionsState = {
      status: 'loading',
      requestState: 'loading',
      source,
      caption: source === 'portal' ? `Missions at ${portalTitle || portalGuid || 'selected portal'}` : 'Missions in view',
      portalGuid,
      portalTitle,
      missions: [],
      selectedMission: undefined,
      detailsStatus: 'idle',
      cached: false,
      detailsCached: false,
      error: undefined,
    };
    postMissionsState();

    const payload = source === 'portal'
      ? portalGuid ? {guid: portalGuid} : undefined
      : getCurrentMissionBoundsPayload();
    if (!payload) {
      latestMissionsState = {
        ...latestMissionsState,
        status: 'error',
        requestState: 'error',
        elapsedMs: performance.now() - startedAt,
        error: source === 'portal' ? 'select a portal first' : 'missing map bounds',
      };
      postMissionsState();
      return;
    }

    try {
      const response = await postIntelEndpoint(
        source === 'portal' ? 'getTopMissionsForPortal' : 'getTopMissionsInBounds',
        payload,
        abortController.signal,
      );
      abortController.signal.throwIfAborted();
      const missionSummaries = sortMissionSummaries(parseIitcTopMissionsResponse(response).map(toIrisMissionSummary));
      if (source === 'portal' && portalGuid) setPortalMissionsCache(portalGuid, missionSummaries);
      const missions = enrichMissionSummariesWithCache(missionSummaries);
      latestMissionsState = {
        ...latestMissionsState,
        status: missions.length > 0 ? 'ready' : 'empty',
        requestState: 'ready',
        missions,
        cached: false,
        elapsedMs: performance.now() - startedAt,
      };
      postMissionsState();
      if (source === 'portal' && missions.length === 1) void refreshMissionDetails(missions[0].guid);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const status = isIitcAuthError(error) ? 'auth' : 'error';
      latestMissionsState = {
        ...latestMissionsState,
        status,
        requestState: status,
        elapsedMs: performance.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
      postMissionsState();
    } finally {
      if (currentMissionsAbortController === abortController) currentMissionsAbortController = undefined;
    }
  }

  async function refreshMissionDetails(guid: unknown): Promise<void> {
    const missionGuid = typeof guid === 'string' ? guid : '';
    if (!missionGuid) return;
    cancelActiveMissionDetailsFetch();
    const cachedMission = getFreshMissionDetailsCache(missionGuid);
    if (cachedMission) {
      latestMissionsState = {
        ...latestMissionsState,
        detailsStatus: 'ready',
        selectedMission: cachedMission,
        detailsCached: true,
        detailsElapsedMs: 0,
        error: undefined,
      };
      renderMissionOverlay(cachedMission);
      panToMissionStart(cachedMission);
      postMissionsState();
      return;
    }

    const abortController = new AbortController();
    currentMissionDetailsAbortController = abortController;
    const startedAt = performance.now();
    latestMissionsState = {
      ...latestMissionsState,
      detailsStatus: 'loading',
      selectedMission: latestMissionsState.selectedMission?.guid === missionGuid ? latestMissionsState.selectedMission : undefined,
      detailsCached: false,
      error: undefined,
    };
    postMissionsState();

    try {
      const response = await postIntelEndpoint('getMissionDetails', {guid: missionGuid}, abortController.signal);
      abortController.signal.throwIfAborted();
      const details = parseIitcMissionDetailsResponse(response);
      const selectedMission = details ? toIrisMissionDetails(details) : undefined;
      if (selectedMission) setMissionDetailsCache(missionGuid, selectedMission);
      latestMissionsState = {
        ...latestMissionsState,
        detailsStatus: selectedMission ? 'ready' : 'empty',
        selectedMission,
        detailsCached: false,
        detailsElapsedMs: performance.now() - startedAt,
      };
      renderMissionOverlay(selectedMission);
      panToMissionStart(selectedMission);
      postMissionsState();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const status = isIitcAuthError(error) ? 'auth' : 'error';
      latestMissionsState = {
        ...latestMissionsState,
        detailsStatus: status,
        detailsElapsedMs: performance.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      };
      renderMissionOverlay(undefined);
      postMissionsState();
    } finally {
      if (currentMissionDetailsAbortController === abortController) currentMissionDetailsAbortController = undefined;
    }
  }

  return {
    getState: () => latestMissionsState,
    refreshMissions, refreshMissionDetails,
    cancelRequests: (): void => {
      cancelActiveMissionsFetch();
      cancelActiveMissionDetailsFetch();
    },
  };
}
