import {create} from 'zustand';
import {subscribeWithSelector, persist} from 'zustand/middleware';

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

export interface Plext {
    id: string;
    time: number;
    text: string;
    markup: any[];
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
    error?: any;
    time: number;
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

interface IRISState {
    portals: Record<string, Portal>;
    links: Record<string, Link>;
    fields: Record<string, Field>;
    plexts: Plext[];
    statsItems: Record<string, StatsItem>;
    menuItems: MenuItem[];
    pluginStates: Record<string, boolean>;
    pluginFeatures: GeoJSON.FeatureCollection;
    mapState: {
        lat: number;
        lng: number;
        zoom: number;
    };
    addPortal: (portal: Portal) => void;
    updatePortals: (portals: Portal[]) => void;
    updateLinks: (links: Link[]) => void;
    updateFields: (fields: Field[]) => void;
    updatePlexts: (plexts: Plext[]) => void;
    addStatsItem: (item: StatsItem) => void;
    removeStatsItem: (id: string) => void;
    addMenuItem: (item: MenuItem) => void;
    removeMenuItem: (id: string) => void;
    setPluginEnabled: (id: string, enabled: boolean) => void;
    setPluginFeatures: (features: GeoJSON.FeatureCollection) => void;
    updateMapState: (lat: number, lng: number, zoom: number) => void;
    removeEntities: (guids: string[]) => void;

    selectedPortalId: string | null;
    selectPortal: (id: string | null) => void;

    selectedPluginFeature: any | null;
    setSelectedPluginFeature: (feature: any | null) => void;

    playerStats: PlayerStats | null;
    setPlayerStats: (stats: PlayerStats) => void;

    gameScore: GameScore | null;
    setGameScore: (score: GameScore) => void;

    regionScore: RegionScore | null;
    setRegionScore: (score: RegionScore) => void;

    hasSubscription: boolean;
    setHasSubscription: (has: boolean) => void;

    inventory: InventoryItem[];
    setInventory: (items: InventoryItem[]) => void;

    themeId: string;
    setTheme: (id: string) => void;

    mapThemeId: string;
    setMapTheme: (id: string) => void;

    activeRequests: number;
    lastRequestUrl: string;
    onRequestStart: (url: string) => void;
    onRequestEnd: () => void;
    failedRequests: FailedRequest[];
    addFailedRequest: (request: FailedRequest) => void;
    clearFailedRequests: () => void;
    successfulRequests: SuccessfulRequest[];
    addSuccessfulRequest: (request: SuccessfulRequest) => void;
    clearSuccessfulRequests: () => void;
    jsErrors: JSError[];
    addJSError: (error: JSError) => void;
    clearJSErrors: () => void;

    // Layer visibility states
    showFields: boolean;
    showLinks: boolean;
    showResistance: boolean;
    showEnlightened: boolean;
    showMachina: boolean;
    showUnclaimedPortals: boolean;
    showLevel: Record<number, boolean>;
    showHealth: Record<number, boolean>;

    // Layer visibility actions
    toggleShowFields: () => void;
    toggleShowLinks: () => void;
    toggleShowResistance: () => void;
    toggleShowEnlightened: () => void;
    toggleShowMachina: () => void;
    toggleShowUnclaimedPortals: () => void;
    toggleShowLevel: (level: number) => void;
    toggleShowHealth: (bucket: number) => void;

    debugLogging: boolean;
    toggleDebugLogging: () => void;

    rehydrated: boolean;

