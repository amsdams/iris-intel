import {h, render} from 'preact';
import {useCallback, useEffect, useMemo, useRef, useState} from 'preact/hooks';
import './iitc-iris.css';
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
  addCommNicknameCommand,
  centerMapContextCommand,
  clearPortalSelectionCommand,
  clearSearchCommand,
  copyMapContextGuidCommand,
  copyMapContextLatLngCommand,
  copyMapContextPortalGuidsCommand,
  copyMapContextUrlCommand,
  copySelectedPortalGuidCommand,
  copySelectedPortalLinkCommand,
  copySelectedPortalTitleCommand,
  focusSelectedPortalCommand,
  handleSearchKeyDownCommand,
  panMapCommand,
  previewSearchResultCommand,
  redeemPasscodeCommand,
  refreshInventoryCommand,
  refreshMissionsCommand,
  refreshScoresCommand,
  requestMissionDetailsCommand,
  requestSearchCommand,
  selectMapContextAnchorCommand,
  selectPortalByLatLngCommand,
  selectSearchResultCommand,
  sendCommCommand,
  setMapViewCommand,
  setPortalSectionOpenCommand,
  zoomToAndShowPortalCommand,
  zoomToMissionCommand,
  closeSheetToMapCommand,
  openSheetCommand,
  toggleSheetCommand,
  openCommPanelCommand,
  selectCommTabCommand,
  toggleCommPanelCommand,
  toggleMissionsSheetCommand,
  togglePrimaryMenuCommand,
  openIntelLoginCommand,
  logoutIntelCommand,
  setDataSourceCommand,
} from './content-command-callbacks';
import {handleIitcIrisContentKeyDown, type IitcIrisPanDirection} from './content-keyboard-shortcuts';
import {copyIitcIrisText} from './content-feedback';
import {IitcIrisPortalDetailsPanel} from './portal-details-panel';
import {IitcIrisSearchPanel} from './search-panel';
import {usePortalAnalysisWorkflow} from './content-portal-analysis-workflow';
import {IitcIrisMapControlsPanelContainer} from './map-controls-panel-container';
import {IitcIrisHelpPanel} from './help-panel';
import {IitcIrisPortalImageModal} from './portal-image-modal';
import {IitcIrisSheetTabBar} from './sheet-tabbar';
import {IitcIrisAuthRecoveryBanner} from './auth-recovery-banner';
import {IitcIrisRequestSidePanelContainer} from './request-side-panel-container';
import {IitcIrisSystemPanelContainer} from './system-panel-container';
import {createDockDiagnostics} from './content-dock-diagnostics';
import {
  calculateSidePanelStatus,
  formatAuthRecoveryText,
  getAuthSources,
  retryActiveAuthPanelRequest,
  type AppAuthStates,
} from './content-auth-navigation';
import {useScenarioWorkflow} from './content-scenario-workflow';
import {
  jumpToPresetAction,
  jumpToViewInputAction,
  locateBrowserPositionAction,
} from './content-location-actions';
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
  storeSidePanelId,
  VIEW_PRESETS,
} from './content-storage-settings';
import {
  createInnerStatusView,
  createIntelUrl,
  createPlan,
  formatRenderMutationSummary,
  formatSelectedPortal,
} from './content-map-status';


