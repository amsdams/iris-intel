import { render, h } from 'preact';
import '../ui/iris.css';
import { IRISOverlay } from '../ui/components/Overlay';
import { useStore, pluginManager, normalizeTeam, InventoryItem, Portal, Link, Field, Plext } from '@iris/core';
import PortalNamesPlugin from '../../../plugins/src/portal-names';
import ThemeSelectorPlugin from '../../../plugins/src/theme-selector';
import PlayerTrackerPlugin from '../../../plugins/src/player-tracker';
import ExportDataPlugin from '../../../plugins/src/export-data';
import { IRISPlugin } from '@iris/plugin-sdk';

// Tracks whether MapLibre has been given its initial position
let hasInitialPosition = false;
let lastPlextRequestTime = 0;
const PLEXT_COOLDOWN_MS = 5000;

// ---------------------------------------------------------------------------
// Intel API Types
// ---------------------------------------------------------------------------

interface IntelTile {
  deletedGameEntityGuids?: string[];
  gameEntities?: [string, number, unknown[]][];
}

interface IntelMapData {
  result?: {
    map?: Record<string, IntelTile>;
  };
}

interface PortalDetailsData {
  result?: unknown[];
}

interface PlextData {
  result?: [string, number, {
    plext: {
      text: string;
      markup: unknown[];
      categories: number;
      team: string;
      plextType: 'PLAYER_GENERATED' | 'SYSTEM_BROADCAST' | 'SYSTEM_NARROWCAST';
    };
  }][];
}

interface InventoryData {
  result?: [string, number, unknown][];
}

// ---------------------------------------------------------------------------
// Entity parsers
// ---------------------------------------------------------------------------

function parseEntities(data: IntelMapData): {
  portals: Partial<Portal>[];
  links: Partial<Link>[];
  fields: Partial<Field>[];
  deletedGuids: string[];
} {
  const portals: Partial<Portal>[] = [];
  const links: Partial<Link>[] = [];
  const fields: Partial<Field>[] = [];
  const deletedGuids: string[] = [];

  if (!data.result?.map) return { portals, links, fields, deletedGuids };

  Object.values(data.result.map).forEach((tile: IntelTile) => {
    // Handle deleted entities
    if (tile.deletedGameEntityGuids) {
      deletedGuids.push(...tile.deletedGameEntityGuids);
    }

    if (!tile.gameEntities) return;

    tile.gameEntities.forEach((entity) => {
      const [id, , entData] = entity;
      const entType = entData[0] as string;
      const team = normalizeTeam(entData[1] as string);

      if (entType === 'p') {
        portals.push({
          id,
          lat: parseFloat(entData[2] as string) / 1e6,
          lng: parseFloat(entData[3] as string) / 1e6,
          team,
          level: parseInt(entData[4] as string, 10),
          health: parseInt(entData[5] as string, 10),
        });
      } else if (entType === 'e') {
        links.push({
          id,
          team,
          fromPortalId: entData[2] as string,
          fromLat: parseFloat(entData[3] as string) / 1e6,
          fromLng: parseFloat(entData[4] as string) / 1e6,
          toPortalId: entData[5] as string,
          toLat: parseFloat(entData[6] as string) / 1e6,
          toLng: parseFloat(entData[7] as string) / 1e6,
        });
      } else if (entType === 'r') {
        const points = (entData[2] as unknown[][]).map((p: unknown[]) => ({
          lat: parseFloat(p[1] as string) / 1e6,
          lng: parseFloat(p[2] as string) / 1e6,
        }));
        fields.push({ id, team, points });
      }
    });
  });

  return { portals, links, fields, deletedGuids };
}

