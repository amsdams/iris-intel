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
  Plext,
  PlayerStatsMessage,
  PasscodeResponseData,
  IntelInventoryItemData,
  boundsE6ContainsLatLng,
  clampMapCamera,
  parseMapCamera,
  readNestedRecord,
  readStorageJson,
  shouldReplacePlextWindow,
  mockPlext
} from '@iris/core';
import PortalNamesPlugin from '../../../../packages/plugins/src/portal-names';
import ThemeSelectorPlugin from '../../../../packages/plugins/src/theme-selector';
import PlayerTrackerPlugin from '../../../../packages/plugins/src/player-tracker';
import ExportDataPlugin from '../../../../packages/plugins/src/export-data';
import PortalLevelFillPlugin from '../../../../packages/plugins/src/portal-level-fill';
import PortalHealthFillPlugin from '../../../../packages/plugins/src/portal-health-fill';
import PortalLevelLabelsPlugin from '../../../../packages/plugins/src/portal-level-labels';
import PortalKeyCountLabelsPlugin from '../../../../packages/plugins/src/portal-key-count-labels';
import PlannedLinksPlugin from '../../../../packages/plugins/src/planned-links';
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
import { INGRESS_TEAM_COLORS } from '@iris/core/ingress-map-style';
import { IRIS_PAGE_MAP_MIN_ZOOM, PAGE_MAP_RUNTIME_MESSAGES } from '../shared/page-map-runtime-protocol';

declare global {
  interface Window {
    __irisContentInitialized?: boolean;
  }
}