import {IITC_IRIS_MESSAGES, type IitcIrisAgentState, type IitcIrisBaseLayerId, type IitcIrisCommState, type IitcIrisCommTab, type IitcIrisDrawToolsItem, type IitcIrisHighlighterSettings, type IitcIrisInventoryState, type IitcIrisLayerSettings, type IitcIrisLifecycleSettings, type IitcIrisMapContextPortalAnchor, type IitcIrisMessage, type IitcIrisMissionSource, type IitcIrisMissionsState, type IitcIrisPasscodeState, type IitcIrisPortalHighlighterId, type IitcIrisRequestDiagnostics, type IitcIrisRenderPolicy, type IitcIrisScoresState, type IitcIrisSearchResult, type IitcIrisSearchState} from './messages';
import {
  type IitcMapDataPlan,
} from '@iris/iitc-core';
import {
  buildHighlighterSettingsMessage,
  buildHighlighterSettingsValue,
  buildLayerSettingsMessage,
  calculateToggledLayerSettings,
} from './content-layer-actions';
import {useDrawToolsWorkflow} from './content-draw-tools-workflow';
import {
  handleCommScrollAction,
  jumpCommToLatestAction,
  requestCommAction,
  requestOlderCommAction,
} from './content-comm-panel-actions';


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
  const [drawToolsItems, setDrawToolsItems] = useState<IitcIrisDrawToolsItem[]>([]);
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
  const plan: IitcMapDataPlan | null = useMemo(() => createPlan(camera), [camera]);
  const summaryMode = plan?.tileParams.hasPortals ? 'summary' : 'placeholder';
  const requestBatches = plan ? plan.requestBatches.map((batch) => batch.length) : [];
  const intelUrl = createIntelUrl(camera);
  const dataSource = useMemo(() => createDataSourceSettings(dataSourceId), [dataSourceId]);
  const innerStatus = createInnerStatusView(plan, entityFetch, requestDiagnostics);
  const portalAnalysis = entityFetch.portalAnalysis;
  const {
    portalsListSortBy,
    portalsListSortOrder,
    portalsListTeamFilter,
    portalsListLevelFilter,
    portalsListTextFilter,
    sortedPortalsList,
    portalsListSummary,
    setPortalsListLevelFilter,
    setPortalsListTeamFilter,
    setPortalsListTextFilter,
    sortPortalsListBy,
  } = usePortalAnalysisWorkflow({portalAnalysis});
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


  const copyDockText = (): void => {
    copyIitcIrisText(JSON.stringify(dockDiagnostics, null, 2), {setStatus: setCopyStatus, successStatus: 'json copied'});
  };

  const copyIntelUrl = (): void => {
    copyIitcIrisText(intelUrl, {setStatus: setCopyStatus, successStatus: 'url copied'});
  };

  const copyMapContextLatLng = (): void => {
    copyMapContextLatLngCommand(mapContext, setCopyStatus);
  };

  const copyMapContextUrl = (): void => {
    copyMapContextUrlCommand(mapContext, setCopyStatus);
  };

  const copyMapContextGuid = (): void => {
    copyMapContextGuidCommand(mapContext, setCopyStatus);
  };

  const copyMapContextPortalGuids = (): void => {
    copyMapContextPortalGuidsCommand(mapContext, setCopyStatus);
  };

  const centerMapContext = (): void => {
    centerMapContextCommand(mapContext, setMapView);
  };


  const copySelectedPortalLink = (): void => {
    copySelectedPortalLinkCommand(entityFetch.selectedPortal, camera.zoom, setCopyStatus);
  };

  const copySelectedPortalGuid = (): void => {
    copySelectedPortalGuidCommand(entityFetch.selectedPortal, setCopyStatus);
  };

  const copySelectedPortalTitle = (): void => {
    copySelectedPortalTitleCommand(entityFetch.selectedPortal, setCopyStatus);
  };


  const toggleDebugDock = (): void => {
    setDebugDockVisible((current) => {
      const next = !current;
      storeDebugDockVisible(next);
      return next;
    });
  };

  const postIitcMessage = useCallback((message: IitcIrisMessage): void => {
    window.postMessage(message, '*');
  }, []);

  const closeSheetToMap = useCallback((): void => {
    closeSheetToMapCommand(activeSheet, activeSidePanel, postIitcMessage, {setActiveSheet, setActiveSidePanel, storeActiveSheet, storeSidePanelId});
  }, [activeSheet, activeSidePanel, postIitcMessage]);

  const closeSidePanel = useCallback((): void => {
    closeSheetToMap();
  }, [closeSheetToMap]);

  const openSheet = useCallback((sheet: SheetId): void => {
    openSheetCommand(sheet, activeSheet, activeSidePanel, postIitcMessage, {setActiveSheet, setActiveSidePanel, storeActiveSheet, storeSidePanelId});
  }, [activeSheet, activeSidePanel, postIitcMessage]);

  const toggleSheet = useCallback((sheet: SheetId): void => {
    toggleSheetCommand(sheet, activeSheet, activeSidePanel, postIitcMessage, {setActiveSheet, setActiveSidePanel, storeActiveSheet, storeSidePanelId});
  }, [activeSheet, activeSidePanel, postIitcMessage]);

  const refreshComm = useCallback((tab: IitcIrisCommTab = commState.tab, older = false): void => {
    requestCommAction(tab, older);
  }, [commState.tab]);

  const requestOlderComm = (): void => {
    requestOlderCommAction(
      commState,
      commListRef.current,
      (h) => { commOlderScrollHeightRef.current = h; },
      (p) => { commOlderRequestPendingRef.current = p; },
      refreshComm
    );
  };

  const handleCommScroll = (): void => {
    handleCommScrollAction(
      commListRef.current,
      activeSidePanel,
      commState,
      commOlderRequestPendingRef.current,
      (stick) => { commStickToBottomRef.current = stick; },
      setCommUserAtBottom,
      setCommNewBelow,
      requestOlderComm
    );
  };

  const jumpCommToLatest = (): void => {
    jumpCommToLatestAction(
      commListRef.current,
      (stick) => { commStickToBottomRef.current = stick; },
      setCommUserAtBottom,
      setCommNewBelow
    );
  };

  const refreshScores = (): void => {
    refreshScoresCommand(postIitcMessage);
  };

  const refreshInventory = (): void => {
    refreshInventoryCommand(postIitcMessage);
  };

  const refreshMissions = useCallback((source: IitcIrisMissionSource = missionsState.source ?? 'view'): void => {
    refreshMissionsCommand(postIitcMessage, source);
  }, [missionsState.source, postIitcMessage]);

  const openSelectedPortalMissions = (): void => {
    if (!entityFetch.selectedPortal) return;
    openSheet('missions');
    refreshMissions('portal');
  };

  const requestMissionDetails = (missionGuid: string): void => {
    requestMissionDetailsCommand(postIitcMessage, missionGuid);
  };

  const zoomToMission = (): void => {
    zoomToMissionCommand(postIitcMessage);
  };

  const redeemPasscode = (): void => {
    redeemPasscodeCommand(passcodeState, passcodeDraft, setPasscodeDraft, postIitcMessage);
  };

  const sendComm = (): void => {
    sendCommCommand(commState.tab, commDraft, setCommDraft, postIitcMessage);
  };

  const addCommNickname = (nickname: string): void => {
    setCommDraft((current) => addCommNicknameCommand(current, nickname));
  };

  const openIntelLogin = (): void => {
    openIntelLoginCommand(
      LOGIN_BYPASS_STORAGE_KEY,
      LOGIN_BYPASS_MS,
      document.getElementById('iitc-iris-root'),
      window.location
    );
  };

  const logoutIntel = (): void => {
    logoutIntelCommand(
      LOGIN_BYPASS_STORAGE_KEY,
      document.getElementById('iitc-iris-root'),
      window.location
    );
  };

  // Deliberately kept in content.tsx: extracting this to a pure command would require
  // passing ~13 distinct dependencies (state values and update callbacks) which creates
  // a massive untyped bag, reducing clarity compared to inline assembly.
  const retryAuthRequest = (): void => {
    retryActiveAuthPanelRequest(activeSidePanel, activeSheet, commState.tab, missionsState.source, {
      refreshComm,
      refreshScores,
      refreshInventory,
      refreshMissions,
      requestSearch,
      searchTerm,
      passcodeDraft,
      passcodeState,
      retryPasscode: (passcode): void => {
        redeemPasscodeCommand(passcodeState, passcode, setPasscodeDraft, postIitcMessage);
      },
      retryMapFetch: (): void => {
        postIitcMessage({
          type: IITC_IRIS_MESSAGES.dataSourceSettings,
          dataSource,
        });
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
    setLayerSettings((current) => calculateToggledLayerSettings(current, key));
  };

  const selectPortalHighlighter = (active: IitcIrisPortalHighlighterId): void => {
    highlighterSettingsIntentAtRef.current = performance.now();
    setHighlighterSettings(buildHighlighterSettingsValue(active));
  };

  const setMapView = useCallback((lat: number, lng: number, zoom = camera.zoom): void => {
    setMapViewCommand(lat, lng, zoom, postIitcMessage);
  }, [camera.zoom, postIitcMessage]);

  const {
    drawToolsLinkStart,
    drawToolsImportText,
    drawToolsImportMerge,
    drawToolsImportStatus,
    drawToolsClearConfirm,
    drawToolsMarkerLabel,
    editingDrawToolsMarkerIndex,
    drawToolsTarget,
    drawToolsLinkItems,
    drawToolsLinkEndpointLabelsByStorageIndex,
    drawToolsMarkerItems,
    drawToolsMarkerPortalInfoByStorageIndex,
    setDrawToolsLinkStart,
    setDrawToolsImportText,
    setDrawToolsImportMerge,
    setDrawToolsImportStatus,
    setDrawToolsMarkerLabel,
    setEditingDrawToolsMarkerIndex,
    addDrawToolsMarker,
    saveDrawToolsMarkerLabel,
    addDrawToolsLinkPoint,
    deleteDrawToolsAtContext,
    deleteDrawToolsItem,
    undoDrawToolsItem,
    clearDrawToolsItems,
    centerDrawToolsItem,
    copyDrawToolsItems,
    importDrawToolsItems,
  } = useDrawToolsWorkflow({
    drawToolsItems,
    selectedPortal: entityFetch.selectedPortal,
    mapContext,
    cameraCenter: {lat: camera.lat, lng: camera.lng},
    cameraZoom: camera.zoom,
    portalAnalysis,
    setMapView,
    setStatus,
  });

  const requestSearch = useCallback((term: string, confirmed = false): void => {
    requestSearchCommand(postIitcMessage, term, confirmed);
  }, [postIitcMessage]);

  const clearSearch = (): void => {
    clearSearchCommand(postIitcMessage, setSearchTerm, setSearchState, setActiveSearchResultIndex, EMPTY_SEARCH_STATE);
  };

  const previewSearchResult = useCallback((result: IitcIrisSearchResult | null): void => {
    previewSearchResultCommand(postIitcMessage, result);
  }, [postIitcMessage]);

  const selectSearchResult = (result: IitcIrisSearchResult, zoom = false): void => {
    selectSearchResultCommand(result, zoom, postIitcMessage, mapFocusMode, closeSheets, openSheet);
  };

  const handleSearchKeyDown = (event: h.JSX.TargetedKeyboardEvent<HTMLInputElement>): void => {
    // We cast event because Preact TargetedKeyboardEvent doesn't exactly match the generic signature, but it conforms.
    handleSearchKeyDownCommand(event as unknown as {key: string; shiftKey: boolean; preventDefault(): void}, searchState.results, activeSearchResultIndex, postIitcMessage, mapFocusMode, closeSheets, openSheet, setActiveSearchResultIndex);
  };

  const setPortalSectionOpen = (section: PortalSectionId, open: boolean): void => {
    setPortalSectionOpenCommand(portalSections, section, open, setPortalSections);
  };

  const zoomToAndShowPortal = (portalGuid?: string, latE6?: number, lngE6?: number, zoom = Math.max(camera.zoom, 15)): void => {
    zoomToAndShowPortalCommand(portalGuid, latE6, lngE6, zoom, postIitcMessage);
  };

  const selectMapContextAnchor = (anchor: IitcIrisMapContextPortalAnchor): void => {
    selectMapContextAnchorCommand(anchor, Math.max(camera.zoom, 15), postIitcMessage);
  };

  const selectPortalByLatLng = (latE6?: number, lngE6?: number, portalGuid?: string): void => {
    selectPortalByLatLngCommand(latE6, lngE6, portalGuid, camera.zoom, postIitcMessage);
  };

  const selectCommPortal = (latE6?: number, lngE6?: number, portalGuid?: string): void => {
    selectPortalByLatLng(latE6, lngE6, portalGuid);
  };

  const panMap = useCallback((direction: IitcIrisPanDirection): void => {
    panMapCommand(direction, IITC_PAN_CONTROL_OFFSET_PX, postIitcMessage);
  }, [postIitcMessage]);

  const zoomMap = useCallback((delta: number): void => {
    setMapView(camera.lat, camera.lng, camera.zoom + delta);
  }, [camera.lat, camera.lng, camera.zoom, setMapView]);

  const clearPortalSelection = (): void => {
    clearPortalSelectionCommand(postIitcMessage);
  };

  const closeSheets = useCallback((): void => {
    setPortalImageOpen(false);
    openSheet('map');
  }, [openSheet]);

  const focusSelectedPortal = (): void => {
    focusSelectedPortalCommand(entityFetch.selectedPortal, camera.zoom, mapFocusMode, setMapView, closeSheets);
  };

  const canPan = camera.bounds !== null;
  const {
    scenarioRuns,
    activeScenarioRun,
    latestScenarioRun,
    scenarioSnapCount,
    scenarioStatus,
    scenarioProgressRun,
    scenarioProgressLabels,
    scenarioExpectedSteps,
    startScenarioRun,
    captureScenarioSnapshot,
    panScenarioSouth,
    finishScenarioRun,
    clearScenarioRuns,
    copyScenarioRun,
  } = useScenarioWorkflow({
    lifecycleSettings,
    dockDiagnostics,
    canPan,
    panMap,
    setLifecycleSettings,
  });
  const activeSidePanelOption = SIDE_PANEL_OPTIONS.find((option) => option.id === activeSidePanel) ?? null;
  const activePrimaryMenu = activeSheet === 'missions' && missionsState.source === 'portal'
    ? 'selected'
    : activeSheet === 'map' && entityFetch.selectedPortal
      ? 'selected'
    : getPrimaryMenuId(activeSheet);
  const appAuthStates: AppAuthStates = {
    entityFetch,
    selectedPortalDetails,
    commState,
    scoresState,
    missionsState,
    inventoryState,
    passcodeState,
    agentState,
  };
  const activeSidePanelStatus = calculateSidePanelStatus(activeSidePanel, appAuthStates);
  const authSources = getAuthSources(appAuthStates);
  const authRecoveryText = formatAuthRecoveryText(authSources);
  const activePanelNeedsAuth = activeSidePanelStatus === 'auth';
  const openCommPanel = useCallback((tab?: IitcIrisCommTab): void => {
    openCommPanelCommand(tab, refreshComm, openSheet);
  }, [openSheet, refreshComm]);

  const selectCommTab = (tab: IitcIrisCommTab): void => {
    selectCommTabCommand(tab, activeSheet, commState.tab, refreshComm, openSheet);
  };

  const toggleCommPanel = useCallback((tab?: IitcIrisCommTab): void => {
    toggleCommPanelCommand(tab, activeSheet, commState.tab, closeSheetToMap, openCommPanel);
  }, [activeSheet, closeSheetToMap, commState.tab, openCommPanel]);

  const toggleMissionsSheet = (source: IitcIrisMissionSource): void => {
    toggleMissionsSheetCommand(source, activeSheet, missionsState.source, closeSheetToMap, openSheet, refreshMissions);
  };

  const togglePrimaryMenu = useCallback((menu: PrimaryMenuId): void => {
    togglePrimaryMenuCommand(
      menu,
      {activePrimaryMenu, activeSelectedSheet, activeSheet, hasSelectedObject},
      closeSheetToMap,
      openSheet,
      toggleCommPanel,
      toggleSheet
    );
  }, [activePrimaryMenu, activeSelectedSheet, activeSheet, closeSheetToMap, hasSelectedObject, openSheet, toggleCommPanel, toggleSheet]);



  const jumpToPreset = (preset: typeof VIEW_PRESETS[number]): void => {
    jumpToPresetAction(preset, setMapView);
  };

  const jumpToViewInput = (): void => {
    jumpToViewInputAction(viewInput, camera.zoom, setMapView, setViewInputStatus);
  };

  const locateBrowserPosition = (): void => {
    locateBrowserPositionAction(
      Boolean(navigator.geolocation),
      (success, error, options) => navigator.geolocation.getCurrentPosition(success, error, options),
      setMapView,
      setGeolocationStatus,
      (msg) => window.postMessage(msg, '*')
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
  }, [activeSidePanel, baseLayerId, camera.zoom, dataSource, highlighterSettings, layerSettings, lifecycleSettings, setDrawToolsImportStatus]);

  useEffect(() => {
    storeLayerSettings(layerSettings);
    const sentAt = layerSettingsIntentAtRef.current ?? performance.now();
    layerSettingsIntentAtRef.current = undefined;
    window.postMessage(buildLayerSettingsMessage(layerSettings, baseLayerId, sentAt), '*');
  }, [baseLayerId, layerSettings]);

  useEffect(() => {
    storeHighlighterSettings(highlighterSettings);
    const sentAt = highlighterSettingsIntentAtRef.current ?? performance.now();
    highlighterSettingsIntentAtRef.current = undefined;
    window.postMessage(buildHighlighterSettingsMessage(highlighterSettings, sentAt), '*');
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
  }, [searchTerm, requestSearch]);

  useEffect(() => {
    setActiveSearchResultIndex(0);
  }, [searchState.term, searchState.results.length]);

  useEffect(() => {
    if (activeSheet !== 'search') return;
    const result = searchState.results.filter((candidate) => candidate.type !== 'empty')[activeSearchResultIndex];
    previewSearchResult(result ?? null);
  }, [activeSheet, activeSearchResultIndex, searchState.results, previewSearchResult]);

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
    setDataSourceCommand(id, DATA_SOURCE_OPTIONS, setDataSourceId, setMapView);
  };
  const activeSearchResult = searchState.results.filter((result) => result.type !== 'empty')[activeSearchResultIndex];

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
      <IitcIrisMapControlsPanelContainer
        activeSheet={activeSheet}
        closeSheets={closeSheets}
        canPan={canPan}
        geolocationStatus={geolocationStatus}
        locateBrowserPosition={locateBrowserPosition}
        panMap={panMap}
        zoomMap={zoomMap}
        mapContext={mapContext}
        centerMapContext={centerMapContext}
        copyMapContextGuid={copyMapContextGuid}
        copyMapContextLatLng={copyMapContextLatLng}
        copyMapContextPortalGuids={copyMapContextPortalGuids}
        copyMapContextUrl={copyMapContextUrl}
        selectMapContextAnchor={selectMapContextAnchor}
        drawToolsItems={drawToolsItems}
        drawToolsClearConfirm={drawToolsClearConfirm}
        editingDrawToolsMarkerIndex={editingDrawToolsMarkerIndex}
        drawToolsImportMerge={drawToolsImportMerge}
        drawToolsImportStatus={drawToolsImportStatus}
        drawToolsImportText={drawToolsImportText}
        drawToolsLinkItems={drawToolsLinkItems}
        drawToolsLinkEndpointLabelsByStorageIndex={drawToolsLinkEndpointLabelsByStorageIndex}
        drawToolsLinkStart={drawToolsLinkStart}
        drawToolsMarkerItems={drawToolsMarkerItems}
        drawToolsMarkerLabel={drawToolsMarkerLabel}
        drawToolsMarkerPortalInfoByStorageIndex={drawToolsMarkerPortalInfoByStorageIndex}
        drawToolsTarget={drawToolsTarget}
        addDrawToolsLinkPoint={addDrawToolsLinkPoint}
        addDrawToolsMarker={addDrawToolsMarker}
        centerDrawToolsItem={centerDrawToolsItem}
        clearDrawToolsItems={clearDrawToolsItems}
        copyDrawToolsItems={copyDrawToolsItems}
        deleteDrawToolsAtContext={deleteDrawToolsAtContext}
        deleteDrawToolsItem={deleteDrawToolsItem}
        importDrawToolsItems={importDrawToolsItems}
        saveDrawToolsMarkerLabel={saveDrawToolsMarkerLabel}
        setEditingMarkerIndex={setEditingDrawToolsMarkerIndex}
        setImportMerge={setDrawToolsImportMerge}
        setImportText={setDrawToolsImportText}
        setLinkStart={setDrawToolsLinkStart}
        setMarkerLabel={setDrawToolsMarkerLabel}
        undoDrawToolsItem={undoDrawToolsItem}
        portalAnalysis={portalAnalysis}
        cameraZoom={camera.zoom}
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
        baseLayerId={baseLayerId}
        highlighterSettings={highlighterSettings}
        layerSettings={layerSettings}
        selectBaseLayer={setBaseLayerId}
        selectPortalHighlighter={selectPortalHighlighter}
        toggleLayerSetting={toggleLayerSetting}
      />
      {activeSheet === 'system' && (
        <IitcIrisSystemPanelContainer
          camera={camera}
          debugDockVisible={debugDockVisible}
          detailOverlaysActive={detailOverlaysActive}
          entityFetch={entityFetch}
          innerStatus={innerStatus}
          plan={plan}
          requestBatches={requestBatches}
          requestDiagnostics={requestDiagnostics}
          status={status}
          summaryMode={summaryMode}
          clearPortalSelection={clearPortalSelection}
          formatRenderMutationSummary={formatRenderMutationSummary}
          formatSelectedPortalLabel={() => (entityFetch.selectedPortal ? formatSelectedPortal(entityFetch.selectedPortal) : null)}
          openIntelLogin={openIntelLogin}
          logoutIntel={logoutIntel}
          toggleDebugDock={toggleDebugDock}
          activeScenarioRun={activeScenarioRun}
          canPan={canPan}
          captureScenarioSnapshot={captureScenarioSnapshot}
          clearScenarioRuns={clearScenarioRuns}
          copyDockText={copyDockText}
          copyIntelUrl={copyIntelUrl}
          copyScenarioRun={copyScenarioRun}
          copyStatus={copyStatus}
          dataSourceId={dataSourceId}
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
        />
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
        <IitcIrisRequestSidePanelContainer
          activeSidePanel={activeSidePanel}
          activeSidePanelOption={activeSidePanelOption}
          activeSidePanelStatus={activeSidePanelStatus}
          activePanelNeedsAuth={activePanelNeedsAuth}
          inlineAuthActions={inlineAuthActions}
          closeSidePanel={closeSidePanel}
          agentState={agentState}
          commState={commState}
          commDraft={commDraft}
          commListRef={commListRef as import('preact').RefObject<HTMLDivElement>}
          commNewBelow={commNewBelow}
          commUserAtBottom={commUserAtBottom}
          addCommNickname={addCommNickname}
          handleCommScroll={handleCommScroll}
          jumpCommToLatest={jumpCommToLatest}
          refreshComm={refreshComm}
          requestOlderComm={requestOlderComm}
          selectCommPortal={selectCommPortal}
          selectCommTab={selectCommTab}
          sendComm={sendComm}
          setCommDraft={setCommDraft}
          scoresState={scoresState}
          refreshScores={refreshScores}
          missionsState={missionsState}
          cameraZoom={camera.zoom}
          hasSelectedPortal={Boolean(entityFetch.selectedPortal)}
          refreshMissions={refreshMissions}
          requestMissionDetails={requestMissionDetails}
          zoomToAndShowPortal={zoomToAndShowPortal}
          zoomToMission={zoomToMission}
          inventoryState={inventoryState}
          refreshInventory={refreshInventory}
          passcodeState={passcodeState}
          passcodeDraft={passcodeDraft}
          setPasscodeDraft={setPasscodeDraft}
          redeemPasscode={redeemPasscode}
        />
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
