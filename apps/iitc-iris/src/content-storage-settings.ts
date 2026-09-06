import { DEFAULT_LAYER_SETTINGS } from './layer-registry';
import { normalizePortalHighlighterId } from './highlighter-registry';
import {
  isSheetId,
  isSidePanelId,
  type IitcIrisSheetId as SheetId,
  type IitcIrisSidePanelId as SidePanelId,
} from './menu-registry';
import {
  DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS,
  PORTAL_DETAIL_SECTION_REGISTRY,
  type IitcIrisPortalDetailSectionId as PortalSectionId,
} from './portal-detail-section-registry';
import type {
  IitcIrisBaseLayerId,
  IitcIrisCommTab,
  IitcIrisDataSourceSettings,
  IitcIrisHighlighterSettings,
  IitcIrisLayerSettings,
  IitcIrisLifecycleSettings,
  IitcIrisPortalHighlighterId,
} from './messages';
import {
  clampView,
  isStoredMapView,
  type StoredMapView,
} from './content-scenarios';
import type { DataSourceOption, ViewPresetOption } from './system-controls-panel';

export const LOGIN_BYPASS_STORAGE_KEY = 'iitc-iris:login-bypass-until';
export const COMM_TAB_STORAGE_KEY = 'iitc-chat-tab';
export const BASE_LAYER_STORAGE_KEY = 'iitc-iris:base-layer';
export const LAYER_SETTINGS_STORAGE_KEY = 'iitc-iris:layer-settings';
export const HIGHLIGHTER_SETTINGS_STORAGE_KEY = 'iitc-iris:highlighter-settings';
export const DATA_SOURCE_STORAGE_KEY = 'iitc-iris:data-source';
export const LIFECYCLE_SETTINGS_STORAGE_KEY = 'iitc-iris:lifecycle-settings';
export const DEBUG_DOCK_STORAGE_KEY = 'iitc-iris:debug-dock';
export const SIDE_PANEL_STORAGE_KEY = 'iitc-iris:side-panel';
export const ACTIVE_SHEET_STORAGE_KEY = 'iitc-iris:active-sheet';
export const MAP_VIEW_STORAGE_KEY = 'iitc-iris:map-view';
export const PORTAL_SECTION_STORAGE_KEY = 'iitc-iris:portal-sections';
export const SHORTCUTS_ENABLED_STORAGE_KEY = 'iitc-iris:shortcuts-enabled';
export const MAP_FOCUS_MODE_STORAGE_KEY = 'iitc-iris:map-focus-mode';

function getLocalStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export const VIEW_PRESETS: readonly ViewPresetOption[] = [
  { id: 'amsterdam-z10', label: 'AMS 10', lat: 52.3730796, lng: 4.8924534, zoom: 10 },
  { id: 'amsterdam-z15', label: 'AMS 15', lat: 52.3730796, lng: 4.8924534, zoom: 15 },
  { id: 'damrak-z15', label: 'DAM 15', lat: 52.3761096, lng: 4.8980545, zoom: 15 },
];

export const DATA_SOURCE_OPTIONS: readonly DataSourceOption[] = [
  { id: 'live', label: 'Live', title: 'Fetch live Intel getEntities responses', mode: 'live' },
  {
    id: 'ams-z10',
    label: 'AMS F10',
    title: 'Amsterdam fixture from docs/iris/update-map-samples/get-entities-z10.json',
    mode: 'fixture',
    fixturePath: 'fixtures/get-entities-z10.json',
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 10,
  },
  {
    id: 'ams-z14',
    label: 'AMS F14',
    title: 'Amsterdam fixture from docs/iris/update-map-samples/get-entities-z14.json',
    mode: 'fixture',
    fixturePath: 'fixtures/get-entities-z14.json',
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 14,
  },
  {
    id: 'damrak-z15',
    label: 'DAM F15',
    title: 'Damrak fixture from docs/iris/update-map-samples/get-entities-damrak-iitc-z15.json',
    mode: 'fixture',
    fixturePath: 'fixtures/get-entities-damrak-iitc-z15.json',
    lat: 52.3761096,
    lng: 4.8980545,
    zoom: 15,
  },
];