if (window.__irisContentInitialized) {
  console.warn('IRIS: content runtime already initialized; skipping duplicate bootstrap');
} else {
  window.__irisContentInitialized = true;

// The store has a usable default camera; live entity payloads should not choose
// a startup camera unless an explicit Intel/map sync message does so.
let hasInitialPosition = true;
let latestEntityRefreshGeneration = 0;
let pageMapMoving = false;
let inventoryMockPreviousSubscription: boolean | null = null;
let pendingStartupPosition: { lat: number; lng: number; zoom: number } | null = null;
let startupPositionTimeoutId: number | null = null;
let startupPositionUnsubscribe: (() => void) | null = null;
const requestCoordinator = createRequestCoordinator();
const MOCK_PLAYER_TRACKER_PLUGIN_ID = 'debug-mock-player-tracker';
const MOCK_PLAYER_ACTIVITY_PLEXT_PREFIX = 'mock-player-activity:';
const IRIS_SETTINGS_STORAGE_KEY = 'iris-settings';

function readPersistedMapPosition(): { lat: number; lng: number; zoom: number } | null {
  const mapState = readNestedRecord(readStorageJson<unknown>(IRIS_SETTINGS_STORAGE_KEY), ['state', 'mapState']);
  const position = parseMapCamera(mapState);
  return position ? clampMapCamera(position, {minZoom: IRIS_PAGE_MAP_MIN_ZOOM}) : null;
}

function hasStoredMapPosition(): boolean {
  return readPersistedMapPosition() !== null;
}

function cleanupPendingStartupPosition(): void {
  if (startupPositionTimeoutId !== null) {
    window.clearTimeout(startupPositionTimeoutId);
    startupPositionTimeoutId = null;
  }
  if (startupPositionUnsubscribe !== null) {
    startupPositionUnsubscribe();
    startupPositionUnsubscribe = null;
  }
}

function applyIntelStartupPosition(position: { lat: number; lng: number; zoom: number }): void {
  const state = useStore.getState();

  // Intel startup cookies can contain stale/fallback locations. IRIS owns the
  // visible MapLibre camera, so startup cookies only mark initialization; they
  // should not override persisted/default IRIS camera state.
  hasInitialPosition = true;
  if (state.rehydrated && hasStoredMapPosition()) return;
  void position;
}

function flushPendingStartupPosition(force = false): void {
  if (!pendingStartupPosition) return;
  if (!force && !useStore.getState().rehydrated) return;

  const position = pendingStartupPosition;
  pendingStartupPosition = null;
  cleanupPendingStartupPosition();
  applyIntelStartupPosition(position);
}

function handleIntelStartupPosition(position: { lat: number; lng: number; zoom: number }): void {
  if (useStore.getState().rehydrated) {
    applyIntelStartupPosition(position);
    return;
  }

  pendingStartupPosition = position;

  if (startupPositionUnsubscribe === null) {
    startupPositionUnsubscribe = useStore.subscribe(
      (state) => state.rehydrated,
      (rehydrated) => {
        if (rehydrated) flushPendingStartupPosition();
      },
    );
  }

  if (startupPositionTimeoutId === null) {
    startupPositionTimeoutId = window.setTimeout(() => flushPendingStartupPosition(true), 1500);
  }
}

function buildMockArtifacts(): ArtifactData {
  const state = useStore.getState();
  const allPortals = Object.values(state.portals);
  const bounds = state.mapState.bounds;

  const inBoundsPortals = bounds
    ? allPortals.filter((portal) =>
        boundsE6ContainsLatLng(bounds, portal)
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
        boundsE6ContainsLatLng(bounds, portal)
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

function buildMockCoLocatedPlayerTrackerFeatures(playerCount = 8): GeoJSON.Feature[] {
  const state = useStore.getState();
  const portals = Object.values(state.portals);
  const center = state.mapState;
  const bounds = center.bounds;
  const inBoundsPortals = bounds
    ? portals.filter((portal) =>
        boundsE6ContainsLatLng(bounds, portal)
      )
    : portals;

  const candidates = (inBoundsPortals.length > 0 ? inBoundsPortals : portals)
    .filter((portal) => portal.team !== 'N')
    .sort((a, b) => {
      const distanceA = Math.hypot(a.lat - center.lat, a.lng - center.lng);
      const distanceB = Math.hypot(b.lat - center.lat, b.lng - center.lng);
      return distanceA - distanceB;
    });

  const portal = candidates[0] ?? portals[0];
  if (!portal) return [];

  const now = Date.now();
  const names = ['AdaNorth', 'JarvisEast', 'KurezeWest', 'Lightman', 'MistWalker', 'NianticOps', 'ResoRunner', 'ShardScout'];

  return names.slice(0, playerCount).map((name, index): GeoJSON.Feature<GeoJSON.Point> => {
    const team = index % 2 === 0 ? 'R' : 'E';
    const color = team === 'R' ? INGRESS_TEAM_COLORS.R : INGRESS_TEAM_COLORS.E;
    const time = now - index * 60_000;
    return {
      type: 'Feature',
      id: `mock-player:${name}`,
      geometry: {type: 'Point', coordinates: [portal.lng, portal.lat]},
      properties: {
        id: `mock-player:${name}`,
        name,
        team,
        color,
        opacity: 1,
        isPlayerMarker: true,
        label: `${name}, ${index}m`,
        time,
        portalName: portal.name || `Portal ${portal.id}`,
        actions: [{
          text: `${name} deployed a Resonator on ${portal.name || portal.id}`,
          time,
          markup: [
            ['PLAYER', {plain: name, team}],
            ['TEXT', {plain: ' deployed a Resonator on '}],
            ['PORTAL', {
              name: portal.name || portal.id,
              plain: portal.name || portal.id,
              latE6: Math.round(portal.lat * 1e6),
              lngE6: Math.round(portal.lng * 1e6),
            }],
          ],
        }],
      },
    };
  });
}

function buildMockPlayerActivityPlexts(): Plext[] {
  const state = useStore.getState();
  const portals = Object.values(state.portals);
  const center = state.mapState;
  const bounds = center.bounds;
  const inBoundsPortals = bounds
    ? portals.filter((portal) =>
        boundsE6ContainsLatLng(bounds, portal)
      )
    : portals;

  const candidates = (inBoundsPortals.length > 0 ? inBoundsPortals : portals)
    .filter((portal) => portal.lat !== undefined && portal.lng !== undefined)
    .sort((a, b) => {
      const distanceA = Math.hypot(a.lat - center.lat, a.lng - center.lng);
      const distanceB = Math.hypot(b.lat - center.lat, b.lng - center.lng);
      return distanceA - distanceB;
    })
    .slice(0, 6);

  if (candidates.length === 0) return [];

  const now = Date.now();
  const players = [
    {name: 'MockRunner', team: 'R'},
    {name: 'MockBuilder', team: 'E'},
    {name: 'MockFieldOps', team: 'R'},
    {name: 'MockScout', team: 'E'},
    {name: 'MockReso', team: 'R'},
    {name: 'MockLinker', team: 'E'},
    {name: 'MockAnchor', team: 'R'},
    {name: 'MockCapsule', team: 'E'},
    {name: 'MockScanner', team: 'R'},
    {name: 'MockOperator', team: 'E'},
  ];

  return players.map((player, playerIndex): Plext => {
    const portal = candidates[playerIndex % candidates.length];
    const time = now - playerIndex * 45_000;
    const actionText = playerIndex % 3 === 0
      ? ' captured '
      : playerIndex % 3 === 1
        ? ' deployed a Resonator on '
        : ' linked ';
    const portalName = portal.name || portal.id;

    return mockPlext({
      id: `${MOCK_PLAYER_ACTIVITY_PLEXT_PREFIX}${player.name}:${time}`,
      time,
      text: `${player.name}${actionText}${portalName}`,
      team: player.team,
      type: 'PLAYER_GENERATED',
      markup: [
        ['PLAYER', {plain: player.name, team: player.team}],
        ['TEXT', {plain: actionText}],
        ['PORTAL', {
          plain: portalName,
          name: portalName,
          latE6: Math.round(portal.lat * 1e6),
          lngE6: Math.round(portal.lng * 1e6),
        }],
      ],
    });
  });
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

const requestResumeRefresh = (): void => {
  window.postMessage({ type: 'IRIS_REFRESH_CURRENT_VIEW', reason: 'resume' }, '*');
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    requestResumeRefresh();
  }
});
window.addEventListener('focus', requestResumeRefresh);
window.addEventListener('online', requestResumeRefresh);

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
    case PAGE_MAP_RUNTIME_MESSAGES.movement: {
      pageMapMoving = msg.moving === true;
      requestCoordinator.handlePageMapMovement(pageMapMoving);
      break;
    }

    case 'IRIS_INTEL_STARTUP_POSITION': {
      const camera = parseMapCamera(msg, {rejectNullIsland: false});
      if (camera) handleIntelStartupPosition(clampMapCamera(camera, {minZoom: IRIS_PAGE_MAP_MIN_ZOOM}));
      break;
    }

    case 'IRIS_INTEL_POSITION_SYNC':
    case 'IRIS_INITIAL_POSITION': {
      const incomingCamera = parseMapCamera(msg, {rejectNullIsland: false});
      if (!incomingCamera) break;
      hasInitialPosition = true;
      const state = useStore.getState();
      const currentZoom = state.mapState.zoom;
      // If the incoming zoom is an integer (from Intel) and close to our current zoom,
      // it's likely just Intel snapping to integer zoom levels.
      // We keep our fractional zoom to avoid the "bounce" effect.
      const targetZoom = (Math.abs(currentZoom - incomingCamera.zoom) < 0.5) ? currentZoom : incomingCamera.zoom;
      const camera = clampMapCamera({...incomingCamera, zoom: targetZoom}, {minZoom: IRIS_PAGE_MAP_MIN_ZOOM});
      state.updateMapCamera(camera.lat, camera.lng, camera.zoom);
      break;
    }
    case 'IRIS_DISCOVERED_LOCATION': {
      const location = typeof msg.location === 'string' ? msg.location : null;
      const {lat, lng} = useStore.getState().mapState;
      useStore.getState().setDiscoveredLocation(location, {lat, lng});
      break;
    }
    case 'IRIS_TILE_REQUEST':
      break;

    case 'IRIS_MOVE_MAP': {
      requestCoordinator.handleMoveMap(msg);
      break;
    }

    case 'IRIS_REFRESH_CURRENT_VIEW': {
      requestCoordinator.handleCurrentViewRefresh(msg.reason === 'manual' ? 'manual' : 'resume');
      break;
    }

    case 'IRIS_BENCHMARK_PRELOAD_ENTITIES': {
      requestCoordinator.handleBenchmarkEntitiesPreload();
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

    case 'IRIS_LOAD_MOCK_PLAYER_TRACKER': {
      const features = buildMockCoLocatedPlayerTrackerFeatures(8);
      pluginManager.setDebugFeatures(MOCK_PLAYER_TRACKER_PLUGIN_ID, features);
      console.log(`IRIS: Loaded mock co-located player tracker pins (${features.length})`);
      break;
    }

    case 'IRIS_CLEAR_MOCK_PLAYER_TRACKER': {
      pluginManager.clearDebugFeatures(MOCK_PLAYER_TRACKER_PLUGIN_ID);
      break;
    }

    case 'IRIS_LOAD_MOCK_PLAYER_ACTIVITY': {
      const plexts = buildMockPlayerActivityPlexts();
      useStore.getState().updatePlexts(plexts);
      console.log(`IRIS: Loaded mock player activity plexts (${plexts.length})`);
      break;
    }

    case 'IRIS_CLEAR_MOCK_PLAYER_ACTIVITY': {
      useStore.getState().removePlextsByIdPrefix(MOCK_PLAYER_ACTIVITY_PLEXT_PREFIX);
      console.log('IRIS: Cleared mock player activity plexts');
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
        useStore.getState().onRequestEnd(typeof msg.url === 'string' ? msg.url : undefined);
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
            isActive: msg.isActive,
            isMoving: pageMapMoving,
        });
        break;
    }

    case 'IRIS_ENTITY_REFRESH_GENERATION': {
        if (typeof msg.entityGeneration === 'number') {
            latestEntityRefreshGeneration = Math.max(latestEntityRefreshGeneration, msg.entityGeneration);
        }
        break;
    }

    case 'IRIS_ENTITY_REFRESH_STALE_QUEUED_DROP': {
        const current = useStore.getState().endpointDiagnostics.entities;
        useStore.getState().setEndpointMetadata('entities', {
            staleQueuedDropCount: current.staleQueuedDropCount + 1,
            lastSkipReason: `dropped stale queued generation ${String(msg.entityGeneration ?? '?')}`,
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

    case 'IRIS_DOMAIN_ERROR': {
        useStore.getState().addDomainError({
            domain: String(msg.domain ?? 'unknown'),
            message: String(msg.message ?? 'Unknown domain error'),
            detail: typeof msg.detail === 'string' ? msg.detail : undefined,
            time: typeof msg.time === 'number' ? msg.time : Date.now(),
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
        const entityGeneration = typeof msg.entityGeneration === 'number' ? msg.entityGeneration : undefined;
        if (isActuallyActive && typeof entityGeneration === 'number' && entityGeneration < latestEntityRefreshGeneration) {
            const current = useStore.getState().endpointDiagnostics.entities;
            useStore.getState().setEndpointMetadata('entities', {
                staleResponseIgnoreCount: current.staleResponseIgnoreCount + 1,
                lastSkipReason: `stale generation ${entityGeneration}`,
            });
            break;
        }
        useStore.getState().setEndpointMetadata('entities', {
            [isActuallyActive ? 'lastActiveSuccessAt' : 'lastPassiveSuccessAt']: Date.now(),
        });
        handleEntities(data as IntelMapData, hasInitialPosition, () => {
          hasInitialPosition = true;
        }, (parsedParams as { tileKeys?: string[] })?.tileKeys);
      } else if (url_str.includes('getPortalDetails')) {
        handlePortalDetails(data as PortalDetailsData, parsedParams as { guid?: string });
      } else if (url_str.includes('getPlexts')) {
        const plextParams = parsedParams as { minTimestampMs?: number; maxTimestampMs?: number } | undefined;
        const plexts = handlePlexts(data as PlextData, { replace: shouldReplacePlextWindow(plextParams) });
        requestCoordinator.onPlextsDataReceived(Date.now(), plexts);
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
