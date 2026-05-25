import { useSyncExternalStore } from 'preact/compat';
import { createStore } from 'zustand/vanilla';
import type { StateCreator } from 'zustand/vanilla';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import { EntityLogic } from './logic/EntityLogic';
import { globalSpatialIndex } from './SpatialIndex';
import type {BoundsE6} from './geo-bounds';
import {
    DEFAULT_PORTAL_HISTORY_LAYER_STATE,
    nextPortalHistoryMode,
    type HistoryFilterState,
    type PortalHistoryKey,
    type PortalHistoryLayerState,
} from './portal-history';
import {
    formatEndpointErrorActivityMessage,
    formatEndpointRequestActivityMessage,
    formatEndpointSuccessActivityMessage,
} from './endpoint-formatting';

function getFeatureIdentity(feature: GeoJSON.Feature | null | undefined): string | number | null {
    if (!feature) return null;
    if (typeof feature.id === 'string' || typeof feature.id === 'number') return feature.id;

    const properties = feature.properties as Record<string, unknown> | null | undefined;
    if (!properties) return null;
    const propertyId = properties.id;
    return typeof propertyId === 'string' || typeof propertyId === 'number' ? propertyId : null;
}

export interface PlayerStats {
    nickname: string;
    level: number | null;
    ap: number | null;
    team: string;
    energy?: number;
    xm_capacity?: number;
    available_invites?: number;
    min_ap_for_current_level?: number;
    min_ap_for_next_level?: number;
}

export interface GameScore {
    enlightened: number;
    resistance: number;
}

export interface RegionScore {
    regionName: string;
    gameScore: [number, number]; // [ENL, RES]
    topAgents: { team: string; nick: string }[];
    scoreHistory: [string, string, string][]; // [CP, ENL, RES]
}

export interface PortalMod {
    owner: string;
    name: string;
    rarity: string;
    stats: Record<string, string | number>;
    type?: string;
}

export interface PortalResonator {
    owner: string;
    level: number;
    energy: number;
}

export interface Portal {
    id: string;
    lat: number;
    lng: number;
    team: string;
    name?: string;
    level?: number;
    health?: number;
    resCount?: number;
    image?: string;
    owner?: string;
    mods?: PortalMod[];
    resonators?: PortalResonator[];
    visited?: boolean;
    captured?: boolean;
    scanned?: boolean;
    scoutControlled?: boolean;
    history?: number;
    mitigation?: {
        total: number;
        shields: number;
        links: number;
        linkDefenseBoost: number;
        excess: number;
    };
    hasMissionsStartingHere?: boolean;
    ornaments?: string[];
}

export interface Link {
    id: string;
    team: string;
    fromPortalId: string;
    toPortalId: string;
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
}

export interface PlannedLink {
    id: string;
    fromPortalId: string;
    toPortalId: string;
    createdAt: number;
}

export interface PlannedMarker {
    id: string;
    lat: number;
    lng: number;
    label: string;
    color: 'white' | 'red' | 'blue' | 'green';
    portalId?: string;
    createdAt: number;
}

const MAX_MERCATOR_LATITUDE = 85.05112878;

function clampLatitude(lat: number): number {
    return Math.max(-MAX_MERCATOR_LATITUDE, Math.min(MAX_MERCATOR_LATITUDE, lat));
}

function normalizeLongitude(lng: number): number {
    return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function normalizePlannedMarkerCoordinates(lat: number, lng: number): {lat: number; lng: number} | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
        lat: Math.round(clampLatitude(lat) * 1e6) / 1e6,
        lng: Math.round(normalizeLongitude(lng) * 1e6) / 1e6,
    };
}

function getPlannedMarkerCoordinateKey(marker: Pick<PlannedMarker, 'lat' | 'lng'>): string {
    return `${Math.round(marker.lat * 1e6)}:${Math.round(marker.lng * 1e6)}`;
}

function plannedMarkersMatch(a: PlannedMarker, b: Pick<PlannedMarker, 'lat' | 'lng' | 'portalId'>): boolean {
    if (a.portalId && b.portalId && a.portalId === b.portalId) return true;
    return getPlannedMarkerCoordinateKey(a) === getPlannedMarkerCoordinateKey(b);
}

function isGenericPlannedMarkerLabel(label: string): boolean {
    return /^Marker \d+$/u.test(label.trim());
}

function mergePlannedMarker(existing: PlannedMarker, duplicate: PlannedMarker): PlannedMarker {
    const existingIsGeneric = isGenericPlannedMarkerLabel(existing.label);
    const duplicateIsGeneric = isGenericPlannedMarkerLabel(duplicate.label);

    return {
        ...existing,
        label: existingIsGeneric && !duplicateIsGeneric ? duplicate.label : existing.label,
        color: existing.color,
        portalId: existing.portalId ?? duplicate.portalId,
        createdAt: Math.min(existing.createdAt, duplicate.createdAt),
    };
}

function dedupePlannedMarkers(markers: PlannedMarker[]): PlannedMarker[] {
    const deduped: PlannedMarker[] = [];

    for (const marker of markers) {
        const normalizedCoordinates = normalizePlannedMarkerCoordinates(marker.lat, marker.lng);
        if (!normalizedCoordinates) continue;
        const normalizedMarker = {
            ...marker,
            ...normalizedCoordinates,
        };
        const existingIndex = deduped.findIndex((existing) => plannedMarkersMatch(existing, normalizedMarker));
        if (existingIndex === -1) {
            deduped.push(normalizedMarker);
            continue;
        }

        deduped[existingIndex] = mergePlannedMarker(deduped[existingIndex], normalizedMarker);
    }

    return deduped;
}

export type PlanningTool = 'links' | 'markers';
export type PlannedItemType = 'link' | 'marker';

export interface Field {
    id: string;
    team: string;
    points: { portalId?: string; lat: number; lng: number }[];
}

export interface Artifact {
    portalId: string;
    type: string;
    ids: string[];
}

export interface Plext {
    id: string;
    time: number;
    text: string;
    markup: [string, { plain?: string; team?: string; name?: string; address?: string; latE6?: number; lngE6?: number; }][];
    categories: number;
    team: string;
    type: 'PLAYER_GENERATED' | 'SYSTEM_BROADCAST' | 'SYSTEM_NARROWCAST';
}

export interface StatsItem {
    id: string;
    label: string;
    value: string | (() => string);
}

export interface MenuItem {
    id: string;
    label: string;
    onClick: () => void;
}

export interface FailedRequest {
    url: string;
    status: number;
    statusText: string;
    time: number;
}

export interface SuccessfulRequest {
    url: string;
    time: number;
    isActive?: boolean;
}

export interface JSError {
    message: string;
    source?: string;
    lineno?: number;
    colno?: number;
    error?: unknown;
    time: number;
}

export interface SessionError {
    url: string;
    status: number;
    statusText: string;
    time: number;
}

export interface MapInteraction {
    type: 'click' | 'mouseenter' | 'mouseleave';
    layerId: string;
    featureId?: string;
    lngLat?: [number, number];
    time: number;
}

export type EndpointStatus = 'idle' | 'in_flight' | 'success' | 'error';

export type EndpointKey =
    | 'entities'
    | 'portalDetails'
    | 'plexts'
    | 'missionDetails'
    | 'topMissions'
    | 'sendPlext'
    | 'redeemReward'
    | 'artifacts'
    | 'subscription'
    | 'inventory'
    | 'gameScore'
    | 'regionScore'
    | 'unknown';

export interface EndpointDiagnostics {
    key: EndpointKey;
    status: EndpointStatus;
    lastRequestAt: number | null;
    lastSuccessAt: number | null;
    lastErrorAt: number | null;
    lastErrorStatus: number | null;
    lastErrorText: string | null;
    lastUrl: string;
    nextAutoRefreshAt: number | null;
    lastRefreshReason: string | null;
    lastSkipReason: string | null;
    lastActiveSuccessAt: number | null;
    lastPassiveSuccessAt: number | null;
    lastCoverageKey: string | null;
    staleQueuedDropCount: number;
    staleResponseIgnoreCount: number;
}

export interface EndpointActivityLogEntry {
    time: number;
    endpoint: EndpointKey;
    message: string;
}

