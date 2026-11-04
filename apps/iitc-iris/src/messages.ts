import type {
  IitcIrisRenderEntities, IitcIrisPortalAnalysis, IitcIrisSelectedPortal, IitcIrisPortalDetailsState,
} from './messages/entities';
import type {
  IitcIrisEntitySource, IitcIrisQueueDiagnostics, IitcIrisRenderQueueDiagnostics,
  IitcIrisRenderMutationDiagnostics, IitcIrisMapTimingDiagnostics, IitcIrisRequestDiagnostics,
  IitcIrisPlayerTrackerDiagnostics, IitcIrisLayerSettings, IitcIrisLayerRegistryEntry,
  IitcIrisHighlighterSettings, IitcIrisPortalHighlighterId, IitcIrisBaseLayerId, IitcIrisBaseLayerError,
  IitcIrisDataSourceSettings, IitcIrisLifecycleSettings, IitcIrisRenderPolicy, IitcIrisMapContextPortalAnchor,
} from './messages/map';
import type {IitcIrisCommState, IitcIrisCommTab, IitcIrisCommMessage} from './messages/comm';
import type {IitcIrisScoresState} from './messages/scores';
import type {IitcIrisPasscodeState} from './messages/passcode';
import type {IitcIrisInventoryState} from './messages/inventory';
import type {IitcIrisMissionsState, IitcIrisMissionSource} from './messages/missions';
import type {IitcIrisAgentState} from './messages/agent';
import type {IitcIrisSearchState, IitcIrisSearchResult} from './messages/search';
import type {IitcIrisDrawToolsLatLng, IitcIrisDrawToolsItem} from './messages/draw-tools';

// Keep existing bridge imports stable; feature payload declarations live with their domain.
export type {
  IitcIrisRenderArtifact, IitcIrisPortalSummary, IitcIrisRenderPortal, IitcIrisSelectedPortal,
  IitcIrisPortalMod, IitcIrisPortalResonator, IitcIrisPortalDetailsState, IitcIrisRenderLink,
  IitcIrisRenderField, IitcIrisRenderEntities, IitcIrisPortalAnalysis,
} from './messages/entities';
export type {
  IitcIrisEntitySource, IitcIrisBaseLayerError, IitcIrisMapContextPortalAnchor, IitcIrisQueueDiagnostics,
  IitcIrisRequestDiagnostics, IitcIrisRenderQueueDiagnostics, IitcIrisRenderMutationLayerDiagnostics,
  IitcIrisRenderMutationDiagnostics, IitcIrisLayerUpdateTimingDiagnostics,
  IitcIrisInteractionUpdateTimingDiagnostics, IitcIrisMapTimingDiagnostics, IitcIrisPlayerTrackerDiagnostics,
  IitcIrisLifecycleSettings, IitcIrisLayerRegistryGroup, IitcIrisLayerRegistryKind, IitcIrisPortalHighlighterId,
  IitcIrisHighlighterSettings, IitcIrisLayerRegistryEntry, IitcIrisLayerSettings, IitcIrisBaseLayerId,
  IitcIrisDataSourceSettings, IitcIrisRenderPolicy,
} from './messages/map';
export type {
  IitcIrisCommTab, IitcIrisCommState, IitcIrisCommMessage, IitcIrisCommMessagePart,
} from './messages/comm';
export type {IitcIrisAgentState, IitcIrisSubscriptionState} from './messages/agent';
export type {IitcIrisInventoryState} from './messages/inventory';
export type {IitcIrisScoresState} from './messages/scores';
export type {IitcIrisPasscodeRewardItem, IitcIrisPasscodeState} from './messages/passcode';
export type {
  IitcIrisMissionSource, IitcIrisMissionSummary, IitcIrisMissionWaypoint, IitcIrisMissionDetails,
  IitcIrisMissionsState,
} from './messages/missions';
export type {IitcIrisSearchResult, IitcIrisSearchState} from './messages/search';
export type {
  IitcIrisDrawToolsLatLng, IitcIrisDrawToolsPolyline, IitcIrisDrawToolsMarker, IitcIrisDrawToolsItem,
} from './messages/draw-tools';

