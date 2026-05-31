import {h, render} from 'preact';
import {useEffect, useMemo, useState} from 'preact/hooks';
import './iitc-iris.css';
import {IITC_IRIS_MESSAGES, type IitcIrisBaseLayerId, type IitcIrisCommState, type IitcIrisCommTab, type IitcIrisDataSourceSettings, type IitcIrisEntitySource, type IitcIrisInventoryState, type IitcIrisLayerSettings, type IitcIrisMessage, type IitcIrisPasscodeState, type IitcIrisPortalDetailsState, type IitcIrisQueueDiagnostics, type IitcIrisRenderPolicy, type IitcIrisScoresState, type IitcIrisSelectedPortal} from './messages';
import {
  createIitcMapDataPlan,
  IITC_EMPTY_TILE_RETRY_BATCH_SIZE,
  IITC_EMPTY_TILE_RETRY_LIMIT,
  IITC_EMPTY_TILE_RETRY_PASSES,
  IITC_MAX_REQUESTS,
  IITC_MAX_TILE_RETRIES,
  IITC_NUM_TILES_PER_REQUEST,
  type IitcBounds,
  type IitcMapDataPlan,
} from '@iris/iitc-core';

const REQUEST_BOUNDS_PADDING_RATIO = 0.25;
const BASE_LAYER_STORAGE_KEY = 'iitc-iris:base-layer';
const LAYER_SETTINGS_STORAGE_KEY = 'iitc-iris:layer-settings';
const DATA_SOURCE_STORAGE_KEY = 'iitc-iris:data-source';
const DEBUG_DOCK_STORAGE_KEY = 'iitc-iris:debug-dock';
const SIDE_PANEL_STORAGE_KEY = 'iitc-iris:side-panel';
const COMM_TAB_STORAGE_KEY = 'iitc-chat-tab';
const VIEW_PRESETS = [
  {id: 'amsterdam-z10', label: 'AMS 10', lat: 52.3730796, lng: 4.8924534, zoom: 10},
  {id: 'amsterdam-z15', label: 'AMS 15', lat: 52.3730796, lng: 4.8924534, zoom: 15},
  {id: 'damrak-z15', label: 'DAM 15', lat: 52.3761096, lng: 4.8980545, zoom: 15},
] as const;
const BASE_LAYER_OPTIONS: {id: IitcIrisBaseLayerId; label: string; title: string}[] = [
  {id: 'cartodb-dark-matter', label: 'Dark', title: 'CartoDB Dark Matter'},
  {id: 'cartodb-positron', label: 'Light', title: 'CartoDB Positron'},
  {id: 'osm', label: 'OSM', title: 'OpenStreetMap'},
];
const DATA_SOURCE_OPTIONS = [
  {id: 'live', label: 'Live', title: 'Fetch live Intel getEntities responses', mode: 'live' as const},
  {
    id: 'ams-z10',
    label: 'AMS F10',
    title: 'Amsterdam fixture from docs/update-map/get-entities-z10.json',
    mode: 'fixture' as const,
    fixturePath: 'fixtures/get-entities-z10.json',
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 10,
  },
  {
    id: 'ams-z14',
    label: 'AMS F14',
    title: 'Amsterdam fixture from docs/update-map/get-entities-z14.json',
    mode: 'fixture' as const,
    fixturePath: 'fixtures/get-entities-z14.json',
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 14,
  },
  {
    id: 'dam-iitc-z15',
    label: 'DAM IITC',
    title: 'Damrak fixture extracted from IITC HAR getEntities response',
    mode: 'fixture' as const,
    fixturePath: 'fixtures/get-entities-damrak-iitc-z15.json',
    lat: 52.3761096,
    lng: 4.8980545,
    zoom: 15,
  },
] as const;
const CORE_LAYER_TOGGLE_LABELS: [keyof IitcIrisLayerSettings, string][] = [
  ['fields', 'F'],
  ['links', 'LN'],
  ['portals', 'P'],
  ['unclaimedPortals', 'U'],
  ['level1Portals', 'L1'],
  ['level2Portals', 'L2'],
  ['level3Portals', 'L3'],
  ['level4Portals', 'L4'],
  ['level5Portals', 'L5'],
  ['level6Portals', 'L6'],
  ['level7Portals', 'L7'],
  ['level8Portals', 'L8'],
  ['resistance', 'RES'],
  ['enlightened', 'ENL'],
  ['machina', 'MAC'],
];
const DETAIL_LAYER_TOGGLE_LABELS: [keyof IitcIrisLayerSettings, string][] = [
  ['levelFill', 'LF'],
  ['healthFill', 'HF'],
  ['ornaments', 'OR'],
  ['artifacts', 'AR'],
  ['labels', 'LV'],
  ['tiles', 'T'],
];
const RESONATOR_PANEL_ORDER: (number | null)[] = [0, 1, 2, 3, null, 4, 5, 6, 7];
const SIDE_PANEL_OPTIONS = [
  {id: 'comm', label: 'COMM', title: 'COMM messages'},
  {id: 'scores', label: 'Scores', title: 'Scores'},
  {id: 'inventory', label: 'Inventory', title: 'Inventory'},
] as const;
const COMM_TABS: {id: IitcIrisCommTab; label: string}[] = [
  {id: 'all', label: 'All'},
  {id: 'faction', label: 'Faction'},
  {id: 'alerts', label: 'Alerts'},
];
const DEFAULT_LAYER_SETTINGS: IitcIrisLayerSettings = {
  fields: true,
  links: true,
  portals: true,
  unclaimedPortals: true,
  level1Portals: true,
  level2Portals: true,
  level3Portals: true,
  level4Portals: true,
  level5Portals: true,
  level6Portals: true,
  level7Portals: true,
  level8Portals: true,
  resistance: true,
  enlightened: true,
  machina: true,
  levelFill: false,
  healthFill: false,
  ornaments: false,
  artifacts: false,
  labels: false,
  tiles: false,
};
const DEFAULT_RENDER_POLICY: IitcIrisRenderPolicy = {
  optionalOverlayMinZoom: 14,
  detailedPortals: false,
  levelFill: false,
  healthFill: false,
  ornaments: false,
  artifacts: false,
  labels: false,
};

interface CameraState {
  lat: number;
  lng: number;
  zoom: number;
  bounds: IitcBounds | null;
}

interface EntityFetchState {
  status: string;
  entitySource: IitcIrisEntitySource | 'idle';
  authRequired: boolean;
  generation: number;
  key: string;
  collision: boolean;
  portals: number;
  realPortals: number;
  placeholderPortals: number;
  ornamentPortals: number;
  drawnOrnamentMarkers: number;
  hiddenOrnamentMarkers: number;
  ornamentTypes: Record<string, number>;
  artifactPortals: number;
  drawnArtifactMarkers: number;
  artifactTypes: Record<string, number>;
  artifactFetchStatus: string;
  artifactFetchPortalCount: number;
  artifactFetchTypes: string[];
  artifactFetchElapsedMs: number | null;
  artifactFetchError: string;
  levelLabels: number;
  damagedPortals: number;
  links: number;
  fields: number;
  viewportPortals: number;
  viewportRealPortals: number;
  viewportPlaceholderPortals: number;
  viewportLinks: number;
  viewportFields: number;
  viewportOrnamentPortals: number;
  viewportOrnamentMarkers: number;
  viewportArtifactPortals: number;
  viewportArtifactMarkers: number;
  requestedTiles: number;
  returnedTiles: number;
  nonEmptyTiles: number;
  elapsedMs: number | null;
  firstRenderElapsedMs: number | null;
  retryRequests: number;
  retriedTileKeys: string[];
  recoveredTileKeys: string[];
  emptyTileKeys: string[];
  nonEmptyTileKeys: string[];
  unaccountedTileKeys: string[];
  serverRetryTileKeys: string[];
  timeoutTileKeys: string[];
  errorTileKeys: string[];
  responseRetryTileKeys: string[];
  queueDelayReasons: string[];
  partialTileKeys: string[];
  cacheFreshTileKeys: string[];
  cacheStaleTileKeys: string[];
  queue: IitcIrisQueueDiagnostics | null;
  baseLayerId: IitcIrisBaseLayerId;
  dataSource: IitcIrisDataSourceSettings;
  renderPolicy: IitcIrisRenderPolicy;
  selectedPortal: IitcIrisSelectedPortal | null;
  portalDetails: IitcIrisPortalDetailsState | null;
}

type SidePanelId = typeof SIDE_PANEL_OPTIONS[number]['id'];
type SheetId = 'map' | 'layers' | 'portal' | SidePanelId;

interface ParsedViewInput {
  lat: number;
  lng: number;
  zoom?: number;
}

interface InnerStatusView {
  portalText: string;
  mapText: string;
  mapTitle: string;
  progressPercent: number | null;
  activeRequests: number;
  failedRequests: number;
}

function clampView(view: ParsedViewInput): ParsedViewInput {
  return {
    lat: Math.max(-85.051128, Math.min(85.051128, view.lat)),
    lng: Math.max(-180, Math.min(179.999999, view.lng)),
    zoom: view.zoom === undefined ? undefined : Math.max(0, Math.min(21, view.zoom)),
  };
}

function parseViewInput(value: string): ParsedViewInput | null {
  const text = value.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const ll = url.searchParams.get('ll') ?? url.searchParams.get('pll');
    const z = url.searchParams.get('z');
    if (ll) {
      const [latText, lngText] = ll.split(',');
      const parsed = {
        lat: Number(latText),
        lng: Number(lngText),
        zoom: z ? Number(z) : undefined,
      };
      if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) && (parsed.zoom === undefined || Number.isFinite(parsed.zoom))) return clampView(parsed);
    }
  } catch {
    // Fall through to coordinate parsing.
  }

  const [latText, lngText, zoomText] = text.split(/[,\s]+/).filter(Boolean);
  const parsed = {
    lat: Number(latText),
    lng: Number(lngText),
    zoom: zoomText ? Number(zoomText) : undefined,
  };
  if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
  if (parsed.zoom !== undefined && !Number.isFinite(parsed.zoom)) return null;
  return clampView(parsed);
}

function getExtensionUrl(path: string): string {
  return chrome.runtime.getURL(path);
}

function isBaseLayerId(value: string | null): value is IitcIrisBaseLayerId {
  return value === 'osm' || value === 'cartodb-dark-matter' || value === 'cartodb-positron';
}