export function createDataSourceSettings(id: string): IitcIrisDataSourceSettings {
  const option = DATA_SOURCE_OPTIONS.find((candidate) => candidate.id === id) ?? DATA_SOURCE_OPTIONS[0];
  if (option.mode === 'live' || !option.fixturePath) return { mode: 'live' };
  const url = typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL(option.fixturePath)
    : option.fixturePath;
  return {
    mode: 'fixture',
    id: option.id,
    label: option.label,
    url,
  };
}

export function defaultMapView(): StoredMapView {
  return { lat: 52.3730796, lng: 4.8924534, zoom: 11 };
}

export function loadUrlMapView(): StoredMapView | null {
  try {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const ll = params.get('ll');
    const z = params.get('z');
    if (!ll || !z) return null;
    const [latText, lngText] = ll.split(',');
    const parsed = { lat: Number(latText), lng: Number(lngText), zoom: Number(z) };
    if (!isStoredMapView(parsed)) return null;
    const clamped = clampView(parsed);
    return { lat: clamped.lat, lng: clamped.lng, zoom: clamped.zoom ?? defaultMapView().zoom };
  } catch {
    return null;
  }
}

export function loadStoredMapView(): StoredMapView {
  try {
    const storage = getLocalStorage();
    const value = storage?.getItem(MAP_VIEW_STORAGE_KEY);
    if (!value) return defaultMapView();
    const parsed = JSON.parse(value) as unknown;
    if (!isStoredMapView(parsed)) return defaultMapView();
    const clamped = clampView(parsed);
    return { lat: clamped.lat, lng: clamped.lng, zoom: clamped.zoom ?? defaultMapView().zoom };
  } catch {
    return defaultMapView();
  }
}

export function loadInitialMapView(): StoredMapView {
  return loadUrlMapView() ?? loadStoredMapView();
}

export function storeMapView(view: StoredMapView): void {
  try {
    getLocalStorage()?.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(view));
  } catch {
    // Map view persistence is optional.
  }
}

export function isBaseLayerId(value: string | null): value is IitcIrisBaseLayerId {
  return value === 'osm' || value === 'cartodb-dark-matter' || value === 'cartodb-positron';
}

export function loadStoredBaseLayerId(): IitcIrisBaseLayerId {
  try {
    const value = getLocalStorage()?.getItem(BASE_LAYER_STORAGE_KEY);
    return isBaseLayerId(value ?? null) ? (value as IitcIrisBaseLayerId) : 'cartodb-dark-matter';
  } catch {
    return 'cartodb-dark-matter';
  }
}

export function isLayerSettings(value: unknown): value is Partial<IitcIrisLayerSettings> {
  return !!value && typeof value === 'object';
}

type LegacyStoredLayerSettings = Partial<IitcIrisLayerSettings> & {
  drawnItems?: unknown;
  levelFill?: unknown;
  healthFill?: unknown;
  historyCaptured?: unknown;
  historyVisited?: unknown;
  historyScoutControlled?: unknown;
};