export interface MapPerfSnapshot {
    type: 'viewport' | 'htmlMarkers' | 'frame';
    time: number;
    totalMs: number;
    queryMs?: number;
    setDataMs?: number;
    zoom?: number;
    queryBufferDegrees?: number;
    sourceSetDataMs?: Record<string, number>;
    sourceFeatureCounts?: Record<string, number>;
    pluginFeatureCounts?: Record<string, number>;
    itemCount?: number;
    portalCount?: number;
    linkCount?: number;
    fieldCount?: number;
    artifactCount?: number;
    ornamentCount?: number;
    pluginCount?: number;
    candidateCount?: number;
    activeCount?: number;
    existingCount?: number;
    createdCount?: number;
    updatedCount?: number;
    removedCount?: number;
    frameCount?: number;
    averageFrameMs?: number;
    maxFrameMs?: number;
    slowFrameCount?: number;
    estimatedFps?: number;
    benchmarkRunCount?: number;
    benchmarkMedianAverageFrameMs?: number;
    benchmarkMinAverageFrameMs?: number;
    benchmarkMaxAverageFrameMs?: number;
    benchmarkMaxFrameMs?: number;
    benchmarkVariant?: string;
    benchmarkZoom?: number;
    benchmarkMode?: string;
    benchmarkSourceFeatureCounts?: Record<string, number>;
    benchmarkPluginFeatureCounts?: Record<string, number>;
}

export interface MapPerfDiagnostics {
    viewport: MapPerfSnapshot | null;
    htmlMarkers: MapPerfSnapshot | null;
    frame: MapPerfSnapshot | null;
}

export interface UiRenderDiagnosticsEntry {
    name: string;
    count: number;
    lastCount: number;
    lastAt: number;
}

export interface MainThreadLongTask {
    time: number;
    durationMs: number;
    source: string;
}

export interface MainThreadDiagnostics {
    longTaskCount: number;
    maxLongTaskMs: number;
    lastLongTask: MainThreadLongTask | null;
    recentLongTasks: MainThreadLongTask[];
}

export interface DomainDiagnosticError {
    time: number;
    domain: string;
    message: string;
    detail?: string;
}

export interface InventoryItemData {
    resource?: {
        resourceType: string;
        resourceRarity: string;
    };
    resourceWithLevels?: {
        resourceType: string;
        level: number;
    };
    modResource?: {
        displayName: string;
        stats: Record<string, string>;
        rarity: string;
        resourceType: string;
    };
    playerPowerupResource?: {
        playerPowerupEnum: string;
    };
    timedPowerupResource?: {
        multiplier: number;
        designation: string;
        multiplierE6: number;
    };
    flipCard?: {
        flipCardType: string;
    };
    container?: {
        currentCapacity: number;
        currentCount: number;
        stackableItems: {
            itemGuids: string[];
            exampleGameEntity: [string, number, InventoryItemData];
        }[];
    };
    moniker?: {
        differentiator: string;
    };
    portalCoupler?: {
        portalGuid: string;
        portalLocation: string;
        portalImageUrl: string;
        portalTitle: string;
        portalAddress: string;
    };
    inInventory?: {
        playerId: string;
        acquisitionTimestampMs: string;
    };
}

export interface InventoryItem extends InventoryItemData {
    guid: string;
    timestamp: number;
}

export interface PasscodeRewardAward {
    level: number;
    count: number;
}

export interface PasscodeRewardInventoryItem {
    name: string;
    awards: PasscodeRewardAward[];
}

export interface PasscodeRewards {
    xm: number;
    ap: number;
    other: string[];
    inventory?: PasscodeRewardInventoryItem[];
}

export interface MissionWaypoint {
    index: number;
    id: string;
    title: string;
    type: number;
    objective: number;
    hidden: boolean;
    lat?: number;
    lng?: number;
}

export interface MissionDetails {
    id: string;
    title: string;
    description: string;
    author?: string;
    logoUrl?: string;
    rating?: number;
    medianCompletionTime?: string;
    participants?: number;
    waypoints: MissionWaypoint[];
}

export interface MissionSummary {
    id: string;
    title: string;
    logoUrl?: string;
    rating?: number;
    medianCompletionTime?: string;
}

export interface IRISSettings {
    pluginStates: Record<string, boolean>;
    themeId: string;
    mapThemeId: string;
    layerShowFields: boolean;
    layerShowLinks: boolean;
    layerShowOrnaments: boolean;
    layerShowArtifacts: boolean;
    filterShowResistance: boolean;
    filterShowEnlightened: boolean;
    filterShowMachina: boolean;
    filterShowUnclaimedPortals: boolean;
    filterShowLevel: Record<number, boolean>;
    filterShowHealth: Record<number, boolean>;
    portalHistoryLayers: PortalHistoryLayerState;
    filterShowVisited: HistoryFilterState;
    filterShowCaptured: HistoryFilterState;
    filterShowScanned: HistoryFilterState;
    allowRotation: boolean;
    allowPitch: boolean;
    debugLogging: boolean;
    showMockTools: boolean;
    plannedShowLinks: boolean;
    plannedShowMarkers: boolean;
}

export const DEFAULT_SETTINGS: IRISSettings = {
    pluginStates: {},
    themeId: 'INGRESS',
    mapThemeId: 'DARK',
    layerShowFields: true,
    layerShowLinks: true,
    layerShowOrnaments: true,
    layerShowArtifacts: true,
    filterShowResistance: true,
    filterShowEnlightened: true,
    filterShowMachina: true,
    filterShowUnclaimedPortals: true,
    filterShowLevel: {
        1: true, 2: true, 3: true, 4: true,
        5: true, 6: true, 7: true, 8: true,
    },
    filterShowHealth: {
        25: true, 50: true, 75: true, 100: true,
    },
    portalHistoryLayers: { ...DEFAULT_PORTAL_HISTORY_LAYER_STATE },
    filterShowVisited: 'ALL',
    filterShowCaptured: 'ALL',
    filterShowScanned: 'ALL',
    allowRotation: true,
    allowPitch: true,
    debugLogging: false,
    showMockTools: false,
    plannedShowLinks: true,
    plannedShowMarkers: true,
};

// Slice Types
interface SettingsSlice extends IRISSettings {
    setPluginEnabled: (id: string, enabled: boolean) => void;
    setTheme: (id: string) => void;
    setMapTheme: (id: string) => void;
    toggleLayerFields: () => void;
    toggleLayerLinks: () => void;
    toggleLayerOrnaments: () => void;
    toggleLayerArtifacts: () => void;
    toggleFilterResistance: () => void;
    toggleFilterEnlightened: () => void;
    toggleFilterMachina: () => void;
    toggleFilterUnclaimedPortals: () => void;
    toggleFilterLevel: (level: number) => void;
    toggleFilterHealth: (bucket: number) => void;
    togglePortalHistoryLayer: (key: PortalHistoryKey) => void;
    toggleFilterVisited: () => void;
    toggleFilterCaptured: () => void;
    toggleFilterScanned: () => void;
    resetTacticalFilters: () => void;
    toggleAllowRotation: () => void;
    toggleAllowPitch: () => void;
    toggleDebugLogging: () => void;
    toggleShowMockTools: () => void;
    togglePlannedShowLinks: () => void;
    togglePlannedShowMarkers: () => void;
}

interface EntitiesSlice {
    portals: Record<string, Portal>;
    links: Record<string, Link>;
    fields: Record<string, Field>;
    artifacts: Record<string, Artifact>;
    mockOrnaments: Record<string, string[]>;
    tileFreshness: Record<string, number>;
    plexts: Plext[];
    syncIndex: () => void;
    addPortal: (portal: Portal) => void;
    updatePortals: (portals: Partial<Portal>[]) => void;
    updateLinks: (links: Partial<Link>[]) => void;
    updateFields: (fields: Partial<Field>[]) => void;
    updateArtifacts: (artifacts: Artifact[]) => void;
    setMockOrnaments: (mockOrnaments: Record<string, string[]>) => void;
    clearMockOrnaments: () => void;
    updatePlexts: (plexts: Plext[]) => void;
    replacePlexts: (plexts: Plext[]) => void;
    removePlextsByIdPrefix: (prefix: string) => void;
    removeEntities: (guids: string[]) => void;
    cullEntities: (centerLat: number, centerLng: number, maxDistKm: number) => void;
    setTileFreshness: (tileKeys: string[]) => void;
    }
