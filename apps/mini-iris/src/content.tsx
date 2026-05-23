import { render, h, Fragment } from 'preact';
import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks';
import { MockDataGenerator } from './MockDataGenerator';
import { useStore, getMinLevelForZoom, getGridSizeForZoom, Portal, Link, Field, type InventoryItem, type PlextRequestBounds } from '@iris/core';
import { TacticalUI } from './TacticalUI';
import { MAP_STYLES, type MapStyleName } from './MapConstants';
import { LaunchButton } from './LaunchButton';
import { MapContainer } from './MapContainer';
import { usePatterns } from './usePatterns';
import { useIntelMessages } from './useIntelMessages';
import { useMapRenderer } from './useMapRenderer';
import { useScores } from './useScores';
import { usePlayerStats } from './usePlayerStats';
import { usePlayerTracker, type PlayerAction, type PlayerHistory } from './usePlayerTracker';
import { useEndpointTelemetry } from './useEndpointTelemetry';
import { throttle } from './GeoUtils';
import { isEndpointStateMessage, numberOrNull, stringOrNull } from './messages';
import { DEFAULT_PORTAL_HISTORY_LAYERS, nextPortalHistoryMode, type PortalHistoryKey, type PortalHistoryLayerState, type PortalHistoryMode } from './portalHistory';
import type { MiniFrameStats, MiniRenderStats } from './diagnostics';
import {
    MINI_PAGE_MAP_EVENT,
    postMiniPageMapCommand,
    type MiniMapBounds,
    type MiniMapView,
    type MiniPageMapEventMessage,
} from './pageMapProtocol';

console.log("Mini IRIS (TS): Tactical Overlay | v1.3.35 | TypeScript 6 Test");

const DEFAULT_MAP_CENTER: [number, number] = [4.8952, 52.3702];
const DEFAULT_MAP_ZOOM = 13;
const MAP_STATE_STORAGE_KEY = 'iris-poc-map-state';
const MAP_STYLE_STORAGE_KEY = 'iris-poc-map-style';
const PORTAL_HISTORY_STORAGE_KEY = 'iris-poc-portal-history-layers';
const KEY_OVERLAY_STORAGE_KEY = 'iris-poc-key-overlay-enabled';
const PORTAL_LEVEL_COLOR_STORAGE_KEY = 'iris-poc-portal-level-color-enabled';
const PORTAL_HEALTH_COLOR_STORAGE_KEY = 'iris-poc-portal-health-color-enabled';
const MINI_IRIS_OPEN_STORAGE_KEY = 'iris-poc-mini-iris-open';
const MAP_STATE_COOKIE_KEY = 'iris_poc_map_state';
const EXPERIMENTAL_PREFS_STORAGE_KEY = 'mini-iris:preferences:v1';
const EXPERIMENTAL_PREFS_STORAGE_KEY_V2 = 'mini-iris:preferences:v2';

// Keep preferences as small standalone keys; avoid a broad state object that can affect map lifecycle.

interface SavedMapState {
    lat: number;
    lng: number;
    zoom: number;
}

type SelectedEntity = { type: 'portal'; data: Portal } | { type: 'link'; data: Link } | { type: 'field'; data: Field };
interface MiniEntityCounts {
    portals: number;
    links: number;
    fields: number;
    players: number;
}

const EMPTY_PLAYER_HISTORIES = new Map<string, PlayerHistory>();
const EMPTY_ENTITY_COUNTS: MiniEntityCounts = {
    portals: 0,
    links: 0,
    fields: 0,
    players: 0,
};
const EMPTY_FRAME_STATS: MiniFrameStats = {
    avgMs: 0,
    maxMs: 0,
    fps: 0,
    slowFrames: 0,
    sampleCount: 0,
    updatedAt: 0,
};

function readSavedMapState(): SavedMapState | null {
    try {
        const raw = window.localStorage.getItem(MAP_STATE_STORAGE_KEY);

        if (!raw) return null;

        const parsed = JSON.parse(raw) as Partial<SavedMapState>;
        if (
            typeof parsed.lat !== 'number' ||
            typeof parsed.lng !== 'number' ||
            typeof parsed.zoom !== 'number'
        ) {
            return null;
        }

        return {
            lat: parsed.lat,
            lng: parsed.lng,
            zoom: parsed.zoom,
        };
    } catch {
        return null;
    }
}

function writeSavedMapState(state: SavedMapState): void {
    try {
        const serialized = JSON.stringify(state);
        window.localStorage.setItem(MAP_STATE_STORAGE_KEY, serialized);
    } catch {
        // Ignore storage failures.
    }
}

function createFallbackBounds(state: SavedMapState): MiniMapBounds {
    const span = Math.max(0.002, 0.18 / (2 ** Math.max(0, state.zoom - 8)));
    return {
        south: state.lat - span,
        west: state.lng - span,
        north: state.lat + span,
        east: state.lng + span,
    };
}

function createMapView(state: SavedMapState, bounds = createFallbackBounds(state)): MiniMapView {
    return {
        ...state,
        bounds,
    };
}