function loadStoredBaseLayerId(): IitcIrisBaseLayerId {
  try {
    const value = window.localStorage.getItem(BASE_LAYER_STORAGE_KEY);
    return isBaseLayerId(value) ? value : 'cartodb-dark-matter';
  } catch {
    return 'cartodb-dark-matter';
  }
}

function isLayerSettings(value: unknown): value is Partial<IitcIrisLayerSettings> {
  return !!value && typeof value === 'object';
}

function loadStoredLayerSettings(): IitcIrisLayerSettings {
  try {
    const value = window.localStorage.getItem(LAYER_SETTINGS_STORAGE_KEY);
    if (!value) return DEFAULT_LAYER_SETTINGS;
    const parsed = JSON.parse(value) as unknown;
    if (!isLayerSettings(parsed)) return DEFAULT_LAYER_SETTINGS;
    return {
      fields: typeof parsed.fields === 'boolean' ? parsed.fields : DEFAULT_LAYER_SETTINGS.fields,
      links: typeof parsed.links === 'boolean' ? parsed.links : DEFAULT_LAYER_SETTINGS.links,
      portals: typeof parsed.portals === 'boolean' ? parsed.portals : DEFAULT_LAYER_SETTINGS.portals,
      unclaimedPortals: typeof parsed.unclaimedPortals === 'boolean' ? parsed.unclaimedPortals : DEFAULT_LAYER_SETTINGS.unclaimedPortals,
      level1Portals: typeof parsed.level1Portals === 'boolean' ? parsed.level1Portals : DEFAULT_LAYER_SETTINGS.level1Portals,
      level2Portals: typeof parsed.level2Portals === 'boolean' ? parsed.level2Portals : DEFAULT_LAYER_SETTINGS.level2Portals,
      level3Portals: typeof parsed.level3Portals === 'boolean' ? parsed.level3Portals : DEFAULT_LAYER_SETTINGS.level3Portals,
      level4Portals: typeof parsed.level4Portals === 'boolean' ? parsed.level4Portals : DEFAULT_LAYER_SETTINGS.level4Portals,
      level5Portals: typeof parsed.level5Portals === 'boolean' ? parsed.level5Portals : DEFAULT_LAYER_SETTINGS.level5Portals,
      level6Portals: typeof parsed.level6Portals === 'boolean' ? parsed.level6Portals : DEFAULT_LAYER_SETTINGS.level6Portals,
      level7Portals: typeof parsed.level7Portals === 'boolean' ? parsed.level7Portals : DEFAULT_LAYER_SETTINGS.level7Portals,
      level8Portals: typeof parsed.level8Portals === 'boolean' ? parsed.level8Portals : DEFAULT_LAYER_SETTINGS.level8Portals,
      resistance: typeof parsed.resistance === 'boolean' ? parsed.resistance : DEFAULT_LAYER_SETTINGS.resistance,
      enlightened: typeof parsed.enlightened === 'boolean' ? parsed.enlightened : DEFAULT_LAYER_SETTINGS.enlightened,
      machina: typeof parsed.machina === 'boolean' ? parsed.machina : DEFAULT_LAYER_SETTINGS.machina,
      levelFill: typeof parsed.levelFill === 'boolean' ? parsed.levelFill : DEFAULT_LAYER_SETTINGS.levelFill,
      healthFill: typeof parsed.healthFill === 'boolean' ? parsed.healthFill : DEFAULT_LAYER_SETTINGS.healthFill,
      ornaments: typeof parsed.ornaments === 'boolean' ? parsed.ornaments : DEFAULT_LAYER_SETTINGS.ornaments,
      artifacts: typeof parsed.artifacts === 'boolean' ? parsed.artifacts : DEFAULT_LAYER_SETTINGS.artifacts,
      labels: typeof parsed.labels === 'boolean' ? parsed.labels : DEFAULT_LAYER_SETTINGS.labels,
      tiles: typeof parsed.tiles === 'boolean' ? parsed.tiles : DEFAULT_LAYER_SETTINGS.tiles,
    };
  } catch {
    return DEFAULT_LAYER_SETTINGS;
  }
}

function loadStoredDataSourceId(): typeof DATA_SOURCE_OPTIONS[number]['id'] {
  try {
    const value = window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
    return DATA_SOURCE_OPTIONS.some((option) => option.id === value) ? value as typeof DATA_SOURCE_OPTIONS[number]['id'] : 'live';
  } catch {
    return 'live';
  }
}

