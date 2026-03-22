import {create} from 'zustand';

export interface PlayerStats {
    nickname: string;
    level: number | null;
    ap: number | null;
    team: string;
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

export interface StatsItem {
    id: string;
    label: string;
    value: string | (() => string);
}

interface IRISState {
    portals: Record<string, Portal>;
    links: Record<string, Link>;
    fields: Record<string, Field>;
    statsItems: Record<string, StatsItem>;
    mapState: {
        lat: number;
        lng: number;
        zoom: number;
    };
    addPortal: (portal: Portal) => void;
    updatePortals: (portals: Portal[]) => void;
    updateLinks: (links: Link[]) => void;
    updateFields: (fields: Field[]) => void;
    addStatsItem: (item: StatsItem) => void;
    removeStatsItem: (id: string) => void;
    updateMapState: (lat: number, lng: number, zoom: number) => void;

    selectedPortalId: string | null;
    selectPortal: (id: string | null) => void;

    playerStats: PlayerStats | null;
    setPlayerStats: (stats: PlayerStats) => void;
}

export const useStore = create<IRISState>((set) => ({
    portals: {},
    links: {},
    fields: {},
    statsItems: {},
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
    updateMapState: (lat, lng, zoom) =>
        set(() => ({
            mapState: {lat, lng, zoom}
        })),
    selectedPortalId: null,
    selectPortal: (id) => set(() => ({ selectedPortalId: id })),
    playerStats: null,
    setPlayerStats: (stats) => set(() => ({ playerStats: stats })),
}));