function parsePortalDetails(data: PortalDetailsData, params: { guid?: string }): Partial<Portal> | null {
  if (!data.result || !Array.isArray(data.result)) return null;
  const d = data.result;

  try {
    // Indices based on Niantic API:
    // [0] "p" (type)
    // [1] team ("E", "R", "M", "N")
    // [2] latE6
    // [3] lngE6
    // [4] level
    // [5] health
    // [6] resCount
    // [7] image
    // [8] name
    // [14] mods
    // [15] resonators
    // [16] owner

    // Parse mods — slot 14 is array of 4 slots, each null or [owner, name, rarity, stats]
    const mods = (d[14] as unknown[][] | undefined)
        ?.filter(Boolean)
        .map((m: unknown[]) => ({
            owner: m[0] as string,
            name: m[1] as string,
            rarity: m[2] as string,
            stats: m[3] as Record<string, string>,
        })) || [];

    // Parse resonators — slot 15 is array of [owner, level, energy]
    const resonators = (d[15] as unknown[][] | undefined)
        ?.filter(Boolean)
        .map((r: unknown[]) => ({
            owner: r[0] as string,
            level: r[1] as number,
            energy: r[2] as number,
        })) || [];

    return {
        id: params?.guid || '',
        lat: typeof d[2] === 'number' ? d[2] / 1e6 : parseFloat(d[2] as string) / 1e6,
        lng: typeof d[3] === 'number' ? d[3] / 1e6 : parseFloat(d[3] as string) / 1e6,
        team: normalizeTeam(d[1] as string),
        level: parseInt(String(d[4]), 10),
        health: parseInt(String(d[5]), 10),
        resCount: d[6] as number,
        image: d[7] as string,
        name: d[8] as string,
        owner: d[16] as string,
        mods,
        resonators,
    };
  } catch (e) {
      console.error('IRIS: Failed to parse portal details', e, data);
      return null;
  }
}

function parsePlexts(data: PlextData): Plext[] {
    if (!data.result) return [];
    try {
        return data.result.map((plext) => {
            const [id, time, plextData] = plext;
            const { text, markup, categories, team, plextType } = plextData.plext;
            return {
                id,
                time,
                text,
                markup: markup as unknown[],
                categories: categories as number,
                team: normalizeTeam(team as string),
                type: plextType,
            };
        });
    } catch (e) {
        console.error('IRIS: Error parsing plexts', e, data);
        return [];
    }
}

function parseInventory(data: InventoryData): InventoryItem[] {
    if (!data.result) return [];
    try {
        // Result is an array of [guid, timestamp, itemData]
        return data.result.map((item) => {
            const [guid, timestamp, itemData] = item;
            return {
                guid,
                timestamp,
                ...(itemData as object)
            } as InventoryItem;
        });
    } catch (e) {
        console.error('IRIS: Error parsing inventory', e, data);
        return [];
    }
}

// ---------------------------------------------------------------------------
// UI bootstrap
// ---------------------------------------------------------------------------

