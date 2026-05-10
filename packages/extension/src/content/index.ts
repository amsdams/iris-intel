import { render, h } from 'preact';
import '../ui/iris.css';
import { IRISOverlay } from '../ui/Overlay';
import { 
  useStore, 
  pluginManager, 
  IntelMapData, 
  InventoryData, 
  PlextData, 
  PortalDetailsData, 
  GameScoreData, 
  RegionScoreData, 
  MissionDetailsData, 
  TopMissionsInBoundsData, 
  ArtifactData,
  PlayerStatsMessage,
  PasscodeResponseData,
  IntelInventoryItemData
} from '@iris/core';
import PortalNamesPlugin from '../../../plugins/src/portal-names';
import ThemeSelectorPlugin from '../../../plugins/src/theme-selector';
import PlayerTrackerPlugin from '../../../plugins/src/player-tracker';
import ExportDataPlugin from '../../../plugins/src/export-data';
import PortalLevelFillPlugin from '../../../plugins/src/portal-level-fill';
import PortalHealthFillPlugin from '../../../plugins/src/portal-health-fill';
import PortalLevelLabelsPlugin from '../../../plugins/src/portal-level-labels';
import PortalKeyCountLabelsPlugin from '../../../plugins/src/portal-key-count-labels';
import PlannedLinksPlugin from '../../../plugins/src/planned-links';
import { IRISPlugin } from '@iris/plugin-sdk';
import { handleEntities } from './domains/entities/handler';
import { getKnownOrnamentIds } from './domains/entities/ornaments';
import { handleInventory } from './domains/inventory/handler';
import mockInventoryData from './domains/inventory/mock.inventory.json';
import { handlePlayerStats } from './domains/player/handler';
import { handlePlexts } from './domains/plexts/handler';
import { handlePortalDetails } from './domains/portal-details/handler';
import { handleGameScore } from './domains/game-score/handler';
import { handleRegionScore } from './domains/region-score/handler';
import { handleMissionDetails } from './domains/missions/handler';
import { handleTopMissionsInBounds } from './domains/missions-list/handler';
import { handleArtifacts } from './domains/artifacts/handler';
import { handlePasscodeResponse } from './domains/passcodes/handler';
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
    .slice(0, 8);

  const ornamentIds = getKnownOrnamentIds();

  if (candidatePortals.length === 0 || ornamentIds.length === 0) {
    return {};
  }

  const mockOrnaments: Record<string, string[]> = {};

  ornamentIds.forEach((ornamentId, index) => {
    const portal = candidatePortals[index % candidatePortals.length];
    if (!mockOrnaments[portal.id]) {
      mockOrnaments[portal.id] = [];
    }
    mockOrnaments[portal.id].push(ornamentId);
  });

  return mockOrnaments;
}

function buildLoadedPortalKeyInventory(totalKeys = 500): InventoryData {
  const state = useStore.getState();
  const portals = Object.values(state.portals)
    .filter((portal) => portal.lat !== undefined && portal.lng !== undefined)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (portals.length === 0) {
    return { result: [] };
  }

  const now = Date.now();
  const looseCount = Math.ceil(totalKeys / 2);
  const capsuleCount = totalKeys - looseCount;
  const result: NonNullable<InventoryData['result']> = [];

  const createCoupler = (portal: typeof portals[number]): NonNullable<IntelInventoryItemData['portalCoupler']> => ({
    portalGuid: portal.id,
    portalLocation: `${Math.round(portal.lat * 1e6)},${Math.round(portal.lng * 1e6)}`,
    portalImageUrl: portal.image || '',
    portalTitle: portal.name || `Portal ${portal.id}`,
    portalAddress: `Mock loaded portal ${portal.id}`,
  });

  for (let i = 0; i < looseCount; i++) {
    const portal = portals[i % portals.length];
    result.push([
      `mock-loaded-key-${i + 1}`,
      now + i,
      {
        resource: { resourceType: 'PORTAL_LINK_KEY', resourceRarity: 'VERY_COMMON' },
        portalCoupler: createCoupler(portal),
      },
    ]);
  }

  if (capsuleCount > 0) {
    const stackableItems: { itemGuids: string[]; exampleGameEntity: [string, number, IntelInventoryItemData] }[] = Array.from({ length: capsuleCount }, (_, i) => {
      const portal = portals[(looseCount + i) % portals.length];
      return {
        itemGuids: [`mock-loaded-capsule-key-${i + 1}`],
        exampleGameEntity: [
          `mock-loaded-capsule-key-template-${i + 1}`,
          now + looseCount + i,
          {
            resource: { resourceType: 'PORTAL_LINK_KEY', resourceRarity: 'VERY_COMMON' },
            portalCoupler: createCoupler(portal),
          },
        ],
      };
    });

    result.push([
      'mock-loaded-key-capsule-500',
      now + totalKeys + 1,
      {
        resource: { resourceType: 'KEY_CAPSULE', resourceRarity: 'RARE' },
        moniker: { differentiator: 'LOAD' },
        container: {
          currentCapacity: 500,
          currentCount: capsuleCount,
          stackableItems,
        },
      },
    ]);
  }

  return { result };
}

function markMockInventoryLoaded(): void {
  const now = Date.now();
  useStore.getState().setEndpointMetadata('inventory', {
    status: 'success',
    lastSuccessAt: now,
    lastActiveSuccessAt: now,
    lastErrorAt: null,
    lastErrorStatus: null,
    lastErrorText: null,
    lastUrl: 'mock:getInventory',
  });
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
pluginManager.load(PlannedLinksPlugin as IRISPlugin);
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

  const { type, url, data, params, isActive } = msg;

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
      markMockInventoryLoaded();
      break;
    }

    case 'IRIS_LOAD_MOCK_PORTAL_KEYS_500': {
      const state = useStore.getState();
      inventoryMockPreviousSubscription = state.hasSubscription;
      state.setHasSubscription(true);
      const mockKeyInventory = buildLoadedPortalKeyInventory(500);
      handleInventory(mockKeyInventory);
      markMockInventoryLoaded();
      console.log(`IRIS: Loaded mock portal key inventory (${mockKeyInventory.result?.length ?? 0} top-level items)`);
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
            time: msg.time as number,
            isActive: msg.isActive
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
        const isActuallyActive = !!isActive;
        useStore.getState().setEndpointMetadata('entities', {
            [isActuallyActive ? 'lastActiveSuccessAt' : 'lastPassiveSuccessAt']: Date.now(),
        });
        handleEntities(data as IntelMapData, hasInitialPosition, () => {
          hasInitialPosition = true;
        }, (parsedParams as { tileKeys?: string[] })?.tileKeys);
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