    activeCommTab: string;
    setActiveCommTab: (tab: string) => void;
}

export const useStore = create<IRISState>()(
    subscribeWithSelector(
        persist(
            (set) => ({
    portals: {},
    links: {},
    fields: {},
    plexts: [],
    statsItems: {},
    menuItems: [],
    pluginStates: {},
    pluginFeatures: { type: 'FeatureCollection', features: [] },
    mapState: {
        lat: 0,
        lng: 0,
        zoom: 3,
    },
    addPortal: (portal) =>
        set((state) => ({
            portals: {...state.portals, [portal.id]: portal}
        })),
    updatePortals: (newPortals) =>
        set((state) => {
            const portals = {...state.portals};
            newPortals.forEach((p) => {
                portals[p.id] = {...portals[p.id], ...p};
            });
            return {portals};
        }),
    updateLinks: (newLinks) =>
        set((state) => {
            const links = {...state.links};
            newLinks.forEach((l) => {
                links[l.id] = l;
            });
            return {links};
        }),
    updateFields: (newFields) =>
        set((state) => {
            const fields = {...state.fields};
            newFields.forEach((f) => {
                fields[f.id] = f;
            });
            return {fields};
        }),
    updatePlexts: (newPlexts) =>
        set((state) => {
            // Keep unique plexts, sorted by time descending
            const all = [...state.plexts, ...newPlexts];
            const unique = Array.from(new Map(all.map(p => [p.id, p])).values());
            unique.sort((a, b) => b.time - a.time);
            // Keep last 1000 for performance and history
            return { plexts: unique.slice(0, 1000) };
        }),
    addStatsItem: (item) =>
        set((state) => ({
            statsItems: {...state.statsItems, [item.id]: item}
        })),
    removeStatsItem: (id) =>
        set((state) => {
            const statsItems = {...state.statsItems};
            delete statsItems[id];
            return {statsItems};
        }),
    addMenuItem: (item) =>
        set((state) => ({
            menuItems: [...state.menuItems, item]
        })),
    removeMenuItem: (id) =>
        set((state) => ({
            menuItems: state.menuItems.filter((i) => i.id !== id)
        })),
    setPluginEnabled: (id, enabled) =>
        set((state) => ({
            pluginStates: { ...state.pluginStates, [id]: enabled }
        })),
    setPluginFeatures: (features) =>
        set(() => ({
            pluginFeatures: features
        })),
    updateMapState: (lat, lng, zoom) =>
        set(() => ({
            mapState: {lat, lng, zoom}
        })),
    removeEntities: (guids) =>
        set((state) => {
            const portals = { ...state.portals };
            const links = { ...state.links };
            const fields = { ...state.fields };
            let changed = false;

            guids.forEach((id) => {
                if (portals[id]) { delete portals[id]; changed = true; }
                if (links[id]) { delete links[id]; changed = true; }
                if (fields[id]) { delete fields[id]; changed = true; }
            });

            return changed ? { portals, links, fields } : state;
        }),
    selectedPortalId: null,
    selectPortal: (id) => set(() => ({ selectedPortalId: id })),
    selectedPluginFeature: null,
    setSelectedPluginFeature: (feature) => set(() => ({ selectedPluginFeature: feature })),
    playerStats: null,
    setPlayerStats: (stats) => set(() => ({ playerStats: stats })),

    gameScore: null,
    setGameScore: (score) => set(() => ({ gameScore: score })),

    regionScore: null,
    setRegionScore: (score) => set(() => ({ regionScore: score })),

    hasSubscription: false,
    setHasSubscription: (has) => set(() => ({ hasSubscription: has })),

    inventory: [],
    setInventory: (items: InventoryItem[]) => set(() => ({ inventory: items })),

    themeId: 'DEFAULT',
    setTheme: (id: string) => set(() => ({ themeId: id })),

    mapThemeId: 'DARK',
    setMapTheme: (id: string) => set(() => ({ mapThemeId: id })),

    activeRequests: 0,
    lastRequestUrl: '',
    onRequestStart: (url) => set((state) => ({ 
        activeRequests: state.activeRequests + 1,
        lastRequestUrl: url
    })),
    onRequestEnd: () => set((state) => ({ 
        activeRequests: Math.max(0, state.activeRequests - 1) 
    })),
    failedRequests: [],
    addFailedRequest: (request) => set((state) => ({ 
        failedRequests: [request, ...state.failedRequests].slice(0, 50) 
    })),
    clearFailedRequests: () => set({ failedRequests: [] }),
    successfulRequests: [],
    addSuccessfulRequest: (request) => set((state) => ({ 
        successfulRequests: [request, ...state.successfulRequests].slice(0, 50) 
    })),
    clearSuccessfulRequests: () => set({ successfulRequests: [] }),
    jsErrors: [],
    addJSError: (error) => set((state) => ({ 
        jsErrors: [error, ...state.jsErrors].slice(0, 50) 
    })),
    clearJSErrors: () => set({ jsErrors: [] }),

    // Initialize layer visibility states
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

    // Implement layer visibility actions
    toggleShowFields: () => set((state) => ({ showFields: !state.showFields })),
    toggleShowLinks: () => set((state) => ({ showLinks: !state.showLinks })),
    toggleShowResistance: () => set((state) => ({ showResistance: !state.showResistance })),
    toggleShowEnlightened: () => set((state) => ({ showEnlightened: !state.showEnlightened })),
    toggleShowMachina: () => set((state) => ({ showMachina: !state.showMachina })),
    toggleShowUnclaimedPortals: () => set((state) => ({ showUnclaimedPortals: !state.showUnclaimedPortals })),
    toggleShowLevel: (level: number) => set((state) => ({
        showLevel: {
            ...state.showLevel,
            [level]: !state.showLevel[level],
        },
    })),
    toggleShowHealth: (bucket: number) => set((state) => ({
        showHealth: {
            ...state.showHealth,
            [bucket]: !state.showHealth[bucket],
        },
    })),

    debugLogging: false,
    toggleDebugLogging: () => set((state) => ({ debugLogging: !state.debugLogging })),

    rehydrated: false,

    activeCommTab: 'ALL',
    setActiveCommTab: (tab) => set({ activeCommTab: tab }),
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
            activeCommTab: state.activeCommTab,
            showHealth: state.showHealth,
            hasSubscription: state.hasSubscription,
        }),
        onRehydrateStorage: () => (state) => {
            if (state) state.rehydrated = true;
        }
    }
)));