export const IITC_IRIS_MESSAGES = {
  boot: 'IITC_IRIS_BOOT',
  pageReady: 'IITC_IRIS_PAGE_READY',
  mapMoved: 'IITC_IRIS_MAP_MOVED',
  renderEntities: 'IITC_IRIS_RENDER_ENTITIES',
  fetchEntities: 'IITC_IRIS_FETCH_ENTITIES',
  entitiesResponse: 'IITC_IRIS_ENTITIES_RESPONSE',
  entityStatus: 'IITC_IRIS_ENTITY_STATUS',
  layerSettings: 'IITC_IRIS_LAYER_SETTINGS',
  baseLayerStatus: 'IITC_IRIS_BASE_LAYER_STATUS',
  dataSourceSettings: 'IITC_IRIS_DATA_SOURCE_SETTINGS',
  lifecycleSettings: 'IITC_IRIS_LIFECYCLE_SETTINGS',
  setView: 'IITC_IRIS_SET_VIEW',
  panBy: 'IITC_IRIS_PAN_BY',
  setUserLocation: 'IITC_IRIS_SET_USER_LOCATION',
  zoomToAndShowPortal: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL',
  clearPortalSelection: 'IITC_IRIS_CLEAR_PORTAL_SELECTION',
  mapContext: 'IITC_IRIS_MAP_CONTEXT',
  requestComm: 'IITC_IRIS_REQUEST_COMM',
  commVisibility: 'IITC_IRIS_COMM_VISIBILITY',
  portalActivityRequest: 'IITC_IRIS_PORTAL_ACTIVITY_REQUEST',
  portalActivityStatus: 'IITC_IRIS_PORTAL_ACTIVITY_STATUS',
  cancelPanelRequests: 'IITC_IRIS_CANCEL_PANEL_REQUESTS',
  sendComm: 'IITC_IRIS_SEND_COMM',
  commStatus: 'IITC_IRIS_COMM_STATUS',
  requestScores: 'IITC_IRIS_REQUEST_SCORES',
  scoresStatus: 'IITC_IRIS_SCORES_STATUS',
  requestPasscode: 'IITC_IRIS_REQUEST_PASSCODE',
  passcodeStatus: 'IITC_IRIS_PASSCODE_STATUS',
  requestInventory: 'IITC_IRIS_REQUEST_INVENTORY',
  inventoryStatus: 'IITC_IRIS_INVENTORY_STATUS',
  requestMissions: 'IITC_IRIS_REQUEST_MISSIONS',
  requestMissionDetails: 'IITC_IRIS_REQUEST_MISSION_DETAILS',
  missionZoom: 'IITC_IRIS_MISSION_ZOOM',
  missionsStatus: 'IITC_IRIS_MISSIONS_STATUS',
  requestStatus: 'IITC_IRIS_REQUEST_STATUS',
  agentStatus: 'IITC_IRIS_AGENT_STATUS',
  searchRequest: 'IITC_IRIS_SEARCH_REQUEST',
  searchStatus: 'IITC_IRIS_SEARCH_STATUS',
  searchSelect: 'IITC_IRIS_SEARCH_SELECT',
  searchPreview: 'IITC_IRIS_SEARCH_PREVIEW',
  searchClear: 'IITC_IRIS_SEARCH_CLEAR',
  drawTools: 'IITC_IRIS_DRAW_TOOLS',
  drawToolsStatus: 'IITC_IRIS_DRAW_TOOLS_STATUS',
} as const;

export type IitcIrisMessageType = typeof IITC_IRIS_MESSAGES[keyof typeof IITC_IRIS_MESSAGES];