interface UISlice {
    statsItems: Record<string, StatsItem>;
    menuItems: MenuItem[];
    pluginFeatures: GeoJSON.FeatureCollection;
    discoveredLocation: string | null;
    portalAddresses: Record<string, string>;
    lastResolvedLatLng: { lat: number; lng: number } | null;
    addressStatus: 'idle' | 'pending' | 'resolving';
    addressNextLookupAt: number | null;
    mapState: {
        lat: number;
        lng: number;
        zoom: number;
        bounds?: BoundsE6;
    };
    selectedPortalId: string | null;
    selectedFieldId: string | null;
    selectedLinkId: string | null;
    selectedPluginFeature: GeoJSON.Feature | null;
    planningMode: boolean;
    planningTool: PlanningTool;
    planningAnchorPortalId: string | null;
    planningPortalPath: string[];
    selectedPlannedItemId: string | null;
    selectedPlannedItemType: PlannedItemType | null;
    plannedLinks: PlannedLink[];
    plannedMarkers: PlannedMarker[];
    activeCommTab: string;
    commSendStatus: 'idle' | 'sending' | 'success' | 'error';
    commSendError: string | null;
    passcodeRedeemStatus: 'idle' | 'sending' | 'success' | 'error';
    passcodeRedeemError: string | null;
    passcodeRewards: PasscodeRewards | null;
    rehydrated: boolean;
    activeVisualOverlayIds: string[];
    addStatsItem: (item: StatsItem) => void;
    removeStatsItem: (id: string) => void;
    addMenuItem: (item: MenuItem) => void;
    removeMenuItem: (id: string) => void;
    setPluginFeatures: (features: GeoJSON.FeatureCollection) => void;
    setDiscoveredLocation: (location: string | null) => void;
    reverseGeocode: (lat: number, lng: number, portalId?: string) => Promise<void>;
    updateMapState: (lat: number, lng: number, zoom: number, bounds?: BoundsE6) => void;
    selectPortal: (id: string | null) => void;
    selectField: (id: string | null) => void;
    selectLink: (id: string | null) => void;
    setSelectedPluginFeature: (feature: GeoJSON.Feature | null) => void;
    togglePlanningMode: () => void;
    setPlanningMode: (enabled: boolean) => void;
    setPlanningTool: (tool: PlanningTool) => void;
    selectPlanningPortal: (portalId: string) => void;
    createPlannedLink: () => void;
    clearPlanningSelection: () => void;
    addPlannedMarker: (lat: number, lng: number, label?: string, color?: PlannedMarker['color'], portalId?: string) => void;
    renamePlannedMarker: (id: string, label: string) => void;
    deletePlannedMarker: (id: string) => void;
    selectPlannedMarker: (id: string) => void;
    selectPlannedItem: (id: string | null, type?: PlannedItemType | null) => void;
    deleteSelectedPlannedItem: () => void;
    undoPlannedItem: (tool?: PlanningTool) => void;
    clearPlannedLinks: (tool?: PlanningTool) => void;
    setActiveCommTab: (tab: string) => void;
    setCommSendPending: () => void;
    setCommSendSuccess: () => void;
    setCommSendError: (error: string) => void;
    clearCommSendState: () => void;
    setPasscodeRedeemPending: () => void;
    setPasscodeRedeemSuccess: (rewards: PasscodeRewards) => void;
    setPasscodeRedeemError: (error: string) => void;
    clearPasscodeRedeemState: () => void;
    toggleVisualOverlay: (id: string) => void;
}

interface PlayerSlice {
    playerStats: PlayerStats | null;
    gameScore: GameScore | null;
    regionScore: RegionScore | null;
    hasSubscription: boolean;
    inventory: InventoryItem[];
    missionDetails: MissionDetails | null;
    missionsInView: MissionSummary[];
    missionsPortalId: string | null;
    setPlayerStats: (stats: PlayerStats) => void;
    setGameScore: (score: GameScore) => void;
    setRegionScore: (score: RegionScore) => void;
    setHasSubscription: (has: boolean) => void;
    setInventory: (items: InventoryItem[]) => void;
    setInventoryItems: (items: InventoryItem[]) => void;
    setMissionDetails: (mission: MissionDetails | null) => void;
    setMissionsInView: (missions: MissionSummary[]) => void;
    setMissionsPortalId: (portalId: string | null) => void;
}

interface DiagnosticsSlice {
    activeRequests: number;
    lastRequestUrl: string;
    failedRequests: FailedRequest[];
    successfulRequests: SuccessfulRequest[];
    jsErrors: JSError[];
    interactionLogs: MapInteraction[];
    sessionStatus: 'ok' | 'initial_login_required' | 'expired' | 'recovering';
    lastSessionError: SessionError | null;
    endpointDiagnostics: Record<EndpointKey, EndpointDiagnostics>;
    mapPerfDiagnostics: MapPerfDiagnostics;
    uiRenderDiagnostics: Record<string, UiRenderDiagnosticsEntry>;
    mainThreadDiagnostics: MainThreadDiagnostics;
    domainErrors: DomainDiagnosticError[];
    endpointActivityLog: EndpointActivityLogEntry[];
    onRequestStart: (url: string) => void;
    onRequestEnd: () => void;
    addFailedRequest: (request: FailedRequest) => void;
    clearFailedRequests: () => void;
    addSuccessfulRequest: (request: SuccessfulRequest) => void;
    clearSuccessfulRequests: () => void;
    addJSError: (error: JSError) => void;
    clearJSErrors: () => void;
    addInteractionLog: (log: Omit<MapInteraction, 'time'>) => void;
    clearInteractionLogs: () => void;
    setInitialLoginRequired: (error: SessionError) => void;
    setSessionExpired: (error: SessionError) => void;
    setSessionRecovering: () => void;
    setSessionRecovered: () => void;
    setEndpointNextAutoRefresh: (key: EndpointKey, nextAutoRefreshAt: number | null) => void;
    setEndpointMetadata: (key: EndpointKey, metadata: Partial<EndpointDiagnostics>) => void;
    addEndpointActivityLog: (entry: Omit<EndpointActivityLogEntry, 'time'> & {time?: number}) => void;
    clearEndpointActivityLog: () => void;
    setMapPerfSnapshot: (snapshot: MapPerfSnapshot) => void;
    recordUiRenderSample: (name: string, count: number) => void;
    recordMainThreadLongTask: (task: MainThreadLongTask) => void;
    addDomainError: (error: Omit<DomainDiagnosticError, 'time'> & {time?: number}) => void;
    clearDomainErrors: () => void;
    clearEndpointDiagnostics: () => void;
}

export type IRISState = SettingsSlice & EntitiesSlice & UISlice & PlayerSlice & DiagnosticsSlice;

const ENDPOINT_KEYS: EndpointKey[] = [
    'entities',
    'portalDetails',
    'plexts',
    'missionDetails',
    'topMissions',
    'sendPlext',
    'redeemReward',
    'artifacts',
    'subscription',
    'inventory',
    'gameScore',
    'regionScore',
    'unknown',
];

const createEmptyEndpointDiagnostics = (): Record<EndpointKey, EndpointDiagnostics> =>
    Object.fromEntries(
        ENDPOINT_KEYS.map((key) => [key, {
            key,
            status: 'idle',
            lastRequestAt: null,
            lastSuccessAt: null,
            lastErrorAt: null,
            lastErrorStatus: null,
            lastErrorText: null,
            lastUrl: '',
            nextAutoRefreshAt: null,
            lastRefreshReason: null,
            lastSkipReason: null,
            lastActiveSuccessAt: null,
            lastPassiveSuccessAt: null,
            lastCoverageKey: null,
            staleQueuedDropCount: 0,
            staleResponseIgnoreCount: 0,
        } satisfies EndpointDiagnostics]),
    ) as Record<EndpointKey, EndpointDiagnostics>;

