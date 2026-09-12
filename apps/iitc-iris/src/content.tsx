import {h, render} from 'preact';
import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import './iitc-iris.css';
import {getPanelStatusClass} from './ui-status';
import {
  type IitcIrisBooleanLayerSettingKey,
} from './layer-registry';
import {PORTAL_HIGHLIGHTER_REGISTRY} from './highlighter-registry';
import {
  getPrimaryMenuId,
  isSidePanelId,
  SIDE_PANEL_REGISTRY,
  type IitcIrisPrimaryMenuId,
  type IitcIrisSheetId,
  type IitcIrisSidePanelId,
} from './menu-registry';
import {
  type IitcIrisPortalDetailSectionId,
} from './portal-detail-section-registry';
import {
  getSelectionView,
  type IitcIrisMapContextSelection,
} from './selection-lifecycle';
import {handleIitcIrisContentMessage, type CameraState, type EntityFetchState} from './content-message-adapter';
import {
  createCancelPanelRequestsMessage,
  createMissionZoomMessage,
  createRequestCommMessage,
  createRequestInventoryMessage,
  createRequestMissionDetailsMessage,
  createRequestMissionsMessage,
  createRequestPasscodeMessage,
  createRequestScoresMessage,
  formatCommDraftWithNickname,
} from './content-outbound-messages';
import {handleIitcIrisContentKeyDown, type IitcIrisPanDirection} from './content-keyboard-shortcuts';
import {copyIitcIrisText} from './content-feedback';
import {closeIitcIrisSheet, openIitcIrisSheet, toggleIitcIrisSheet} from './content-sheet-navigation';
import {getIitcIrisPrimaryMenuEffect} from './content-primary-menu';
import {IitcIrisAgentPanel} from './agent-panel';
import {IitcIrisCommPanel} from './comm-panel';
import {IitcIrisInventoryPanel} from './inventory-panel';
import {IitcIrisMissionsPanel} from './missions-panel';
import {IitcIrisPasscodePanel} from './passcode-panel';
import {IitcIrisPortalDetailsPanel} from './portal-details-panel';
import {IitcIrisSearchPanel} from './search-panel';
import {IitcIrisScoresPanel} from './scores-panel';
import {IitcIrisDrawToolsPanel} from './draw-tools-panel';
import {IitcIrisSystemDiagnosticsPanel} from './system-diagnostics-panel';
import {
  filterPortalsList,
  PortalsListLevelFilter,
  PortalsListSortField,
  PortalsListTeamFilter,
  SortOrder,
  sortPortalsList,
  summarizePortalsList,
} from './content-portal-analysis';
import {IitcIrisPortalCountsPanel} from './portal-counts-panel';
import {IitcIrisPortalsListPanel} from './portals-list-panel';
import {IitcIrisScoreboardPanel} from './scoreboard-panel';
import {IitcIrisLayersPanel} from './layers-panel';
import {IitcIrisMapContextPanel, IitcIrisMapNavigationPanel} from './map-controls-panel';
import {IitcIrisHelpPanel} from './help-panel';
import {IitcIrisSystemControlsPanel} from './system-controls-panel';
import {IitcIrisPortalImageModal} from './portal-image-modal';
import {IitcIrisSheetTabBar} from './sheet-tabbar';
import {IitcIrisAuthRecoveryBanner} from './auth-recovery-banner';
import {createDockDiagnostics} from './content-dock-diagnostics';
import {
  checkCommIsAtBottom,
  checkShouldRequestOlderComm,
  createCommSendRequest,
} from './content-comm-actions';
import {
  performIntelLoginRedirect,
  retryActiveAuthPanelRequest,
} from './content-auth-navigation';
import {
  copyMapContextGuid as copyMapContextGuidHelper,
  copyMapContextLatLng as copyMapContextLatLngHelper,
  copyMapContextPortalGuids as copyMapContextPortalGuidsHelper,
  copyMapContextUrl as copyMapContextUrlHelper,
  copySelectedPortalGuid as copySelectedPortalGuidHelper,
  copySelectedPortalLink as copySelectedPortalLinkHelper,
  copySelectedPortalTitle as copySelectedPortalTitleHelper,
} from './content-copy-helpers';
import {
  createDataSourceSettings,
  DATA_SOURCE_OPTIONS,
  getExtensionUrl,
  loadInitialMapView,
  loadStoredActiveSheet,
  loadStoredBaseLayerId,
  loadStoredBoolean,
  loadStoredCommTab,
  loadStoredDataSourceId,
  loadStoredDebugDockVisible,
  loadStoredHighlighterSettings,
  loadStoredLayerSettings,
  loadStoredLifecycleSettings,
  loadStoredPortalSections,
  LOGIN_BYPASS_STORAGE_KEY,
  MAP_FOCUS_MODE_STORAGE_KEY,
  SHORTCUTS_ENABLED_STORAGE_KEY,
  storeActiveSheet,
  storeBoolean,
  storeCommTab,
  storeDataSourceId,
  storeDebugDockVisible,
  storeHighlighterSettings,
  storeLayerSettings,
  storeLifecycleSettings,
  storePortalSections,
  storeSidePanelId,
  VIEW_PRESETS,
} from './content-storage-settings';
import {
  clampView,
  createScenarioSnapshotSummary,
  isScenarioSettled,
  parseViewInput,
  type ScenarioRun,
  type ScenarioSnapshot,
} from './content-scenarios';
import {
  createInnerStatusView,
  createIntelUrl,
  createPlan,
  formatMapObjectDistance,
  formatRenderMutationSummary,
  formatSelectedPortal,
  formatTeamLabel,
  getPortalLatLng,
} from './content-map-status';
import {
  getDrawToolsTargetFromContext,
} from './content-map-context';
import {
  DRAW_TOOLS_DEFAULT_COLOR,
  filterAndSerializeDrawToolsItems,
  getDrawToolsItemCenter,
  prepareDrawToolsImport,
  type DrawToolsTarget,
} from './content-draw-tools';
import {IITC_IRIS_MESSAGES, type IitcIrisAgentState, type IitcIrisBaseLayerId, type IitcIrisCommState, type IitcIrisCommTab, type IitcIrisDrawToolsItem, type IitcIrisDrawToolsLatLng, type IitcIrisHighlighterSettings, type IitcIrisInventoryState, type IitcIrisLayerSettings, type IitcIrisLifecycleSettings, type IitcIrisMapContextPortalAnchor, type IitcIrisMessage, type IitcIrisMissionSource, type IitcIrisMissionsState, type IitcIrisPasscodeState, type IitcIrisPortalHighlighterId, type IitcIrisRequestDiagnostics, type IitcIrisRenderPolicy, type IitcIrisScoresState, type IitcIrisSearchResult, type IitcIrisSearchState} from './messages';
import {
  normalizeIitcDrawToolsLabel,
  type IitcMapDataPlan,
} from '@iris/iitc-core';

const IITC_PAN_CONTROL_OFFSET_PX = 500;
const LOGIN_BYPASS_MS = 5 * 60 * 1000;
type BooleanLayerSettingKey = IitcIrisBooleanLayerSettingKey;
const SIDE_PANEL_OPTIONS = SIDE_PANEL_REGISTRY;
const DEFAULT_RENDER_POLICY: IitcIrisRenderPolicy = {
  optionalOverlayMinZoom: 14,
  detailedPortals: false,
  activeHighlighter: 'none',
  levelFill: false,
  healthFill: false,
  ornaments: false,
  artifacts: false,
  labels: false,
};
const EMPTY_REQUEST_DIAGNOSTICS: IitcIrisRequestDiagnostics = {
  activeRequests: 0,
  activeByEndpoint: {},
  active: [],
};
const EMPTY_SEARCH_STATE: IitcIrisSearchState = {
  status: 'idle',
  term: '',
  confirmed: false,
  results: [],
  localResults: 0,
};
const EMPTY_MISSIONS_STATE: IitcIrisMissionsState = {
  status: 'idle',
  requestState: 'idle',
  missions: [],
  detailsStatus: 'idle',
};
const GEOLOCATION_MAX_ZOOM = 13;

type SidePanelId = IitcIrisSidePanelId;
type SheetId = IitcIrisSheetId;
type PrimaryMenuId = IitcIrisPrimaryMenuId;
type PortalSectionId = IitcIrisPortalDetailSectionId;