function initUI(): void {
  const container = document.createElement('div');
  container.id = 'iris-root';

  if (document.body) {
    document.body.appendChild(container);
    render(h(IRISOverlay, {}), container);
  } else {
    const observer = new MutationObserver((_, obs) => {
      if (document.body) {
        document.body.appendChild(container);
        render(h(IRISOverlay, {}), container);
        obs.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

// ---------------------------------------------------------------------------
// Plugins
// ---------------------------------------------------------------------------

pluginManager.load(PortalNamesPlugin as IRISPlugin);
pluginManager.load(ThemeSelectorPlugin as IRISPlugin);
pluginManager.load(PlayerTrackerPlugin as IRISPlugin);
pluginManager.load(ExportDataPlugin as IRISPlugin);

// ---------------------------------------------------------------------------
// Message handler — bridges main world interceptor and Preact UI
// ---------------------------------------------------------------------------

interface IRISMessage {
    type: string;
    url?: string;
    data?: unknown;
    params?: unknown;
    lat?: number;
    lng?: number;
    zoom?: number;
    center?: { lat: number; lng: number };
    status?: number;
    statusText?: string;
    time?: number;
    message?: string;
    source?: string;
    lineno?: number;
    colno?: number;
    guid?: string;
    tab?: string;
    minTimestampMs?: number;
    maxTimestampMs?: number;
    ascendingTimestampOrder?: boolean;
    bounds?: {
        minLatE6: number;
        minLngE6: number;
        maxLatE6: number;
        maxLngE6: number;
    };
    minLatE6?: number;
    maxLatE6?: number;
    minLngE6?: number;
    maxLngE6?: number;

    // Player stats fields
    nickname?: string;
    level?: number;
    ap?: number;
    team?: string;
    energy?: number;
    xm_capacity?: number;
    available_invites?: number;
    min_ap_for_current_level?: number;
    min_ap_for_next_level?: number;
    hasActiveSubscription?: boolean;
}

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as IRISMessage;
  if (msg?.type?.startsWith('IRIS') && useStore.getState().debugLogging) {
    console.log('IRIS raw message received:', msg.type, msg);
  }

  if (event.source !== window || !msg?.type) return;

  const { type, url, data, params } = msg;

  switch (type) {
    case 'IRIS_INITIAL_POSITION': {
      const { lat, lng, zoom } = msg as { lat: number; lng: number; zoom: number };
      hasInitialPosition = true;
      useStore.getState().updateMapState(lat, lng, Math.max(zoom, 14));
      break;
    }
    case 'IRIS_TILE_REQUEST':
      break;

    case 'IRIS_MOVE_MAP': {
      const { center, zoom, bounds } = msg as { 
        center: { lat: number; lng: number }; 
        zoom: number;
        bounds?: { minLatE6: number; minLngE6: number; maxLatE6: number; maxLngE6: number };
      };
      window.postMessage(
          { type: 'IRIS_MOVE_MAP_INTERNAL', center, zoom },
          '*'
      );
      useStore.getState().updateMapState(center.lat, center.lng, zoom, bounds);
      window.postMessage({ type: 'IRIS_PLEXTS_REQUEST', minTimestampMs: -1 }, '*');
      break;
    }

    case 'IRIS_MOVE_MAP_INTERNAL':
    case 'IRIS_GEOLOCATE':
      break;

    case 'IRIS_GEOLOCATE_REQUEST': {
      window.postMessage({ type: 'IRIS_GEOLOCATE' }, '*');
      break;
    }

    case 'IRIS_REGION_SCORE_REQUEST': {
        const { lat, lng } = msg as { lat: number; lng: number };
        window.postMessage({ 
            type: 'IRIS_REGION_SCORE_FETCH', 
            latE6: Math.round(lat * 1e6), 
            lngE6: Math.round(lng * 1e6) 
        }, '*');
        break;
    }

    case 'IRIS_REQUEST_START': {
        const url_data = url as string;
        if (url_data.includes('getPlexts')) {
            lastPlextRequestTime = Date.now();
        }
        useStore.getState().onRequestStart(url_data);
        break;
    }

    case 'IRIS_REQUEST_END': {
        useStore.getState().onRequestEnd();
        break;
    }

    case 'IRIS_REQUEST_FAILED': {
        useStore.getState().addFailedRequest({
            url: msg.url as string,
            status: msg.status as number,
            statusText: msg.statusText as string,
            time: msg.time as number
        });
        break;
    }

    case 'IRIS_REQUEST_SUCCESS': {
        useStore.getState().addSuccessfulRequest({
            url: msg.url as string,
            time: msg.time as number
        });
        break;
    }

    case 'IRIS_JS_ERROR': {
        useStore.getState().addJSError({
            message: msg.message as string,
            source: msg.source as string,
            lineno: msg.lineno as number,
            colno: msg.colno as number,
            time: msg.time as number
        });
        break;
    }

    case 'IRIS_PORTAL_DETAILS_REQUEST': {
      window.postMessage({
        type: 'IRIS_PORTAL_DETAILS_FETCH',
        guid: msg.guid as string,
      }, '*');
      break;
    }

    case 'IRIS_PLEXTS_REQUEST': {
      const now = Date.now();
      if (now - lastPlextRequestTime < PLEXT_COOLDOWN_MS) {
          break;
      }
      lastPlextRequestTime = now;
      
      const requestedTab = msg.tab;
      const minTimestampMs = msg.minTimestampMs ?? -1;
      const maxTimestampMs = msg.maxTimestampMs ?? -1;
      const ascendingTimestampOrder = msg.ascendingTimestampOrder ?? false;
      const bounds = useStore.getState().mapState.bounds;

      if (requestedTab) {
          window.postMessage({
            type: 'IRIS_PLEXTS_FETCH',
            tab: requestedTab,
            minTimestampMs,
            maxTimestampMs,
            ascendingTimestampOrder,
            ...bounds
          }, '*');

          if (requestedTab === 'alerts') {
              window.postMessage({
                type: 'IRIS_PLEXTS_FETCH',
                tab: 'all',
                minTimestampMs,
                maxTimestampMs,
                ascendingTimestampOrder,
                ...bounds
              }, '*');
          }
      } else {
          window.postMessage({
            type: 'IRIS_PLEXTS_FETCH',
            tab: 'all',
            minTimestampMs,
            maxTimestampMs,
            ascendingTimestampOrder,
            ...bounds
          }, '*');
          
          window.postMessage({
            type: 'IRIS_PLEXTS_FETCH',
            tab: 'faction',
            minTimestampMs,
            maxTimestampMs,
            ascendingTimestampOrder,
            ...bounds
          }, '*');
      }
      break;
    }

    case 'IRIS_DATA': {
      const url_str = url as string;
      
      // Handle stringified params from interceptor
      let parsedParams = params;
      if (typeof params === 'string') {
          try {
              parsedParams = JSON.parse(params);
          } catch {
              // Ignore parse errors for non-JSON bodies
          }
      }

      if (url_str.includes('getEntities')) {
        const { portals, links, fields, deletedGuids } = parseEntities(data as IntelMapData);
        const store = useStore.getState();

        if (!hasInitialPosition && portals.length > 0) {
          hasInitialPosition = true;
          const mid = portals[Math.floor(portals.length / 2)];
          if (mid.lat !== undefined && mid.lng !== undefined) {
            store.updateMapState(mid.lat, mid.lng, 15);
          }
        }

        if (deletedGuids.length > 0) store.removeEntities(deletedGuids);
        if (portals.length > 0) store.updatePortals(portals);
        if (links.length > 0) store.updateLinks(links);
        if (fields.length > 0) store.updateFields(fields);

      } else if (url_str.includes('getPortalDetails')) {
        const portal = parsePortalDetails(data as PortalDetailsData, parsedParams as { guid?: string });
        if (portal) useStore.getState().updatePortals([portal]);
      } else if (url_str.includes('getPlexts')) {
        lastPlextRequestTime = Date.now();
        const plexts = parsePlexts(data as PlextData);
        if (plexts.length > 0) useStore.getState().updatePlexts(plexts);
      } else if (url_str.includes('getGameScore')) {
        const [enlightened, resistance] = (data as { result?: [number, number] }).result || [0, 0];
        useStore.getState().setGameScore({ 
            enlightened: parseInt(String(enlightened), 10), 
            resistance: parseInt(String(resistance), 10) 
        });
      } else if (url_str.includes('getRegionScoreDetails')) {
        const res = (data as { result?: Record<string, unknown> }).result;
        if (res) {
            useStore.getState().setRegionScore({
                regionName: res.regionName as string,
                gameScore: [parseInt(res.gameScore[0] as string, 10), parseInt(res.gameScore[1] as string, 10)],
                topAgents: res.topAgents as { team: string; nick: string }[],
                scoreHistory: res.scoreHistory as [string, string, string][]
            });
        }
      } else if (url_str.includes('getHasActiveSubscription')) {
        const res = (data as { result?: boolean }).result;
        if (res !== undefined) {
            useStore.getState().setHasSubscription(res);
        }
      } else if (url_str.includes('getInventory')) {
        const inventory = parseInventory(data as InventoryData);
        if (inventory.length > 0) {
            useStore.getState().setInventory(inventory);
        }
      }
      break;
    }

    case 'IRIS_PLAYER_STATS': {
      const stats = msg as unknown as {
          nickname: string;
          level: number;
          ap: number;
          team: string;
          energy: number;
          xm_capacity: number;
          available_invites: number;
          min_ap_for_current_level: number;
          min_ap_for_next_level: number;
          hasActiveSubscription: boolean;
      };
      
      useStore.getState().setPlayerStats({ 
          nickname: stats.nickname, 
          level: stats.level, 
          ap: stats.ap, 
          team: stats.team,
          energy: stats.energy,
          xm_capacity: stats.xm_capacity,
          available_invites: stats.available_invites,
          min_ap_for_current_level: stats.min_ap_for_current_level,
          min_ap_for_next_level: stats.min_ap_for_next_level
        });
      if (stats.hasActiveSubscription) {
          useStore.getState().setHasSubscription(true);
      }
      break;
    }
    default:
      break;
  }
});

initUI();