export function loadStoredLayerSettings(): IitcIrisLayerSettings {
  try {
    const value = getLocalStorage()?.getItem(LAYER_SETTINGS_STORAGE_KEY);
    if (!value) return DEFAULT_LAYER_SETTINGS;
    const parsed = JSON.parse(value) as unknown;
    if (!isLayerSettings(parsed)) return DEFAULT_LAYER_SETTINGS;
    const legacyParsed = parsed as LegacyStoredLayerSettings;
    const legacyPlayerTracker = typeof parsed.playerTracker === 'boolean' ? parsed.playerTracker : undefined;
    const storedKeyCount = (parsed as Record<string, unknown>).keyCount;
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
      ornaments: typeof parsed.ornaments === 'boolean' ? parsed.ornaments : DEFAULT_LAYER_SETTINGS.ornaments,
      artifacts: typeof parsed.artifacts === 'boolean' ? parsed.artifacts : DEFAULT_LAYER_SETTINGS.artifacts,
      labels: typeof parsed.labels === 'boolean' ? parsed.labels : DEFAULT_LAYER_SETTINGS.labels,
      tiles: typeof parsed.tiles === 'boolean' ? parsed.tiles : DEFAULT_LAYER_SETTINGS.tiles,
      drawnLinks: typeof parsed.drawnLinks === 'boolean'
        ? parsed.drawnLinks
        : typeof legacyParsed.drawnItems === 'boolean'
          ? legacyParsed.drawnItems
          : DEFAULT_LAYER_SETTINGS.drawnLinks,
      drawnMarkers: typeof parsed.drawnMarkers === 'boolean'
        ? parsed.drawnMarkers
        : typeof legacyParsed.drawnItems === 'boolean'
          ? legacyParsed.drawnItems
          : DEFAULT_LAYER_SETTINGS.drawnMarkers,
      playerTracker: DEFAULT_LAYER_SETTINGS.playerTracker,
      playerTrackerResistance: typeof parsed.playerTrackerResistance === 'boolean'
        ? parsed.playerTrackerResistance
        : legacyPlayerTracker ?? DEFAULT_LAYER_SETTINGS.playerTrackerResistance,
      playerTrackerEnlightened: typeof parsed.playerTrackerEnlightened === 'boolean'
        ? parsed.playerTrackerEnlightened
        : legacyPlayerTracker ?? DEFAULT_LAYER_SETTINGS.playerTrackerEnlightened,
      playerTrackerMachina: typeof parsed.playerTrackerMachina === 'boolean'
        ? parsed.playerTrackerMachina
        : legacyPlayerTracker ?? DEFAULT_LAYER_SETTINGS.playerTrackerMachina,
      keyCount: storedKeyCount === true || storedKeyCount === 'on',
    };
  } catch {
    return DEFAULT_LAYER_SETTINGS;
  }
}

export function legacyHighlighterFromLayerSettings(
  legacyLayerSettings?: LegacyStoredLayerSettings,
): IitcIrisPortalHighlighterId {
  if (legacyLayerSettings?.levelFill === true) return 'level-color';
  if (legacyLayerSettings?.healthFill === true) return 'needs-recharge';
  if (legacyLayerSettings?.historyCaptured === 'on') return 'history-captured';
  if (legacyLayerSettings?.historyVisited === 'on') return 'history-visited';
  if (legacyLayerSettings?.historyCaptured === 'invert') return 'history-not-captured';
  if (legacyLayerSettings?.historyVisited === 'invert') return 'history-not-visited';
  if (legacyLayerSettings?.historyScoutControlled === 'on') return 'history-scout-controlled';
  if (legacyLayerSettings?.historyScoutControlled === 'invert') return 'history-not-scout-controlled';
  return 'none';
}

export function loadStoredHighlighterSettings(): IitcIrisHighlighterSettings {
  try {
    const storage = getLocalStorage();
    const value = storage?.getItem(HIGHLIGHTER_SETTINGS_STORAGE_KEY);
    const legacyLayerValue = storage?.getItem(LAYER_SETTINGS_STORAGE_KEY);
    const legacyParsed = legacyLayerValue ? JSON.parse(legacyLayerValue) as unknown : undefined;
    const legacyStoredLayerSettings = isLayerSettings(legacyParsed) ? legacyParsed as LegacyStoredLayerSettings : undefined;
    if (!value) return { active: legacyHighlighterFromLayerSettings(legacyStoredLayerSettings) };
    const parsed = JSON.parse(value) as Partial<IitcIrisHighlighterSettings>;
    return { active: normalizePortalHighlighterId(parsed.active) };
  } catch {
    return { active: legacyHighlighterFromLayerSettings() };
  }
}

export function loadStoredDataSourceId(): string {
  try {
    const value = getLocalStorage()?.getItem(DATA_SOURCE_STORAGE_KEY);
    return DATA_SOURCE_OPTIONS.some((option) => option.id === value) ? (value as string) : 'live';
  } catch {
    return 'live';
  }
}

export function loadStoredLifecycleSettings(): IitcIrisLifecycleSettings {
  try {
    const value = getLocalStorage()?.getItem(LIFECYCLE_SETTINGS_STORAGE_KEY);
    if (!value) return { iitcMovementDelay: false };
    const parsed = JSON.parse(value) as Partial<IitcIrisLifecycleSettings>;
    return { iitcMovementDelay: parsed.iitcMovementDelay === true };
  } catch {
    return { iitcMovementDelay: false };
  }
}