export function getEndpointKeyFromUrl(url: string): EndpointKey {
    if (url.includes('getEntities')) return 'entities';
    if (url.includes('getPortalDetails')) return 'portalDetails';
    if (url.includes('getPlexts')) return 'plexts';
    if (url.includes('getMissionDetails')) return 'missionDetails';
    if (url.includes('getTopMissionsInBounds') || url.includes('getTopMissionsForPortal')) return 'topMissions';
    if (url.includes('sendPlext')) return 'sendPlext';
    if (url.includes('redeemReward')) return 'redeemReward';
    if (url.includes('getArtifactPortals')) return 'artifacts';
    if (url.includes('getHasActiveSubscription')) return 'subscription';
    if (url.includes('getInventory')) return 'inventory';
    if (url.includes('getGameScore')) return 'gameScore';
    if (url.includes('getRegionScoreDetails')) return 'regionScore';
    return 'unknown';
}

const SUCCESS_DEDUP_WINDOW_MS = 3000;
const REVERSE_GEOCODE_DEBOUNCE_MS = 1000;

interface NominatimResponse {
    display_name?: string;
}

let reverseGeocodeTimeout: ReturnType<typeof setTimeout> | null = null;

// Slice Creators
const createSettingsSlice: StateCreator<IRISState, [], [], SettingsSlice> = (set) => ({
    ...DEFAULT_SETTINGS,
    setPluginEnabled: (id, enabled) =>
        set((state) => ({ pluginStates: { ...state.pluginStates, [id]: enabled } })),
    setTheme: (id) => set(() => ({ themeId: id })),
    setMapTheme: (id) => set(() => ({ mapThemeId: id })),
    toggleLayerFields: () => set((state) => ({ layerShowFields: !state.layerShowFields })),
    toggleLayerLinks: () => set((state) => ({ layerShowLinks: !state.layerShowLinks })),
    toggleLayerOrnaments: () => set((state) => ({ layerShowOrnaments: !state.layerShowOrnaments })),
    toggleLayerArtifacts: () => set((state) => ({ layerShowArtifacts: !state.layerShowArtifacts })),
    toggleFilterResistance: () => set((state) => ({ filterShowResistance: !state.filterShowResistance })),
    toggleFilterEnlightened: () => set((state) => ({ filterShowEnlightened: !state.filterShowEnlightened })),
    toggleFilterMachina: () => set((state) => ({ filterShowMachina: !state.filterShowMachina })),
    toggleFilterUnclaimedPortals: () => set((state) => ({ filterShowUnclaimedPortals: !state.filterShowUnclaimedPortals })),
    toggleFilterLevel: (level) => set((state) => ({
        filterShowLevel: { ...state.filterShowLevel, [level]: !state.filterShowLevel[level] }
    })),
    toggleFilterHealth: (bucket) => set((state) => ({
        filterShowHealth: { ...state.filterShowHealth, [bucket]: !state.filterShowHealth[bucket] }
    })),
    togglePortalHistoryLayer: (key) => set((state) => ({
        portalHistoryLayers: {
            ...state.portalHistoryLayers,
            [key]: nextPortalHistoryMode(state.portalHistoryLayers[key]),
        },
    })),
    toggleFilterVisited: () => set((state) => {
        const next: HistoryFilterState = state.filterShowVisited === 'ALL' ? 'TRUE' : (state.filterShowVisited === 'TRUE' ? 'FALSE' : 'ALL');
        return { filterShowVisited: next };
    }),
    toggleFilterCaptured: () => set((state) => {
        const next: HistoryFilterState = state.filterShowCaptured === 'ALL' ? 'TRUE' : (state.filterShowCaptured === 'TRUE' ? 'FALSE' : 'ALL');
        return { filterShowCaptured: next };
    }),
    toggleFilterScanned: () => set((state) => {
        const next: HistoryFilterState = state.filterShowScanned === 'ALL' ? 'TRUE' : (state.filterShowScanned === 'TRUE' ? 'FALSE' : 'ALL');
        return { filterShowScanned: next };
    }),
    resetTacticalFilters: () => set(() => ({
        filterShowResistance: DEFAULT_SETTINGS.filterShowResistance,
        filterShowEnlightened: DEFAULT_SETTINGS.filterShowEnlightened,
        filterShowMachina: DEFAULT_SETTINGS.filterShowMachina,
        filterShowUnclaimedPortals: DEFAULT_SETTINGS.filterShowUnclaimedPortals,
        filterShowLevel: { ...DEFAULT_SETTINGS.filterShowLevel },
        filterShowHealth: { ...DEFAULT_SETTINGS.filterShowHealth },
        portalHistoryLayers: { ...DEFAULT_SETTINGS.portalHistoryLayers },
        filterShowVisited: DEFAULT_SETTINGS.filterShowVisited,
        filterShowCaptured: DEFAULT_SETTINGS.filterShowCaptured,
        filterShowScanned: DEFAULT_SETTINGS.filterShowScanned,
    })),
    toggleAllowRotation: () => set((state) => ({ allowRotation: !state.allowRotation })),
    toggleAllowPitch: () => set((state) => ({ allowPitch: !state.allowPitch })),
    toggleDebugLogging: () => set((state) => ({ debugLogging: !state.debugLogging })),
    toggleShowMockTools: () => set((state) => ({ showMockTools: !state.showMockTools })),
    togglePlannedShowLinks: () => set((state) => ({ plannedShowLinks: !state.plannedShowLinks })),
    togglePlannedShowMarkers: () => set((state) => ({ plannedShowMarkers: !state.plannedShowMarkers })),
});

