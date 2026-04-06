import { create, StateCreator } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';

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
    stats: Record<string, string>;
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
    hasMissionsStartingHere?: boolean;
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

export interface Field {
    id: string;
    team: string;
    points: { lat: number; lng: number }[];
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
    showFields: boolean;
    showLinks: boolean;
    showResistance: boolean;
    showEnlightened: boolean;
    showMachina: boolean;
    showUnclaimedPortals: boolean;
    showLevel: Record<number, boolean>;
    showHealth: Record<number, boolean>;
    showVisited: boolean;
    showCaptured: boolean;
    showScanned: boolean;
    debugLogging: boolean;
}

export const DEFAULT_SETTINGS: IRISSettings = {
    pluginStates: {},
    themeId: 'INGRESS',
    mapThemeId: 'DARK',
    showFields: true,
    showLinks: true,
    showResistance: true,
    showEnlightened: true,
    showMachina: true,
    showUnclaimedPortals: true,
    showLevel: {
        1: true, 2: true, 3: true, 4: true,
        5: true, 6: true, 7: true, 8: true,
    },
    showHealth: {
        25: true, 50: true, 75: true, 100: true,
    },
    showVisited: true,
    showCaptured: true,
    showScanned: true,
    debugLogging: false,
};

// Slice Types
interface SettingsSlice extends IRISSettings {
    setPluginEnabled: (id: string, enabled: boolean) => void;
    setTheme: (id: string) => void;
    setMapTheme: (id: string) => void;
    toggleShowFields: () => void;
    toggleShowLinks: () => void;
    toggleShowResistance: () => void;
    toggleShowEnlightened: () => void;
    toggleShowMachina: () => void;
    toggleShowUnclaimedPortals: () => void;
    toggleShowLevel: (level: number) => void;
    toggleShowHealth: (bucket: number) => void;
    toggleShowVisited: () => void;
    toggleShowCaptured: () => void;
    toggleShowScanned: () => void;
    toggleDebugLogging: () => void;
}

interface EntitiesSlice {
    portals: Record<string, Portal>;
    links: Record<string, Link>;
    fields: Record<string, Field>;
    artifacts: Record<string, Artifact>;
    plexts: Plext[];
    addPortal: (portal: Portal) => void;
    updatePortals: (portals: Partial<Portal>[]) => void;
    updateLinks: (links: Partial<Link>[]) => void;
    updateFields: (fields: Partial<Field>[]) => void;
    updateArtifacts: (artifacts: Artifact[]) => void;
    updatePlexts: (plexts: Plext[]) => void;
    removeEntities: (guids: string[]) => void;
}