function storeLayerSettings(value: IitcIrisLayerSettings): void {
  try {
    window.localStorage.setItem(LAYER_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Layer preferences are optional.
  }
}

function storeDataSourceId(value: string): void {
  try {
    window.localStorage.setItem(DATA_SOURCE_STORAGE_KEY, value);
  } catch {
    // Data source preference is optional.
  }
}

function loadStoredDebugDockVisible(): boolean {
  try {
    return window.localStorage.getItem(DEBUG_DOCK_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

function storeDebugDockVisible(value: boolean): void {
  try {
    window.localStorage.setItem(DEBUG_DOCK_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // Debug visibility is optional.
  }
}

function isSidePanelId(value: string | null): value is SidePanelId {
  return SIDE_PANEL_OPTIONS.some((option) => option.id === value);
}

function isCommTab(value: string | null): value is IitcIrisCommTab {
  return value === 'all' || value === 'faction' || value === 'alerts';
}

function loadStoredCommTab(): IitcIrisCommTab {
  try {
    const value = window.localStorage.getItem(COMM_TAB_STORAGE_KEY);
    return isCommTab(value) ? value : 'all';
  } catch {
    return 'all';
  }
}

function storeCommTab(value: IitcIrisCommTab): void {
  try {
    window.localStorage.setItem(COMM_TAB_STORAGE_KEY, value);
  } catch {
    // COMM tab preference is optional.
  }
}

function loadStoredSidePanelId(): SidePanelId | null {
  try {
    const value = window.localStorage.getItem(SIDE_PANEL_STORAGE_KEY);
    return isSidePanelId(value) ? value : null;
  } catch {
    return null;
  }
}

function storeSidePanelId(value: SidePanelId | null): void {
  try {
    if (value) {
      window.localStorage.setItem(SIDE_PANEL_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(SIDE_PANEL_STORAGE_KEY);
    }
  } catch {
    // Side panel preference is optional.
  }
}

function createDataSourceSettings(id: typeof DATA_SOURCE_OPTIONS[number]['id']): IitcIrisDataSourceSettings {
  const option = DATA_SOURCE_OPTIONS.find((candidate) => candidate.id === id) ?? DATA_SOURCE_OPTIONS[0];
  if (option.mode === 'live') return {mode: 'live'};
  return {
    mode: 'fixture',
    id: option.id,
    label: option.label,
    url: getExtensionUrl(option.fixturePath),
  };
}

function entityFetchStateFromMessage(message: IitcIrisMessage, current: EntityFetchState): EntityFetchState {
  return {
    status: message.status ?? current.status,
    entitySource: message.entitySource ?? 'live',
    authRequired: message.authRequired ?? false,
    generation: current.generation,
    key: current.key,
    collision: current.collision,
    portals: message.portals ?? 0,
    realPortals: message.realPortals ?? 0,
    placeholderPortals: message.placeholderPortals ?? 0,
    ornamentPortals: message.ornamentPortals ?? 0,
    drawnOrnamentMarkers: message.drawnOrnamentMarkers ?? 0,
    hiddenOrnamentMarkers: message.hiddenOrnamentMarkers ?? 0,
    ornamentTypes: message.ornamentTypes ?? {},
    artifactPortals: message.artifactPortals ?? 0,
    drawnArtifactMarkers: message.drawnArtifactMarkers ?? 0,
    artifactTypes: message.artifactTypes ?? {},
    artifactFetchStatus: message.artifactFetchStatus ?? 'disabled',
    artifactFetchPortalCount: message.artifactFetchPortalCount ?? 0,
    artifactFetchTypes: message.artifactFetchTypes ?? [],
    artifactFetchElapsedMs: message.artifactFetchElapsedMs ?? null,
    artifactFetchError: message.artifactFetchError ?? '',
    levelLabels: message.levelLabels ?? 0,
    damagedPortals: message.damagedPortals ?? 0,
    links: message.links ?? 0,
    fields: message.fields ?? 0,
    viewportPortals: message.viewportPortals ?? 0,
    viewportRealPortals: message.viewportRealPortals ?? 0,
    viewportPlaceholderPortals: message.viewportPlaceholderPortals ?? 0,
    viewportLinks: message.viewportLinks ?? 0,
    viewportFields: message.viewportFields ?? 0,
    viewportOrnamentPortals: message.viewportOrnamentPortals ?? 0,
    viewportOrnamentMarkers: message.viewportOrnamentMarkers ?? 0,
    viewportArtifactPortals: message.viewportArtifactPortals ?? 0,
    viewportArtifactMarkers: message.viewportArtifactMarkers ?? 0,
    requestedTiles: message.requestedTiles ?? 0,
    returnedTiles: message.returnedTiles ?? 0,
    nonEmptyTiles: message.nonEmptyTiles ?? 0,
    elapsedMs: message.elapsedMs ?? null,
    firstRenderElapsedMs: message.firstRenderElapsedMs ?? current.firstRenderElapsedMs,
    retryRequests: message.retryRequests ?? 0,
    retriedTileKeys: message.retriedTileKeys ?? [],
    recoveredTileKeys: message.recoveredTileKeys ?? [],
    emptyTileKeys: message.emptyTileKeys ?? [],
    nonEmptyTileKeys: message.nonEmptyTileKeys ?? [],
    unaccountedTileKeys: message.unaccountedTileKeys ?? [],
    serverRetryTileKeys: message.serverRetryTileKeys ?? [],
    timeoutTileKeys: message.timeoutTileKeys ?? [],
    errorTileKeys: message.errorTileKeys ?? [],
    responseRetryTileKeys: message.responseRetryTileKeys ?? [],
    queueDelayReasons: message.queueDelayReasons ?? [],
    partialTileKeys: message.partialTileKeys ?? [],
    cacheFreshTileKeys: message.cacheFreshTileKeys ?? [],
    cacheStaleTileKeys: message.cacheStaleTileKeys ?? [],
    queue: message.queue ?? null,
    baseLayerId: message.baseLayerId ?? current.baseLayerId,
    dataSource: message.dataSource ?? current.dataSource,
    renderPolicy: message.renderPolicy ?? current.renderPolicy,
    selectedPortal: message.selectedPortal === undefined ? current.selectedPortal : message.selectedPortal,
    portalDetails: message.portalDetails === undefined ? current.portalDetails : message.portalDetails,
  };
}

function injectScript(src: string): void {
  if (document.querySelector(`script[data-iitc-iris-src="${CSS.escape(src)}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = false;
  script.dataset.iitcIrisSrc = src;
  (document.head || document.documentElement).appendChild(script);
}

function createPlan(camera: CameraState): IitcMapDataPlan | null {
  if (!camera.bounds) return null;

  try {
    return createIitcMapDataPlan(camera.bounds, {lat: camera.lat, lng: camera.lng}, camera.zoom, {
      boundsPaddingRatio: REQUEST_BOUNDS_PADDING_RATIO,
    });
  } catch (error) {
    console.warn('[IITC IRIS] Failed to create map data plan', error);
    return null;
  }
}

function createSequentialBatches(tileKeys: string[], batchSize: number): string[][] {
  const batches: string[][] = [];
  for (let index = 0; index < tileKeys.length; index += batchSize) {
    batches.push(tileKeys.slice(index, index + batchSize));
  }
  return batches;
}

function createIntelUrl(camera: CameraState): string {
  const lat = camera.lat.toFixed(6);
  const lng = camera.lng.toFixed(6);
  const zoom = String(Math.round(camera.zoom * 100) / 100);
  return `https://intel.ingress.com/intel?ll=${lat},${lng}&z=${zoom}`;
}

function formatLinkLength(meters: number): string {
  return meters > 1000 ? `${meters / 1000}km` : `${meters}m`;
}

function formatElapsedSeconds(milliseconds: number): string {
  return (Math.round(milliseconds / 100) / 10).toFixed(1);
}

function formatInteger(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : value.toLocaleString();
}

function formatPercent(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : `${Math.round(value)}%`;
}

function formatScoreLead(enlightened: number | undefined, resistance: number | undefined): string {
  if (enlightened === undefined || resistance === undefined) return '-';
  if (enlightened === resistance) return 'tied';
  const leader = enlightened > resistance ? 'ENL' : 'RES';
  return `${leader} +${formatInteger(Math.abs(enlightened - resistance))}`;
}

function formatSelectedPortal(portal: IitcIrisSelectedPortal | null): string {
  if (!portal) return 'none';
  const label = portal.title || portal.guid.slice(0, 8);
  const level = portal.isPlaceholder || portal.level === undefined ? 'P' : `L${portal.level}`;
  return `${label} ${portal.team}${level}`;
}

function formatPortalHealth(portal: IitcIrisSelectedPortal): string {
  if (portal.isPlaceholder || portal.health === undefined) return '-';
  return `${Math.round(portal.health)}%`;
}

function formatPortalHealthPercent(portal: IitcIrisSelectedPortal): number {
  if (portal.isPlaceholder || portal.health === undefined || !Number.isFinite(portal.health)) return 0;
  return Math.max(0, Math.min(100, Math.round(portal.health)));
}

function getPortalLatLng(portal: IitcIrisSelectedPortal): {lat: number; lng: number} {
  return {
    lat: portal.latE6 / 1_000_000,
    lng: portal.lngE6 / 1_000_000,
  };
}

function formatTeamLabel(team: string): string {
  if (team === 'E') return 'Enlightened';
  if (team === 'R') return 'Resistance';
  if (team === 'M') return 'Machina';
  if (team === 'N') return 'Neutral';
  return team || 'Unknown';
}

function formatTeamClass(team: string): string {
  if (team === 'E') return 'iitc-iris-team-enl';
  if (team === 'R') return 'iitc-iris-team-res';
  if (team === 'M') return 'iitc-iris-team-machina';
  return 'iitc-iris-team-neutral';
}

function formatPortalDetailsElapsed(details: IitcIrisPortalDetailsState | null): string {
  if (!details?.elapsedMs) return '';
  return ` ${formatElapsedSeconds(details.elapsedMs)}s`;
}

function formatResonatorEnergy(energy: number): string {
  return energy >= 1000 ? `${Math.round(energy / 100) / 10}k` : String(energy);
}

function formatResonatorEnergyPercent(level: number, energy: number): number {
  const maxEnergyByLevel = [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000];
  const maxEnergy = maxEnergyByLevel[level] ?? 1000;
  return Math.max(0, Math.min(100, Math.round((energy / maxEnergy) * 100)));
}

function formatModName(name: string): string {
  return name.replace(/^Portal\s+/i, '').replace(/_/g, ' ');
}

function formatModStats(stats: Record<string, string | number>): string {
  const preferredStats = ['MITIGATION', 'REMOVAL_STICKINESS', 'FORCE_AMPLIFIER', 'LINK_RANGE_MULTIPLIER', 'HACK_SPEED', 'HIT_BONUS', 'ATTACK_FREQUENCY'];
  const parts: string[] = [];
  for (const key of preferredStats) {
    const value = stats[key];
    if (value !== undefined) parts.push(`${key.toLowerCase().replace(/_/g, ' ')} ${value}`);
  }
  return parts.slice(0, 2).join(', ');
}

function formatCommTime(time: number): string {
  if (!Number.isFinite(time)) return '-';
  return new Date(time).toLocaleTimeString();
}

function formatCommBounds(bounds: IitcIrisCommState['bounds']): string {
  return bounds ? `${bounds.minLatE6},${bounds.minLngE6} to ${bounds.maxLatE6},${bounds.maxLngE6}` : '-';
}

function getCommTeamClass(team?: string): string {
  if (team === 'E') return 'is-enlightened';
  if (team === 'R') return 'is-resistance';
  if (team === 'M') return 'is-machina';
  return '';
}

function createInnerStatusView(plan: IitcMapDataPlan | null, entityFetch: EntityFetchState): InnerStatusView {
  const portalText = plan?.tileParams.hasPortals
    ? 'portals'
    : `links: ${plan && plan.tileParams.minLinkLength > 0 ? `>${formatLinkLength(plan.tileParams.minLinkLength)}` : 'all links'}`;
  const loading = entityFetch.requestedTiles > 0 && entityFetch.returnedTiles < entityFetch.requestedTiles;
  const activeRequests = entityFetch.queue?.activeRequests ?? (loading ? 1 : 0);
  const failedRequests = entityFetch.queue?.failedTiles ?? entityFetch.errorTileKeys.length;
  const progressPercent = loading ? Math.floor((entityFetch.returnedTiles / entityFetch.requestedTiles) * 100) : null;

  let mapText = entityFetch.status;
  if (entityFetch.authRequired) {
    mapText = 'login';
  } else if (loading) {
    mapText = 'loading';
  } else if (entityFetch.status === 'entities ready') {
    mapText = failedRequests > 0 ? 'errors' : 'done';
  }

  const cachedTiles = entityFetch.entitySource === 'cache' ? entityFetch.returnedTiles : 0;
  const loadedTiles = entityFetch.entitySource === 'cache' ? 0 : entityFetch.returnedTiles;
  const remainingTiles = Math.max(0, entityFetch.requestedTiles - entityFetch.returnedTiles);
  const retryText = entityFetch.retryRequests > 0 ? `, ${entityFetch.retryRequests} retried` : '';
  const partialText = entityFetch.queue?.partialTiles ? `, ${entityFetch.queue.partialTiles} partial` : '';
  const sourceText = entityFetch.entitySource === 'idle' ? '' : `, source ${entityFetch.entitySource}`;
  const finalTimeText = !loading && entityFetch.elapsedMs !== null ? `, in ${formatElapsedSeconds(entityFetch.elapsedMs)} seconds` : '';
  const tileProgressText = !loading && entityFetch.elapsedMs !== null
    ? `Tiles: ${cachedTiles} cached, ${loadedTiles} loaded${retryText}${partialText}${finalTimeText}${sourceText}`
    : `Tiles: ${cachedTiles} cached, ${loadedTiles} loaded, ${remainingTiles} remaining${retryText}${sourceText}`;
  const mapTitle = entityFetch.requestedTiles > 0
    ? tileProgressText
    : `${entityFetch.status}${sourceText}`;

  return {
    portalText,
    mapText,
    mapTitle,
    progressPercent,
    activeRequests,
    failedRequests,
  };
}

function App(): h.JSX.Element {
  const [status, setStatus] = useState('booting');
  const [copyStatus, setCopyStatus] = useState('');
  const [viewInput, setViewInput] = useState('');
  const [viewInputStatus, setViewInputStatus] = useState('');
  const [debugDockVisible, setDebugDockVisible] = useState(() => loadStoredDebugDockVisible());
  const [activeSidePanel, setActiveSidePanel] = useState<SidePanelId | null>(() => loadStoredSidePanelId());
  const [activeSheet, setActiveSheet] = useState<SheetId>(() => loadStoredSidePanelId() ?? 'map');
  const [commState, setCommState] = useState<IitcIrisCommState>(() => ({status: 'idle', tab: loadStoredCommTab(), messages: 0}));
  const [scoresState, setScoresState] = useState<IitcIrisScoresState>(() => ({status: 'idle', requestState: 'idle', region: {status: 'idle'}}));
  const [passcodeState, setPasscodeState] = useState<IitcIrisPasscodeState>(() => ({status: 'idle', requestState: 'idle'}));
  const [inventoryState, setInventoryState] = useState<IitcIrisInventoryState>(() => ({
    status: 'idle',
    requestState: 'idle',
    items: 0,
    keys: 0,
    portalsWithKeys: 0,
    capsules: 0,
    portalKeysForSelectedPortal: null,
  }));
  const [commDraft, setCommDraft] = useState('');
  const [passcodeDraft, setPasscodeDraft] = useState('');
  const [baseLayerId, setBaseLayerId] = useState<IitcIrisBaseLayerId>(() => loadStoredBaseLayerId());
  const [dataSourceId, setDataSourceId] = useState<typeof DATA_SOURCE_OPTIONS[number]['id']>(() => loadStoredDataSourceId());
  const [layerSettings, setLayerSettings] = useState<IitcIrisLayerSettings>(() => loadStoredLayerSettings());
  const [camera, setCamera] = useState<CameraState>({
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 11,
    bounds: null,
  });
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
    queue: null,
    baseLayerId: loadStoredBaseLayerId(),
    dataSource: createDataSourceSettings(loadStoredDataSourceId()),
    renderPolicy: DEFAULT_RENDER_POLICY,
    selectedPortal: null,
    portalDetails: null,
  });
  const plan: IitcMapDataPlan | null = useMemo(() => createPlan(camera), [camera]);
  const summaryMode = plan?.tileParams.hasPortals ? 'summary' : 'placeholder';
  const requestBatches = plan ? createSequentialBatches(plan.tileKeys, IITC_NUM_TILES_PER_REQUEST).map((batch) => batch.length) : [];
  const intelUrl = createIntelUrl(camera);
  const dataSource = useMemo(() => createDataSourceSettings(dataSourceId), [dataSourceId]);
  const innerStatus = createInnerStatusView(plan, entityFetch);
  const detailOverlaysActive = entityFetch.renderPolicy.levelFill ||
    entityFetch.renderPolicy.healthFill ||
    entityFetch.renderPolicy.ornaments ||
    entityFetch.renderPolicy.artifacts ||
    entityFetch.renderPolicy.labels;
  const dockDiagnostics = {
    app: 'IITC IRIS',
    status,
    intelUrl,
    camera: {
      lat: camera.lat,
      lng: camera.lng,
      zoom: camera.zoom,
      bounds: camera.bounds,
    },
    plan: plan ? {
      dataZoom: plan.dataZoom,
      mode: summaryMode,
      tiles: plan.tiles.length,
      xRange: plan.xRange,
      yRange: plan.yRange,
      firstBatchSize: requestBatches[0] ?? 0,
      requestBatches,
      requestPolicy: {
        name: 'iitc-concurrent',
        maxRequests: IITC_MAX_REQUESTS,
        tilesPerRequest: IITC_NUM_TILES_PER_REQUEST,
        sequentialRequestBatches: false,
        emptyTileRetryPasses: IITC_EMPTY_TILE_RETRY_PASSES,
        emptyTileRetryBatchSize: IITC_EMPTY_TILE_RETRY_BATCH_SIZE,
        emptyTileRetryLimit: IITC_EMPTY_TILE_RETRY_LIMIT,
        placeholderTimeoutRetryPasses: IITC_MAX_TILE_RETRIES,
      },
      dataBounds: plan.dataBounds,
    } : null,
    entities: {
      status: entityFetch.status,
      source: entityFetch.entitySource,
      complete: entityFetch.status === 'entities ready',
      portals: entityFetch.portals,
      realPortals: entityFetch.realPortals,
      placeholderPortals: entityFetch.placeholderPortals,
      ornamentPortals: entityFetch.ornamentPortals,
      drawnOrnamentMarkers: entityFetch.drawnOrnamentMarkers,
      hiddenOrnamentMarkers: entityFetch.hiddenOrnamentMarkers,
      ornamentTypes: entityFetch.ornamentTypes,
      artifactPortals: entityFetch.artifactPortals,
      drawnArtifactMarkers: entityFetch.drawnArtifactMarkers,
      artifactTypes: entityFetch.artifactTypes,
      artifactFetch: {
        status: entityFetch.artifactFetchStatus,
        portalCount: entityFetch.artifactFetchPortalCount,
        types: entityFetch.artifactFetchTypes,
        elapsedMs: entityFetch.artifactFetchElapsedMs,
        elapsedSeconds: entityFetch.artifactFetchElapsedMs === null ? null : Number(formatElapsedSeconds(entityFetch.artifactFetchElapsedMs)),
        error: entityFetch.artifactFetchError || undefined,
      },
      levelLabels: entityFetch.levelLabels,
      damagedPortals: entityFetch.damagedPortals,
      links: entityFetch.links,
      fields: entityFetch.fields,
      viewport: {
        portals: entityFetch.viewportPortals,
        realPortals: entityFetch.viewportRealPortals,
        placeholderPortals: entityFetch.viewportPlaceholderPortals,
        links: entityFetch.viewportLinks,
        fields: entityFetch.viewportFields,
        ornamentPortals: entityFetch.viewportOrnamentPortals,
        ornamentMarkers: entityFetch.viewportOrnamentMarkers,
        artifactPortals: entityFetch.viewportArtifactPortals,
        artifactMarkers: entityFetch.viewportArtifactMarkers,
      },
      requestedTiles: entityFetch.requestedTiles,
      returnedTiles: entityFetch.returnedTiles,
      nonEmptyTiles: entityFetch.nonEmptyTiles,
      elapsedMs: entityFetch.elapsedMs,
      elapsedSeconds: entityFetch.elapsedMs === null ? null : Number(formatElapsedSeconds(entityFetch.elapsedMs)),
      firstRenderMs: entityFetch.firstRenderElapsedMs,
      firstRenderSeconds: entityFetch.firstRenderElapsedMs === null ? null : Number(formatElapsedSeconds(entityFetch.firstRenderElapsedMs)),
      retryRequests: entityFetch.retryRequests,
      retriedTileKeys: entityFetch.retriedTileKeys,
      recoveredTileKeys: entityFetch.recoveredTileKeys,
      emptyTileKeys: entityFetch.emptyTileKeys,
      nonEmptyTileKeys: entityFetch.nonEmptyTileKeys,
      unaccountedTileKeys: entityFetch.unaccountedTileKeys,
      serverRetryTileKeys: entityFetch.serverRetryTileKeys,
      timeoutTileKeys: entityFetch.timeoutTileKeys,
      errorTileKeys: entityFetch.errorTileKeys,
      responseRetryTileKeys: entityFetch.responseRetryTileKeys,
      queueDelayReasons: entityFetch.queueDelayReasons,
      partialTileKeys: entityFetch.partialTileKeys,
      cacheFreshTiles: entityFetch.cacheFreshTileKeys.length,
      cacheFreshTileKeys: entityFetch.cacheFreshTileKeys,
      cacheStaleTiles: entityFetch.cacheStaleTileKeys.length,
      cacheStaleTileKeys: entityFetch.cacheStaleTileKeys,
      queue: entityFetch.queue,
      authRequired: entityFetch.authRequired,
    },
    baseLayerId,
    dataSource,
    layers: layerSettings,
    renderPolicy: entityFetch.renderPolicy,
    selectedPortal: entityFetch.selectedPortal,
    portalDetails: entityFetch.portalDetails,
    sidePanels: {
      active: activeSidePanel,
      comm: commState,
      scores: scoresState,
      passcodes: passcodeState,
      inventory: inventoryState,
    },
    collision: entityFetch.collision,
  };
  const copyDockText = (): void => {
    void navigator.clipboard.writeText(JSON.stringify(dockDiagnostics, null, 2))
      .then(() => {
        setCopyStatus('json copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copyIntelUrl = (): void => {
    void navigator.clipboard.writeText(intelUrl)
      .then(() => {
        setCopyStatus('url copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copySelectedPortalLink = (): void => {
    if (!entityFetch.selectedPortal) return;
    const {lat, lng} = getPortalLatLng(entityFetch.selectedPortal);
    const portalUrl = `https://intel.ingress.com/intel?ll=${lat.toFixed(6)},${lng.toFixed(6)}&z=${Math.max(17, Math.round(camera.zoom))}&pll=${lat.toFixed(6)},${lng.toFixed(6)}`;
    void navigator.clipboard.writeText(portalUrl)
      .then(() => {
        setCopyStatus('portal link copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copySelectedPortalGuid = (): void => {
    if (!entityFetch.selectedPortal) return;
    void navigator.clipboard.writeText(entityFetch.selectedPortal.guid)
      .then(() => {
        setCopyStatus('portal guid copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const toggleDebugDock = (): void => {
    setDebugDockVisible((current) => {
      const next = !current;
      storeDebugDockVisible(next);
      return next;
    });
  };

  const toggleSidePanel = (panelId: SidePanelId): void => {
    setActiveSidePanel((current) => {
      const next = current === panelId ? null : panelId;
      storeSidePanelId(next);
      setActiveSheet(next ?? 'map');
      return next;
    });
  };

  const closeSidePanel = (): void => {
    setActiveSidePanel(null);
    setActiveSheet('map');
    storeSidePanelId(null);
  };

  const openSheet = (sheet: SheetId): void => {
    setActiveSheet(sheet);
    if (isSidePanelId(sheet)) {
      setActiveSidePanel(sheet);
      storeSidePanelId(sheet);
      return;
    }
    setActiveSidePanel(null);
    storeSidePanelId(null);
  };

  const refreshComm = (tab: IitcIrisCommTab = commState.tab, older = false): void => {
    storeCommTab(tab);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestComm,
      commTab: tab,
      commOlder: older,
    } satisfies IitcIrisMessage, '*');
  };

  const refreshScores = (): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestScores,
    } satisfies IitcIrisMessage, '*');
  };

  const refreshInventory = (): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestInventory,
    } satisfies IitcIrisMessage, '*');
  };

  const redeemPasscode = (): void => {
    const passcode = passcodeDraft.replace(/[^\x20-\x7E]+/g, '').trim();
    if (!passcode || passcodeState.status === 'loading') return;
    setPasscodeDraft(passcode);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.requestPasscode,
      passcodeText: passcode,
    } satisfies IitcIrisMessage, '*');
  };

  const sendComm = (): void => {
    const message = commDraft.trim();
    if (!message || commState.tab === 'alerts') return;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.sendComm,
      commTab: commState.tab,
      commMessage: message,
    } satisfies IitcIrisMessage, '*');
    setCommDraft('');
  };

  const addCommNickname = (nickname: string): void => {
    const normalized = nickname.replace(/^@/, '').trim();
    if (!normalized) return;
    setCommDraft((current) => `${current.trim()} @${normalized} `.trimStart());
  };

  const openIntelLogin = (): void => {
    window.location.assign('https://intel.ingress.com/intel');
  };

  const toggleLayerSetting = (key: keyof IitcIrisLayerSettings): void => {
    setLayerSettings((current) => ({...current, [key]: !current[key]}));
  };

  const setMapView = (lat: number, lng: number, zoom = camera.zoom): void => {
    const clamped = clampView({lat, lng, zoom});
    window.postMessage({
      type: IITC_IRIS_MESSAGES.setView,
      lat: clamped.lat,
      lng: clamped.lng,
      zoom: clamped.zoom ?? camera.zoom,
    } satisfies IitcIrisMessage, '*');
  };

  const focusCommPortal = (latE6?: number, lngE6?: number): void => {
    if (latE6 === undefined || lngE6 === undefined) return;
    setMapView(latE6 / 1_000_000, lngE6 / 1_000_000, Math.max(camera.zoom, 15));
  };

  const panMap = (direction: 'north' | 'south' | 'west' | 'east'): void => {
    if (!camera.bounds) return;
    const latStep = (camera.bounds.north - camera.bounds.south) * 0.25;
    const lngStep = (camera.bounds.east - camera.bounds.west) * 0.25;
    const lat = camera.lat + (direction === 'north' ? latStep : direction === 'south' ? -latStep : 0);
    const lng = camera.lng + (direction === 'east' ? lngStep : direction === 'west' ? -lngStep : 0);
    setMapView(lat, lng);
  };

  const zoomMap = (delta: number): void => {
    setMapView(camera.lat, camera.lng, camera.zoom + delta);
  };

  const clearPortalSelection = (): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.clearPortalSelection,
    } satisfies IitcIrisMessage, '*');
  };

  const focusSelectedPortal = (): void => {
    if (!entityFetch.selectedPortal) return;
    const {lat, lng} = getPortalLatLng(entityFetch.selectedPortal);
    setMapView(lat, lng, Math.max(17, camera.zoom));
  };

  const canPan = camera.bounds !== null;
  const activeSidePanelOption = SIDE_PANEL_OPTIONS.find((option) => option.id === activeSidePanel) ?? null;

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

  useEffect(() => {
    const onMessage = (event: MessageEvent<IitcIrisMessage>): void => {
      if (event.source !== window) return;
      if (typeof event.data?.type === 'string' && event.data.type.startsWith('IRIS_')) {
        setEntityFetch((current) => ({...current, collision: true}));
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.pageReady) {
        setStatus('leaflet ready');
        window.postMessage({
          type: IITC_IRIS_MESSAGES.layerSettings,
          layerSettings,
          baseLayerId,
        } satisfies IitcIrisMessage, '*');
        window.postMessage({
          type: IITC_IRIS_MESSAGES.dataSourceSettings,
          dataSource,
        } satisfies IitcIrisMessage, '*');
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.mapMoved) {
        setCamera((current) => ({
          lat: event.data.lat ?? current.lat,
          lng: event.data.lng ?? current.lng,
          zoom: event.data.zoom ?? current.zoom,
          bounds: event.data.bounds ?? current.bounds,
        }));
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.entityStatus) {
        setEntityFetch((current) => entityFetchStateFromMessage(event.data, current));
        if (event.data.comm) setCommState(event.data.comm);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.commStatus && event.data.comm) {
        setCommState(event.data.comm);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.scoresStatus && event.data.scores) {
        setScoresState(event.data.scores);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.passcodeStatus && event.data.passcode) {
        setPasscodeState(event.data.passcode);
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.inventoryStatus && event.data.inventory) {
        setInventoryState(event.data.inventory);
      }
    };

    window.addEventListener('message', onMessage);
    return (): void => window.removeEventListener('message', onMessage);
  }, [baseLayerId, dataSource, layerSettings]);

  useEffect(() => {
    storeLayerSettings(layerSettings);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.layerSettings,
      layerSettings,
      baseLayerId,
    } satisfies IitcIrisMessage, '*');
  }, [baseLayerId, layerSettings]);

  useEffect(() => {
    storeDataSourceId(dataSourceId);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.dataSourceSettings,
      dataSource,
    } satisfies IitcIrisMessage, '*');
  }, [dataSource, dataSourceId]);

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

  const setDataSource = (id: typeof DATA_SOURCE_OPTIONS[number]['id']): void => {
    setDataSourceId(id);
    const option = DATA_SOURCE_OPTIONS.find((candidate) => candidate.id === id);
    if (!option || option.mode === 'live') return;
    setMapView(option.lat, option.lng, option.zoom);
  };

  return (
    <div className={`iitc-iris-shell iitc-iris-sheet-${activeSheet} ${entityFetch.selectedPortal ? 'iitc-iris-has-selected-portal' : ''}`}>
      <div id="iitc-iris-map" className="iitc-iris-map" />
      <div className="iitc-iris-dock">
        <div className="iitc-iris-dock-row">
          <span className="iitc-iris-title">IITC IRIS</span>
          <button
            className={`iitc-iris-copy ${debugDockVisible ? 'iitc-iris-debug-active' : ''}`}
            type="button"
            onClick={toggleDebugDock}
            title="Show or hide debug diagnostics"
          >
            Debug
          </button>
          <button className="iitc-iris-copy" type="button" onClick={copyDockText} title="Copy JSON diagnostics">Copy JSON</button>
          <button className="iitc-iris-copy" type="button" onClick={copyIntelUrl} title="Copy current view as an Intel URL">Copy URL</button>
          {VIEW_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className="iitc-iris-preset"
              type="button"
              onClick={() => jumpToPreset(preset)}
              title={`${preset.label} ${preset.lat.toFixed(6)},${preset.lng.toFixed(6)}`}
            >
              {preset.label}
            </button>
          ))}
          <form
            className="iitc-iris-jump"
            onSubmit={(event) => {
              event.preventDefault();
              jumpToViewInput();
            }}
          >
            <input
              className="iitc-iris-jump-input"
              type="text"
              value={viewInput}
              onInput={(event) => setViewInput((event.currentTarget as HTMLInputElement).value)}
              placeholder="lat,lng,z or Intel URL"
              title="Paste lat,lng,z or an Intel URL with ll, pll, and optional z"
            />
            <button className="iitc-iris-preset" type="submit">Jump</button>
          </form>
          {viewInputStatus && <span className="iitc-iris-status">{viewInputStatus}</span>}
          {copyStatus && <span className="iitc-iris-status">{copyStatus}</span>}
        </div>
        <div id="iitc-iris-innerstatus" className="iitc-iris-innerstatus">
          <span className="help portallevel" title="Indicates portal levels/link lengths displayed. Zoom in to display more.">{innerStatus.portalText}</span>
          <span className="map">
            <b>map</b>:{' '}
            <span className="help" title={innerStatus.mapTitle}>{innerStatus.mapText}</span>
            {innerStatus.progressPercent !== null && ` ${innerStatus.progressPercent}%`}
          </span>
          {innerStatus.activeRequests > 0 && <span>{innerStatus.activeRequests} requests</span>}
          {innerStatus.failedRequests > 0 && <span className="failed-request">{innerStatus.failedRequests} failed</span>}
          {entityFetch.selectedPortal && (
            <>
              <span className="selected-portal" title={entityFetch.selectedPortal.guid}>
                selected {formatSelectedPortal(entityFetch.selectedPortal)}
              </span>
              <button className="iitc-iris-clear-selection" type="button" onClick={clearPortalSelection} title="Clear selected portal">x</button>
            </>
          )}
          {entityFetch.collision && <span className="failed-request">old IRIS active</span>}
          {entityFetch.authRequired && (
            <button className="iitc-iris-login iitc-iris-innerstatus-login" type="button" onClick={openIntelLogin} title="Open Intel login">
              Intel Login
            </button>
          )}
        </div>
        {debugDockVisible && <div className="iitc-iris-dock-row iitc-iris-debug-row">
          <span className="iitc-iris-status">{status}</span>
          <span className="iitc-iris-status">z {camera.zoom.toFixed(2)}</span>
          <span className="iitc-iris-status">data z {plan?.dataZoom ?? '-'}</span>
          <span className="iitc-iris-status">mode {summaryMode}</span>
          <span className="iitc-iris-status">detail {detailOverlaysActive ? 'on' : 'off'}</span>
          <span className="iitc-iris-status">tiles {plan?.tiles.length ?? '-'}</span>
          <span className="iitc-iris-status">x {plan ? `${plan.xRange[0]}-${plan.xRange[1]}` : '-'}</span>
          <span className="iitc-iris-status">y {plan ? `${plan.yRange[0]}-${plan.yRange[1]}` : '-'}</span>
          <span className="iitc-iris-status">batch {requestBatches[0] ?? 0}</span>
          {entityFetch.collision && <span className="iitc-iris-status iitc-iris-warning">old IRIS active</span>}
          {entityFetch.authRequired && (
            <button className="iitc-iris-login" type="button" onClick={openIntelLogin} title="Open Intel login">
              Intel Login
            </button>
          )}
        </div>}
        {debugDockVisible && <div className="iitc-iris-dock-row iitc-iris-debug-row">
          <span className="iitc-iris-status">{entityFetch.status}</span>
          <span className="iitc-iris-status">src {entityFetch.entitySource}</span>
          <span className="iitc-iris-status">p {entityFetch.portals}</span>
          <span className="iitc-iris-status">real {entityFetch.realPortals}</span>
          <span className="iitc-iris-status">ph {entityFetch.placeholderPortals}</span>
          <span className="iitc-iris-status">orn {entityFetch.ornamentPortals}</span>
          <span className="iitc-iris-status">ornDraw {entityFetch.drawnOrnamentMarkers}</span>
          <span className="iitc-iris-status">ornHide {entityFetch.hiddenOrnamentMarkers}</span>
          <span className="iitc-iris-status">art {entityFetch.artifactPortals}</span>
          <span className="iitc-iris-status">artDraw {entityFetch.drawnArtifactMarkers}</span>
          <span className="iitc-iris-status">artFetch {entityFetch.artifactFetchStatus}:{entityFetch.artifactFetchPortalCount}</span>
          <span className="iitc-iris-status">lvl {entityFetch.levelLabels}</span>
          <span className="iitc-iris-status">dmg {entityFetch.damagedPortals}</span>
          <span className="iitc-iris-status">l {entityFetch.links}</span>
          <span className="iitc-iris-status">f {entityFetch.fields}</span>
          <span className="iitc-iris-status iitc-iris-compare">compare vp P/L/F {entityFetch.viewportPortals}/{entityFetch.viewportLinks}/{entityFetch.viewportFields}</span>
          <span className="iitc-iris-status">rt {entityFetch.returnedTiles}/{entityFetch.requestedTiles}</span>
          <span className="iitc-iris-status">nt {entityFetch.nonEmptyTiles}</span>
          {entityFetch.elapsedMs !== null && <span className="iitc-iris-status">in {formatElapsedSeconds(entityFetch.elapsedMs)}s</span>}
          {entityFetch.retryRequests > 0 && <span className="iitc-iris-status">retry {entityFetch.retryRequests}</span>}
          {entityFetch.selectedPortal && (
            <>
              <span className="iitc-iris-status iitc-iris-compare">sel {formatSelectedPortal(entityFetch.selectedPortal)}</span>
              <button className="iitc-iris-preset" type="button" onClick={clearPortalSelection} title="Clear selected portal">Clear Sel</button>
            </>
          )}
        </div>}
        <div className="iitc-iris-dock-row">
          <span className="iitc-iris-status">Data</span>
          {DATA_SOURCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`iitc-iris-layer-toggle iitc-iris-source-toggle ${dataSourceId === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
              type="button"
              onClick={() => setDataSource(option.id)}
              title={option.title}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <aside className="iitc-iris-map-controls" aria-label="Map controls">
        <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">View</span>
          <div className="iitc-iris-map-control-row">
            <div className="iitc-iris-pan-grid" aria-label="Pan controls">
              <button className="iitc-iris-nav-button iitc-iris-pan-north" type="button" disabled={!canPan} onClick={() => panMap('north')} title="Pan north">N</button>
              <button className="iitc-iris-nav-button iitc-iris-pan-west" type="button" disabled={!canPan} onClick={() => panMap('west')} title="Pan west">W</button>
              <button className="iitc-iris-nav-button iitc-iris-pan-east" type="button" disabled={!canPan} onClick={() => panMap('east')} title="Pan east">E</button>
              <button className="iitc-iris-nav-button iitc-iris-pan-south" type="button" disabled={!canPan} onClick={() => panMap('south')} title="Pan south">S</button>
            </div>
            <button className="iitc-iris-nav-button" type="button" onClick={() => zoomMap(1)} title="Zoom in">+</button>
            <button className="iitc-iris-nav-button" type="button" onClick={() => zoomMap(-1)} title="Zoom out">-</button>
          </div>
        </div>
        <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Base</span>
          <div className="iitc-iris-map-control-row">
            {BASE_LAYER_OPTIONS.map((option) => (
              <button
                key={option.id}
                className={`iitc-iris-layer-toggle iitc-iris-base-toggle ${baseLayerId === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
                type="button"
                onClick={() => setBaseLayerId(option.id)}
                title={option.title}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Core</span>
          <div className="iitc-iris-map-control-row">
            {CORE_LAYER_TOGGLE_LABELS.map(([key, label]) => (
              <button
                key={key}
                className={`iitc-iris-layer-toggle ${layerSettings[key] ? 'iitc-iris-layer-toggle-active' : ''}`}
                type="button"
                onClick={() => toggleLayerSetting(key)}
                title={`Toggle ${key}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Detail</span>
          <div className="iitc-iris-map-control-row">
            {DETAIL_LAYER_TOGGLE_LABELS.map(([key, label]) => (
              <button
                key={key}
                className={`iitc-iris-layer-toggle ${layerSettings[key] ? 'iitc-iris-layer-toggle-active' : ''}`}
                type="button"
                onClick={() => toggleLayerSetting(key)}
                title={`Toggle ${key}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Side</span>
          <div className="iitc-iris-map-control-row">
            {SIDE_PANEL_OPTIONS.map((option) => (
              <button
                key={option.id}
                className={`iitc-iris-layer-toggle ${activeSidePanel === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
                type="button"
                onClick={() => toggleSidePanel(option.id)}
                title={option.title}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="iitc-iris-map-controls-section">
          <span className="iitc-iris-status">Tools</span>
          <div className="iitc-iris-map-control-row">
            <button
              className={`iitc-iris-layer-toggle ${activeSheet === 'portal' ? 'iitc-iris-layer-toggle-active' : ''}`}
              type="button"
              onClick={() => openSheet('portal')}
              disabled={!entityFetch.selectedPortal}
              title="Open selected portal sheet"
            >
              Portal
            </button>
          </div>
        </div>
      </aside>
      <nav className="iitc-iris-sheet-tabbar" aria-label="Panels">
        <button
          className={`iitc-iris-sheet-tab ${activeSheet === 'map' ? 'is-active' : ''}`}
          type="button"
          onClick={() => openSheet('map')}
        >
          Map
        </button>
        <button
          className={`iitc-iris-sheet-tab ${activeSheet === 'layers' ? 'is-active' : ''}`}
          type="button"
          onClick={() => openSheet('layers')}
        >
          Layers
        </button>
        <button
          className={`iitc-iris-sheet-tab ${activeSheet === 'portal' ? 'is-active' : ''}`}
          type="button"
          onClick={() => openSheet('portal')}
          disabled={!entityFetch.selectedPortal}
        >
          Portal
        </button>
        <button
          className={`iitc-iris-sheet-tab ${activeSheet === 'comm' ? 'is-active' : ''}`}
          type="button"
          onClick={() => openSheet('comm')}
        >
          COMM
        </button>
        <button
          className={`iitc-iris-sheet-tab ${activeSheet === 'scores' ? 'is-active' : ''}`}
          type="button"
          onClick={() => openSheet('scores')}
        >
          Scores
        </button>
        <button
          className={`iitc-iris-sheet-tab ${activeSheet === 'inventory' ? 'is-active' : ''}`}
          type="button"
          onClick={() => openSheet('inventory')}
        >
          Inv
        </button>
      </nav>
      {entityFetch.selectedPortal && (
        <aside className={`iitc-iris-portal-side-panel ${formatTeamClass(entityFetch.selectedPortal.team)} ${activeSidePanel ? 'iitc-iris-portal-side-panel-stacked' : ''}`} aria-label="Selected portal details">
          <div className="iitc-iris-portal-side-header">
            {entityFetch.selectedPortal.image && (
              <img
                className="iitc-iris-selected-image"
                src={entityFetch.selectedPortal.image}
                alt=""
              />
            )}
            <div className="iitc-iris-portal-side-title">
              <span className="iitc-iris-selected-title" title={entityFetch.selectedPortal.guid}>
                {entityFetch.selectedPortal.title || entityFetch.selectedPortal.guid}
              </span>
              <span className="iitc-iris-status">
                {formatTeamLabel(entityFetch.selectedPortal.team)}
                {entityFetch.selectedPortal.isPlaceholder || entityFetch.selectedPortal.level === undefined ? ' placeholder' : ` L${entityFetch.selectedPortal.level}`}
                {' '}hp {formatPortalHealth(entityFetch.selectedPortal)}
                {entityFetch.selectedPortal.resCount !== undefined && ` res ${entityFetch.selectedPortal.resCount}`}
              </span>
            </div>
            <button className="iitc-iris-clear-selection" type="button" onClick={clearPortalSelection} title="Clear selected portal">x</button>
          </div>
          <div className="iitc-iris-portal-actions" aria-label="Selected portal actions">
            <button className="iitc-iris-portal-action" type="button" onClick={focusSelectedPortal} title="Center and zoom to this portal">Zoom</button>
            <button className="iitc-iris-portal-action" type="button" onClick={copySelectedPortalLink} title="Copy Intel portal link">Link</button>
            <button className="iitc-iris-portal-action" type="button" onClick={copySelectedPortalGuid} title="Copy portal GUID">GUID</button>
          </div>
          <div className="iitc-iris-portal-summary">
            <span className="iitc-iris-portal-summary-cell">
              <span className="iitc-iris-status">level</span>
              <b>{entityFetch.selectedPortal.isPlaceholder || entityFetch.selectedPortal.level === undefined ? '-' : `L${entityFetch.selectedPortal.level}`}</b>
            </span>
            <span className="iitc-iris-portal-summary-cell">
              <span className="iitc-iris-status">health</span>
              <b>{formatPortalHealth(entityFetch.selectedPortal)}</b>
            </span>
            <span className="iitc-iris-portal-summary-cell">
              <span className="iitc-iris-status">res</span>
              <b>{entityFetch.selectedPortal.resCount ?? '-'}</b>
            </span>
            <span className="iitc-iris-portal-summary-cell">
              <span className="iitc-iris-status">links</span>
              <b>{entityFetch.selectedPortal.links.count}</b>
            </span>
          </div>
          <div className="iitc-iris-health-track" title={`Portal health ${formatPortalHealth(entityFetch.selectedPortal)}`}>
            <span className="iitc-iris-health-fill" style={`width: ${formatPortalHealthPercent(entityFetch.selectedPortal)}%;`} />
          </div>
          <div className="iitc-iris-portal-panel">
            <div className="iitc-iris-portal-panel-header">
              <span className="iitc-iris-status">details</span>
              {entityFetch.portalDetails && entityFetch.portalDetails.guid === entityFetch.selectedPortal.guid ? (
                <span className={`iitc-iris-status ${entityFetch.portalDetails.status === 'error' || entityFetch.portalDetails.status === 'auth' ? 'iitc-iris-warning' : ''}`}>
                  {entityFetch.portalDetails.status}{formatPortalDetailsElapsed(entityFetch.portalDetails)}
                </span>
              ) : (
                <span className="iitc-iris-status">waiting</span>
              )}
              {entityFetch.portalDetails?.error && <span className="iitc-iris-status iitc-iris-warning">{entityFetch.portalDetails.error}</span>}
            </div>
            {entityFetch.portalDetails?.status === 'ready' && entityFetch.portalDetails.guid === entityFetch.selectedPortal.guid && (
              <>
                <div className="iitc-iris-portal-section">
                  <span className="iitc-iris-status">Mods</span>
                  <div className="iitc-iris-mod-grid">
                    {Array.from({ length: 4 }, (_, index) => {
                      const mod = entityFetch.portalDetails?.mods?.[index];
                      const modStats = mod ? formatModStats(mod.stats) : '';
                      return (
                        <div className={`iitc-iris-mod-slot ${mod ? '' : 'iitc-iris-empty-slot'}`} key={`mod-${index}`}>
                          {mod ? (
                            <>
                              <span className="iitc-iris-portal-mod-name">{mod.rarity} {formatModName(mod.name)}</span>
                              <span className="iitc-iris-status">{mod.owner}</span>
                              {modStats && <span className="iitc-iris-status">{modStats}</span>}
                            </>
                          ) : (
                            <span className="iitc-iris-status">empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="iitc-iris-portal-panel-grid iitc-iris-portal-facts">
                  <span className="iitc-iris-status">owner</span>
                  <span>{entityFetch.portalDetails.owner || '-'}</span>
                  <span className="iitc-iris-status">mitigation</span>
                  <span>
                    {entityFetch.portalDetails.mitigation
                      ? `${Math.round(entityFetch.portalDetails.mitigation.total)} total, ${Math.round(entityFetch.portalDetails.mitigation.shields)} shields, ${Math.round(entityFetch.portalDetails.mitigation.links)} links`
                      : '-'}
                  </span>
                  <span className="iitc-iris-status">history</span>
                  <span>
                    {entityFetch.portalDetails.history
                      ? [
                        entityFetch.portalDetails.history.captured ? 'captured' : 'not captured',
                        entityFetch.portalDetails.history.visited ? 'visited' : 'not visited',
                        entityFetch.portalDetails.history.scoutControlled ? 'scout controlled' : 'not scout controlled',
                      ].join(' / ')
                      : '-'}
                  </span>
                  <span className="iitc-iris-status">topology</span>
                  <span>
                    {entityFetch.selectedPortal.links.count} links ({entityFetch.selectedPortal.links.outgoing} out/{entityFetch.selectedPortal.links.incoming} in), {entityFetch.selectedPortal.fields.count} fields
                  </span>
                  <span className="iitc-iris-status">markers</span>
                  <span>
                    {entityFetch.selectedPortal.ornaments.length} ornaments, {entityFetch.selectedPortal.artifacts.length} artifacts
                    {(entityFetch.selectedPortal.mission || entityFetch.selectedPortal.mission50plus) && ', mission'}
                  </span>
                </div>
                <div className="iitc-iris-portal-section">
                  <span className="iitc-iris-status">Resonators</span>
                  <div className="iitc-iris-resonator-grid">
                    {RESONATOR_PANEL_ORDER.map((resonatorIndex, panelIndex) => {
                      if (resonatorIndex === null) {
                        return (
                          <span className="iitc-iris-resonator-center" key="portal-center" title={entityFetch.selectedPortal?.title || entityFetch.selectedPortal?.guid || 'selected portal'}>
                            portal
                          </span>
                        );
                      }
                      const resonator = entityFetch.portalDetails?.resonators?.[resonatorIndex];
                      return (
                        <span
                          className={`iitc-iris-resonator-slot ${resonator ? '' : 'iitc-iris-empty-slot'}`}
                          key={`resonator-${panelIndex}`}
                          title={resonator ? `${resonator.owner} ${resonator.energy} XM` : 'empty resonator slot'}
                        >
                          {resonator ? (
                            <>
                              <span className="iitc-iris-resonator-level">L{resonator.level}</span>
                              <span className="iitc-iris-resonator-energy">{formatResonatorEnergy(resonator.energy)}</span>
                              <span className="iitc-iris-resonator-owner">{resonator.owner}</span>
                              <span className="iitc-iris-resonator-fill" style={`width: ${formatResonatorEnergyPercent(resonator.level, resonator.energy)}%;`} />
                            </>
                          ) : (
                            <span className="iitc-iris-status">empty</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>
      )}
      {activeSidePanelOption && (
        <aside className="iitc-iris-request-side-panel" aria-label={`${activeSidePanelOption.title} panel`}>
          <div className="iitc-iris-request-panel-header">
            <span className="iitc-iris-selected-title">{activeSidePanelOption.label}</span>
            <span className="iitc-iris-status">
              {activeSidePanel === 'comm'
                ? commState.status
                : activeSidePanel === 'scores'
                  ? scoresState.status
                  : activeSidePanel === 'inventory'
                    ? inventoryState.status
                    : 'idle'}
            </span>
            <button className="iitc-iris-clear-selection" type="button" onClick={closeSidePanel} title={`Close ${activeSidePanelOption.title}`}>x</button>
          </div>
          {activeSidePanel === 'comm' && (
            <div className="iitc-iris-request-panel-body">
              <div className="iitc-iris-segmented-row" role="tablist" aria-label="COMM channel">
                {COMM_TABS.map((tab) => (
                  <button
                    className={`iitc-iris-segmented-button ${commState.tab === tab.id ? 'is-active' : ''}`}
                    type="button"
                    role="tab"
                    aria-selected={commState.tab === tab.id}
                    onClick={() => refreshComm(tab.id)}
                    disabled={commState.status === 'loading' && commState.tab === tab.id}
                    key={tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="iitc-iris-map-control-row">
                <button className="iitc-iris-portal-action" type="button" onClick={() => refreshComm()} disabled={commState.status === 'loading'} title="Fetch COMM messages for the current map bounds">
                  {commState.status === 'loading' ? 'Loading' : 'Refresh'}
                </button>
                <button className="iitc-iris-portal-action" type="button" onClick={() => refreshComm(commState.tab, true)} disabled={commState.status === 'loading' || commState.oldestTimestamp === undefined || commState.oldestTimestamp < 0} title="Fetch older COMM messages before the current oldest timestamp">
                  Older
                </button>
                <span className={`iitc-iris-status ${commState.status === 'error' || commState.status === 'auth' ? 'iitc-iris-warning' : ''}`}>
                  {commState.status}{commState.elapsedMs !== undefined ? ` ${formatElapsedSeconds(commState.elapsedMs)}s` : ''}
                </span>
              </div>
              <form
                className="iitc-iris-comm-send-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendComm();
                }}
              >
                <input
                  className="iitc-iris-passcode-input"
                  value={commDraft}
                  placeholder={commState.tab === 'faction' ? 'tell faction:' : commState.tab === 'all' ? 'broadcast:' : "can't send to alerts"}
                  disabled={commState.tab === 'alerts' || commState.sendStatus === 'sending'}
                  onInput={(event) => setCommDraft(event.currentTarget.value)}
                />
                <button className="iitc-iris-portal-action" type="submit" disabled={!commDraft.trim() || commState.tab === 'alerts' || commState.sendStatus === 'sending'}>
                  {commState.sendStatus === 'sending' ? 'Sending' : 'Send'}
                </button>
              </form>
              {(commState.sendStatus === 'sent' || commState.sendError) && (
                <span className={`iitc-iris-status ${commState.sendError ? 'iitc-iris-warning' : ''}`}>
                  send {commState.sendError || commState.sendStatus}
                </span>
              )}
              <div className="iitc-iris-panel-summary">
                <span><b>{formatInteger(commState.messages)}</b><small>messages</small></span>
                <span><b>{formatInteger(commState.addedMessages)}</b><small>added</small></span>
                <span><b>{commState.oldestTimestamp !== undefined && commState.newestTimestamp !== undefined ? `${formatCommTime(commState.oldestTimestamp)} - ${formatCommTime(commState.newestTimestamp)}` : '-'}</b><small>range</small></span>
              </div>
              {(commState.status === 'empty' || (!commState.recent?.length && commState.status !== 'loading' && commState.status !== 'idle')) && (
                <div className="iitc-iris-empty-state">No COMM messages for this channel and map bounds.</div>
              )}
              {commState.recent && commState.recent.length > 0 && (
                <div className="iitc-iris-comm-list">
                  {commState.recent.map((message) => (
                    <div className="iitc-iris-comm-row" key={message.id}>
                      <span className={`iitc-iris-comm-meta ${getCommTeamClass(message.team)}`}>
                        <b>{formatCommTime(message.time)}</b>
                        <small>{message.team || '-'}</small>
                        {message.alert && <small>alert</small>}
                        {message.narrowcast && <small>direct</small>}
                      </span>
                      <span className={`iitc-iris-comm-text ${message.narrowcast ? 'is-narrowcast' : ''}`}>
                        {message.parts.length > 0 ? message.parts.map((part, index) => {
                          const key = `${message.id}-${index}`;
                          if (part.type === 'portal') {
                            return (
                              <button
                                className="iitc-iris-comm-portal"
                                type="button"
                                title={part.portal?.address || part.text}
                                onClick={() => focusCommPortal(part.portal?.latE6, part.portal?.lngE6)}
                                key={key}
                              >
                                {part.text}
                              </button>
                            );
                          }
                          if (part.type === 'player') {
                            return (
                              <button
                                className={`iitc-iris-comm-player ${getCommTeamClass(part.team)} ${part.at ? 'is-at' : ''}`}
                                type="button"
                                onClick={() => addCommNickname(part.text)}
                                title={`Message ${part.text}`}
                                key={key}
                              >
                                {part.at ? '@' : ''}{part.text}
                              </button>
                            );
                          }
                          if (part.type === 'faction') {
                            return <span className={`iitc-iris-comm-faction ${getCommTeamClass(part.team)}`} key={key}>{part.text}</span>;
                          }
                          return <span className={getCommTeamClass(part.team)} key={key}>{part.text}</span>;
                        }) : (message.text || message.type)}
                      </span>
                      {(message.players.length > 0 || message.portals.length > 0) && (
                        <span className="iitc-iris-comm-context">
                          {[...message.players, ...message.portals.map((portal) => portal.name || portal.address || 'portal')].slice(0, 3).join(' / ')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="iitc-iris-panel-footer">
                <span
                  className="iitc-iris-diagnostics-chip"
                  title={[
                    `request: /r/getPlexts ${commState.tab}`,
                    `bounds: ${formatCommBounds(commState.bounds)}`,
                    `response: ${commState.responseMessages ?? '-'}`,
                    `older: ${commState.requestOlder ? (commState.oldMessagesWereAdded ? 'added' : 'none') : '-'}`,
                  ].join('\n')}
                >
                  request
                </span>
                {commState.error && <span className="iitc-iris-warning">{commState.error}</span>}
              </div>
            </div>
          )}
          {activeSidePanel === 'scores' && (
            <div className="iitc-iris-request-panel-body">
              <div className="iitc-iris-map-control-row">
                <button className="iitc-iris-portal-action" type="button" onClick={refreshScores} disabled={scoresState.status === 'loading'} title="Fetch global and regional scores for the current map center">
                  {scoresState.status === 'loading' ? 'Loading' : 'Refresh'}
                </button>
                <span className={`iitc-iris-status ${scoresState.status === 'error' || scoresState.status === 'auth' ? 'iitc-iris-warning' : ''}`}>
                  {scoresState.status}{scoresState.elapsedMs !== undefined ? ` ${formatElapsedSeconds(scoresState.elapsedMs)}s` : ''}
                </span>
              </div>
              <div className="iitc-iris-score-block">
                <div className="iitc-iris-score-heading">
                  <span>Global</span>
                  <span className="iitc-iris-status">{formatScoreLead(scoresState.game?.enlightened, scoresState.game?.resistance)}</span>
                </div>
                <div className="iitc-iris-score-bar" style={`--enl-percent: ${scoresState.game?.enlightenedPercent ?? 50}%;`}>
                  <span className="iitc-iris-score-bar-enl" />
                  <span className="iitc-iris-score-bar-res" />
                </div>
                <div className="iitc-iris-score-pair">
                  <span className="is-enlightened">ENL <b>{formatInteger(scoresState.game?.enlightened)}</b> MU <small>{formatPercent(scoresState.game?.enlightenedPercent)}</small></span>
                  <span className="is-resistance">RES <b>{formatInteger(scoresState.game?.resistance)}</b> MU <small>{formatPercent(scoresState.game?.resistancePercent)}</small></span>
                </div>
              </div>
              <div className="iitc-iris-score-block">
                <div className="iitc-iris-score-heading">
                  <span>{scoresState.region?.name || 'Region'}</span>
                  <span className="iitc-iris-status">
                    CP {scoresState.region?.lastCheckpoint !== undefined ? `${scoresState.region.lastCheckpoint} / ${scoresState.region.checkpoints ?? '-'}` : '-'}
                  </span>
                </div>
                <div className="iitc-iris-score-bar" style={`--enl-percent: ${
                  scoresState.region?.enlightenedAvg !== undefined && scoresState.region.resistanceAvg !== undefined
                    ? Math.round((scoresState.region.enlightenedAvg / Math.max(1, scoresState.region.enlightenedAvg + scoresState.region.resistanceAvg)) * 100)
                    : 50
                }%;`}>
                  <span className="iitc-iris-score-bar-enl" />
                  <span className="iitc-iris-score-bar-res" />
                </div>
                <div className="iitc-iris-score-pair">
                  <span className="is-enlightened">ENL <b>{formatInteger(scoresState.region?.enlightenedAvg)}</b> MU</span>
                  <span className="is-resistance">RES <b>{formatInteger(scoresState.region?.resistanceAvg)}</b> MU</span>
                </div>
              </div>
              <div className="iitc-iris-panel-summary">
                <span><b>{formatScoreLead(scoresState.region?.enlightenedAvg, scoresState.region?.resistanceAvg)}</b><small>region lead</small></span>
                <span><b>{formatInteger(scoresState.region?.topAgents)}</b><small>top agents</small></span>
                <span><b>{scoresState.region?.center ? `${scoresState.region.center.latE6},${scoresState.region.center.lngE6}` : '-'}</b><small>center</small></span>
              </div>
              {scoresState.region?.topAgentList && scoresState.region.topAgentList.length > 0 && (
                <div className="iitc-iris-agent-list">
                  {scoresState.region.topAgentList.slice(0, 5).map((agent, index) => (
                    <span className="iitc-iris-agent-row" key={`${agent.nick}-${index}`}>
                      <small>{index + 1}</small>
                      <b className={getCommTeamClass(agent.team)}>{agent.nick}</b>
                    </span>
                  ))}
                </div>
              )}
              <div className="iitc-iris-panel-footer">
                <span
                  className="iitc-iris-diagnostics-chip"
                  title={[
                    'request: /r/getGameScore + /r/getRegionScoreDetails',
                    `center: ${scoresState.region?.center ? `${scoresState.region.center.latE6},${scoresState.region.center.lngE6}` : '-'}`,
                  ].join('\n')}
                >
                  request
                </span>
                {(scoresState.error || scoresState.region?.error) && <span className="iitc-iris-warning">{scoresState.error || scoresState.region?.error}</span>}
              </div>
            </div>
          )}
          {activeSidePanel === 'inventory' && (
            <div className="iitc-iris-request-panel-body">
              <div className="iitc-iris-map-control-row">
                <button className="iitc-iris-portal-action" type="button" onClick={refreshInventory} disabled={inventoryState.status === 'loading'} title="Fetch Intel inventory with lastQueryTimestamp 0">
                  {inventoryState.status === 'loading' ? 'Loading' : 'Refresh'}
                </button>
                <span className={`iitc-iris-status ${inventoryState.status === 'error' || inventoryState.status === 'auth' ? 'iitc-iris-warning' : ''}`}>
                  {inventoryState.status}{inventoryState.elapsedMs !== undefined ? ` ${formatElapsedSeconds(inventoryState.elapsedMs)}s` : ''}
                </span>
              </div>
              <div className="iitc-iris-panel-summary">
                <span><b>{formatInteger(inventoryState.items)} / 2500</b><small>items</small></span>
                <span><b>{formatInteger(inventoryState.keys)}</b><small>{formatInteger(inventoryState.portalsWithKeys)} portals</small></span>
                <span><b>{formatInteger(inventoryState.capsules)}</b><small>capsules</small></span>
              </div>
              <div className="iitc-iris-panel-summary">
                <span>
                  <b>{inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.total : '-'}</b>
                  <small>selected keys</small>
                </span>
                <span>
                  <b>{inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.loose : '-'}</b>
                  <small>loose</small>
                </span>
                <span>
                  <b>{inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.capsule : '-'}</b>
                  <small>capsule</small>
                </span>
              </div>
              {inventoryState.selectedPortalTitle && (
                <div className="iitc-iris-inventory-selected" title={inventoryState.selectedPortalGuid}>
                  <span className="iitc-iris-status">selected</span>
                  <b>{inventoryState.selectedPortalTitle}</b>
                </div>
              )}
              {inventoryState.portalKeysForSelectedPortal && Object.keys(inventoryState.portalKeysForSelectedPortal.capsules).length > 0 && (
                <div className="iitc-iris-inventory-section">
                  <span className="iitc-iris-status">Selected key capsules</span>
                  <div className="iitc-iris-inventory-list">
                    {Object.entries(inventoryState.portalKeysForSelectedPortal.capsules).map(([capsule, count]) => (
                      <div className="iitc-iris-inventory-row" key={capsule}>
                        <span>{capsule}</span>
                        <b>{count}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="iitc-iris-inventory-section">
                <span className="iitc-iris-status">Passcode</span>
                <form
                  className="iitc-iris-passcode-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    redeemPasscode();
                  }}
                >
                  <input
                    className="iitc-iris-passcode-input"
                    type="text"
                    value={passcodeDraft}
                    placeholder="passcode"
                    disabled={passcodeState.status === 'loading'}
                    onInput={(event) => setPasscodeDraft(event.currentTarget.value)}
                  />
                  <button className="iitc-iris-portal-action" type="submit" disabled={!passcodeDraft.trim() || passcodeState.status === 'loading'}>
                    {passcodeState.status === 'loading' ? 'Redeeming' : 'Redeem'}
                  </button>
                </form>
                <div className="iitc-iris-panel-summary">
                  <span><b>{formatInteger(passcodeState.ap)}</b><small>AP</small></span>
                  <span><b>{formatInteger(passcodeState.xm)}</b><small>XM</small></span>
                  <span><b>{formatInteger(passcodeState.items?.reduce((sum, item) => sum + (item.count ?? 1), 0))}</b><small>items</small></span>
                </div>
                {passcodeState.other && passcodeState.other.length > 0 && (
                  <div className="iitc-iris-inventory-list">
                    {passcodeState.other.map((reward) => (
                      <div className="iitc-iris-inventory-row" key={reward}>
                        <span>{reward}</span>
                        <b>1</b>
                      </div>
                    ))}
                  </div>
                )}
                {passcodeState.items && passcodeState.items.length > 0 && (
                  <div className="iitc-iris-inventory-list">
                    {passcodeState.items.map((item, index) => (
                      <div className="iitc-iris-inventory-row" key={`${item.label}-${item.level ?? ''}-${index}`}>
                        <span>{item.label}{item.level ? ` L${item.level}` : ''}</span>
                        <b>{item.count ?? 1}</b>
                      </div>
                    ))}
                  </div>
                )}
                {(passcodeState.status === 'empty' || passcodeState.error) && (
                  <div className={passcodeState.error ? 'iitc-iris-warning' : 'iitc-iris-empty-state'}>
                    {passcodeState.error || 'Passcode returned no rewards.'}
                  </div>
                )}
              </div>
              {inventoryState.topItems && inventoryState.topItems.length > 0 && (
                <div className="iitc-iris-inventory-section">
                  <span className="iitc-iris-status">Top items</span>
                  <div className="iitc-iris-inventory-list">
                    {inventoryState.topItems.map((item) => (
                      <div className="iitc-iris-inventory-row" key={`${item.type}-${item.level ?? ''}-${item.rarity ?? ''}-${item.label}`}>
                        <span>{item.label}{item.level ? ` L${item.level}` : ''}</span>
                        <b>{item.count}</b>
                        {item.rarity && <small>{item.rarity.replace(/_/g, ' ')}</small>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {inventoryState.topKeys && inventoryState.topKeys.length > 0 && (
                <div className="iitc-iris-inventory-section">
                  <span className="iitc-iris-status">Top keys</span>
                  <div className="iitc-iris-inventory-list">
                    {inventoryState.topKeys.map((key) => (
                      <div className="iitc-iris-inventory-row" key={key.portalGuid} title={key.portalGuid}>
                        <span>{key.portalTitle || key.portalGuid}</span>
                        <b>{key.count}</b>
                        {key.capsule > 0 && <small>{key.capsule} capsule</small>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="iitc-iris-panel-footer">
                <span
                  className="iitc-iris-diagnostics-chip"
                  title={[
                    'request: /r/getInventory lastQueryTimestamp=0',
                    `raw: ${formatInteger(inventoryState.rawItems)}`,
                    `selected portal: ${inventoryState.selectedPortalGuid ?? '-'}`,
                  ].join('\n')}
                >
                  request
                </span>
                <span
                  className="iitc-iris-diagnostics-chip"
                  title={[
                    'request: /r/redeemReward',
                    `passcode: ${passcodeState.passcode ?? '-'}`,
                  ].join('\n')}
                >
                  passcode
                </span>
                {inventoryState.error && <span className="iitc-iris-warning">{inventoryState.error}</span>}
              </div>
            </div>
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

function mount(): void {
  if (!document.body) {
    window.setTimeout(mount, 50);
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