export interface IitcIrisMessage {
  type: IitcIrisMessageType;
  sentAt?: number;
  lat?: number;
  lng?: number;
  zoom?: number;
  panX?: number;
  panY?: number;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  entities?: IitcIrisRenderEntities;
  requestId?: number;
  tileKeys?: string[];
  data?: unknown;
  error?: string;
  status?: string;
  entitySource?: IitcIrisEntitySource;
  authRequired?: boolean;
  portals?: number;
  realPortals?: number;
  placeholderPortals?: number;
  ornamentPortals?: number;
  drawnOrnamentMarkers?: number;
  hiddenOrnamentMarkers?: number;
  ornamentTypes?: Record<string, number>;
  artifactPortals?: number;
  drawnArtifactMarkers?: number;
  artifactTypes?: Record<string, number>;
  artifactFetchStatus?: string;
  artifactFetchPortalCount?: number;
  artifactFetchTypes?: string[];
  artifactFetchElapsedMs?: number;
  artifactFetchError?: string;
  levelLabels?: number;
  damagedPortals?: number;
  links?: number;
  fields?: number;
  viewportPortals?: number;
  viewportRealPortals?: number;
  viewportPlaceholderPortals?: number;
  viewportLinks?: number;
  viewportFields?: number;
  viewportOrnamentPortals?: number;
  viewportOrnamentMarkers?: number;
  viewportArtifactPortals?: number;
  viewportArtifactMarkers?: number;
  requestedTiles?: number;
  returnedTiles?: number;
  nonEmptyTiles?: number;
  elapsedMs?: number;
  firstRenderElapsedMs?: number;
  retryRequests?: number;
  retriedTileKeys?: string[];
  recoveredTileKeys?: string[];
  emptyTileKeys?: string[];
  nonEmptyTileKeys?: string[];
  unaccountedTileKeys?: string[];
  serverRetryTileKeys?: string[];
  timeoutTileKeys?: string[];
  errorTileKeys?: string[];
  responseRetryTileKeys?: string[];
  queueDelayReasons?: string[];
  partialTileKeys?: string[];
  cacheFreshTileKeys?: string[];
  cacheStaleTileKeys?: string[];
  staleGenerationCacheWarmTileKeys?: string[];
  queue?: IitcIrisQueueDiagnostics | null;
  renderQueue?: IitcIrisRenderQueueDiagnostics | null;
  renderMutation?: IitcIrisRenderMutationDiagnostics | null;
  timing?: IitcIrisMapTimingDiagnostics | null;
  requestDiagnostics?: IitcIrisRequestDiagnostics;
  playerTracker?: IitcIrisPlayerTrackerDiagnostics;
  portalAnalysis?: IitcIrisPortalAnalysis | null;
  layerSettings?: IitcIrisLayerSettings;
  layerRegistry?: IitcIrisLayerRegistryEntry[];
  highlighterSettings?: IitcIrisHighlighterSettings;
  highlighterIds?: IitcIrisPortalHighlighterId[];
  baseLayerId?: IitcIrisBaseLayerId;
  baseLayerRequestedId?: IitcIrisBaseLayerId;
  baseLayerError?: IitcIrisBaseLayerError;
  dataSource?: IitcIrisDataSourceSettings;
  lifecycleSettings?: IitcIrisLifecycleSettings;
  renderPolicy?: IitcIrisRenderPolicy;
  selectedPortal?: IitcIrisSelectedPortal | null;
  portalDetails?: IitcIrisPortalDetailsState | null;
  contextTarget?: 'map' | 'portal' | 'link' | 'field';
  contextGuid?: string;
  contextTeam?: 'E' | 'R' | 'N' | 'M';
  contextPortalGuids?: string[];
  contextPortalAnchors?: IitcIrisMapContextPortalAnchor[];
  contextDistanceMeters?: number;
  comm?: IitcIrisCommState;
  scores?: IitcIrisScoresState;
  passcode?: IitcIrisPasscodeState;
  inventory?: IitcIrisInventoryState;
  missions?: IitcIrisMissionsState;
  agent?: IitcIrisAgentState;
  search?: IitcIrisSearchState;
  searchTerm?: string;
  searchConfirmed?: boolean;
  searchResult?: IitcIrisSearchResult;
  drawToolsAction?: 'addMarker' | 'addPolyline' | 'deleteAt' | 'deleteIndex' | 'rename' | 'clear' | 'undo' | 'import' | 'snapToPortals' | 'requestStatus' | 'highlightIndex';
  drawToolsItemType?: 'polyline' | 'marker';
  drawToolsColor?: string;
  drawToolsLabel?: string;
  drawToolsLatLngs?: IitcIrisDrawToolsLatLng[];
  drawToolsItems?: IitcIrisDrawToolsItem[];
  drawToolsIndex?: number;
  drawToolsJson?: string;
  drawToolsMerge?: boolean;
  drawToolsError?: string;
  drawToolsStatusText?: string;
  userLat?: number;
  userLng?: number;
  userAccuracy?: number;
  commTab?: IitcIrisCommTab;
  commVisible?: boolean;
  portalActivity?: {guid: string; recent: IitcIrisCommMessage[]; total: number};
  commOlder?: boolean;
  commMessage?: string;
  passcodeText?: string;
  missionSource?: IitcIrisMissionSource;
  missionGuid?: string;
  portalGuid?: string;
  portalLat?: number;
  portalLng?: number;
  openPortal?: boolean;
}