export function storeLayerSettings(value: IitcIrisLayerSettings): void {
  try {
    getLocalStorage()?.setItem(LAYER_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Layer preferences are optional.
  }
}

export function storeHighlighterSettings(value: IitcIrisHighlighterSettings): void {
  try {
    getLocalStorage()?.setItem(HIGHLIGHTER_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Highlighter preferences are optional.
  }
}

export function storeDataSourceId(value: string): void {
  try {
    getLocalStorage()?.setItem(DATA_SOURCE_STORAGE_KEY, value);
  } catch {
    // Data source preference is optional.
  }
}

export function storeLifecycleSettings(value: IitcIrisLifecycleSettings): void {
  try {
    getLocalStorage()?.setItem(LIFECYCLE_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Lifecycle diagnostics are optional.
  }
}

export function loadStoredDebugDockVisible(): boolean {
  try {
    return getLocalStorage()?.getItem(DEBUG_DOCK_STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function storeDebugDockVisible(value: boolean): void {
  try {
    getLocalStorage()?.setItem(DEBUG_DOCK_STORAGE_KEY, value ? 'true' : 'false');
  } catch {
    // Debug visibility is optional.
  }
}

export function isCommTab(value: string | null): value is IitcIrisCommTab {
  return value === 'all' || value === 'faction' || value === 'alerts';
}

export function loadStoredCommTab(): IitcIrisCommTab {
  try {
    const value = getLocalStorage()?.getItem(COMM_TAB_STORAGE_KEY);
    return isCommTab(value ?? null) ? (value as IitcIrisCommTab) : 'all';
  } catch {
    return 'all';
  }
}

export function storeCommTab(value: IitcIrisCommTab): void {
  try {
    getLocalStorage()?.setItem(COMM_TAB_STORAGE_KEY, value);
  } catch {
    // COMM tab preference is optional.
  }
}

export function loadStoredSidePanelId(): SidePanelId | null {
  try {
    const value = getLocalStorage()?.getItem(SIDE_PANEL_STORAGE_KEY);
    return isSidePanelId(value) ? value : null;
  } catch {
    return null;
  }
}

export function loadStoredActiveSheet(): SheetId {
  try {
    const value = getLocalStorage()?.getItem(ACTIVE_SHEET_STORAGE_KEY);
    if (isSheetId(value)) return value;
    return loadStoredSidePanelId() ?? 'map';
  } catch {
    return loadStoredSidePanelId() ?? 'map';
  }
}

export function storeActiveSheet(value: SheetId): void {
  try {
    getLocalStorage()?.setItem(ACTIVE_SHEET_STORAGE_KEY, value);
  } catch {
    // Sheet preference is optional.
  }
}

export function loadStoredPortalSections(): Record<PortalSectionId, boolean> {
  try {
    const storage = getLocalStorage();
    const parsed = JSON.parse(storage?.getItem(PORTAL_SECTION_STORAGE_KEY) ?? '{}') as Partial<
      Record<PortalSectionId, boolean>
    >;
    return Object.fromEntries(
      PORTAL_DETAIL_SECTION_REGISTRY.map((entry) => [
        entry.id,
        typeof parsed[entry.id] === 'boolean' ? parsed[entry.id] : entry.defaultOpen,
      ]),
    ) as Record<PortalSectionId, boolean>;
  } catch {
    return DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS;
  }
}

export function storePortalSections(value: Record<PortalSectionId, boolean>): void {
  try {
    getLocalStorage()?.setItem(PORTAL_SECTION_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Portal section state is optional.
  }
}

export function loadStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const value = getLocalStorage()?.getItem(key);
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

export function storeBoolean(key: string, value: boolean): void {
  try {
    getLocalStorage()?.setItem(key, value ? 'true' : 'false');
  } catch {
    // Storage preference is optional.
  }
}

export function storeSidePanelId(value: SidePanelId | null): void {
  try {
    const storage = getLocalStorage();
    if (value) {
      storage?.setItem(SIDE_PANEL_STORAGE_KEY, value);
    } else {
      storage?.removeItem(SIDE_PANEL_STORAGE_KEY);
    }
  } catch {
    // Side panel preference is optional.
  }
}

export function getExtensionUrl(path: string): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : path;
}
