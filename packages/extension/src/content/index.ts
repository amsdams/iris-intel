import { render, h } from 'preact';
import '../ui/iris.css';
import { IRISOverlay } from '../ui/Overlay';
import { useStore, pluginManager } from '@iris/core';
import PortalNamesPlugin from '../../../plugins/src/portal-names';
import ThemeSelectorPlugin from '../../../plugins/src/theme-selector';
import PlayerTrackerPlugin from '../../../plugins/src/player-tracker';
import ExportDataPlugin from '../../../plugins/src/export-data';
import PortalLevelFillPlugin from '../../../plugins/src/portal-level-fill';
import PortalHealthFillPlugin from '../../../plugins/src/portal-health-fill';
import PortalLevelLabelsPlugin from '../../../plugins/src/portal-level-labels';
import PortalKeyCountLabelsPlugin from '../../../plugins/src/portal-key-count-labels';
import { IRISPlugin } from '@iris/plugin-sdk';
import { handleEntities } from './domains/entities/handler';
import { IntelMapData } from './domains/entities/types';
import { handleInventory } from './domains/inventory/handler';
import { InventoryData } from './domains/inventory/types';
import mockInventoryData from './domains/inventory/mock.inventory.json';
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
import { handleArtifacts } from './domains/artifacts/handler';
import { ArtifactData } from './domains/artifacts/types';
import { handlePasscodeResponse } from './domains/passcodes/handler';
import { PasscodeResponseData } from './domains/passcodes/types';
import mockPasscodeData from './domains/passcodes/mock.passcode.json';
import { IRISMessage } from './runtime/message-types';
import { createRequestCoordinator } from './runtime/request-coordinator';

declare global {
  interface Window {
    __irisContentInitialized?: boolean;
  }
}

