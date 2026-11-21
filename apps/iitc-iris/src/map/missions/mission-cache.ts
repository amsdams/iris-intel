import type {IitcIrisMissionDetails, IitcIrisMissionSummary} from '../../messages';

const MISSION_DETAILS_CACHE_MS = 3 * 24 * 60 * 60 * 1000;
const PORTAL_MISSIONS_CACHE_MS = 21 * 24 * 60 * 60 * 1000;
const MISSION_DETAILS_CACHE_STORAGE_KEY = 'iitc-iris:missions:details-cache';
const PORTAL_MISSIONS_CACHE_STORAGE_KEY = 'iitc-iris:missions:portal-cache';
const MISSION_DETAILS_CACHE_STORAGE_MAX_CHARS = 2_000_000;
const PORTAL_MISSIONS_CACHE_STORAGE_MAX_CHARS = 1_000_000;

export function toMissionCacheSummary(mission: IitcIrisMissionSummary): IitcIrisMissionSummary {
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

interface MissionCache {
  getFreshPortalMissionsCache: (portalGuid: string) => IitcIrisMissionSummary[] | undefined;
  setPortalMissionsCache: (portalGuid: string, missions: IitcIrisMissionSummary[]) => void;
  getFreshMissionDetailsCache: (missionGuid: string) => IitcIrisMissionDetails | undefined;
  setMissionDetailsCache: (missionGuid: string, mission: IitcIrisMissionDetails) => void;
}

export function createMissionCache(): MissionCache {
  interface MissionCacheEntry<T> {time: number; data: T}
  const missionDetailsCache = new Map<string, MissionCacheEntry<IitcIrisMissionDetails>>();
  const portalMissionsCache = new Map<string, MissionCacheEntry<IitcIrisMissionSummary[]>>();

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
  }

  return {getFreshPortalMissionsCache, setPortalMissionsCache, getFreshMissionDetailsCache, setMissionDetailsCache};
}