const createEntitiesSlice: StateCreator<IRISState, [], [], EntitiesSlice> = (set) => ({
    portals: {},
    links: {},
    fields: {},
    artifacts: {},
    mockOrnaments: {},
    tileFreshness: {},
    plexts: [],
    syncIndex: () => set((state) => {
        globalSpatialIndex.syncAll(state.portals, state.links, state.fields);
        return state;
    }),
    addPortal: (portal) => set((state) => {
        globalSpatialIndex.updatePortal(portal);
        return { portals: { ...state.portals, [portal.id]: portal } };
    }),
    updatePortals: (newPortals) => set((state) => {
        const portals = { ...state.portals };
        const changedPortalIdsWithTeamChange = new Set<string>();
        let changed = false;

        newPortals.forEach((p) => {
            if (!p.id) return;
            const existing = portals[p.id];
            if (!existing) {
                portals[p.id] = p as Portal;
                globalSpatialIndex.updatePortal(p as Portal);
                changed = true;
                return;
            }

            const { updated, teamChanged, changed: pChanged } = EntityLogic.mergePortal(existing, p);

            if (pChanged) {
                portals[p.id] = updated;
                globalSpatialIndex.updatePortal(updated);
                changed = true;
                if (teamChanged) {
                    changedPortalIdsWithTeamChange.add(p.id);
                }
            }
        });

        if (changedPortalIdsWithTeamChange.size > 0) {
            const { links, fields, changed: entitiesChanged } = EntityLogic.calculateCascadingDeletes(
                changedPortalIdsWithTeamChange,
                state.links,
                state.fields
            );

            if (entitiesChanged) {
                // Cleanup removed links/fields from index
                const deletedLinkIds = Object.keys(state.links).filter(id => !links[id]);
                const deletedFieldIds = Object.keys(state.fields).filter(id => !fields[id]);
                deletedLinkIds.forEach(id => globalSpatialIndex.remove(id));
                deletedFieldIds.forEach(id => globalSpatialIndex.remove(id));

                return { portals, links, fields };
            }
        }

        return changed ? { portals } : state;
    }),
    cullEntities: (centerLat, centerLng, maxDistKm) => set((state) => {
        const portals: Record<string, Portal> = {};
        const tileFreshness = { ...state.tileFreshness };
        let changed = false;

        const selectedPortalId = (state as IRISState).selectedPortalId;
        const artifactPortalIds = new Set(Object.values(state.artifacts).map(a => a.portalId));

        const deletedPortalIds = new Set<string>();

        Object.keys(state.portals).forEach((id) => {
            const p = state.portals[id];
            // Preserve selected portal and portals with artifacts
            if (id === selectedPortalId || artifactPortalIds.has(id) || EntityLogic.getDistKm(centerLat, centerLng, p.lat, p.lng) <= maxDistKm) {
                portals[id] = p;
            } else {
                deletedPortalIds.add(id);
                globalSpatialIndex.remove(id);
                changed = true;
            }
        });

        let nextLinks = state.links;
        let nextFields = state.fields;

        if (deletedPortalIds.size > 0) {
            const result = EntityLogic.calculateCascadingDeletes(deletedPortalIds, state.links, state.fields);
            
            // Cleanup index
            Object.keys(state.links).forEach(id => { if (!result.links[id]) globalSpatialIndex.remove(id); });
            Object.keys(state.fields).forEach(id => { if (!result.fields[id]) globalSpatialIndex.remove(id); });

            nextLinks = result.links;
            nextFields = result.fields;
            if (result.changed) changed = true;
        }

        // Also cull old tile freshness entries (older than 1 hour)
        const oneHourAgo = Date.now() - 3600000;
        const nextTileFreshness: Record<string, number> = {};
        Object.entries(tileFreshness).forEach(([key, lastSuccessAt]) => {
            if (lastSuccessAt >= oneHourAgo) {
                nextTileFreshness[key] = lastSuccessAt;
            } else {
                changed = true;
            }
        });

        return changed ? { portals, links: nextLinks, fields: nextFields, tileFreshness: nextTileFreshness } : state;
    }),
    setTileFreshness: (tileKeys) => set((state) => {
        const now = Date.now();
        const tileFreshness = { ...state.tileFreshness };
        tileKeys.forEach((key) => {
            tileFreshness[key] = now;
        });
        return { tileFreshness };
    }),
    updateLinks: (newLinks) => set((state) => {
        const links = { ...state.links };
        newLinks.forEach((l) => {
            if (!l.id) return;
            const updated = { ...links[l.id], ...l } as Link;
            links[l.id] = updated;
            globalSpatialIndex.updateLink(updated);
        });
        return { links };
    }),
    updateFields: (newFields) => set((state) => {
        const fields = { ...state.fields };
        newFields.forEach((f) => {
            if (!f.id) return;
            const updated = { ...fields[f.id], ...f } as Field;
            fields[f.id] = updated;
            globalSpatialIndex.updateField(updated);
        });
        return { fields };
    }),
    updateArtifacts: (newArtifacts) => set(() => {
        const artifacts: Record<string, Artifact> = {};
        newArtifacts.forEach((a) => {
            artifacts[a.portalId] = a;
        });
        return { artifacts };
    }),
    setMockOrnaments: (mockOrnaments) => set(() => ({ mockOrnaments })),
    clearMockOrnaments: () => set(() => ({ mockOrnaments: {} })),
    updatePlexts: (newPlexts) => set((state) => {
        const all = [...state.plexts, ...newPlexts];
        const unique = Array.from(new Map(all.map(p => [p.id, p])).values());
        unique.sort((a, b) => b.time - a.time);
        return { plexts: unique.slice(0, 1000) };
    }),
    replacePlexts: (newPlexts) => set(() => {
        const unique = Array.from(new Map(newPlexts.map(p => [p.id, p])).values());
        unique.sort((a, b) => b.time - a.time);
        return { plexts: unique.slice(0, 1000) };
    }),
    removePlextsByIdPrefix: (prefix) => set((state) => ({
        plexts: state.plexts.filter((plext) => !plext.id.startsWith(prefix)),
    })),
    removeEntities: (guids) => set((state) => {
        const portals: Record<string, Portal> = {};
        const artifacts: Record<string, Artifact> = {};
        const mockOrnaments: Record<string, string[]> = {};
        
        let changed = false;
        const deletedPortalIds = new Set<string>();
        const guidsSet = new Set(guids);

        Object.entries(state.portals).forEach(([id, portal]) => {
            if (guidsSet.has(id)) {
                deletedPortalIds.add(id);
                globalSpatialIndex.remove(id);
                changed = true;
            } else {
                portals[id] = portal;
            }
        });

        // First pass: remove the explicitly requested GUIDs from links and fields
        const remainingLinks: Record<string, Link> = {};
        Object.entries(state.links).forEach(([id, link]) => {
            if (guidsSet.has(id)) {
                globalSpatialIndex.remove(id);
                changed = true;
            } else {
                remainingLinks[id] = link;
            }
        });

        const remainingFields: Record<string, Field> = {};
        Object.entries(state.fields).forEach(([id, field]) => {
            if (guidsSet.has(id)) {
                globalSpatialIndex.remove(id);
                changed = true;
            } else {
                remainingFields[id] = field;
            }
        });

        Object.entries(state.artifacts).forEach(([id, artifact]) => {
            if (guidsSet.has(id)) {
                changed = true;
            } else {
                artifacts[id] = artifact;
            }
        });

        Object.entries(state.mockOrnaments).forEach(([id, ornaments]) => {
            if (guidsSet.has(id)) {
                changed = true;
            } else {
                mockOrnaments[id] = ornaments;
            }
        });

        // Second pass: remove links and fields anchored to deleted portals
        const { links, fields, changed: cascadingChanged } = EntityLogic.calculateCascadingDeletes(
            deletedPortalIds,
            remainingLinks,
            remainingFields
        );

        if (cascadingChanged) {
            // Cleanup index for cascading deletes
            Object.keys(remainingLinks).forEach(id => { if (!links[id]) globalSpatialIndex.remove(id); });
            Object.keys(remainingFields).forEach(id => { if (!fields[id]) globalSpatialIndex.remove(id); });
            changed = true;
        }

        return changed ? { portals, links, fields, artifacts, mockOrnaments } : state;
    }),
});