function injectScript(src: string): void {
  if (document.querySelector(`script[data-iitc-iris-src="${CSS.escape(src)}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = false;
  script.dataset.iitcIrisSrc = src;
  (document.head || document.documentElement).appendChild(script);
}

function App(): h.JSX.Element {
  const [status, setStatus] = useState('booting');
  const [copyStatus, setCopyStatus] = useState('');
  const [scenarioStatus, setScenarioStatus] = useState('');
  const [scenarioRuns, setScenarioRuns] = useState<ScenarioRun[]>([]);
  const [activeScenarioRunId, setActiveScenarioRunId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchState, setSearchState] = useState<IitcIrisSearchState>(EMPTY_SEARCH_STATE);
  const [activeSearchResultIndex, setActiveSearchResultIndex] = useState(0);
  const [portalImageOpen, setPortalImageOpen] = useState(false);
  const [portalSections, setPortalSections] = useState<Record<PortalSectionId, boolean>>(() => loadStoredPortalSections());
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => loadStoredBoolean(SHORTCUTS_ENABLED_STORAGE_KEY, true));
  const [mapFocusMode, setMapFocusMode] = useState(() => loadStoredBoolean(MAP_FOCUS_MODE_STORAGE_KEY, false));
  const [commUserAtBottom, setCommUserAtBottom] = useState(true);
  const [commNewBelow, setCommNewBelow] = useState(false);
  const [viewInput, setViewInput] = useState('');
  const [viewInputStatus, setViewInputStatus] = useState('');
  const [geolocationStatus, setGeolocationStatus] = useState('');
  const [mapContext, setMapContext] = useState<IitcIrisMapContextSelection | null>(null);
  const [drawToolsLinkStart, setDrawToolsLinkStart] = useState<IitcIrisDrawToolsLatLng | null>(null);
  const [drawToolsItems, setDrawToolsItems] = useState<IitcIrisDrawToolsItem[]>([]);
  const [drawToolsImportText, setDrawToolsImportText] = useState('');
  const [drawToolsImportMerge, setDrawToolsImportMerge] = useState(true);
  const [drawToolsImportStatus, setDrawToolsImportStatus] = useState('');
  const [drawToolsClearConfirm, setDrawToolsClearConfirm] = useState<'polyline' | 'marker' | null>(null);
  const [drawToolsMarkerLabel, setDrawToolsMarkerLabel] = useState('');
  const [editingDrawToolsMarkerIndex, setEditingDrawToolsMarkerIndex] = useState<number | null>(null);
  const [debugDockVisible, setDebugDockVisible] = useState(() => loadStoredDebugDockVisible());
  const [activeSheet, setActiveSheet] = useState<SheetId>(() => loadStoredActiveSheet());
  const [activeSidePanel, setActiveSidePanel] = useState<SidePanelId | null>(() => {
    const sheet = loadStoredActiveSheet();
    return isSidePanelId(sheet) ? sheet : null;
  });
  const [agentState, setAgentState] = useState<IitcIrisAgentState>(() => ({status: 'idle'}));
  const [commState, setCommState] = useState<IitcIrisCommState>(() => ({status: 'idle', tab: loadStoredCommTab(), messages: 0}));
  const [scoresState, setScoresState] = useState<IitcIrisScoresState>(() => ({status: 'idle', requestState: 'idle', region: {status: 'idle'}}));
  const [missionsState, setMissionsState] = useState<IitcIrisMissionsState>(() => EMPTY_MISSIONS_STATE);
  const [passcodeState, setPasscodeState] = useState<IitcIrisPasscodeState>(() => ({status: 'idle', requestState: 'idle'}));
  const [requestDiagnostics, setRequestDiagnostics] = useState<IitcIrisRequestDiagnostics>(EMPTY_REQUEST_DIAGNOSTICS);
  const [inventoryState, setInventoryState] = useState<IitcIrisInventoryState>(() => ({
    status: 'idle',
    requestState: 'idle',
    subscription: {status: 'unknown'},
    items: 0,
    keys: 0,
    portalsWithKeys: 0,
    capsules: 0,
    portalKeysForSelectedPortal: null,
  }));
  const [commDraft, setCommDraft] = useState('');
  const [passcodeDraft, setPasscodeDraft] = useState('');
  const commListRef = useRef<HTMLDivElement | null>(null);
  const commOlderScrollHeightRef = useRef<number | null>(null);
  const commOlderRequestPendingRef = useRef(false);
  const commStickToBottomRef = useRef(true);
  const commLatestTimestampRef = useRef<number | undefined>(undefined);
  const layerSettingsIntentAtRef = useRef<number | undefined>(undefined);
  const highlighterSettingsIntentAtRef = useRef<number | undefined>(undefined);
  const [baseLayerId, setBaseLayerId] = useState<IitcIrisBaseLayerId>(() => loadStoredBaseLayerId());
  const [dataSourceId, setDataSourceId] = useState<typeof DATA_SOURCE_OPTIONS[number]['id']>(() => loadStoredDataSourceId());
  const [lifecycleSettings, setLifecycleSettings] = useState<IitcIrisLifecycleSettings>(() => loadStoredLifecycleSettings());
  const [layerSettings, setLayerSettings] = useState<IitcIrisLayerSettings>(() => loadStoredLayerSettings());
  const [highlighterSettings, setHighlighterSettings] = useState<IitcIrisHighlighterSettings>(() => loadStoredHighlighterSettings());
  const [camera, setCamera] = useState<CameraState>(() => ({
    ...loadInitialMapView(),
    bounds: null,
  }));
  const [entityFetch, setEntityFetch] = useState<EntityFetchState>({
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
    baseLayerId: loadStoredBaseLayerId(),
    dataSource: createDataSourceSettings(loadStoredDataSourceId()),
    highlighterSettings: {active: 'none'},
    highlighterIds: PORTAL_HIGHLIGHTER_REGISTRY.map((entry) => entry.id),
    renderPolicy: DEFAULT_RENDER_POLICY,
    selectedPortal: null,
    portalDetails: null,
    portalAnalysis: null,
  });
  const [portalsListSortBy, setPortalsListSortBy] = useState<PortalsListSortField>('level');
  const [portalsListSortOrder, setPortalsListSortOrder] = useState<SortOrder>(-1);
  const [portalsListTeamFilter, setPortalsListTeamFilter] = useState<PortalsListTeamFilter>('all');
  const [portalsListLevelFilter, setPortalsListLevelFilter] = useState<PortalsListLevelFilter>('all');
  const [portalsListTextFilter, setPortalsListTextFilter] = useState('');
  const plan: IitcMapDataPlan | null = useMemo(() => createPlan(camera), [camera]);
  const summaryMode = plan?.tileParams.hasPortals ? 'summary' : 'placeholder';
  const requestBatches = plan ? plan.requestBatches.map((batch) => batch.length) : [];
  const intelUrl = createIntelUrl(camera);
  const dataSource = useMemo(() => createDataSourceSettings(dataSourceId), [dataSourceId]);
  const innerStatus = createInnerStatusView(plan, entityFetch, requestDiagnostics);
  const portalAnalysis = entityFetch.portalAnalysis;
  const filteredPortalsList = useMemo(
    () => filterPortalsList(portalAnalysis?.portalslist ?? [], portalsListTeamFilter, portalsListLevelFilter, portalsListTextFilter),
    [portalAnalysis?.portalslist, portalsListTeamFilter, portalsListLevelFilter, portalsListTextFilter],
  );
  const sortedPortalsList = useMemo(
    () => sortPortalsList(filteredPortalsList, portalsListSortBy, portalsListSortOrder),
    [filteredPortalsList, portalsListSortBy, portalsListSortOrder],
  );
  const portalsListSummary = useMemo(() => summarizePortalsList(filteredPortalsList), [filteredPortalsList]);
  const sortPortalsListBy = (field: PortalsListSortField): void => {
    if (portalsListSortBy === field) {
      setPortalsListSortOrder((current) => current === 1 ? -1 : 1);
      return;
    }
    setPortalsListSortBy(field);
    setPortalsListSortOrder(field === 'title' || field === 'team' ? 1 : -1);
  };
  const detailOverlaysActive = entityFetch.renderPolicy.activeHighlighter !== 'none' ||
    entityFetch.renderPolicy.levelFill ||
    entityFetch.renderPolicy.healthFill ||
    entityFetch.renderPolicy.ornaments ||
    entityFetch.renderPolicy.artifacts ||
    entityFetch.renderPolicy.labels;
  const selectedPortalDetails = entityFetch.selectedPortal && entityFetch.portalDetails?.guid === entityFetch.selectedPortal.guid
    ? entityFetch.portalDetails
    : null;
  const selectedPortalMissionState = entityFetch.selectedPortal &&
    missionsState.source === 'portal' &&
    missionsState.portalGuid === entityFetch.selectedPortal.guid
    ? missionsState
    : null;
  const {
    hasSelectedObject,
    selectedPrimaryLabel,
    activeSelectedSheet,
    selectedKind,
    showPortalSidePanel,
  } = getSelectionView({selectedPortal: entityFetch.selectedPortal, mapContext}, activeSheet);
  const dockDiagnostics = createDockDiagnostics({
    status,
    intelUrl,
    camera,
    plan,
    summaryMode,
    requestBatches,
    entityFetch,
    baseLayerId,
    dataSource,
    requestDiagnostics,
    lifecycleSettings,
    layerSettings,
    activeSidePanel,
    agentState,
    commState,
    scoresState,
    missionsState,
    passcodeState,
    inventoryState,
  });
  const createScenarioSnapshot = (label: string, settings = lifecycleSettings): ScenarioSnapshot => ({
    label,
    capturedAt: new Date().toISOString(),
    diagnostics: {
      ...dockDiagnostics,
      lifecycleSettings: settings,
    },
  });

  const setScenarioStatusBriefly = (value: string): void => {
    setScenarioStatus(value);
    window.setTimeout(() => setScenarioStatus(''), 1800);
  };

  const activeScenarioRun = scenarioRuns.find((run) => run.id === activeScenarioRunId && run.status === 'running') ?? null;
  const latestScenarioRun = scenarioRuns.length > 0 ? scenarioRuns[scenarioRuns.length - 1] : null;
  const scenarioSnapCount = scenarioRuns.reduce((total, run) => total + run.snapshots.length, 0);
  const scenarioProgressRun = activeScenarioRun ?? latestScenarioRun;
  const scenarioProgressLabels = scenarioProgressRun ? new Set(scenarioProgressRun.snapshots.map((snapshot) => snapshot.label)) : new Set<string>();
  const scenarioExpectedSteps = ['previous', 'before-pan-south', 'reload', 'in-progress', 'done'];

  const startScenarioRun = (name: string, overrides: Partial<IitcIrisLifecycleSettings>): void => {
    if (activeScenarioRun) {
      setScenarioStatusBriefly('finish current run first');
      return;
    }
    const nextSettings: IitcIrisLifecycleSettings = { ...lifecycleSettings, ...overrides };
    const runId = `${name}-${Date.now()}`;
    setLifecycleSettings(nextSettings);
    setScenarioRuns((current) => [...current, {
      id: runId,
      name,
      startedAt: new Date().toISOString(),
      status: 'running',
      lifecycleSettings: nextSettings,
      snapshots: [createScenarioSnapshot('previous', nextSettings)],
    }]);
    setActiveScenarioRunId(runId);
    setScenarioStatusBriefly(`${name}: previous captured`);
  };

  const captureScenarioSnapshot = (label: string): void => {
    const runId = activeScenarioRunId;
    if (!runId) {
      setScenarioStatusBriefly('start a scenario first');
      return;
    }
    setScenarioRuns((current) => current.map((run) => run.id === runId
      ? {...run, snapshots: [...run.snapshots, createScenarioSnapshot(label, run.lifecycleSettings)]}
      : run));
    setScenarioStatusBriefly(`${label} captured`);
  };

  const panScenarioSouth = (): void => {
    if (!canPan || !activeScenarioRun) return;
    captureScenarioSnapshot('before-pan-south');
    panMap('south');
  };

  const finishScenarioRun = (): void => {
    const run = activeScenarioRun;
    if (!run) {
      setScenarioStatusBriefly('no active run');
      return;
    }
    const finalLabel = isScenarioSettled(dockDiagnostics) ? 'done' : 'done-active';
    const finishedAt = new Date().toISOString();
    setScenarioRuns((current) => current.map((item) => item.id === run.id
      ? {
        ...item,
        status: 'finished',
        finishedAt,
        snapshots: [...item.snapshots, createScenarioSnapshot(finalLabel, item.lifecycleSettings)],
      }
      : item));
    setActiveScenarioRunId(null);
    setScenarioStatusBriefly(finalLabel === 'done' ? `${run.name} finished` : `${run.name} captured active finish`);
  };

  const clearScenarioRuns = (): void => {
    setScenarioRuns([]);
    setActiveScenarioRunId(null);
    setScenarioStatusBriefly('scenario history cleared');
  };

  const copyScenarioRun = (): void => {
    const summarizeRun = (run: ScenarioRun): ScenarioRun => ({
      ...run,
      snapshots: run.snapshots.map((snapshot) => ({
        ...snapshot,
        summary: createScenarioSnapshotSummary(snapshot.diagnostics),
      })),
    });
    const currentRun = {
      id: `current-${Date.now()}`,
      name: 'current',
      startedAt: new Date().toISOString(),
      status: 'finished' as const,
      lifecycleSettings,
      snapshots: [createScenarioSnapshot('current')],
    };
    const runs = (scenarioRuns.length > 0 ? scenarioRuns : [currentRun]).map(summarizeRun);
    const latest = runs.length > 0 ? runs[runs.length - 1] : currentRun;
    void navigator.clipboard.writeText(JSON.stringify({
      runs,
      latest,
      activeRunId: activeScenarioRunId,
      copiedAt: new Date().toISOString(),
    }, null, 2))
      .then(() => setScenarioStatusBriefly('scenario history copied'))
      .catch(() => setScenarioStatusBriefly('copy failed'));
  };

  const copyDockText = (): void => {
    copyIitcIrisText(JSON.stringify(dockDiagnostics, null, 2), {setStatus: setCopyStatus, successStatus: 'json copied'});
  };

  const copyIntelUrl = (): void => {
    copyIitcIrisText(intelUrl, {setStatus: setCopyStatus, successStatus: 'url copied'});
  };

  const copyMapContextLatLng = (): void => {
    copyMapContextLatLngHelper(mapContext, setCopyStatus);
  };

  const copyMapContextUrl = (): void => {
    copyMapContextUrlHelper(mapContext, setCopyStatus);
  };

  const copyMapContextGuid = (): void => {
    copyMapContextGuidHelper(mapContext, setCopyStatus);
  };

  const copyMapContextPortalGuids = (): void => {
    copyMapContextPortalGuidsHelper(mapContext, setCopyStatus);
  };

  const centerMapContext = (): void => {
    if (!mapContext) return;
    setMapView(mapContext.lat, mapContext.lng, mapContext.zoom);
  };

  const getDrawToolsTarget = (): DrawToolsTarget | null => {
    return getDrawToolsTargetFromContext(entityFetch.selectedPortal, mapContext);
  };

  const getDrawToolsTargetLatLng = (): IitcIrisDrawToolsLatLng | null => {
    const target = getDrawToolsTarget();
    return target ? {lat: target.lat, lng: target.lng} : null;
  };

  const postDrawToolsAction = (message: Omit<IitcIrisMessage, 'type'>): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.drawTools,
      ...message,
    } satisfies IitcIrisMessage, '*');
  };

  const addDrawToolsMarker = (color: string): void => {
    const target = getDrawToolsTarget();
    if (!target) return;
    const label = normalizeIitcDrawToolsLabel(drawToolsMarkerLabel) ?? normalizeIitcDrawToolsLabel(target.label);
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({
      drawToolsAction: 'addMarker',
      drawToolsColor: color,
      drawToolsLabel: label ?? '',
      drawToolsLatLngs: [{lat: target.lat, lng: target.lng}],
    });
    setStatus('draw marker added');
  };

  const renameDrawToolsMarker = (item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>, label: string): void => {
    const normalizedLabel = normalizeIitcDrawToolsLabel(label);
    if (normalizedLabel === item.label) return;
    postDrawToolsAction({
      drawToolsAction: 'rename',
      drawToolsIndex: item.storageIndex,
      drawToolsLabel: normalizedLabel ?? '',
    });
    setStatus(normalizedLabel ? 'draw marker renamed' : 'draw marker label cleared');
  };

  const saveDrawToolsMarkerLabel = (item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>, label: string): void => {
    renameDrawToolsMarker(item, label);
    setEditingDrawToolsMarkerIndex(null);
  };

  const addDrawToolsLinkPoint = (): void => {
    const latLng = getDrawToolsTargetLatLng();
    if (!latLng) return;
    if (!drawToolsLinkStart) {
      setDrawToolsLinkStart(latLng);
      setStatus('draw link start set');
      return;
    }
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({
      drawToolsAction: 'addPolyline',
      drawToolsColor: DRAW_TOOLS_DEFAULT_COLOR,
      drawToolsLatLngs: [drawToolsLinkStart, latLng],
    });
    setDrawToolsLinkStart(null);
    setStatus('draw link added');
  };

  const deleteDrawToolsAtContext = (itemType?: 'polyline' | 'marker'): void => {
    const latLng = getDrawToolsTargetLatLng();
    if (!latLng) return;
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({
      drawToolsAction: 'deleteAt',
      drawToolsItemType: itemType,
      drawToolsLatLngs: [latLng],
    });
    setStatus('draw item delete requested');
  };

  const deleteDrawToolsItem = (item: IitcIrisDrawToolsItem): void => {
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({
      drawToolsAction: 'deleteIndex',
      drawToolsIndex: item.storageIndex,
    });
    setStatus(`${item.type === 'polyline' ? 'draw link' : 'draw marker'} delete requested`);
  };

  const undoDrawToolsItem = (itemType?: 'polyline' | 'marker'): void => {
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({drawToolsAction: 'undo', drawToolsItemType: itemType});
    setStatus(itemType === 'polyline' ? 'draw link undo requested' : itemType === 'marker' ? 'draw marker undo requested' : 'draw undo requested');
  };

  const clearDrawToolsItems = (itemType?: 'polyline' | 'marker'): void => {
    if (itemType && drawToolsClearConfirm !== itemType) {
      setDrawToolsClearConfirm(itemType);
      setStatus(itemType === 'polyline' ? 'click Clear again to remove drawn links' : 'click Clear again to remove drawn markers');
      return;
    }
    setDrawToolsClearConfirm(null);
    postDrawToolsAction({drawToolsAction: 'clear', drawToolsItemType: itemType});
    if (!itemType || itemType === 'polyline') setDrawToolsLinkStart(null);
    setStatus(itemType === 'polyline' ? 'draw links cleared' : itemType === 'marker' ? 'draw markers cleared' : 'draw items cleared');
  };

  const centerDrawToolsItem = (item: IitcIrisDrawToolsItem): void => {
    const center = getDrawToolsItemCenter(item);
    setMapView(center.lat, center.lng, Math.max(camera.zoom, 15));
  };

  const copyDrawToolsItems = (itemType?: 'polyline' | 'marker'): void => {
    copyIitcIrisText(filterAndSerializeDrawToolsItems(drawToolsItems, itemType), {
      setStatus: setDrawToolsImportStatus,
      successStatus: itemType === 'polyline' ? 'links copied' : itemType === 'marker' ? 'markers copied' : 'draw tools JSON copied',
      successTimeoutMs: 1400,
      failureTimeoutMs: 1800,
    });
  };

  const importDrawToolsItems = (): void => {
    try {
      const {supportedJson, supportedCount, skippedCount} = prepareDrawToolsImport(drawToolsImportText);
      postDrawToolsAction({
        drawToolsAction: 'import',
        drawToolsJson: supportedJson,
        drawToolsMerge: drawToolsImportMerge,
      });
      setDrawToolsImportStatus(skippedCount > 0 ? `importing ${supportedCount}, skipped ${skippedCount}` : `importing ${supportedCount}`);
      setDrawToolsClearConfirm(null);
    } catch (error) {
      setDrawToolsImportStatus(error instanceof Error ? error.message : String(error));
    }
  };

  const copySelectedPortalLink = (): void => {
    copySelectedPortalLinkHelper(entityFetch.selectedPortal, camera.zoom, setCopyStatus);
  };

  const copySelectedPortalGuid = (): void => {
    copySelectedPortalGuidHelper(entityFetch.selectedPortal, setCopyStatus);
  };

  const copySelectedPortalTitle = (): void => {
    copySelectedPortalTitleHelper(entityFetch.selectedPortal, setCopyStatus);
  };

  const toggleDebugDock = (): void => {
    setDebugDockVisible((current) => {
      const next = !current;
      storeDebugDockVisible(next);
      return next;
    });
  };

  const closeSheetToMap = useCallback((): void => {
    const effect = closeIitcIrisSheet({activeSheet, activeSidePanel});
    if (effect.cancelPanelRequests) {
      window.postMessage(createCancelPanelRequestsMessage(), '*');
    }
    setActiveSidePanel(effect.activeSidePanel);
    setActiveSheet(effect.activeSheet);
    storeSidePanelId(effect.activeSidePanel);
    storeActiveSheet(effect.activeSheet);
  }, [activeSheet, activeSidePanel]);

  const closeSidePanel = useCallback((): void => {
    closeSheetToMap();
  }, [closeSheetToMap]);

  const openSheet = useCallback((sheet: SheetId): void => {
    const effect = openIitcIrisSheet({activeSheet, activeSidePanel}, sheet);
    if (effect.cancelPanelRequests) {
      window.postMessage(createCancelPanelRequestsMessage(), '*');
    }
    setActiveSheet(effect.activeSheet);
    storeActiveSheet(effect.activeSheet);
    setActiveSidePanel(effect.activeSidePanel);
    storeSidePanelId(effect.activeSidePanel);
  }, [activeSheet, activeSidePanel]);

  const toggleSheet = useCallback((sheet: SheetId): void => {
    const effect = toggleIitcIrisSheet({activeSheet, activeSidePanel}, sheet);
    if (effect.cancelPanelRequests) {
      window.postMessage(createCancelPanelRequestsMessage(), '*');
    }
    setActiveSheet(effect.activeSheet);
    storeActiveSheet(effect.activeSheet);
    setActiveSidePanel(effect.activeSidePanel);
    storeSidePanelId(effect.activeSidePanel);
  }, [activeSheet, activeSidePanel]);

  const refreshComm = useCallback((tab: IitcIrisCommTab = commState.tab, older = false): void => {
    storeCommTab(tab);
    window.postMessage(createRequestCommMessage(tab, older), '*');
  }, [commState.tab]);

  const requestOlderComm = (): void => {
    if (commState.status === 'loading' || commState.oldestTimestamp === undefined || commState.oldestTimestamp < 0) return;
    const list = commListRef.current;
    commOlderScrollHeightRef.current = list?.scrollHeight ?? null;
    commOlderRequestPendingRef.current = true;
    refreshComm(commState.tab, true);
  };

  const handleCommScroll = (): void => {
    const list = commListRef.current;
    if (!list || activeSidePanel !== 'comm' || commState.status === 'loading' || commOlderRequestPendingRef.current) return;
    const atBottom = checkCommIsAtBottom(list);
    commStickToBottomRef.current = atBottom;
    setCommUserAtBottom(atBottom);
    if (atBottom) setCommNewBelow(false);
    if (checkShouldRequestOlderComm(list.scrollTop)) requestOlderComm();
  };

  const jumpCommToLatest = (): void => {
    const list = commListRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
    commStickToBottomRef.current = true;
    setCommUserAtBottom(true);
    setCommNewBelow(false);
  };

  const refreshScores = (): void => {
    window.postMessage(createRequestScoresMessage(), '*');
  };

  const refreshInventory = (): void => {
    window.postMessage(createRequestInventoryMessage(), '*');
  };

  const refreshMissions = useCallback((source: IitcIrisMissionSource = missionsState.source ?? 'view'): void => {
    window.postMessage(createRequestMissionsMessage(source), '*');
  }, [missionsState.source]);

  const openSelectedPortalMissions = (): void => {
    if (!entityFetch.selectedPortal) return;
    openSheet('missions');
    refreshMissions('portal');
  };

  const requestMissionDetails = (missionGuid: string): void => {
    window.postMessage(createRequestMissionDetailsMessage(missionGuid), '*');
  };

  const zoomToMission = (): void => {
    window.postMessage(createMissionZoomMessage(), '*');
  };

  const redeemPasscode = (): void => {
    if (passcodeState.status === 'loading') return;
    const res = createRequestPasscodeMessage(passcodeDraft);
    if (!res) return;
    setPasscodeDraft(res.cleanPasscode);
    window.postMessage(res.message, '*');
  };

  const sendComm = (): void => {
    const msg = createCommSendRequest(commState.tab, commDraft);
    if (!msg) return;
    window.postMessage(msg, '*');
    setCommDraft('');
  };

  const addCommNickname = (nickname: string): void => {
    setCommDraft((current) => formatCommDraftWithNickname(current, nickname));
  };

  const openIntelLogin = (): void => {
    performIntelLoginRedirect(
      LOGIN_BYPASS_STORAGE_KEY,
      LOGIN_BYPASS_MS,
      document.getElementById('iitc-iris-root'),
      window.location
    );
  };

  const retryAuthRequest = (): void => {
    retryActiveAuthPanelRequest(activeSidePanel, activeSheet, commState.tab, missionsState.source, {
      refreshComm,
      refreshScores,
      refreshInventory,
      refreshMissions,
      requestSearch,
      searchTerm,
      retryMapFetch: (): void => {
        window.postMessage({
          type: IITC_IRIS_MESSAGES.dataSourceSettings,
          dataSource,
        } satisfies IitcIrisMessage, '*');
      },
    });
  };

  const inlineAuthActions = (
    <span className="iitc-iris-inline-auth">
      <button type="button" onClick={openIntelLogin} title="Open Intel login">Login</button>
      <button type="button" onClick={retryAuthRequest} title="Retry after login">Retry</button>
    </span>
  );

  const toggleLayerSetting = (key: BooleanLayerSettingKey): void => {
    layerSettingsIntentAtRef.current = performance.now();
    setLayerSettings((current) => ({...current, [key]: !current[key]}));
  };

  const selectPortalHighlighter = (active: IitcIrisPortalHighlighterId): void => {
    highlighterSettingsIntentAtRef.current = performance.now();
    setHighlighterSettings({active});
  };

  const setMapView = useCallback((lat: number, lng: number, zoom = camera.zoom): void => {
    const clamped = clampView({lat, lng, zoom});
    window.postMessage({
      type: IITC_IRIS_MESSAGES.setView,
      lat: clamped.lat,
      lng: clamped.lng,
      zoom: clamped.zoom ?? camera.zoom,
    } satisfies IitcIrisMessage, '*');
  }, [camera.zoom]);

  const requestSearch = (term: string, confirmed = false): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.searchRequest,
      searchTerm: term,
      searchConfirmed: confirmed,
    } satisfies IitcIrisMessage, '*');
  };

  const clearSearch = (): void => {
    setSearchTerm('');
    setSearchState(EMPTY_SEARCH_STATE);
    setActiveSearchResultIndex(0);
    window.postMessage({type: IITC_IRIS_MESSAGES.searchClear} satisfies IitcIrisMessage, '*');
  };

  const previewSearchResult = (result: IitcIrisSearchResult | null): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.searchPreview,
      searchResult: result ?? undefined,
    } satisfies IitcIrisMessage, '*');
  };

  const selectSearchResult = (result: IitcIrisSearchResult, zoom = false): void => {
    if (result.type === 'empty') return;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.searchSelect,
      searchResult: result,
      searchZoom: zoom,
    } satisfies IitcIrisMessage, '*');
    if (mapFocusMode) closeSheets();
    else if (result.type === 'portal' || result.type === 'guid') openSheet('portal');
  };

  const moveSearchSelection = (delta: number): void => {
    const selectableResults = searchState.results.filter((result) => result.type !== 'empty');
    if (selectableResults.length === 0) return;
    setActiveSearchResultIndex((current) => (current + delta + selectableResults.length) % selectableResults.length);
  };

  const selectActiveSearchResult = (zoom = false): boolean => {
    const result = searchState.results.filter((candidate) => candidate.type !== 'empty')[activeSearchResultIndex];
    if (!result) return false;
    selectSearchResult(result, zoom);
    return true;
  };

  const handleSearchKeyDown = (event: h.JSX.TargetedKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveSearchSelection(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveSearchSelection(-1);
      return;
    }
    if (event.key === 'Enter' && selectActiveSearchResult(event.shiftKey)) {
      event.preventDefault();
    }
  };

  const setPortalSectionOpen = (section: PortalSectionId, open: boolean): void => {
    setPortalSections((current) => {
      const next = {...current, [section]: open};
      storePortalSections(next);
      return next;
    });
  };

  const zoomToAndShowPortal = (portalGuid?: string, latE6?: number, lngE6?: number, zoom = Math.max(camera.zoom, 15)): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
      portalGuid,
      portalLat: latE6 === undefined ? undefined : latE6 / 1_000_000,
      portalLng: lngE6 === undefined ? undefined : lngE6 / 1_000_000,
      zoom,
    } satisfies IitcIrisMessage, '*');
  };

  const selectMapContextAnchor = (anchor: IitcIrisMapContextPortalAnchor): void => {
    zoomToAndShowPortal(anchor.guid, anchor.latE6, anchor.lngE6);
  };

  const selectPortalByLatLng = (latE6?: number, lngE6?: number, portalGuid?: string): void => {
    if (latE6 === undefined || lngE6 === undefined) return;
    zoomToAndShowPortal(portalGuid, latE6, lngE6);
  };

  const selectCommPortal = (latE6?: number, lngE6?: number, portalGuid?: string): void => {
    selectPortalByLatLng(latE6, lngE6, portalGuid);
  };

  const panMap = useCallback((direction: IitcIrisPanDirection): void => {
    const offsetX = direction === 'east' ? IITC_PAN_CONTROL_OFFSET_PX : direction === 'west' ? -IITC_PAN_CONTROL_OFFSET_PX : 0;
    const offsetY = direction === 'south' ? IITC_PAN_CONTROL_OFFSET_PX : direction === 'north' ? -IITC_PAN_CONTROL_OFFSET_PX : 0;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.panBy,
      panX: offsetX,
      panY: offsetY,
    } satisfies IitcIrisMessage, '*');
  }, []);

  const zoomMap = useCallback((delta: number): void => {
    setMapView(camera.lat, camera.lng, camera.zoom + delta);
  }, [camera.lat, camera.lng, camera.zoom, setMapView]);

  const clearPortalSelection = (): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.clearPortalSelection,
    } satisfies IitcIrisMessage, '*');
  };

  const closeSheets = useCallback((): void => {
    setPortalImageOpen(false);
    openSheet('map');
  }, [openSheet]);

  const focusSelectedPortal = (): void => {
    if (!entityFetch.selectedPortal) return;
    const {lat, lng} = getPortalLatLng(entityFetch.selectedPortal);
    setMapView(lat, lng, Math.max(17, camera.zoom));
    if (mapFocusMode) closeSheets();
  };

  const canPan = camera.bounds !== null;
  const activeSidePanelOption = SIDE_PANEL_OPTIONS.find((option) => option.id === activeSidePanel) ?? null;
  const activePrimaryMenu = activeSheet === 'missions' && missionsState.source === 'portal'
    ? 'selected'
    : activeSheet === 'map' && entityFetch.selectedPortal
      ? 'selected'
    : getPrimaryMenuId(activeSheet);
  const activeSidePanelStatus = activeSidePanel === 'comm'
    ? commState.status === 'auth' || commState.sendStatus === 'auth' ? 'auth' : commState.status
    : activeSidePanel === 'scores'
      ? scoresState.status === 'auth' || scoresState.region?.status === 'auth' ? 'auth' : scoresState.status
      : activeSidePanel === 'missions'
        ? missionsState.status === 'auth' || missionsState.detailsStatus === 'auth' ? 'auth' : missionsState.status
        : activeSidePanel === 'inventory'
          ? inventoryState.status === 'auth' || inventoryState.subscription?.status === 'auth' ? 'auth' : inventoryState.status
          : activeSidePanel === 'passcode'
            ? passcodeState.status
            : activeSidePanel === 'agent'
              ? agentState.status === 'missing' || agentState.subscription?.status === 'auth' ? 'auth' : agentState.status
              : 'idle';
  const authSources = [
    entityFetch.authRequired ? 'map' : null,
    selectedPortalDetails?.status === 'auth' ? 'portal details' : null,
    commState.status === 'auth' || commState.sendStatus === 'auth' ? 'COMM' : null,
    scoresState.status === 'auth' || scoresState.region?.status === 'auth' ? 'scores' : null,
    missionsState.status === 'auth' || missionsState.detailsStatus === 'auth' ? 'missions' : null,
    inventoryState.status === 'auth' || inventoryState.subscription?.status === 'auth' ? 'inventory' : null,
    passcodeState.status === 'auth' ? 'passcode' : null,
    agentState.status === 'missing' || agentState.subscription?.status === 'auth' ? 'agent' : null,
  ].filter((source): source is string => source !== null);
  const authRecoveryText = authSources.length > 0
    ? authSources.length === 1
      ? `${authSources[0]} needs an authenticated Intel session`
      : `${authSources.length} requests need an authenticated Intel session`
    : '';
  const activePanelNeedsAuth = activeSidePanelStatus === 'auth';
  const openCommPanel = useCallback((tab?: IitcIrisCommTab): void => {
    if (tab) refreshComm(tab);
    openSheet('comm');
  }, [openSheet, refreshComm]);

  const selectCommTab = (tab: IitcIrisCommTab): void => {
    if (activeSheet === 'comm' && commState.tab === tab) return;
    refreshComm(tab);
    if (activeSheet !== 'comm') openSheet('comm');
  };

  const toggleCommPanel = useCallback((tab?: IitcIrisCommTab): void => {
    if (activeSheet === 'comm' && (!tab || commState.tab === tab)) {
      closeSheetToMap();
      return;
    }
    openCommPanel(tab);
  }, [activeSheet, closeSheetToMap, commState.tab, openCommPanel]);

  const toggleMissionsSheet = (source: IitcIrisMissionSource): void => {
    if (activeSheet === 'missions' && missionsState.source === source) {
      closeSheetToMap();
      return;
    }
    openSheet('missions');
    refreshMissions(source);
  };

  const togglePrimaryMenu = useCallback((menu: PrimaryMenuId): void => {
    const effect = getIitcIrisPrimaryMenuEffect(menu, {activePrimaryMenu, activeSelectedSheet, activeSheet, hasSelectedObject});
    if (effect.kind === 'closeSheet') {
      closeSheetToMap();
    } else if (effect.kind === 'openSheet') {
      openSheet(effect.sheet);
    } else if (effect.kind === 'toggleComm') {
      toggleCommPanel();
    } else if (effect.kind === 'toggleSheet') {
      toggleSheet(effect.sheet);
    }
  }, [activePrimaryMenu, activeSelectedSheet, activeSheet, closeSheetToMap, hasSelectedObject, openSheet, toggleCommPanel, toggleSheet]);



  const jumpToPreset = (preset: typeof VIEW_PRESETS[number]): void => {
    setMapView(preset.lat, preset.lng, preset.zoom);
  };

  const jumpToViewInput = (): void => {
    const parsed = parseViewInput(viewInput);
    if (!parsed) {
      setViewInputStatus('bad view');
      window.setTimeout(() => setViewInputStatus(''), 1600);
      return;
    }

    setMapView(parsed.lat, parsed.lng, parsed.zoom ?? camera.zoom);
    setViewInputStatus('jumped');
    window.setTimeout(() => setViewInputStatus(''), 1200);
  };

  const locateBrowserPosition = (): void => {
    if (!navigator.geolocation) {
      setGeolocationStatus('unavailable');
      window.setTimeout(() => setGeolocationStatus(''), 1800);
      return;
    }
    setGeolocationStatus('locating...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.postMessage({
          type: IITC_IRIS_MESSAGES.setUserLocation,
          userLat: position.coords.latitude,
          userLng: position.coords.longitude,
          userAccuracy: position.coords.accuracy,
        } satisfies IitcIrisMessage, '*');
        setMapView(position.coords.latitude, position.coords.longitude, GEOLOCATION_MAX_ZOOM);
        setGeolocationStatus(position.coords.accuracy ? `located +/- ${Math.round(position.coords.accuracy)}m` : 'located');
        window.setTimeout(() => setGeolocationStatus(''), 2200);
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'permission denied'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'unavailable'
            : 'timeout';
        setGeolocationStatus(message);
        window.setTimeout(() => setGeolocationStatus(''), 2200);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent<IitcIrisMessage>): void => {
      if (event.source !== window) return;
      handleIitcIrisContentMessage(event.data, {
        activeSidePanel,
        baseLayerId,
        cameraZoom: camera.zoom,
        dataSource,
        highlighterSettings,
        layerSettings,
        lifecycleSettings,
      }, {
        setActiveSheet,
        setActiveSidePanel,
        setAgentState,
        setCamera,
        setCommState,
        setDrawToolsImportStatus,
        setDrawToolsItems,
        setEntityFetch,
        setInventoryState,
        setMapContext,
        setMissionsState,
        setPasscodeState,
        setPortalImageOpen,
        setRequestDiagnostics,
        setScoresState,
        setSearchState,
        setStatus,
        storeActiveSheet,
        storeSidePanelId,
      });
    };

    window.addEventListener('message', onMessage);
    return (): void => window.removeEventListener('message', onMessage);
  }, [activeSidePanel, baseLayerId, camera.zoom, dataSource, highlighterSettings, layerSettings, lifecycleSettings]);

  useEffect(() => {
    storeLayerSettings(layerSettings);
    const sentAt = layerSettingsIntentAtRef.current ?? performance.now();
    layerSettingsIntentAtRef.current = undefined;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.layerSettings,
      sentAt,
      layerSettings,
      baseLayerId,
    } satisfies IitcIrisMessage, '*');
  }, [baseLayerId, layerSettings]);

  useEffect(() => {
    storeHighlighterSettings(highlighterSettings);
    const sentAt = highlighterSettingsIntentAtRef.current ?? performance.now();
    highlighterSettingsIntentAtRef.current = undefined;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.layerSettings,
      sentAt,
      highlighterSettings,
    } satisfies IitcIrisMessage, '*');
  }, [highlighterSettings]);

  useEffect(() => {
    storeDataSourceId(dataSourceId);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.dataSourceSettings,
      dataSource,
    } satisfies IitcIrisMessage, '*');
  }, [dataSource, dataSourceId]);

  useEffect(() => {
    storeLifecycleSettings(lifecycleSettings);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.lifecycleSettings,
      lifecycleSettings,
    } satisfies IitcIrisMessage, '*');
  }, [lifecycleSettings]);

  useEffect(() => {
    storeBoolean(SHORTCUTS_ENABLED_STORAGE_KEY, shortcutsEnabled);
  }, [shortcutsEnabled]);

  useEffect(() => {
    storeBoolean(MAP_FOCUS_MODE_STORAGE_KEY, mapFocusMode);
  }, [mapFocusMode]);

  useEffect(() => {
    if (activeSidePanel !== 'comm' || commState.status !== 'idle') return;
    const postCommRequest = (): void => {
      storeCommTab(commState.tab);
      window.postMessage({
        type: IITC_IRIS_MESSAGES.requestComm,
        commTab: commState.tab,
      } satisfies IitcIrisMessage, '*');
    };
    postCommRequest();
    const retryTimers = [
      window.setTimeout(postCommRequest, 500),
      window.setTimeout(postCommRequest, 1500),
    ];
    return (): void => {
      retryTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeSidePanel, commState.status, commState.tab]);

  useEffect(() => {
    if (activeSidePanel !== 'scores' || scoresState.status !== 'idle') return;
    const postScoresRequest = (): void => {
      window.postMessage({
        type: IITC_IRIS_MESSAGES.requestScores,
      } satisfies IitcIrisMessage, '*');
    };
    postScoresRequest();
    const retryTimer = window.setTimeout(postScoresRequest, 500);
    return (): void => window.clearTimeout(retryTimer);
  }, [activeSidePanel, scoresState.status]);

  useEffect(() => {
    if (activeSidePanel !== 'inventory' || inventoryState.status !== 'idle') return;
    const postInventoryRequest = (): void => {
      window.postMessage({
        type: IITC_IRIS_MESSAGES.requestInventory,
      } satisfies IitcIrisMessage, '*');
    };
    postInventoryRequest();
    const retryTimer = window.setTimeout(postInventoryRequest, 500);
    return (): void => window.clearTimeout(retryTimer);
  }, [activeSidePanel, inventoryState.status]);

  useEffect(() => {
    if (activeSidePanel !== 'missions') return;
    if (missionsState.source !== 'portal' || missionsState.status === 'loading') return;
    const selectedPortalGuid = entityFetch.selectedPortal?.guid;
    if (!selectedPortalGuid || selectedPortalGuid === missionsState.portalGuid) return;
    refreshMissions('portal');
  }, [activeSidePanel, entityFetch.selectedPortal?.guid, missionsState.portalGuid, missionsState.source, missionsState.status, refreshMissions]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length === 0) {
      setSearchState(EMPTY_SEARCH_STATE);
      setActiveSearchResultIndex(0);
      window.postMessage({type: IITC_IRIS_MESSAGES.searchClear} satisfies IitcIrisMessage, '*');
      return;
    }
    const timer = window.setTimeout(() => requestSearch(term, false), 100);
    return (): void => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setActiveSearchResultIndex(0);
  }, [searchState.term, searchState.results.length]);

  useEffect(() => {
    if (activeSheet !== 'search') return;
    const result = searchState.results.filter((candidate) => candidate.type !== 'empty')[activeSearchResultIndex];
    previewSearchResult(result ?? null);
  }, [activeSheet, activeSearchResultIndex, searchState.results]);

  useEffect(() => {
    if (activeSidePanel !== 'comm') return;
    const list = commListRef.current;
    if (!list) return;
    window.requestAnimationFrame(() => {
      if (commState.requestOlder) {
        if (commState.status === 'loading') return;
        const previousHeight = commOlderScrollHeightRef.current;
        if (commState.oldMessagesWereAdded && previousHeight !== null) {
          list.scrollTop = Math.max(0, list.scrollHeight - previousHeight);
        }
        commOlderScrollHeightRef.current = null;
        commOlderRequestPendingRef.current = false;
        return;
      }
      commOlderScrollHeightRef.current = null;
      commOlderRequestPendingRef.current = false;
      if (commStickToBottomRef.current || commState.sendStatus === 'sending' || commState.sendStatus === 'sent') {
        list.scrollTop = list.scrollHeight;
        setCommUserAtBottom(true);
      }
    });
  }, [activeSidePanel, commState.tab, commState.status, commState.newestTimestamp, commState.messages, commState.recent?.length, commState.requestOlder, commState.oldMessagesWereAdded, commState.sendStatus]);

  useEffect(() => {
    if (activeSidePanel !== 'comm') {
      commLatestTimestampRef.current = commState.newestTimestamp;
      return;
    }
    const previous = commLatestTimestampRef.current;
    const current = commState.newestTimestamp;
    if (previous !== undefined && current !== undefined && current > previous && !commStickToBottomRef.current) {
      setCommNewBelow(true);
    }
    commLatestTimestampRef.current = current;
  }, [activeSidePanel, commState.newestTimestamp]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      handleIitcIrisContentKeyDown(event, {
        hasSelectedObject,
        portalImageOpen,
        shortcutsEnabled,
        closeSheets,
        closePortalImage: () => setPortalImageOpen(false),
        panMap,
        togglePrimaryMenu,
        toggleSheet,
        zoomMap,
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return (): void => window.removeEventListener('keydown', onKeyDown);
  }, [closeSheets, hasSelectedObject, panMap, portalImageOpen, shortcutsEnabled, togglePrimaryMenu, toggleSheet, zoomMap]);

  const setDataSource = (id: string): void => {
    setDataSourceId(id);
    const option = DATA_SOURCE_OPTIONS.find((candidate) => candidate.id === id);
    if (!option || option.mode === 'live' || option.lat === undefined || option.lng === undefined || option.zoom === undefined) return;
    setMapView(option.lat, option.lng, option.zoom);
  };
  const activeSearchResult = searchState.results.filter((result) => result.type !== 'empty')[activeSearchResultIndex];
  const drawToolsTarget = getDrawToolsTarget();
  const drawToolsTargetDefaultLabel = drawToolsTarget?.label ?? '';
  const drawToolsLinkItems = drawToolsItems.filter((item) => item.type === 'polyline');
  const drawToolsMarkerItems = drawToolsItems.filter((item) => item.type === 'marker');

  useEffect(() => {
    setDrawToolsMarkerLabel(drawToolsTargetDefaultLabel);
  }, [drawToolsTargetDefaultLabel]);

  return (
    <div className={`iitc-iris-shell iitc-iris-sheet-${activeSheet} ${entityFetch.selectedPortal ? 'iitc-iris-has-selected-portal' : ''}`}>
      <div id="iitc-iris-map" className="iitc-iris-map" />
      <IitcIrisAuthRecoveryBanner
        authRecoveryText={authRecoveryText}
        openIntelLogin={openIntelLogin}
        retryAuthRequest={retryAuthRequest}
      />
      {activeSheet === 'map' && searchState.term && searchState.results.length > 0 && (
        <div className="iitc-iris-map-search-badge">
          <span title={activeSearchResult?.title || searchState.term}>search: {activeSearchResult?.title || searchState.term}</span>
          <button type="button" onClick={clearSearch} title="Clear search overlay" aria-label="Clear search overlay">x</button>
        </div>
      )}
      {activeSheet === 'search' && (
        <IitcIrisSearchPanel
          activeSearchResultIndex={activeSearchResultIndex}
          clearSearch={clearSearch}
          closeSearch={() => openSheet('map')}
          handleSearchKeyDown={handleSearchKeyDown}
          previewSearchResult={previewSearchResult}
          requestSearch={requestSearch}
          searchState={searchState}
          searchTerm={searchTerm}
          selectSearchResult={selectSearchResult}
          setActiveSearchResultIndex={setActiveSearchResultIndex}
          setSearchTerm={setSearchTerm}
        />
      )}
      <aside className="iitc-iris-map-controls" aria-label="Map controls">
        {(activeSheet === 'view' || activeSheet === 'layers' || activeSheet === 'drawLinks' || activeSheet === 'drawMarkers' || activeSheet === 'portalCounts' || activeSheet === 'portalsList' || activeSheet === 'scoreboard' || activeSheet === 'selectedLink' || activeSheet === 'selectedField') && (
          <div className="iitc-iris-panel-topbar">
            <span className="iitc-iris-selected-title">
              {activeSheet === 'view'
                ? 'Controls'
                : activeSheet === 'selectedLink'
                  ? 'Link'
                : activeSheet === 'selectedField'
                  ? 'Field'
                : activeSheet === 'layers'
                  ? 'Display'
                  : activeSheet === 'drawLinks'
                    ? 'Draw Links'
                    : activeSheet === 'drawMarkers'
                      ? 'Draw Markers'
                      : activeSheet === 'portalCounts'
                        ? 'Portal Counts'
                        : activeSheet === 'portalsList'
                          ? 'Portals List'
                          : 'Scoreboard'}
            </span>
            <span className="iitc-iris-panel-header-actions">
              <button className="iitc-iris-clear-selection" type="button" onClick={closeSheets} title={`Close ${activeSheet}`} aria-label={`Close ${activeSheet}`}>X</button>
            </span>
          </div>
        )}
        {activeSheet === 'view' && (
          <IitcIrisMapNavigationPanel
            canPan={canPan}
            geolocationStatus={geolocationStatus}
            locateBrowserPosition={locateBrowserPosition}
            panMap={panMap}
            zoomMap={zoomMap}
          />
        )}
        {mapContext && (
          (activeSheet === 'view' && mapContext.target === 'map') ||
          (activeSheet === 'selectedLink' && mapContext.target === 'link') ||
          (activeSheet === 'selectedField' && mapContext.target === 'field')
        ) && (
          <IitcIrisMapContextPanel
            centerMapContext={centerMapContext}
            copyMapContextGuid={copyMapContextGuid}
            copyMapContextLatLng={copyMapContextLatLng}
            copyMapContextPortalGuids={copyMapContextPortalGuids}
            copyMapContextUrl={copyMapContextUrl}
            formatMapObjectDistance={formatMapObjectDistance}
            formatTeamLabel={formatTeamLabel}
            mapContext={mapContext}
            selectMapContextAnchor={selectMapContextAnchor}
          />
        )}
        {activeSheet === 'drawLinks' && <IitcIrisDrawToolsPanel
          allItemsCount={drawToolsItems.length}
          clearConfirm={drawToolsClearConfirm}
          editingMarkerIndex={editingDrawToolsMarkerIndex}
          importMerge={drawToolsImportMerge}
          importStatus={drawToolsImportStatus}
          importText={drawToolsImportText}
          linkItems={drawToolsLinkItems}
          linkStart={drawToolsLinkStart}
          markerItems={drawToolsMarkerItems}
          markerLabel={drawToolsMarkerLabel}
          mode="links"
          target={drawToolsTarget}
          addLinkPoint={addDrawToolsLinkPoint}
          addMarker={addDrawToolsMarker}
          centerItem={centerDrawToolsItem}
          clearItems={clearDrawToolsItems}
          copyItems={copyDrawToolsItems}
          deleteAtContext={deleteDrawToolsAtContext}
          deleteItem={deleteDrawToolsItem}
          importItems={importDrawToolsItems}
          saveMarkerLabel={saveDrawToolsMarkerLabel}
          setEditingMarkerIndex={setEditingDrawToolsMarkerIndex}
          setImportMerge={setDrawToolsImportMerge}
          setImportText={setDrawToolsImportText}
          setLinkStart={setDrawToolsLinkStart}
          setMarkerLabel={setDrawToolsMarkerLabel}
          undoItem={undoDrawToolsItem}
        />}
        {activeSheet === 'drawMarkers' && <IitcIrisDrawToolsPanel
          allItemsCount={drawToolsItems.length}
          clearConfirm={drawToolsClearConfirm}
          editingMarkerIndex={editingDrawToolsMarkerIndex}
          importMerge={drawToolsImportMerge}
          importStatus={drawToolsImportStatus}
          importText={drawToolsImportText}
          linkItems={drawToolsLinkItems}
          linkStart={drawToolsLinkStart}
          markerItems={drawToolsMarkerItems}
          markerLabel={drawToolsMarkerLabel}
          mode="markers"
          target={drawToolsTarget}
          addLinkPoint={addDrawToolsLinkPoint}
          addMarker={addDrawToolsMarker}
          centerItem={centerDrawToolsItem}
          clearItems={clearDrawToolsItems}
          copyItems={copyDrawToolsItems}
          deleteAtContext={deleteDrawToolsAtContext}
          deleteItem={deleteDrawToolsItem}
          importItems={importDrawToolsItems}
          saveMarkerLabel={saveDrawToolsMarkerLabel}
          setEditingMarkerIndex={setEditingDrawToolsMarkerIndex}
          setImportMerge={setDrawToolsImportMerge}
          setImportText={setDrawToolsImportText}
          setLinkStart={setDrawToolsLinkStart}
          setMarkerLabel={setDrawToolsMarkerLabel}
          undoItem={undoDrawToolsItem}
        />}
        {activeSheet === 'portalCounts' && (
          <IitcIrisPortalCountsPanel portalAnalysis={portalAnalysis} />
        )}
        {activeSheet === 'portalsList' && (
          <IitcIrisPortalsListPanel
            cameraZoom={camera.zoom}
            portalAnalysis={portalAnalysis}
            portalsListLevelFilter={portalsListLevelFilter}
            portalsListSortBy={portalsListSortBy}
            portalsListSortOrder={portalsListSortOrder}
            portalsListSummary={portalsListSummary}
            portalsListTeamFilter={portalsListTeamFilter}
            portalsListTextFilter={portalsListTextFilter}
            sortedPortalsList={sortedPortalsList}
            setPortalsListLevelFilter={setPortalsListLevelFilter}
            setPortalsListTeamFilter={setPortalsListTeamFilter}
            setPortalsListTextFilter={setPortalsListTextFilter}
            sortPortalsListBy={sortPortalsListBy}
            zoomToAndShowPortal={zoomToAndShowPortal}
          />
        )}
        {activeSheet === 'scoreboard' && (
          <IitcIrisScoreboardPanel portalAnalysis={portalAnalysis} />
        )}
        {activeSheet === 'layers' && (
          <IitcIrisLayersPanel
            baseLayerId={baseLayerId}
            highlighterSettings={highlighterSettings}
            layerSettings={layerSettings}
            selectBaseLayer={setBaseLayerId}
            selectPortalHighlighter={selectPortalHighlighter}
            toggleLayerSetting={toggleLayerSetting}
          />
        )}
      </aside>
      {activeSheet === 'system' && (
        <aside className="iitc-iris-system-panel" aria-label="System controls">
          <div className="iitc-iris-panel-topbar">
            <span className="iitc-iris-selected-title">System</span>
            <span className="iitc-iris-panel-header-actions">
              <span className="iitc-iris-status">UI and diagnostics</span>
            </span>
          </div>
          <IitcIrisSystemDiagnosticsPanel
            activeByEndpoint={requestDiagnostics.activeByEndpoint}
            camera={camera}
            debugDockVisible={debugDockVisible}
            detailOverlaysActive={detailOverlaysActive}
            entityFetch={entityFetch}
            innerStatus={innerStatus}
            plan={plan}
            requestBatches={requestBatches}
            selectedPortalLabel={entityFetch.selectedPortal ? formatSelectedPortal(entityFetch.selectedPortal) : null}
            status={status}
            summaryMode={summaryMode}
            clearPortalSelection={clearPortalSelection}
            formatRenderMutationSummary={formatRenderMutationSummary}
            openIntelLogin={openIntelLogin}
            toggleDebugDock={toggleDebugDock}
          />
          <IitcIrisSystemControlsPanel
            activeScenarioRun={activeScenarioRun}
            canPan={canPan}
            captureScenarioSnapshot={captureScenarioSnapshot}
            clearScenarioRuns={clearScenarioRuns}
            copyDockText={copyDockText}
            copyIntelUrl={copyIntelUrl}
            copyScenarioRun={copyScenarioRun}
            copyStatus={copyStatus}
            dataSourceId={dataSourceId}
            dataSourceOptions={DATA_SOURCE_OPTIONS}
            finishScenarioRun={finishScenarioRun}
            jumpToPreset={jumpToPreset}
            jumpToViewInput={jumpToViewInput}
            latestScenarioRun={latestScenarioRun}
            lifecycleSettings={lifecycleSettings}
            mapFocusMode={mapFocusMode}
            panScenarioSouth={panScenarioSouth}
            scenarioExpectedSteps={scenarioExpectedSteps}
            scenarioProgressLabels={scenarioProgressLabels}
            scenarioProgressRun={scenarioProgressRun}
            scenarioRuns={scenarioRuns}
            scenarioSnapCount={scenarioSnapCount}
            scenarioStatus={scenarioStatus}
            setDataSource={setDataSource}
            setLifecycleSettings={setLifecycleSettings}
            setMapFocusMode={setMapFocusMode}
            setShortcutsEnabled={setShortcutsEnabled}
            setViewInput={setViewInput}
            shortcutsEnabled={shortcutsEnabled}
            startScenarioRun={startScenarioRun}
            viewInput={viewInput}
            viewInputStatus={viewInputStatus}
            viewPresets={VIEW_PRESETS}
          />
        </aside>
      )}
      <IitcIrisSheetTabBar
        activePrimaryMenu={activePrimaryMenu}
        togglePrimaryMenu={togglePrimaryMenu}
        selectedPrimaryLabel={selectedPrimaryLabel}
        hasSelectedObject={hasSelectedObject}
        activeSheet={activeSheet}
        selectedKind={selectedKind}
        toggleSheet={toggleSheet}
        openSheet={openSheet}
        toggleMissionsSheet={toggleMissionsSheet}
        missionsState={missionsState}
        commState={commState}
        selectCommTab={selectCommTab}
      />
      {showPortalSidePanel && entityFetch.selectedPortal && (
        <IitcIrisPortalDetailsPanel
          activeSidePanel={activeSidePanel}
          closePortalDetails={closeSheetToMap}
          copySelectedPortalGuid={copySelectedPortalGuid}
          copySelectedPortalLink={copySelectedPortalLink}
          copySelectedPortalTitle={copySelectedPortalTitle}
          focusSelectedPortal={focusSelectedPortal}
          inlineAuthActions={inlineAuthActions}
          openPortalImage={() => setPortalImageOpen(true)}
          openSelectedPortalMissions={openSelectedPortalMissions}
          portal={entityFetch.selectedPortal}
          portalDetails={selectedPortalDetails}
          portalMissionState={selectedPortalMissionState}
          portalSections={portalSections}
          setPortalSectionOpen={setPortalSectionOpen}
        />
      )}
      <IitcIrisPortalImageModal
        isOpen={portalImageOpen}
        onClose={() => setPortalImageOpen(false)}
        portal={entityFetch.selectedPortal}
      />
      {activeSheet === 'help' && (
        <IitcIrisHelpPanel closeHelp={closeSheets} />
      )}
      {activeSidePanelOption && (
        <aside className="iitc-iris-request-side-panel" aria-label={`${activeSidePanelOption.title} panel`}>
          <div className="iitc-iris-request-panel-header">
            <span className="iitc-iris-selected-title">{activeSidePanelOption.label}</span>
            <span className="iitc-iris-panel-header-actions">
              <span className={`iitc-iris-status iitc-iris-panel-state ${getPanelStatusClass(activeSidePanelStatus)}`}>
                {activeSidePanelStatus}
              </span>
              {activePanelNeedsAuth && (
                inlineAuthActions
              )}
	            <button className="iitc-iris-clear-selection" type="button" onClick={closeSidePanel} title={`Close ${activeSidePanelOption.title}`} aria-label={`Close ${activeSidePanelOption.title}`}>X</button>
            </span>
	          </div>
	          {activeSidePanel === 'agent' && (
	            <IitcIrisAgentPanel agentState={agentState} />
          )}
          {activeSidePanel === 'comm' && (
            <IitcIrisCommPanel
              addNickname={addCommNickname}
              commDraft={commDraft}
              commListRef={commListRef as import('preact').RefObject<HTMLDivElement>}
              commNewBelow={commNewBelow}
              commState={commState}
              commUserAtBottom={commUserAtBottom}
              jumpToLatest={jumpCommToLatest}
              onDraftChange={setCommDraft}
              onScroll={handleCommScroll}
              refresh={refreshComm}
              requestOlder={requestOlderComm}
              selectPortal={selectCommPortal}
              selectTab={selectCommTab}
              send={sendComm}
            />
          )}
          {activeSidePanel === 'scores' && (
            <IitcIrisScoresPanel refresh={refreshScores} scoresState={scoresState} />
          )}
          {activeSidePanel === 'missions' && (
            <IitcIrisMissionsPanel
              cameraZoom={camera.zoom}
              hasSelectedPortal={Boolean(entityFetch.selectedPortal)}
              missionsState={missionsState}
              refreshMissions={refreshMissions}
              requestMissionDetails={requestMissionDetails}
              zoomToAndShowPortal={zoomToAndShowPortal}
              zoomToMission={zoomToMission}
            />
          )}
          {activeSidePanel === 'inventory' && (
            <IitcIrisInventoryPanel
              inventoryState={inventoryState}
              refresh={refreshInventory}
              zoomToAndShowPortal={zoomToAndShowPortal}
            />
          )}
          {activeSidePanel === 'passcode' && (
            <IitcIrisPasscodePanel
              onDraftChange={setPasscodeDraft}
              passcodeDraft={passcodeDraft}
              passcodeState={passcodeState}
              redeem={redeemPasscode}
            />
          )}
        </aside>
      )}
    </div>
  );
}

function createRoot(): HTMLElement {
  const existingRoot = document.getElementById('iitc-iris-root');
  if (existingRoot) return existingRoot;

  const root = document.createElement('div');
  root.id = 'iitc-iris-root';
  (document.body || document.documentElement).appendChild(root);
  return root;
}

function hasIntelDashboardBootstrap(): boolean {
  return document.querySelector('script[src*="gen_dashboard_"]') !== null;
}

function shouldBypassForIntelLogin(): boolean {
  try {
    const value = Number(window.sessionStorage.getItem(LOGIN_BYPASS_STORAGE_KEY) ?? 0);
    if (!Number.isFinite(value) || value <= Date.now() || hasIntelDashboardBootstrap()) {
      window.sessionStorage.removeItem(LOGIN_BYPASS_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function mount(): void {
  if (!document.body) {
    window.setTimeout(mount, 50);
    return;
  }

  if (shouldBypassForIntelLogin()) {
    window.setTimeout(mount, 1000);
    return;
  }

  const root = createRoot();
  render(<App />, root);
  injectScript(getExtensionUrl('page-map-runtime.js'));
  window.dispatchEvent(new CustomEvent('IITC_IRIS_CONTAINER_READY'));

  if (window.__iitcIrisContentInitialized) return;
  window.__iitcIrisContentInitialized = true;

  const observer = new MutationObserver(() => {
    if (!document.getElementById('iitc-iris-root')) {
      render(<App />, createRoot());
      window.dispatchEvent(new CustomEvent('IITC_IRIS_CONTAINER_READY'));
    }
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
}

mount();
