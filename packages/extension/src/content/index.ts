import { render, h } from 'preact';
import '../ui/iris.css';
import { IRISOverlay } from '../ui/Overlay';
import { useStore, pluginManager } from '@iris/core';
import PortalNamesPlugin from '../../../plugins/src/portal-names';
import ThemeSelectorPlugin from '../../../plugins/src/theme-selector';
import PlayerTrackerPlugin from '../../../plugins/src/player-tracker';
import ExportDataPlugin from '../../../plugins/src/export-data';
import { IRISPlugin } from '@iris/plugin-sdk';
import { handleEntities } from './domains/entities/handler';
import { IntelMapData } from './domains/entities/types';
import { handleInventory } from './domains/inventory/handler';
import { InventoryData } from './domains/inventory/types';
import { handlePlayerStats } from './domains/player/handler';
import { PlayerStatsMessage } from './domains/player/types';
import { handlePlexts } from './domains/plexts/handler';
import { PlextData } from './domains/plexts/types';
import { handlePortalDetails } from './domains/portal-details/handler';
import { PortalDetailsData } from './domains/portal-details/types';
import { handleGameScore } from './domains/game-score/handler';
import { GameScoreData } from './domains/game-score/types';
import { handleRegionScore } from './domains/region-score/handler';
import { RegionScoreData } from './domains/region-score/types';
import { handleMissionDetails } from './domains/missions/handler';
import { MissionDetailsData } from './domains/missions/types';
import { handleTopMissionsInBounds } from './domains/missions-list/handler';
import { TopMissionsInBoundsData } from './domains/missions-list/types';
import { IRISMessage } from './runtime/message-types';

// Tracks whether MapLibre has been given its initial position
let hasInitialPosition = false;
let lastPlextRequestTime = 0;
const PLEXT_COOLDOWN_MS = 5000;

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
        handleEntities(data as IntelMapData, hasInitialPosition, () => {
          hasInitialPosition = true;
        });
      } else if (url_str.includes('getPortalDetails')) {
        handlePortalDetails(data as PortalDetailsData, parsedParams as { guid?: string });
      } else if (url_str.includes('getPlexts')) {
        handlePlexts(data as PlextData, (time) => {
          lastPlextRequestTime = time;
        });
      } else if (url_str.includes('getGameScore')) {
        handleGameScore(data as GameScoreData);
      } else if (url_str.includes('getRegionScoreDetails')) {
        handleRegionScore(data as RegionScoreData);
      } else if (url_str.includes('getMissionDetails')) {
        handleMissionDetails(data as MissionDetailsData);
      } else if (url_str.includes('getTopMissionsInBounds') || url_str.includes('getTopMissionsForPortal')) {
        handleTopMissionsInBounds(data as TopMissionsInBoundsData);
      } else if (url_str.includes('getHasActiveSubscription')) {
        const res = (data as { result?: boolean }).result;
        if (res !== undefined) {
            useStore.getState().setHasSubscription(res);
        }
      } else if (url_str.includes('getInventory')) {
        handleInventory(data as InventoryData);
      }
      break;
    }

    case 'IRIS_PLAYER_STATS': {
      handlePlayerStats(msg as unknown as PlayerStatsMessage);
      break;
    }
    default:
      break;
  }
});

initUI();