const createUISlice: StateCreator<IRISState, [], [], UISlice> = (set) => ({
    statsItems: {},
    menuItems: [],
    pluginFeatures: { type: 'FeatureCollection', features: [] },
    discoveredLocation: null,
    portalAddresses: {},
    lastResolvedLatLng: null,
    addressStatus: 'idle',
    addressNextLookupAt: null,
    mapState: { lat: 52.3702, lng: 4.8952, zoom: 13 },
    selectedPortalId: null,
    selectedFieldId: null,
    selectedLinkId: null,
    selectedPluginFeature: null,
    planningMode: false,
    planningTool: 'links',
    planningAnchorPortalId: null,
    planningPortalPath: [],
    selectedPlannedItemId: null,
    selectedPlannedItemType: null,
    plannedLinks: [],
    plannedMarkers: [],
    activeCommTab: 'ALL',
    commSendStatus: 'idle',
    commSendError: null,
    passcodeRedeemStatus: 'idle',
    passcodeRedeemError: null,
    passcodeRewards: null,
    rehydrated: false,
    activeVisualOverlayIds: [],
    addStatsItem: (item) => set((state) => ({
        statsItems: { ...state.statsItems, [item.id]: item }
    })),
    removeStatsItem: (id) => set((state) => {
        const { [id]: _, ...rest } = state.statsItems;
        return { statsItems: { ...rest } };
    }),
    addMenuItem: (item) => set((state) => ({ menuItems: [...state.menuItems, item] })),
    removeMenuItem: (id) => set((state) => ({
        menuItems: state.menuItems.filter((i) => i.id !== id)
    })),
    setPluginFeatures: (features) => set((state) => {
        const selectedFeatureId = getFeatureIdentity(state.selectedPluginFeature);
        const selectedPluginFeature = selectedFeatureId === null
            ? state.selectedPluginFeature
            : features.features.find((feature) => getFeatureIdentity(feature) === selectedFeatureId) ?? state.selectedPluginFeature;

        return { pluginFeatures: features, selectedPluginFeature };
    }),
    setDiscoveredLocation: (location) => set(() => ({ discoveredLocation: location })),
    reverseGeocode: async (lat: number, lng: number, portalId?: string): Promise<void> => {
        const { lastResolvedLatLng, portalAddresses, debugLogging } = useStore.getState();
        
        // If it's for a portal and we already have it, don't re-fetch
        if (portalId && portalAddresses[portalId]) {
            return;
        }

        // Use higher precision (0.000001 is ~11cm) to ensure search jumps trigger lookup
        if (!portalId && lastResolvedLatLng &&
            Math.abs(lastResolvedLatLng.lat - lat) < 0.000001 &&
            Math.abs(lastResolvedLatLng.lng - lng) < 0.000001) {
          return;
        }

        if (reverseGeocodeTimeout) {
            clearTimeout(reverseGeocodeTimeout);
        }

        set(() => ({ 
            addressStatus: 'pending',
            addressNextLookupAt: Date.now() + REVERSE_GEOCODE_DEBOUNCE_MS
        }));

        reverseGeocodeTimeout = setTimeout(async () => {
            set(() => ({ 
                addressStatus: 'resolving',
                addressNextLookupAt: null
            }));

            if (debugLogging) {
                console.log(`IRIS: Reverse geocoding for ${lat}, ${lng} ${portalId ? `(portal: ${portalId})` : ''}`);
            }

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
                if (response.ok) {
                    const data = await response.json() as NominatimResponse;
                    if (data.display_name) {
                        const newAddress = data.display_name;
                        set((state): Partial<IRISState> => ({ 
                            discoveredLocation: portalId ? state.discoveredLocation : newAddress,
                            portalAddresses: portalId ? { ...state.portalAddresses, [portalId]: newAddress } as Record<string, string> : state.portalAddresses,
                            lastResolvedLatLng: portalId ? state.lastResolvedLatLng : { lat, lng },
                            addressStatus: 'idle'
                        }));
                    }
                }
            } catch (e) {
                console.warn('IRIS: Reverse geocoding failed', e);
                set(() => ({ addressStatus: 'idle' }));
            }
        }, REVERSE_GEOCODE_DEBOUNCE_MS);
    },
    updateMapState: (lat, lng, zoom, bounds) => set((state) => {
        const nextBounds = bounds ?? state.mapState.bounds;
        const currentBounds = state.mapState.bounds;
        const sameBounds = !nextBounds && !currentBounds ? true : !!nextBounds && !!currentBounds &&
            nextBounds.minLatE6 === currentBounds.minLatE6 &&
            nextBounds.minLngE6 === currentBounds.minLngE6 &&
            nextBounds.maxLatE6 === currentBounds.maxLatE6 &&
            nextBounds.maxLngE6 === currentBounds.maxLngE6;

        if (
            Math.abs(state.mapState.lat - lat) < 0.000001 &&
            Math.abs(state.mapState.lng - lng) < 0.000001 &&
            Math.abs(state.mapState.zoom - zoom) < 0.001 &&
            sameBounds
        ) {
            return state;
        }

        return {
            mapState: {
                lat,
                lng,
                zoom,
                // Intel sync updates do not always carry bounds; preserve the last
                // known viewport so viewport-dependent UI (for example missions)
                // does not regress back to an uninitialized state.
                bounds: nextBounds,
            }
        };
    }),
    selectPortal: (id) => set(() => ({ selectedPortalId: id, selectedFieldId: null, selectedLinkId: null })),
    selectField: (id) => set(() => ({ selectedFieldId: id, selectedPortalId: null, selectedLinkId: null })),
    selectLink: (id) => set(() => ({ selectedLinkId: id, selectedPortalId: null, selectedFieldId: null })),
    setSelectedPluginFeature: (feature) => set(() => ({ selectedPluginFeature: feature })),
    togglePlanningMode: () => set((state) => ({
        planningMode: !state.planningMode,
        planningAnchorPortalId: null,
        planningPortalPath: [],
        selectedPlannedItemId: null,
        selectedPlannedItemType: null,
    })),
    setPlanningMode: (enabled) => set(() => ({
        planningMode: enabled,
        planningAnchorPortalId: null,
        planningPortalPath: [],
        selectedPlannedItemId: null,
        selectedPlannedItemType: null,
    })),
    setPlanningTool: (tool) => set(() => ({
        planningMode: true,
        planningTool: tool,
        planningAnchorPortalId: null,
        planningPortalPath: [],
        selectedPlannedItemId: null,
        selectedPlannedItemType: null,
        ...(tool === 'links' ? { plannedShowLinks: true } : { plannedShowMarkers: true }),
    })),
    selectPlanningPortal: (portalId) => set((state) => {
        if (!state.planningMode) {
            return state;
        }

        if (state.planningTool === 'markers') {
            return { planningAnchorPortalId: portalId, planningPortalPath: [] };
        }

        const lastPortalId = state.planningPortalPath[state.planningPortalPath.length - 1] ?? null;
        if (lastPortalId === portalId) {
            return state;
        }

        return {
            planningAnchorPortalId: portalId,
            planningPortalPath: [...state.planningPortalPath, portalId],
        };
    }),
    createPlannedLink: () => set((state) => {
        if (state.planningPortalPath.length < 2) {
            return state;
        }

        const createdAt = Date.now();
        const plannedLinks = [...state.plannedLinks];

        for (let index = 0; index < state.planningPortalPath.length - 1; index += 1) {
            const fromPortalId = state.planningPortalPath[index];
            const toPortalId = state.planningPortalPath[index + 1];
            const existing = plannedLinks.some((link) =>
                (link.fromPortalId === fromPortalId && link.toPortalId === toPortalId) ||
                (link.fromPortalId === toPortalId && link.toPortalId === fromPortalId)
            );

            if (existing) {
                continue;
            }

            plannedLinks.push({
                id: `planned-link:${fromPortalId}:${toPortalId}:${createdAt}:${index}`,
                fromPortalId,
                toPortalId,
                createdAt,
            });
        }

        const lastPortalId = state.planningPortalPath[state.planningPortalPath.length - 1];

        return {
            planningAnchorPortalId: lastPortalId,
            planningPortalPath: [lastPortalId],
            plannedLinks,
        };
    }),
    clearPlanningSelection: () => set(() => ({
        planningAnchorPortalId: null,
        planningPortalPath: [],
        selectedPlannedItemId: null,
        selectedPlannedItemType: null,
    })),
    addPlannedMarker: (lat, lng, label, color = 'blue', portalId) => set((state) => {
        const createdAt = Date.now();
        const normalizedCoordinates = normalizePlannedMarkerCoordinates(lat, lng);
        if (!normalizedCoordinates) return state;

        const existingMarker = state.plannedMarkers.find((marker) => plannedMarkersMatch(marker, {
            ...normalizedCoordinates,
            portalId,
        }));

        if (existingMarker) {
            const trimmedLabel = label?.trim();

            return {
                plannedMarkers: state.plannedMarkers.map((marker) => marker.id === existingMarker.id
                    ? {
                        ...marker,
                        label: trimmedLabel && isGenericPlannedMarkerLabel(marker.label) ? trimmedLabel : marker.label,
                        color,
                        portalId: marker.portalId ?? portalId,
                    }
                    : marker
                ),
                selectedPlannedItemId: existingMarker.id,
                selectedPlannedItemType: 'marker',
            };
        }

        return {
            plannedMarkers: [
                ...state.plannedMarkers,
                {
                    id: `planned-marker:${createdAt}`,
                    lat: normalizedCoordinates.lat,
                    lng: normalizedCoordinates.lng,
                    label: label || `Marker ${state.plannedMarkers.length + 1}`,
                    color,
                    portalId,
                    createdAt,
                },
            ],
        };
    }),
    renamePlannedMarker: (id, label) => set((state) => {
        const trimmedLabel = label.trim();
        if (!trimmedLabel) return state;

        return {
            plannedMarkers: state.plannedMarkers.map((marker) => marker.id === id
                ? {...marker, label: trimmedLabel}
                : marker
            ),
        };
    }),
    deletePlannedMarker: (id) => set((state) => ({
        plannedMarkers: state.plannedMarkers.filter((marker) => marker.id !== id),
        selectedPlannedItemId: state.selectedPlannedItemId === id ? null : state.selectedPlannedItemId,
        selectedPlannedItemType: state.selectedPlannedItemId === id ? null : state.selectedPlannedItemType,
    })),
    selectPlannedMarker: (id) => set(() => ({
        selectedPlannedItemId: id,
        selectedPlannedItemType: 'marker',
    })),
    selectPlannedItem: (id, type = null) => set((state) => {
        if (!id || !type) {
            return {
                selectedPlannedItemId: null,
                selectedPlannedItemType: null,
            };
        }

        if (state.selectedPlannedItemId === id && state.selectedPlannedItemType === type) {
            return {
                selectedPlannedItemId: null,
                selectedPlannedItemType: null,
            };
        }

        return {
            selectedPlannedItemId: id,
            selectedPlannedItemType: type,
        };
    }),
    deleteSelectedPlannedItem: () => set((state) => {
        if (!state.selectedPlannedItemId || !state.selectedPlannedItemType) {
            return state;
        }

        if (state.selectedPlannedItemType === 'link') {
            return {
                plannedLinks: state.plannedLinks.filter((link) => link.id !== state.selectedPlannedItemId),
                selectedPlannedItemId: null,
                selectedPlannedItemType: null,
            };
        }

        return {
            plannedMarkers: state.plannedMarkers.filter((marker) => marker.id !== state.selectedPlannedItemId),
            selectedPlannedItemId: null,
            selectedPlannedItemType: null,
        };
    }),
    undoPlannedItem: (tool) => set((state) => {
        if (tool === 'links') {
            return { plannedLinks: state.plannedLinks.slice(0, -1), selectedPlannedItemId: null, selectedPlannedItemType: null };
        }

        if (tool === 'markers') {
            return { plannedMarkers: state.plannedMarkers.slice(0, -1), selectedPlannedItemId: null, selectedPlannedItemType: null };
        }

        const latestLink = state.plannedLinks[state.plannedLinks.length - 1] ?? null;
        const latestMarker = state.plannedMarkers[state.plannedMarkers.length - 1] ?? null;

        if (!latestLink && !latestMarker) {
            return state;
        }

        if (latestLink && (!latestMarker || latestLink.createdAt >= latestMarker.createdAt)) {
            return { plannedLinks: state.plannedLinks.slice(0, -1), selectedPlannedItemId: null, selectedPlannedItemType: null };
        }

        return { plannedMarkers: state.plannedMarkers.slice(0, -1), selectedPlannedItemId: null, selectedPlannedItemType: null };
    }),
    clearPlannedLinks: (tool) => set(() => {
        if (tool === 'links') {
            return {
                plannedLinks: [],
                planningAnchorPortalId: null,
                planningPortalPath: [],
                selectedPlannedItemId: null,
                selectedPlannedItemType: null,
            };
        }

        if (tool === 'markers') {
            return {
                plannedMarkers: [],
                planningAnchorPortalId: null,
                planningPortalPath: [],
                selectedPlannedItemId: null,
                selectedPlannedItemType: null,
            };
        }

        return {
            plannedLinks: [],
            plannedMarkers: [],
            planningAnchorPortalId: null,
            planningPortalPath: [],
            selectedPlannedItemId: null,
            selectedPlannedItemType: null,
        };
    }),
    setActiveCommTab: (tab) => set(() => ({ activeCommTab: tab })),
    setCommSendPending: () => set(() => ({
        commSendStatus: 'sending',
        commSendError: null,
    })),
    setCommSendSuccess: () => set(() => ({
        commSendStatus: 'success',
        commSendError: null,
    })),
    setCommSendError: (error) => set(() => ({
        commSendStatus: 'error',
        commSendError: error,
    })),
    clearCommSendState: () => set(() => ({
        commSendStatus: 'idle',
        commSendError: null,
    })),
    setPasscodeRedeemPending: () => set(() => ({
        passcodeRedeemStatus: 'sending',
        passcodeRedeemError: null,
        passcodeRewards: null,
    })),
    setPasscodeRedeemSuccess: (rewards) => set(() => ({
        passcodeRedeemStatus: 'success',
        passcodeRedeemError: null,
        passcodeRewards: rewards,
    })),
    setPasscodeRedeemError: (error) => set(() => ({
        passcodeRedeemStatus: 'error',
        passcodeRedeemError: error,
        passcodeRewards: null,
    })),
    clearPasscodeRedeemState: () => set(() => ({
        passcodeRedeemStatus: 'idle',
        passcodeRedeemError: null,
        passcodeRewards: null,
    })),
    toggleVisualOverlay: (id) => set((state) => ({
        activeVisualOverlayIds: state.activeVisualOverlayIds.includes(id)
            ? state.activeVisualOverlayIds.filter((activeId) => activeId !== id)
            : [...state.activeVisualOverlayIds, id]
    })),
});