function readSavedMapStyle(): MapStyleName {
    try {
        const raw = window.localStorage.getItem(MAP_STYLE_STORAGE_KEY);
        return raw && raw in MAP_STYLES ? raw as MapStyleName : 'Dark';
    } catch {
        return 'Dark';
    }
}

function writeSavedMapStyle(style: string): void {
    if (!(style in MAP_STYLES)) return;
    try {
        window.localStorage.setItem(MAP_STYLE_STORAGE_KEY, style);
    } catch {
        // Ignore storage failures.
    }
}

function isPortalHistoryMode(value: unknown): value is PortalHistoryMode {
    return value === 'off' || value === 'highlight' || value === 'inverse';
}

function readSavedPortalHistoryLayers(): PortalHistoryLayerState {
    try {
        const raw = window.localStorage.getItem(PORTAL_HISTORY_STORAGE_KEY);
        if (!raw) return DEFAULT_PORTAL_HISTORY_LAYERS;
        const parsed = JSON.parse(raw) as Partial<Record<PortalHistoryKey, unknown>>;
        return {
            visited: isPortalHistoryMode(parsed.visited) ? parsed.visited : DEFAULT_PORTAL_HISTORY_LAYERS.visited,
            captured: isPortalHistoryMode(parsed.captured) ? parsed.captured : DEFAULT_PORTAL_HISTORY_LAYERS.captured,
            scanned: isPortalHistoryMode(parsed.scanned) ? parsed.scanned : DEFAULT_PORTAL_HISTORY_LAYERS.scanned,
        };
    } catch {
        return DEFAULT_PORTAL_HISTORY_LAYERS;
    }
}

function writeSavedPortalHistoryLayers(layers: PortalHistoryLayerState): void {
    try {
        window.localStorage.setItem(PORTAL_HISTORY_STORAGE_KEY, JSON.stringify(layers));
    } catch {
        // Ignore storage failures.
    }
}

