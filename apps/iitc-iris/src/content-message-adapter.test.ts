import {describe, expect, it} from 'vitest';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisRenderPolicy, type IitcIrisRequestDiagnostics, type IitcIrisSelectedPortal} from './messages';
import {DEFAULT_LAYER_SETTINGS} from './layer-registry';
import {
  entityFetchStateFromMessage,
  handleIitcIrisContentMessage,
  type CameraState,
  type EntityFetchState,
  type IitcIrisContentMessageActions,
  type IitcIrisContentMessageContext,
} from './content-message-adapter';

const selectedPortal: IitcIrisSelectedPortal = {
  guid: 'portal-guid',
  team: 'R',
  latE6: 52_000_000,
  lngE6: 4_000_000,
  isPlaceholder: false,
  ornaments: [],
  artifacts: [],
  links: {count: 0, incoming: 0, outgoing: 0, guids: []},
  fields: {count: 0, guids: []},
};

const renderPolicy: IitcIrisRenderPolicy = {
  optionalOverlayMinZoom: 14,
  detailedPortals: false,
  activeHighlighter: 'none',
  levelFill: false,
  healthFill: false,
  ornaments: false,
  artifacts: false,
  labels: false,
};

function createEntityFetchState(): EntityFetchState {
  return {
    status: 'idle',
    entitySource: 'idle',
    authRequired: false,
    generation: 0,
    key: '',
    collision: false,
    portals: 0,
    realPortals: 0,
    placeholderPortals: 0,
    ornamentPortals: 0,
    drawnOrnamentMarkers: 0,
    hiddenOrnamentMarkers: 0,
    ornamentTypes: {},
    artifactPortals: 0,
    drawnArtifactMarkers: 0,
    artifactTypes: {},
    artifactFetchStatus: 'disabled',
    artifactFetchPortalCount: 0,
    artifactFetchTypes: [],
    artifactFetchElapsedMs: null,
    artifactFetchError: '',
    levelLabels: 0,
    damagedPortals: 0,
    links: 0,
    fields: 0,
    viewportPortals: 0,
    viewportRealPortals: 0,
    viewportPlaceholderPortals: 0,
    viewportLinks: 0,
    viewportFields: 0,
    viewportOrnamentPortals: 0,
    viewportOrnamentMarkers: 0,
    viewportArtifactPortals: 0,
    viewportArtifactMarkers: 0,
    requestedTiles: 0,
    returnedTiles: 0,
    nonEmptyTiles: 0,
    elapsedMs: null,
    firstRenderElapsedMs: null,
    retryRequests: 0,
    retriedTileKeys: [],
    recoveredTileKeys: [],
    emptyTileKeys: [],
    nonEmptyTileKeys: [],
    unaccountedTileKeys: [],
    serverRetryTileKeys: [],
    timeoutTileKeys: [],
    errorTileKeys: [],
    responseRetryTileKeys: [],
    queueDelayReasons: [],
    partialTileKeys: [],
    cacheFreshTileKeys: [],
    cacheStaleTileKeys: [],
    staleGenerationCacheWarmTileKeys: [],
    queue: null,
    renderQueue: null,
    renderMutation: null,
    timing: null,
    playerTracker: null,
    baseLayerId: 'cartodb-dark-matter',
    dataSource: {mode: 'live'},
    highlighterSettings: {active: 'none'},
    highlighterIds: [],
    renderPolicy,
    selectedPortal: null,
    portalDetails: null,
    portalAnalysis: null,
  };
}

function applySetter<T>(current: T, value: T | ((current: T) => T)): T {
  return typeof value === 'function' ? (value as (current: T) => T)(current) : value;
}

describe('IITC IRIS content message adapter', () => {
  it('projects entity status messages into the content fetch state', () => {
    const current = createEntityFetchState();
    const next = entityFetchStateFromMessage({
      type: IITC_IRIS_MESSAGES.entityStatus,
      status: 'entities ready',
      portals: 3,
      links: 2,
      selectedPortal,
    }, current);

    expect(next).toMatchObject({
      status: 'entities ready',
      entitySource: 'live',
      portals: 3,
      links: 2,
      selectedPortal,
    });
    expect(next.generation).toBe(current.generation);
  });

  it('clears stale map context when normal portal selection arrives via entity status', () => {
    let entityFetch = createEntityFetchState();
    let mapContextCleared = false;
    let requestDiagnostics: IitcIrisRequestDiagnostics = {activeRequests: 0, activeByEndpoint: {}, active: []};
    const camera: CameraState = {lat: 52, lng: 4, zoom: 15, bounds: null};
    const context: IitcIrisContentMessageContext = {
      activeSidePanel: null,
      baseLayerId: 'cartodb-dark-matter',
      cameraZoom: camera.zoom,
      dataSource: {mode: 'live'},
      highlighterSettings: {active: 'none'},
      layerSettings: DEFAULT_LAYER_SETTINGS,
      lifecycleSettings: {iitcMovementDelay: true},
    };
    const actions: IitcIrisContentMessageActions = {
      setActiveSheet: () => undefined,
      setActiveSidePanel: () => undefined,
      setAgentState: () => undefined,
      setCamera: () => undefined,
      setCommState: () => undefined,
      setDrawToolsImportStatus: () => undefined,
      setDrawToolsItems: () => undefined,
      setEntityFetch: (value) => { entityFetch = applySetter(entityFetch, value); },
      setInventoryState: () => undefined,
      setMapContext: (value) => { if (value === null) mapContextCleared = true; },
      setMissionsState: () => undefined,
      setPasscodeState: () => undefined,
      setPortalImageOpen: () => undefined,
      setRequestDiagnostics: (value) => { requestDiagnostics = applySetter(requestDiagnostics, value); },
      setScoresState: () => undefined,
      setSearchState: () => undefined,
      setStatus: () => undefined,
      storeActiveSheet: () => undefined,
      storeSidePanelId: () => undefined,
    };
    const message: IitcIrisMessage = {
      type: IITC_IRIS_MESSAGES.entityStatus,
      selectedPortal,
      requestDiagnostics: {activeRequests: 1, activeByEndpoint: {getEntities: 1}, active: []},
    };

    handleIitcIrisContentMessage(message, context, actions);

    expect(entityFetch.selectedPortal).toBe(selectedPortal);
    expect(mapContextCleared).toBe(true);
    expect(requestDiagnostics.activeRequests).toBe(1);
  });
});