const createPlayerSlice: StateCreator<IRISState, [], [], PlayerSlice> = (set) => ({
    playerStats: null,
    gameScore: null,
    regionScore: null,
    hasSubscription: false,
    inventory: [],
    missionDetails: null,
    missionsInView: [],
    missionsPortalId: null,
    setPlayerStats: (stats) => set(() => ({ playerStats: stats })),
    setGameScore: (score) => set(() => ({ gameScore: score })),
    setRegionScore: (score) => set(() => ({ regionScore: score })),
    setHasSubscription: (has) => set(() => ({ hasSubscription: has })),
    setInventory: (items) => set(() => ({ inventory: items })),
    setInventoryItems: (items) => set(() => ({ inventory: items })),
    setMissionDetails: (mission) => set(() => ({ missionDetails: mission })),
    setMissionsInView: (missions) => set(() => ({ missionsInView: missions })),
    setMissionsPortalId: (portalId) => set(() => ({ missionsPortalId: portalId })),
});

const createDiagnosticsSlice: StateCreator<IRISState, [], [], DiagnosticsSlice> = (set) => ({
    activeRequests: 0,
    lastRequestUrl: '',
    failedRequests: [],
    successfulRequests: [],
    jsErrors: [],
    sessionStatus: 'ok',
    lastSessionError: null,
    endpointDiagnostics: createEmptyEndpointDiagnostics(),
    mapPerfDiagnostics: {
        viewport: null,
        htmlMarkers: null,
        frame: null,
    },
    uiRenderDiagnostics: {},
    mainThreadDiagnostics: {
        longTaskCount: 0,
        maxLongTaskMs: 0,
        lastLongTask: null,
        recentLongTasks: [],
    },
    domainErrors: [],
    endpointActivityLog: [],
    onRequestStart: (url) => set((state) => ({
        activeRequests: state.activeRequests + 1,
        lastRequestUrl: url,
        endpointActivityLog: [{
            time: Date.now(),
            endpoint: getEndpointKeyFromUrl(url),
            message: formatEndpointRequestActivityMessage(url),
        }, ...state.endpointActivityLog].slice(0, 50),
        endpointDiagnostics: {
            ...state.endpointDiagnostics,
            [getEndpointKeyFromUrl(url)]: {
                ...state.endpointDiagnostics[getEndpointKeyFromUrl(url)],
                status: 'in_flight',
                lastRequestAt: Date.now(),
                lastUrl: url,
            },
        },
    })),
    onRequestEnd: () => set((state) => ({
        activeRequests: Math.max(0, state.activeRequests - 1)
    })),
    addFailedRequest: (request) => set((state) => {
        const endpointKey = getEndpointKeyFromUrl(request.url);
        return {
            failedRequests: [request, ...state.failedRequests].slice(0, 50),
            endpointActivityLog: [{
                time: request.time,
                endpoint: endpointKey,
                message: formatEndpointErrorActivityMessage(request.status, request.statusText),
            }, ...state.endpointActivityLog].slice(0, 50),
            endpointDiagnostics: {
                ...state.endpointDiagnostics,
                [endpointKey]: {
                    ...state.endpointDiagnostics[endpointKey],
                    status: 'error',
                    lastErrorAt: request.time,
                    lastErrorStatus: request.status,
                    lastErrorText: request.statusText,
                    lastUrl: request.url,
                },
            },
        };
    }),
    clearFailedRequests: () => set({ failedRequests: [] }),
    addSuccessfulRequest: (request) => set((state) => {
        const endpointKey = getEndpointKeyFromUrl(request.url);
        const dedupedSuccessfulRequests = state.successfulRequests.filter((existing) => {
            const sameEndpoint = getEndpointKeyFromUrl(existing.url) === endpointKey;
            const withinWindow = Math.abs(request.time - existing.time) <= SUCCESS_DEDUP_WINDOW_MS;
            return !(sameEndpoint && withinWindow);
        });

        return {
            successfulRequests: [request, ...dedupedSuccessfulRequests].slice(0, 50),
            endpointActivityLog: [{
                time: request.time,
                endpoint: endpointKey,
                message: formatEndpointSuccessActivityMessage(request.url, request.isActive),
            }, ...state.endpointActivityLog].slice(0, 50),
            endpointDiagnostics: {
                ...state.endpointDiagnostics,
                [endpointKey]: {
                    ...state.endpointDiagnostics[endpointKey],
                    status: 'success',
                    lastSuccessAt: request.time,
                    lastActiveSuccessAt: request.isActive ? request.time : state.endpointDiagnostics[endpointKey].lastActiveSuccessAt,
                    lastPassiveSuccessAt: !request.isActive ? request.time : state.endpointDiagnostics[endpointKey].lastPassiveSuccessAt,
                    lastErrorAt: null,
                    lastErrorStatus: null,
                    lastErrorText: null,
                    lastUrl: request.url,
                },
            },
        };
    }),
    clearSuccessfulRequests: () => set({ successfulRequests: [] }),
    addJSError: (error) => set((state) => ({
        jsErrors: [error, ...state.jsErrors].slice(0, 50)
    })),
    clearJSErrors: () => set({ jsErrors: [] }),
    interactionLogs: [],
    addInteractionLog: (log) => set((state) => ({
        interactionLogs: [{ ...log, time: Date.now() }, ...state.interactionLogs].slice(0, 50)
    })),
    clearInteractionLogs: () => set({ interactionLogs: [] }),
    setInitialLoginRequired: (error) => set((state) => {
        if (
            state.sessionStatus === 'initial_login_required' &&
            state.lastSessionError?.url === error.url
        ) {
            return state;
        }

        return {
            sessionStatus: 'initial_login_required',
            lastSessionError: error,
        };
    }),
    setSessionExpired: (error) => set((state) => {
        if (
            state.sessionStatus === 'expired' &&
            state.lastSessionError?.url === error.url &&
            state.lastSessionError?.status === error.status
        ) {
            return state;
        }

        return {
            sessionStatus: 'expired',
            lastSessionError: error,
        };
    }),
    setSessionRecovering: () => set((state) => (
        state.sessionStatus === 'expired' || state.sessionStatus === 'initial_login_required'
            ? { sessionStatus: 'recovering' }
            : state
    )),
    setSessionRecovered: () => set((state) => (
        state.sessionStatus === 'ok' && state.lastSessionError === null
            ? state
            : {
                sessionStatus: 'ok',
                lastSessionError: null,
            }
    )),
    setEndpointNextAutoRefresh: (key, nextAutoRefreshAt) => set((state) => ({
        endpointDiagnostics: {
            ...state.endpointDiagnostics,
            [key]: {
                ...state.endpointDiagnostics[key],
                nextAutoRefreshAt,
            },
        },
    })),
    setEndpointMetadata: (key, metadata) => set((state) => ({
        endpointDiagnostics: {
            ...state.endpointDiagnostics,
            [key]: {
                ...state.endpointDiagnostics[key],
                ...metadata,
            },
        },
    })),
    addEndpointActivityLog: (entry) => set((state) => ({
        endpointActivityLog: [{
            time: entry.time ?? Date.now(),
            endpoint: entry.endpoint,
            message: entry.message,
        }, ...state.endpointActivityLog].slice(0, 50),
    })),
    clearEndpointActivityLog: () => set({ endpointActivityLog: [] }),
    setMapPerfSnapshot: (snapshot) => set((state) => ({
        mapPerfDiagnostics: {
            ...state.mapPerfDiagnostics,
            [snapshot.type]: snapshot,
        },
    })),
    recordUiRenderSample: (name, count) => set((state) => {
        const existing = state.uiRenderDiagnostics[name];
        const nextCount = Math.max(0, count);

        return {
            uiRenderDiagnostics: {
                ...state.uiRenderDiagnostics,
                [name]: {
                    name,
                    count: (existing?.count ?? 0) + nextCount,
                    lastCount: nextCount,
                    lastAt: Date.now(),
                },
            },
        };
    }),
    recordMainThreadLongTask: (task) => set((state) => {
        const durationMs = Math.max(0, Math.round(task.durationMs));
        const normalizedTask: MainThreadLongTask = {
            time: task.time,
            durationMs,
            source: task.source,
        };

        return {
            mainThreadDiagnostics: {
                longTaskCount: state.mainThreadDiagnostics.longTaskCount + 1,
                maxLongTaskMs: Math.max(state.mainThreadDiagnostics.maxLongTaskMs, durationMs),
                lastLongTask: normalizedTask,
                recentLongTasks: [
                    normalizedTask,
                    ...state.mainThreadDiagnostics.recentLongTasks,
                ].slice(0, 8),
            },
        };
    }),
    addDomainError: (error) => set((state) => ({
        domainErrors: [{
            ...error,
            time: error.time ?? Date.now(),
        }, ...state.domainErrors].slice(0, 20),
    })),
    clearDomainErrors: () => set({ domainErrors: [] }),
    clearEndpointDiagnostics: () => set((state) => ({
        endpointDiagnostics: Object.fromEntries(
            Object.entries(state.endpointDiagnostics).map(([key, entry]) => [
                key,
                {
                    ...createEmptyEndpointDiagnostics()[key as EndpointKey],
                    nextAutoRefreshAt: entry.nextAutoRefreshAt,
                },
            ]),
        ) as Record<EndpointKey, EndpointDiagnostics>,
    })),
});