function readSavedKeyOverlayEnabled(): boolean {
    try {
        return window.localStorage.getItem(KEY_OVERLAY_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function writeSavedKeyOverlayEnabled(enabled: boolean): void {
    try {
        window.localStorage.setItem(KEY_OVERLAY_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
        // Ignore storage failures.
    }
}

function readSavedPortalLevelColorEnabled(): boolean {
    try {
        return window.localStorage.getItem(PORTAL_LEVEL_COLOR_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function writeSavedPortalLevelColorEnabled(enabled: boolean): void {
    try {
        window.localStorage.setItem(PORTAL_LEVEL_COLOR_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
        // Ignore storage failures.
    }
}

function readSavedPortalHealthColorEnabled(): boolean {
    try {
        return window.localStorage.getItem(PORTAL_HEALTH_COLOR_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function writeSavedPortalHealthColorEnabled(enabled: boolean): void {
    try {
        window.localStorage.setItem(PORTAL_HEALTH_COLOR_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {
        // Ignore storage failures.
    }
}

function readSavedMiniIrisOpen(): boolean {
    try {
        return window.localStorage.getItem(MINI_IRIS_OPEN_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function writeSavedMiniIrisOpen(open: boolean): void {
    try {
        window.localStorage.setItem(MINI_IRIS_OPEN_STORAGE_KEY, open ? 'true' : 'false');
    } catch {
        // Ignore storage failures.
    }
}

function cleanupLegacyStorage(): void {
    try {
        document.cookie = `${MAP_STATE_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax; Secure`;
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY);
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY_V2);
    } catch {
        // Ignore storage cleanup failures.
    }
}

function TacticalOverlay(): h.JSX.Element {
    const [generator] = useState(() => new MockDataGenerator());
    const [loadedTileKeys] = useState(() => new Set<string>());
    const [events, setEvents] = useState<{time: string, msg: string}[]>([]);
    const [selected, setSelected] = useState<SelectedEntity | null>(null);
    const [selectionDetailsRequestKey, setSelectionDetailsRequestKey] = useState(0);
    const [savedMapState] = useState(() => readSavedMapState());
    const [initialMapStyle] = useState(() => readSavedMapStyle());
    const [initialPortalHistoryLayers] = useState(() => readSavedPortalHistoryLayers());
    const [initialKeyOverlayEnabled] = useState(() => readSavedKeyOverlayEnabled());
    const [initialPortalLevelColorEnabled] = useState(() => readSavedPortalLevelColorEnabled());
    const [initialPortalHealthColorEnabled] = useState(() => readSavedPortalHealthColorEnabled());
    const [initialMiniIrisOpen] = useState(() => readSavedMiniIrisOpen());
    const [mapState, setMapState] = useState(() => ({
        zoom: savedMapState?.zoom ?? DEFAULT_MAP_ZOOM,
        lat: savedMapState?.lat ?? DEFAULT_MAP_CENTER[1],
        lng: savedMapState?.lng ?? DEFAULT_MAP_CENTER[0],
    }));
    const [mapView, setMapView] = useState(() => createMapView({
        zoom: savedMapState?.zoom ?? DEFAULT_MAP_ZOOM,
        lat: savedMapState?.lat ?? DEFAULT_MAP_CENTER[1],
        lng: savedMapState?.lng ?? DEFAULT_MAP_CENTER[0],
    }));
    const [plextBounds, setPlextBounds] = useState<PlextRequestBounds | null>(null);
    const [liveMode, setLiveMode] = useState(true);
    const [patternMode, setPatternMode] = useState(0);
    const [portalHistoryLayers, setPortalHistoryLayers] = useState(initialPortalHistoryLayers);
    const [keyOverlayEnabled, setKeyOverlayEnabled] = useState(initialKeyOverlayEnabled);
    const [portalLevelColorEnabled, setPortalLevelColorEnabled] = useState(initialPortalLevelColorEnabled);
    const [portalHealthColorEnabled, setPortalHealthColorEnabled] = useState(initialPortalHealthColorEnabled);
    const [mockInventory, setMockInventory] = useState<InventoryItem[]>([]);
    const [renderStats, setRenderStats] = useState<MiniRenderStats | null>(null);
    const [frameStats, setFrameStats] = useState<MiniFrameStats>(EMPTY_FRAME_STATS);
    const [entityCounts, setEntityCounts] = useState<MiniEntityCounts>(EMPTY_ENTITY_COUNTS);
    const [extrusionEnabled, setExtrusionEnabled] = useState(false);
    const [isVis, setIsVis] = useState(false);
    const [pulseTick, setPulseTick] = useState(0);
    const liveModeRef = useRef(liveMode);
    const patternModeRef = useRef(patternMode);
    const moveSettleTimerRef = useRef<number | null>(null);
    const lastSettledLoadRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
    const lastIntelSyncRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
    const mapStateRef = useRef(mapState);
    const mapViewRef = useRef(mapView);
    const initialOpenAppliedRef = useRef(false);
    const playerTrailDataRef = useRef<GeoJSON.FeatureCollection>({
        type: 'FeatureCollection',
        features: [],
    });

    const logEvent = useCallback((msg: string): void => {
        setEvents(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 30));
        console.log(`[Mini IRIS] ${msg}`);
    }, []);

    useEffect(() => {
        liveModeRef.current = liveMode;
    }, [liveMode]);

    useEffect(() => {
        patternModeRef.current = patternMode;
    }, [patternMode]);

    useEffect(() => {
        mapStateRef.current = mapState;
    }, [mapState]);

    useEffect(() => {
        mapViewRef.current = mapView;
    }, [mapView]);

    useEffect(() => {
        cleanupLegacyStorage();
    }, []);

    useEffect(() => {
        if (!isVis) return;

        let frame: number | null = null;
        const tick = (): void => {
            setPulseTick((Date.now() % 1200) / 1200);
            frame = window.requestAnimationFrame(tick);
        };

        frame = window.requestAnimationFrame(tick);
        return (): void => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, [isVis]);

    const persistMapState = useCallback((nextState?: SavedMapState): void => {
        const stateToSave = nextState ?? {
            lat: mapStateRef.current.lat,
            lng: mapStateRef.current.lng,
            zoom: mapStateRef.current.zoom,
        };

        writeSavedMapState({
            lat: stateToSave.lat,
            lng: stateToSave.lng,
            zoom: stateToSave.zoom,
        });
    }, []);

    useEffect(() => {
        const handlePageHide = (): void => {
            persistMapState();
        };

        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);
        return (): void => {
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
        };
    }, [persistMapState]);

    const clearMoveSettleTimer = useCallback((): void => {
        if (moveSettleTimerRef.current !== null) {
            window.clearTimeout(moveSettleTimerRef.current);
            moveSettleTimerRef.current = null;
        }
    }, []);

    const endpointTelemetry = useEndpointTelemetry();

    useEffect(() => {
        if (!isVis) {
            setFrameStats(EMPTY_FRAME_STATS);
            return;
        }

        let frame: number | null = null;
        let lastFrameTime = performance.now();
        let sampleStartedAt = lastFrameTime;
        let totalMs = 0;
        let maxMs = 0;
        let slowFrames = 0;
        let sampleCount = 0;

        const tick = (now: number): void => {
            const delta = now - lastFrameTime;
            lastFrameTime = now;

            if (delta > 0 && delta < 1000) {
                totalMs += delta;
                maxMs = Math.max(maxMs, delta);
                slowFrames += delta > 20 ? 1 : 0;
                sampleCount += 1;
            }

            if (now - sampleStartedAt >= 1000 && sampleCount > 0) {
                const avgMs = totalMs / sampleCount;
                setFrameStats({
                    avgMs,
                    maxMs,
                    fps: Math.round(1000 / avgMs),
                    slowFrames,
                    sampleCount,
                    updatedAt: Date.now(),
                });
                sampleStartedAt = now;
                totalMs = 0;
                maxMs = 0;
                slowFrames = 0;
                sampleCount = 0;
            }

            frame = window.requestAnimationFrame(tick);
        };

        frame = window.requestAnimationFrame(tick);
        return (): void => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, [isVis]);

    useEffect(() => {
        const formatDelay = (ms: number | null | undefined): string => {
            if (typeof ms !== 'number' || !Number.isFinite(ms)) return '';
            const diff = Math.max(0, ms - Date.now());
            const seconds = Math.ceil(diff / 1000);
            if (seconds < 60) return `${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            const rest = seconds % 60;
            return `${minutes}m ${rest}s`;
        };

        const handler = (event: MessageEvent): void => {
            const msg: unknown = event.data;
            if (!isEndpointStateMessage(msg)) return;

            const endpoint = stringOrNull(msg.endpoint) ?? 'unknown';
            const status = stringOrNull(msg.status) ?? 'idle';
            const skipReason = stringOrNull(msg.lastSkipReason) ?? '';
            const cooldown = formatDelay(numberOrNull(msg.cooldownUntil));
            const nextRefresh = formatDelay(numberOrNull(msg.nextRefreshAt));
            const inFlightCount = numberOrNull(msg.inFlightCount) ?? 0;

            if (status === 'in_flight') {
                logEvent(`NET ${endpoint}: in-flight${inFlightCount > 1 ? ` x${inFlightCount}` : ''}`);
                return;
            }

            if (status === 'error') {
                const suffix = cooldown ? `; backoff ${cooldown}` : '';
                logEvent(`NET ${endpoint}: error${skipReason ? ` (${skipReason})` : ''}${suffix}`);
                return;
            }

            if (skipReason) {
                const suffix = nextRefresh ? `; next ${nextRefresh}` : '';
                logEvent(`NET ${endpoint}: skipped ${skipReason}${suffix}`);
            }
        };

        window.addEventListener('message', handler);
        return (): void => window.removeEventListener('message', handler);
    }, [logEvent]);

    useScores(isVis, liveMode, mapState.lat, mapState.lng);
    usePlayerStats(isVis, liveMode);
    const { playerHistories } = usePlayerTracker(isVis, liveMode, logEvent, plextBounds);
    const visiblePlayerHistories = liveMode ? playerHistories : EMPTY_PLAYER_HISTORIES;
    const handleRenderStats = useCallback((stats: MiniRenderStats): void => {
        setRenderStats(stats);
        if (!stats.liveMode) {
            setEntityCounts({
                portals: generator.portals.size,
                links: generator.linksMap.size,
                fields: generator.fieldsMap.size,
                players: 0,
            });
            return;
        }
        const store = useStore.getState();
        setEntityCounts({
            portals: Object.keys(store.portals).length,
            links: Object.keys(store.links).length,
            fields: Object.keys(store.fields).length,
            players: visiblePlayerHistories.size,
        });
    }, [generator, visiblePlayerHistories.size]);

    const { syncToMap } = useMapRenderer(generator, logEvent, portalHistoryLayers, keyOverlayEnabled, mockInventory, handleRenderStats);
    const { loadPattern1, loadPattern2, loadPattern3 } = usePatterns(mapState, generator, loadedTileKeys, logEvent, setMockInventory);
    const syncCurrentView = useCallback((currentLiveMode: boolean, currentPatternMode: number): void => {
        syncToMap(mapViewRef.current, currentLiveMode, currentPatternMode);
    }, [syncToMap]);

    useIntelMessages(liveMode, patternMode, selected, setSelected, syncCurrentView, logEvent);
    const playerTrailData = useMemo<GeoJSON.FeatureCollection>(() => {
        const features: GeoJSON.Feature[] = [];
        const clusters = new Map<string, { lat: number; lng: number; names: string[]; team: string; count: number }>();

        const averageEventCoords = (event: { latlngs: [number, number][] }): [number, number] | null => {
            if (event.latlngs.length === 0) return null;
            let latSum = 0;
            let lngSum = 0;
            event.latlngs.forEach(([lat, lng]) => {
                latSum += lat;
                lngSum += lng;
            });
            return [latSum / event.latlngs.length, lngSum / event.latlngs.length];
        };

        const ageMinutes = (time: number): number => Math.max(0, (Date.now() - time) / 60000);

        visiblePlayerHistories.forEach((history, name) => {
            const trailEvents = history.events
                .map((event) => ({ event, coords: averageEventCoords(event) }))
                .filter((item): item is { event: { latlngs: [number, number][]; time: number; portalName: string; actions: PlayerAction[] }, coords: [number, number] } => !!item.coords);

            for (let i = 1; i < trailEvents.length; i++) {
                const prev = trailEvents[i - 1];
                const curr = trailEvents[i];
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [prev.coords[1], prev.coords[0]],
                            [curr.coords[1], curr.coords[0]],
                        ],
                    },
                    properties: {
                        id: `${name}:${curr.event.time}`,
                        team: history.team,
                        type: 'player-trail',
                        ageMinutes: ageMinutes(curr.event.time),
                    },
                });
            }

            const lastEvent = history.events[history.events.length - 1];
            const lastPos = lastEvent ? averageEventCoords(lastEvent) : null;
            if (lastPos) {
                const [lat, lng] = lastPos;
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat],
                    },
                    properties: {
                        id: name,
                        team: history.team,
                        type: 'player-point',
                        portalName: lastEvent.portalName,
                        name,
                        pulse: pulseTick,
                    },
                });

                const clusterKey = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
                const cluster = clusters.get(clusterKey) ?? { lat, lng, names: [], team: history.team, count: 0 };
                cluster.names.push(name);
                cluster.count += 1;
                if (!cluster.team || cluster.team === 'N') {
                    cluster.team = history.team;
                }
                clusters.set(clusterKey, cluster);
            }
        });

        clusters.forEach((cluster) => {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [cluster.lng, cluster.lat],
                },
                properties: {
                    id: `player-label:${cluster.lat.toFixed(6)}:${cluster.lng.toFixed(6)}`,
                    team: cluster.team,
                    type: 'player-label',
                    label: cluster.names.join('\n'),
                    count: cluster.count,
                },
            });
        });

        return {
            type: 'FeatureCollection',
            features,
        };
    }, [visiblePlayerHistories, pulseTick]);

    useEffect(() => {
        playerTrailDataRef.current = playerTrailData;
    }, [playerTrailData]);

    const checkAndLoad = useCallback((currentView: MiniMapView, currentPatternMode: number, currentLiveMode: boolean): void => {
        const zoom = currentView.zoom;
        const minLevel = getMinLevelForZoom(zoom);
        const gridSize = getGridSizeForZoom(zoom);
        const bounds = currentView.bounds;
        
        if (currentPatternMode > 0 || currentLiveMode) {
            syncToMap(currentView, currentLiveMode, currentPatternMode);
            return;
        }

        if (zoom < 3) return;
        const startLat = Math.floor(bounds.south / gridSize);
        const endLat = Math.floor(bounds.north / gridSize);
        const startLng = Math.floor(bounds.west / gridSize);
        const endLng = Math.floor(bounds.east / gridSize);
        let addedAny = false;
        for (let lat = startLat; lat <= endLat; lat++) {
            for (let lng = startLng; lng <= endLng; lng++) {
                const key = `${lat},${lng},${gridSize},L${minLevel}`;
                if (!loadedTileKeys.has(key)) {
                    loadedTileKeys.add(key);
                    addedAny = true;
                }
            }
        }
        syncToMap(currentView, currentLiveMode, currentPatternMode);
        if (addedAny) logEvent(`Sim Tiles Loaded (Min L:${minLevel})`);
    }, [loadedTileKeys, syncToMap, logEvent]);

    const checkAndLoadRef = useRef(checkAndLoad);

    useEffect(() => {
        checkAndLoadRef.current = checkAndLoad;
    }, [checkAndLoad]);

    const throttledSync = useMemo(() => throttle((view: MiniMapView): void => {
        setMapState({ zoom: view.zoom, lat: view.lat, lng: view.lng });
        setMapView(view);
    }, 100), []);

    const scheduleMoveSettleLoad = useCallback((view: MiniMapView): void => {
        clearMoveSettleTimer();

        const currentZoom = view.zoom;
        const currentLive = liveModeRef.current;
        const currentPattern = patternModeRef.current;
        const nextBounds = {
            minLatE6: Math.round(view.bounds.south * 1e6),
            minLngE6: Math.round(view.bounds.west * 1e6),
            maxLatE6: Math.round(view.bounds.north * 1e6),
            maxLngE6: Math.round(view.bounds.east * 1e6),
        };

        const nextState = { zoom: currentZoom, lat: view.lat, lng: view.lng };
        setMapState(nextState);
        setMapView(view);
        setPlextBounds(nextBounds);
        persistMapState(nextState);

        if (currentLive) {
            const lastIntelSync = lastIntelSyncRef.current;
            const nextIntelSync = { zoom: Math.round(currentZoom), lat: view.lat, lng: view.lng };
            if (
                !lastIntelSync ||
                Math.abs(lastIntelSync.zoom - nextIntelSync.zoom) >= 1 ||
                Math.abs(lastIntelSync.lat - nextIntelSync.lat) >= 0.00001 ||
                Math.abs(lastIntelSync.lng - nextIntelSync.lng) >= 0.00001
            ) {
                lastIntelSyncRef.current = nextIntelSync;
                window.postMessage({ type: 'IRIS_SYNC_INTEL_MAP', lat: nextIntelSync.lat, lng: nextIntelSync.lng, zoom: nextIntelSync.zoom }, '*');
            }
        }

        const settleMs = currentLive ? 300 : 300;
        moveSettleTimerRef.current = window.setTimeout(() => {
            moveSettleTimerRef.current = null;
            const lastSettledLoad = lastSettledLoadRef.current;
            if (
                lastSettledLoad &&
                Math.abs(lastSettledLoad.zoom - currentZoom) < 0.01 &&
                Math.abs(lastSettledLoad.lat - view.lat) < 0.00001 &&
                Math.abs(lastSettledLoad.lng - view.lng) < 0.00001
            ) {
                return;
            }
            lastSettledLoadRef.current = { zoom: currentZoom, lat: view.lat, lng: view.lng };
            checkAndLoadRef.current(view, currentPattern, currentLive);
        }, settleMs);
    }, [clearMoveSettleTimer, persistMapState]);

    const handlePortalClick = useCallback((lat: number, lng: number, name: string): void => {
        logEvent(`Jumping to Portal: ${name}`);
        postMiniPageMapCommand({ action: 'ease-to', lat, lng, zoom: 17, duration: 850 });
        
        const store = useStore.getState();
        const existing = Object.values(store.portals).find(p => Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001);
        if (existing) {
            setSelected({ type: 'portal', data: existing });
            if (liveMode) window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: existing.id }, '*');
        } else {
            setSelected({ type: 'portal', data: { id: 'temp', lat, lng, team: 'N', name } as Portal });
        }
    }, [logEvent, liveMode]);

    const handlePortalHistoryLayerToggle = useCallback((key: PortalHistoryKey): void => {
        setPortalHistoryLayers((current) => {
            const next = {
                ...current,
                [key]: nextPortalHistoryMode(current[key]),
            };
            writeSavedPortalHistoryLayers(next);
            return next;
        });
    }, []);

    const handleKeyOverlayToggle = useCallback((): void => {
        setKeyOverlayEnabled((current) => {
            const next = !current;
            writeSavedKeyOverlayEnabled(next);
            return next;
        });
    }, []);

    const handlePortalLevelColorToggle = useCallback((): void => {
        setPortalLevelColorEnabled((current) => {
            const next = !current;
            writeSavedPortalLevelColorEnabled(next);
            return next;
        });
    }, []);

    const handlePortalHealthColorToggle = useCallback((): void => {
        setPortalHealthColorEnabled((current) => {
            const next = !current;
            writeSavedPortalHealthColorEnabled(next);
            return next;
        });
    }, []);

    useEffect(() => {
        postMiniPageMapCommand({
            action: 'set-portal-paint',
            levelColorEnabled: portalLevelColorEnabled,
            healthColorEnabled: portalHealthColorEnabled,
        });
    }, [portalHealthColorEnabled, portalLevelColorEnabled]);

    const handleSelectionPanelOpen = useCallback((): void => {
        postMiniPageMapCommand({ action: 'nav', nav: 'down' });
    }, []);

    const handleSelectionPanelClose = useCallback((): void => {
        postMiniPageMapCommand({ action: 'nav', nav: 'up' });
    }, []);

    const openMiniIris = useCallback((): void => {
        setIsVis(true);
        writeSavedMiniIrisOpen(true);
        window.requestAnimationFrame(() => {
            postMiniPageMapCommand({ action: 'set-visible', visible: true });
            postMiniPageMapCommand({ action: 'resize' });
            checkAndLoad(mapViewRef.current, patternModeRef.current, liveModeRef.current);
            logEvent("Tactical Map Opened");
        });
    }, [checkAndLoad, logEvent]);

    const closeMiniIris = useCallback((): void => {
        setIsVis(false);
        writeSavedMiniIrisOpen(false);
        postMiniPageMapCommand({ action: 'set-visible', visible: false });
    }, []);

    useEffect(() => {
        const initialCenter: [number, number] = [
            savedMapState?.lng ?? DEFAULT_MAP_CENTER[0],
            savedMapState?.lat ?? DEFAULT_MAP_CENTER[1],
        ];
        const initialZoom = savedMapState?.zoom ?? DEFAULT_MAP_ZOOM;
        postMiniPageMapCommand({
            action: 'init',
            containerId: 'map-poc-container',
            center: initialCenter,
            zoom: initialZoom,
            styleName: initialMapStyle,
            visible: initialMiniIrisOpen,
        });
    }, [initialMapStyle, initialMiniIrisOpen, savedMapState?.lat, savedMapState?.lng, savedMapState?.zoom]);

    useEffect(() => {
        const selectById = (kind: 'portal' | 'link' | 'field', id: string, openDetails: boolean): void => {
            const store = useStore.getState();
            const requestDetailsOpen = (): void => {
                if (openDetails) setSelectionDetailsRequestKey((current) => current + 1);
            };
            if (kind === 'portal') {
                const portal = liveModeRef.current ? store.portals[id] : generator.portals.get(id);
                if (!portal) return;
                setSelected({ type: 'portal', data: portal });
                if (liveModeRef.current) window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: portal.id }, '*');
                requestDetailsOpen();
                return;
            }
            if (kind === 'field') {
                const field = liveModeRef.current ? store.fields[id] : generator.fieldsMap.get(id);
                if (field) {
                    setSelected({ type: 'field', data: field });
                    requestDetailsOpen();
                }
                return;
            }
            const link = liveModeRef.current ? store.links[id] : generator.linksMap.get(id);
            if (link) {
                setSelected({ type: 'link', data: link });
                requestDetailsOpen();
            }
        };

        const handler = (event: MessageEvent): void => {
            const data = event.data as Partial<MiniPageMapEventMessage> | undefined;
            if (!data || data.type !== MINI_PAGE_MAP_EVENT || !data.payload) return;

            if (data.payload.event === 'ready') {
                setMapView(data.payload.view);
                setMapState({ zoom: data.payload.view.zoom, lat: data.payload.view.lat, lng: data.payload.view.lng });
                postMiniPageMapCommand({ action: 'sync-players', data: playerTrailDataRef.current });
                checkAndLoadRef.current(data.payload.view, patternModeRef.current, liveModeRef.current);
                return;
            }

            if (data.payload.event === 'camera') {
                if (data.payload.settled) scheduleMoveSettleLoad(data.payload.view);
                else throttledSync(data.payload.view);
                return;
            }

            if (data.payload.event === 'selection') {
                selectById(data.payload.kind, data.payload.id, data.payload.intent === 'details');
                return;
            }

            if (data.payload.event === 'clear-selection') {
                setSelected(null);
                postMiniPageMapCommand({ action: 'sync-selection', data: { type: 'FeatureCollection', features: [] } });
            }
        };

        window.addEventListener('message', handler);
        return (): void => window.removeEventListener('message', handler);
    }, [generator, scheduleMoveSettleLoad, throttledSync]);

    useEffect(() => {
        if (!initialMiniIrisOpen || initialOpenAppliedRef.current || isVis) return;
        initialOpenAppliedRef.current = true;
        openMiniIris();
    }, [initialMiniIrisOpen, isVis, openMiniIris]);

    useEffect(() => {
        return (): void => {
            clearMoveSettleTimer();
        };
    }, [clearMoveSettleTimer]);

    useEffect(() => {
        postMiniPageMapCommand({ action: 'sync-players', data: playerTrailData });
    }, [playerTrailData]);

    useEffect(() => {
        syncToMap(mapViewRef.current, liveMode, patternMode);
    }, [keyOverlayEnabled, liveMode, patternMode, syncToMap]);

    // 2. Selection highlights
    useEffect(() => {
        const selFeat: GeoJSON.Feature[] = [];
        const store = useStore.getState();

        if (!selected) {
            postMiniPageMapCommand({ action: 'sync-selection', data: { type: 'FeatureCollection', features: selFeat } });
            return;
        }

        if (selected.type === 'portal') {
            const p = selected.data as Portal;
            selFeat.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { type: 'portal' } });
        } else if (selected.type === 'link') {
            const l = selected.data as Link;
            const p1 = liveMode ? store.portals[l.fromPortalId] : generator.portals.get(l.fromPortalId);
            const p2 = liveMode ? store.portals[l.toPortalId] : generator.portals.get(l.toPortalId);
            if (p1 && p2) selFeat.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[p1.lng, p1.lat], [p2.lng, p2.lat]] }, properties: { type: 'link' } });
        } else if (selected.type === 'field') {
            const f = selected.data as Field;
            const poly = [...f.points.map((p) => [p.lng, p.lat]), [f.points[0].lng, f.points[0].lat]];
            selFeat.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: poly }, properties: { type: 'field' } });
        }
        postMiniPageMapCommand({ action: 'sync-selection', data: { type: 'FeatureCollection', features: selFeat } });
    }, [selected, liveMode, generator]);

    const handleNav = useCallback((action: string): void => {
        if (action === '+') postMiniPageMapCommand({ action: 'nav', nav: '+' });
        else if (action === '-') postMiniPageMapCommand({ action: 'nav', nav: '-' });
        else if (action === '↑') postMiniPageMapCommand({ action: 'nav', nav: 'up' });
        else if (action === '↓') postMiniPageMapCommand({ action: 'nav', nav: 'down' });
        else if (action === '←') postMiniPageMapCommand({ action: 'nav', nav: 'left' });
        else if (action === '→') postMiniPageMapCommand({ action: 'nav', nav: 'right' });
        else if (action === 'R') {
            postMiniPageMapCommand({ action: 'nav', nav: 'reset' });
            persistMapState({
                lat: DEFAULT_MAP_CENTER[1],
                lng: DEFAULT_MAP_CENTER[0],
                zoom: DEFAULT_MAP_ZOOM,
            });
        }
        else if (action === '🎯') {
            logEvent("Geolocating...");
            navigator.geolocation.getCurrentPosition((pos): void => {
                const { latitude, longitude } = pos.coords;
                postMiniPageMapCommand({ action: 'fly-to', lat: latitude, lng: longitude, zoom: 16, duration: 1200 });
                logEvent(`Located: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            }, (err): void => {
                logEvent(`Location Failed: ${err.message}`);
            }, { enableHighAccuracy: true, timeout: 5000 });
        }
    }, [logEvent, persistMapState]);

    const handleStyle = useCallback((style: string): void => {
        if (!(style in MAP_STYLES)) return;
        postMiniPageMapCommand({ action: 'set-style', styleName: style as MapStyleName });
        writeSavedMapStyle(style);
        logEvent(`Style: ${style}`);
    }, [logEvent]);

    const handleMode = useCallback((mode: string): void => {
        if (mode === '3D') {
            const nextExtrusion = !extrusionEnabled;
            setExtrusionEnabled(nextExtrusion);
            postMiniPageMapCommand({ action: 'set-extrusion', enabled: nextExtrusion });
            logEvent(`Extrusion: ${nextExtrusion ? 'ON' : 'OFF'}`);
        } else if (mode === 'Src') {
            const currentLiveMode = liveModeRef.current;
            const currentPatternMode = patternModeRef.current;

            if (currentLiveMode) {
                liveModeRef.current = false;
                patternModeRef.current = 1;
                setLiveMode(false);
                setPatternMode(1);
                generator.clear();
                loadedTileKeys.clear();
                setMockInventory([]);
            } else if (currentPatternMode === 1) {
                patternModeRef.current = 2;
                setPatternMode(2);
            } else if (currentPatternMode === 2) {
                patternModeRef.current = 3;
                setPatternMode(3);
            } else {
                patternModeRef.current = 0;
                liveModeRef.current = true;
                setPatternMode(0);
                setLiveMode(true);
                generator.clear();
                loadedTileKeys.clear();
                setMockInventory([]);
                if (useStore.getState().hasSubscription) {
                    window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
                }
            }
        }
    }, [extrusionEnabled, generator, loadedTileKeys, logEvent]);

    // 3. Store subscription
    useEffect(() => {
        const unsub = useStore.subscribe((state, prevState): void => {
            if (liveMode && (
                state.portals !== prevState.portals ||
                state.links !== prevState.links ||
                state.fields !== prevState.fields ||
                (keyOverlayEnabled && state.inventory !== prevState.inventory)
            )) {
                syncToMap(mapViewRef.current, liveMode, patternMode);
            }
        });
        return (): void => unsub();
    }, [keyOverlayEnabled, liveMode, patternMode, syncToMap]);

    // 4. Pattern loading and data sync
    useEffect(() => {
        if (patternMode === 1) loadPattern1();
        else if (patternMode === 2) loadPattern2();
        else if (patternMode === 3) loadPattern3();
    }, [patternMode, liveMode, loadPattern1, loadPattern2, loadPattern3]);

    useEffect(() => {
        checkAndLoad(mapViewRef.current, patternMode, liveMode);
    }, [patternMode, liveMode, checkAndLoad]);

    return (
        <div id="poc-preact-root" style={{ pointerEvents: 'none' }}>
            <MapContainer isVis={isVis} />
            {isVis && (
                <Fragment>
                    <TacticalUI 
                        zoom={mapState.zoom} lat={mapState.lat} lng={mapState.lng} 
                        events={events}
                        endpointTelemetry={endpointTelemetry}
                        plextBounds={plextBounds}
                        playerHistories={visiblePlayerHistories}
                        selected={selected}
                        selectionDetailsRequestKey={selectionDetailsRequestKey}
                        portalHistoryLayers={portalHistoryLayers}
                        onPortalHistoryLayerToggle={handlePortalHistoryLayerToggle}
                        keyOverlayEnabled={keyOverlayEnabled}
                        onKeyOverlayToggle={handleKeyOverlayToggle}
                        portalLevelColorEnabled={portalLevelColorEnabled}
                        onPortalLevelColorToggle={handlePortalLevelColorToggle}
                        portalHealthColorEnabled={portalHealthColorEnabled}
                        onPortalHealthColorToggle={handlePortalHealthColorToggle}
                        liveMode={liveMode}
                        patternMode={patternMode}
                        extrusionEnabled={extrusionEnabled}
                        renderStats={renderStats}
                        frameStats={frameStats}
                        entityCounts={entityCounts}
                        onNav={handleNav} onStyle={handleStyle} onMode={handleMode}
                        onPortalClick={handlePortalClick}
                        onSelectionPanelOpen={handleSelectionPanelOpen}
                        onSelectionPanelClose={handleSelectionPanelClose}
                    />
                </Fragment>
            )}
            <LaunchButton isVis={isVis} onClick={(): void => {
                if (isVis) closeMiniIris();
                else openMiniIris();
            }} />
        </div>
    );
}

function injectInterceptor(): void {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('interceptor.js');
    script.type = 'text/javascript';
    (document.head ?? document.documentElement).appendChild(script);
    script.addEventListener('load', () => script.remove());
}

function injectPageMapRuntime(): void {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('page-map-runtime.js');
    script.type = 'text/javascript';
    (document.head ?? document.documentElement).appendChild(script);
    script.addEventListener('load', () => script.remove());
}

function initApp(): void {
    const uiRoot = document.createElement('div');
    document.body.appendChild(uiRoot);
    render(h(TacticalOverlay, {}), uiRoot);
}

injectInterceptor();
injectPageMapRuntime();

if (document.body) {
    setTimeout(initApp, 500);
} else {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(initApp, 500);
    }, { once: true });
}