interface UISlice {
    statsItems: Record<string, StatsItem>;
    menuItems: MenuItem[];
    pluginFeatures: GeoJSON.FeatureCollection;
    discoveredLocation: string | null;
    lastResolvedLatLng: { lat: number; lng: number } | null;
    addressStatus: 'idle' | 'pending' | 'resolving';
    addressNextLookupAt: number | null;
    mapState: {
        lat: number;
        lng: number;
        zoom: number;
        bounds?: {
            minLatE6: number;
            minLngE6: number;
            maxLatE6: number;
            maxLngE6: number;
        };
    };
    selectedPortalId: string | null;
    selectedPluginFeature: GeoJSON.Feature | null;
    activeCommTab: string;
    commSendStatus: 'idle' | 'sending' | 'success' | 'error';
    commSendError: string | null;
    passcodeRedeemStatus: 'idle' | 'sending' | 'success' | 'error';
    passcodeRedeemError: string | null;
    passcodeRewards: PasscodeRewards | null;
    rehydrated: boolean;
    addStatsItem: (item: StatsItem) => void;
    removeStatsItem: (id: string) => void;
    addMenuItem: (item: MenuItem) => void;
    removeMenuItem: (id: string) => void;
    setPluginFeatures: (features: GeoJSON.FeatureCollection) => void;
    setDiscoveredLocation: (location: string | null) => void;
    reverseGeocode: (lat: number, lng: number) => Promise<void>;
    updateMapState: (lat: number, lng: number, zoom: number, bounds?: {
        minLatE6: number;
        minLngE6: number;
        maxLatE6: number;
        maxLngE6: number;
    }) => void;
    selectPortal: (id: string | null) => void;
    setSelectedPluginFeature: (feature: GeoJSON.Feature | null) => void;
    setActiveCommTab: (tab: string) => void;
    setCommSendPending: () => void;
    setCommSendSuccess: () => void;
    setCommSendError: (error: string) => void;
    clearCommSendState: () => void;
    setPasscodeRedeemPending: () => void;
    setPasscodeRedeemSuccess: (rewards: PasscodeRewards) => void;
    setPasscodeRedeemError: (error: string) => void;
    clearPasscodeRedeemState: () => void;
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
    sessionStatus: 'ok' | 'initial_login_required' | 'expired' | 'recovering';
    lastSessionError: SessionError | null;
    endpointDiagnostics: Record<EndpointKey, EndpointDiagnostics>;
    onRequestStart: (url: string) => void;
    onRequestEnd: () => void;
    addFailedRequest: (request: FailedRequest) => void;
    clearFailedRequests: () => void;
    addSuccessfulRequest: (request: SuccessfulRequest) => void;
    clearSuccessfulRequests: () => void;
    addJSError: (error: JSError) => void;
    clearJSErrors: () => void;
    setInitialLoginRequired: (error: SessionError) => void;
    setSessionExpired: (error: SessionError) => void;
    setSessionRecovering: () => void;
    setSessionRecovered: () => void;
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
    toggleShowFields: () => set((state) => ({ showFields: !state.showFields })),
    toggleShowLinks: () => set((state) => ({ showLinks: !state.showLinks })),
    toggleShowResistance: () => set((state) => ({ showResistance: !state.showResistance })),
    toggleShowEnlightened: () => set((state) => ({ showEnlightened: !state.showEnlightened })),
    toggleShowMachina: () => set((state) => ({ showMachina: !state.showMachina })),
    toggleShowUnclaimedPortals: () => set((state) => ({ showUnclaimedPortals: !state.showUnclaimedPortals })),
    toggleShowLevel: (level) => set((state) => ({
        showLevel: { ...state.showLevel, [level]: !state.showLevel[level] }
    })),
    toggleShowHealth: (bucket) => set((state) => ({
        showHealth: { ...state.showHealth, [bucket]: !state.showHealth[bucket] }
    })),
    toggleShowVisited: () => set((state) => ({ showVisited: !state.showVisited })),
    toggleShowCaptured: () => set((state) => ({ showCaptured: !state.showCaptured })),
    toggleShowScanned: () => set((state) => ({ showScanned: !state.showScanned })),
    toggleDebugLogging: () => set((state) => ({ debugLogging: !state.debugLogging })),
});