const irisStore = createStore<IRISState>()(
    persist(
        subscribeWithSelector(
            (...a) => ({
                ...createSettingsSlice(...a),
                ...createEntitiesSlice(...a),
                ...createUISlice(...a),
                ...createPlayerSlice(...a),
                ...createDiagnosticsSlice(...a),
            }),
        ),
            {
                name: 'iris-settings',
                storage: createJSONStorage(() => globalThis.localStorage),
                partialize: (state) => ({
                    pluginStates: state.pluginStates,
                    themeId: state.themeId,
                    mapThemeId: state.mapThemeId,
                    layerShowFields: state.layerShowFields,
                    layerShowLinks: state.layerShowLinks,
                    layerShowOrnaments: state.layerShowOrnaments,
                    layerShowArtifacts: state.layerShowArtifacts,
                    filterShowResistance: state.filterShowResistance,
                    filterShowEnlightened: state.filterShowEnlightened,
                    filterShowMachina: state.filterShowMachina,
                    filterShowUnclaimedPortals: state.filterShowUnclaimedPortals,
                    filterShowLevel: state.filterShowLevel,
                    debugLogging: state.debugLogging,
                    showMockTools: state.showMockTools,
                    plannedShowLinks: state.plannedShowLinks,
                    plannedShowMarkers: state.plannedShowMarkers,
                    filterShowHealth: state.filterShowHealth,
                    portalHistoryLayers: state.portalHistoryLayers,
                    filterShowVisited: state.filterShowVisited,
                    filterShowCaptured: state.filterShowCaptured,
                    filterShowScanned: state.filterShowScanned,
                    allowRotation: state.allowRotation,
                    allowPitch: state.allowPitch,
                    discoveredLocation: state.discoveredLocation,
                    portalAddresses: state.portalAddresses,
                    lastResolvedLatLng: state.lastResolvedLatLng,
                    activeVisualOverlayIds: state.activeVisualOverlayIds,
                    plannedLinks: state.plannedLinks,
                    plannedMarkers: state.plannedMarkers,
                    mapState: {
                        lat: state.mapState.lat,
                        lng: state.mapState.lng,
                        zoom: state.mapState.zoom,
                    },
                } as IRISState),
                onRehydrateStorage: () => (state: IRISState | undefined): void => {
                    if (state) {
                        if (state.themeId === 'DEFAULT') {
                            state.themeId = 'INGRESS';
                        }
                        state.plannedMarkers = dedupePlannedMarkers(Array.isArray(state.plannedMarkers) ? state.plannedMarkers : []);
                        if (
                            state.selectedPlannedItemType === 'marker' &&
                            state.selectedPlannedItemId &&
                            !state.plannedMarkers.some((marker) => marker.id === state.selectedPlannedItemId)
                        ) {
                            state.selectedPlannedItemId = null;
                            state.selectedPlannedItemType = null;
                        }
                        state.rehydrated = true;
                    }
                }
            }
    ));

type StoreSelector<T> = (state: IRISState) => T;
type IRISUseStore = {
    (): IRISState;
    <T>(selector: StoreSelector<T>): T;
} & typeof irisStore;

function useIrisStore(): IRISState;
function useIrisStore<T>(selector: StoreSelector<T>): T;
function useIrisStore<T>(selector?: StoreSelector<T>): IRISState | T {
    return useSyncExternalStore(
        irisStore.subscribe,
        () => selector ? selector(irisStore.getState()) : irisStore.getState(),
    );
}

export const useStore = Object.assign(useIrisStore, irisStore) as IRISUseStore;