if (window.__irisContentInitialized) {
  console.warn('IRIS: content runtime already initialized; skipping duplicate bootstrap');
} else {
  window.__irisContentInitialized = true;

// Tracks whether MapLibre has been given its initial position
let hasInitialPosition = false;
let inventoryMockPreviousSubscription: boolean | null = null;
const requestCoordinator = createRequestCoordinator();

function buildMockArtifacts(): ArtifactData {
  const state = useStore.getState();
  const allPortals = Object.values(state.portals);
  const bounds = state.mapState.bounds;

  const inBoundsPortals = bounds
    ? allPortals.filter((portal) =>
        portal.lat >= bounds.minLatE6 / 1e6 &&
        portal.lat <= bounds.maxLatE6 / 1e6 &&
        portal.lng >= bounds.minLngE6 / 1e6 &&
        portal.lng <= bounds.maxLngE6 / 1e6
      )
    : [];

  const candidatePortals = (inBoundsPortals.length > 0 ? inBoundsPortals : allPortals)
    .filter((portal) => portal.team !== 'N')
    .slice(0, 3);

  if (candidatePortals.length === 0) {
    return { result: [] };
  }

  return {
    result: candidatePortals.map((portal, index) => [
      portal.id,
      Date.now(),
      [
        index % 2 === 0 ? 'shard' : 'target',
        [`${index + 1}01`, `${index + 1}02`],
      ],
    ]),
  };
}

function buildMockOrnaments(): Record<string, string[]> {
  const state = useStore.getState();
  const allPortals = Object.values(state.portals);
  const bounds = state.mapState.bounds;

  const inBoundsPortals = bounds
    ? allPortals.filter((portal) =>
        portal.lat >= bounds.minLatE6 / 1e6 &&
        portal.lat <= bounds.maxLatE6 / 1e6 &&
        portal.lng >= bounds.minLngE6 / 1e6 &&
        portal.lng <= bounds.maxLngE6 / 1e6
      )
    : [];

  const candidatePortals = (inBoundsPortals.length > 0 ? inBoundsPortals : allPortals)
    .filter((portal) => portal.team !== 'N')
    .slice(0, 5);

  return Object.fromEntries(
    candidatePortals.map((portal, index) => [
      portal.id,
      [index % 2 === 0 ? 'ap' : 'event'],
    ])
  );
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
pluginManager.load(PortalLevelFillPlugin as IRISPlugin);
pluginManager.load(PortalHealthFillPlugin as IRISPlugin);
pluginManager.load(PortalLevelLabelsPlugin as IRISPlugin);
pluginManager.load(PortalKeyCountLabelsPlugin as IRISPlugin);
requestCoordinator.start();

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as IRISMessage;
  if (msg?.type?.startsWith('IRIS') && useStore.getState().debugLogging) {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    console.log(`[IRIS ${timestamp}] raw message received:`, msg.type, msg);
  }

  if (event.source !== window || !msg?.type) return;

  const { type, url, data, params } = msg;

  switch (type) {
    case 'IRIS_INTEL_STARTUP_POSITION': {
      const { lat, lng, zoom } = msg as { lat: number; lng: number; zoom: number };
      const state = useStore.getState();
      if (state.rehydrated && !(state.mapState.lat === 0 && state.mapState.lng === 0)) {
        hasInitialPosition = true;
        break;
      }

      hasInitialPosition = true;
      state.updateMapState(lat, lng, zoom);
      break;
    }

    case 'IRIS_INTEL_POSITION_SYNC':
    case 'IRIS_INITIAL_POSITION': {
      const { lat, lng, zoom } = msg as { lat: number; lng: number; zoom: number };
      hasInitialPosition = true;
      const state = useStore.getState();
      const currentZoom = state.mapState.zoom;
      // If the incoming zoom is an integer (from Intel) and close to our current zoom,
      // it's likely just Intel snapping to integer zoom levels.
      // We keep our fractional zoom to avoid the "bounce" effect.
      const targetZoom = (Math.abs(currentZoom - zoom) < 0.5) ? currentZoom : zoom;
      state.updateMapState(lat, lng, targetZoom);
      break;
    }
    case 'IRIS_DISCOVERED_LOCATION': {
      const { location } = msg as { location: string | null };
      useStore.getState().setDiscoveredLocation(location);
      break;
    }
    case 'IRIS_TILE_REQUEST':
      break;

    case 'IRIS_MOVE_MAP': {
      requestCoordinator.handleMoveMap(msg);
      break;
    }

    case 'IRIS_MOVE_MAP_INTERNAL':
    case 'IRIS_GEOLOCATE':
      break;

    case 'IRIS_GEOLOCATE_REQUEST': {
      requestCoordinator.handleGeolocateRequest();
      break;
    }

    case 'IRIS_INVENTORY_REQUEST': {
      requestCoordinator.handleInventoryRequest();
      break;
    }

    case 'IRIS_LOAD_MOCK_INVENTORY': {
      const state = useStore.getState();
      inventoryMockPreviousSubscription = state.hasSubscription;
      state.setHasSubscription(true);
      handleInventory(mockInventoryData as InventoryData);
      break;
    }

    case 'IRIS_CLEAR_MOCK_INVENTORY': {
      const state = useStore.getState();
      state.setInventory([]);
      if (inventoryMockPreviousSubscription !== null) {
        state.setHasSubscription(inventoryMockPreviousSubscription);
        inventoryMockPreviousSubscription = null;
      }
      break;
    }

    case 'IRIS_LOAD_MOCK_ARTIFACTS': {
      handleArtifacts(buildMockArtifacts());
      break;
    }

    case 'IRIS_CLEAR_MOCK_ARTIFACTS': {
      useStore.getState().updateArtifacts([]);
      break;
    }

    case 'IRIS_LOAD_MOCK_ORNAMENTS': {
      useStore.getState().setMockOrnaments(buildMockOrnaments());
      break;
    }

    case 'IRIS_CLEAR_MOCK_ORNAMENTS': {
      useStore.getState().clearMockOrnaments();
      break;
    }

    case 'IRIS_GAME_SCORE_REQUEST': {
      requestCoordinator.handleGameScoreRequest();
      break;
    }

    case 'IRIS_REGION_SCORE_REQUEST': {
        requestCoordinator.handleRegionScoreRequest(msg);
        break;
    }

    case 'IRIS_REQUEST_START': {
        const url_data = url as string;
        requestCoordinator.onRequestStart(url_data);
        useStore.getState().onRequestStart(url_data);
        break;
    }

    case 'IRIS_REQUEST_END': {
        useStore.getState().onRequestEnd();
        break;
    }

    case 'IRIS_REQUEST_FAILED': {
        if ((msg.url as string).includes('sendPlext')) {
            useStore.getState().setCommSendError(String(msg.statusText ?? 'COMM send failed'));
        }
        useStore.getState().addFailedRequest({
            url: msg.url as string,
            status: msg.status as number,
            statusText: msg.statusText as string,
            time: msg.time as number
        });
        break;
    }

    case 'IRIS_INITIAL_LOGIN_REQUIRED': {
        useStore.getState().setInitialLoginRequired({
            url: msg.url as string,
            status: msg.status as number,
            statusText: msg.statusText as string,
            time: msg.time as number
        });
        break;
    }

    case 'IRIS_SESSION_EXPIRED': {
        useStore.getState().setSessionExpired({
            url: msg.url as string,
            status: msg.status as number,
            statusText: msg.statusText as string,
            time: msg.time as number
        });
        break;
    }

    case 'IRIS_SESSION_RECOVERING': {
        useStore.getState().setSessionRecovering();
        break;
    }

    case 'IRIS_SESSION_RECOVERED': {
        useStore.getState().setSessionRecovered();
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
      requestCoordinator.handlePortalDetailsRequest(msg);
      break;
    }

    case 'IRIS_COMM_SEND_REQUEST': {
      requestCoordinator.handleCommSendRequest(msg);
      break;
    }

    case 'IRIS_PASSCODE_REDEEM_REQUEST': {
      requestCoordinator.handlePasscodeRedeemRequest(msg);
      break;
    }

    case 'IRIS_COMM_SEND_SUCCESS': {
      requestCoordinator.handleCommSendSuccess(msg);
      break;
    }

    case 'IRIS_COMM_SEND_FAILED': {
      useStore.getState().setCommSendError(String(msg.statusText ?? 'COMM send failed'));
      break;
    }

    case 'IRIS_PASSCODE_REDEEM_FAILED': {
      useStore.getState().setPasscodeRedeemError(String(msg.statusText ?? 'Passcode redemption failed'));
      break;
    }

    case 'IRIS_LOAD_MOCK_PASSCODE': {
      handlePasscodeResponse(mockPasscodeData as PasscodeResponseData);
      break;
    }

    case 'IRIS_CLEAR_MOCK_PASSCODE': {
      useStore.getState().clearPasscodeRedeemState();
      break;
    }

    case 'IRIS_MISSIONS_REQUEST': {
      requestCoordinator.handleMissionsRequest();
      break;
    }

    case 'IRIS_MISSION_DETAILS_REQUEST': {
      requestCoordinator.handleMissionDetailsRequest(msg);
      break;
    }

    case 'IRIS_PLEXTS_REQUEST': {
      requestCoordinator.handlePlextsRequest(msg);
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
          requestCoordinator.onPlextsDataReceived(time);
        });
      } else if (url_str.includes('getGameScore')) {
        handleGameScore(data as GameScoreData);
      } else if (url_str.includes('getRegionScoreDetails')) {
        handleRegionScore(data as RegionScoreData);
      } else if (url_str.includes('getMissionDetails')) {
        handleMissionDetails(data as MissionDetailsData);
      } else if (url_str.includes('getTopMissionsInBounds') || url_str.includes('getTopMissionsForPortal')) {
        handleTopMissionsInBounds(data as TopMissionsInBoundsData);
      } else if (url_str.includes('getArtifactPortals')) {
        handleArtifacts(data as ArtifactData);
      } else if (url_str.includes('getHasActiveSubscription')) {
        const res = (data as { result?: boolean }).result;
        if (res !== undefined) {
            useStore.getState().setHasSubscription(res);
        }
      } else if (url_str.includes('getInventory')) {
        handleInventory(data as InventoryData);
      } else if (url_str.includes('redeemReward')) {
        handlePasscodeResponse(data as PasscodeResponseData);
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
}