const createEntitiesSlice: StateCreator<IRISState, [], [], EntitiesSlice> = (set) => ({
    portals: {},
    links: {},
    fields: {},
    artifacts: {},
    plexts: [],
    addPortal: (portal) => set((state) => ({
        portals: { ...state.portals, [portal.id]: portal }
    })),
    updatePortals: (newPortals) => set((state) => {
        const portals = { ...state.portals };
        newPortals.forEach((p) => {
            if (!p.id) return;
            portals[p.id] = { ...portals[p.id], ...p } as Portal;
        });
        return { portals };
    }),
    updateLinks: (newLinks) => set((state) => {
        const links = { ...state.links };
        newLinks.forEach((l) => {
            if (!l.id) return;
            links[l.id] = { ...links[l.id], ...l } as Link;
        });
        return { links };
    }),
    updateFields: (newFields) => set((state) => {
        const fields = { ...state.fields };
        newFields.forEach((f) => {
            if (!f.id) return;
            fields[f.id] = { ...fields[f.id], ...f } as Field;
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
    updatePlexts: (newPlexts) => set((state) => {
        const all = [...state.plexts, ...newPlexts];
        const unique = Array.from(new Map(all.map(p => [p.id, p])).values());
        unique.sort((a, b) => b.time - a.time);
        return { plexts: unique.slice(0, 1000) };
    }),
    removeEntities: (guids) => set((state) => {
        let portals = { ...state.portals };
        let links = { ...state.links };
        let fields = { ...state.fields };
        let artifacts = { ...state.artifacts };
        let changed = false;
        guids.forEach((id) => {
            if (portals[id]) {
                const { [id]: _, ...rest } = portals;
                portals = rest;
                changed = true;
            }
            if (links[id]) {
                const { [id]: _, ...rest } = links;
                links = rest;
                changed = true;
            }
            if (fields[id]) {
                const { [id]: _, ...rest } = fields;
                fields = rest;
                changed = true;
            }
            if (artifacts[id]) {
                const { [id]: _, ...rest } = artifacts;
                artifacts = rest;
                changed = true;
            }
        });
        return changed ? { portals, links, fields, artifacts } : state;
    }),
});

const createUISlice: StateCreator<IRISState, [], [], UISlice> = (set) => ({
    statsItems: {},
    menuItems: [],
    pluginFeatures: { type: 'FeatureCollection', features: [] },
    discoveredLocation: null,
    lastResolvedLatLng: null,
    addressStatus: 'idle',
    addressNextLookupAt: null,
    mapState: { lat: 0, lng: 0, zoom: 3 },
    selectedPortalId: null,
    selectedPluginFeature: null,
    activeCommTab: 'ALL',
    commSendStatus: 'idle',
    commSendError: null,
    passcodeRedeemStatus: 'idle',
    passcodeRedeemError: null,
    passcodeRewards: null,
    rehydrated: false,
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
    setPluginFeatures: (features) => set(() => ({ pluginFeatures: features })),
    setDiscoveredLocation: (location) => set(() => ({ discoveredLocation: location })),
    reverseGeocode: async (lat: number, lng: number): Promise<void> => {
        const { lastResolvedLatLng, debugLogging } = useStore.getState();
        
        // Use higher precision (0.000001 is ~11cm) to ensure search jumps trigger lookup
        if (lastResolvedLatLng &&
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
                console.log(`IRIS: Reverse geocoding for ${lat}, ${lng}`);
            }

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`);
                if (response.ok) {
                    const data = await response.json() as NominatimResponse;
                    if (data.display_name) {
                        set(() => ({ 
                            discoveredLocation: data.display_name,
                            lastResolvedLatLng: { lat, lng },
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
    updateMapState: (lat, lng, zoom, bounds) => set(() => ({
        mapState: { lat, lng, zoom, bounds }
    })),
    selectPortal: (id) => set(() => ({ selectedPortalId: id })),
    setSelectedPluginFeature: (feature) => set(() => ({ selectedPluginFeature: feature })),
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
    onRequestStart: (url) => set((state) => ({
        activeRequests: state.activeRequests + 1,
        lastRequestUrl: url,
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
            endpointDiagnostics: {
                ...state.endpointDiagnostics,
                [endpointKey]: {
                    ...state.endpointDiagnostics[endpointKey],
                    status: 'success',
                    lastSuccessAt: request.time,
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
    clearEndpointDiagnostics: () => set({ endpointDiagnostics: createEmptyEndpointDiagnostics() }),
});

export const useStore = create<IRISState>()(
    subscribeWithSelector(
        persist(
            (...a) => ({
                ...createSettingsSlice(...a),
                ...createEntitiesSlice(...a),
                ...createUISlice(...a),
                ...createPlayerSlice(...a),
                ...createDiagnosticsSlice(...a),
            }),
            {
                name: 'iris-settings',
                partialize: (state) => ({
                    pluginStates: state.pluginStates,
                    themeId: state.themeId,
                    mapThemeId: state.mapThemeId,
                    showFields: state.showFields,
                    showLinks: state.showLinks,
                    showResistance: state.showResistance,
                    showEnlightened: state.showEnlightened,
                    showMachina: state.showMachina,
                    showUnclaimedPortals: state.showUnclaimedPortals,
                    showLevel: state.showLevel,
                    debugLogging: state.debugLogging,
                    showHealth: state.showHealth,
                    showVisited: state.showVisited,
                    showCaptured: state.showCaptured,
                    showScanned: state.showScanned,
                    discoveredLocation: state.discoveredLocation,
                    lastResolvedLatLng: state.lastResolvedLatLng,
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
                        state.rehydrated = true;
                    }
                }
            }
        )));
