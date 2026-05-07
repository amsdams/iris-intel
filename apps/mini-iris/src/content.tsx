import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { render, h, Fragment } from 'preact';
import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks';
import { MockDataGenerator } from './MockDataGenerator';
import { useStore, globalSpatialIndex, getMinLevelForZoom, getGridSizeForZoom, Portal, Link, Field, type InventoryItem } from '@iris/core';
import { TacticalUI } from './TacticalUI';
import { COLORS, INGRESS_COLORS, MAP_STYLES, PLAYER_TRACKER_COLORS } from './MapConstants';
import { LaunchButton } from './LaunchButton';
import { MapContainer } from './MapContainer';
import { usePatterns } from './usePatterns';
import { useIntelMessages } from './useIntelMessages';
import { useMapRenderer } from './useMapRenderer';
import { useScores } from './useScores';
import { usePlayerStats } from './usePlayerStats';
import { usePlayerTracker, type PlayerAction } from './usePlayerTracker';
import { useEndpointTelemetry } from './useEndpointTelemetry';
import type { PlextRequestBounds } from './plextRequests';
import { throttle } from './GeoUtils';
import { isEndpointStateMessage, numberOrNull, stringOrNull } from './messages';
import { DEFAULT_PORTAL_HISTORY_LAYERS, PORTAL_HISTORY_COLORS, nextPortalHistoryMode, type PortalHistoryKey, type PortalHistoryLayerState, type PortalHistoryMode } from './portalHistory';

console.log("Mini IRIS (TS): Tactical Overlay | v1.3.20 | Key Overlay Preference");

const DEFAULT_MAP_CENTER: [number, number] = [4.8952, 52.3702];
const DEFAULT_MAP_ZOOM = 13;
const MAP_STATE_STORAGE_KEY = 'iris-poc-map-state';
const MAP_STYLE_STORAGE_KEY = 'iris-poc-map-style';
const PORTAL_HISTORY_STORAGE_KEY = 'iris-poc-portal-history-layers';
const KEY_OVERLAY_STORAGE_KEY = 'iris-poc-key-overlay-enabled';
const MAP_STATE_COOKIE_KEY = 'iris_poc_map_state';
const EXPERIMENTAL_PREFS_STORAGE_KEY = 'mini-iris:preferences:v1';
const EXPERIMENTAL_PREFS_STORAGE_KEY_V2 = 'mini-iris:preferences:v2';

interface SavedMapState {
    lat: number;
    lng: number;
    zoom: number;
}

type MapStyleName = keyof typeof MAP_STYLES;

type SelectedEntity = { type: 'portal'; data: Portal } | { type: 'link'; data: Link } | { type: 'field'; data: Field };

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
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY);
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY_V2);
    } catch {
        // Ignore storage failures.
    }
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
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY);
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY_V2);
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
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY);
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY_V2);
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
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY);
        window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY_V2);
    } catch {
        // Ignore storage failures.
    }
}

function TacticalOverlay(): h.JSX.Element {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [generator] = useState(() => new MockDataGenerator());
    const [loadedTileKeys] = useState(() => new Set<string>());
    const [events, setEvents] = useState<{time: string, msg: string}[]>([]);
    const [selected, setSelected] = useState<SelectedEntity | null>(null);
    const [savedMapState] = useState(() => readSavedMapState());
    const [initialMapStyle] = useState(() => readSavedMapStyle());
    const [initialPortalHistoryLayers] = useState(() => readSavedPortalHistoryLayers());
    const [initialKeyOverlayEnabled] = useState(() => readSavedKeyOverlayEnabled());
    const [mapState, setMapState] = useState(() => ({
        zoom: savedMapState?.zoom ?? DEFAULT_MAP_ZOOM,
        lat: savedMapState?.lat ?? DEFAULT_MAP_CENTER[1],
        lng: savedMapState?.lng ?? DEFAULT_MAP_CENTER[0],
    }));
    const [plextBounds, setPlextBounds] = useState<PlextRequestBounds | null>(null);
    const [liveMode, setLiveMode] = useState(true);
    const [patternMode, setPatternMode] = useState(0);
    const [portalHistoryLayers, setPortalHistoryLayers] = useState(initialPortalHistoryLayers);
    const [keyOverlayEnabled, setKeyOverlayEnabled] = useState(initialKeyOverlayEnabled);
    const [mockInventory, setMockInventory] = useState<InventoryItem[]>([]);
    const [extrusionEnabled, setExtrusionEnabled] = useState(false);
    const [isVis, setIsVis] = useState(false);
    const [pulseTick, setPulseTick] = useState(0);
    const liveModeRef = useRef(liveMode);
    const patternModeRef = useRef(patternMode);
    const moveSettleTimerRef = useRef<number | null>(null);
    const mapStateRef = useRef(mapState);
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
        try {
            document.cookie = `${MAP_STATE_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax; Secure`;
            window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY);
            window.localStorage.removeItem(EXPERIMENTAL_PREFS_STORAGE_KEY_V2);
        } catch {
            // Ignore storage cleanup failures.
        }
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
        persistMapState();
    }, [persistMapState, liveMode, mapState, patternMode]);

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

    const { syncToMap } = useMapRenderer(generator, logEvent, portalHistoryLayers, keyOverlayEnabled, mockInventory);
    const { loadPattern1, loadPattern2, loadPattern3 } = usePatterns(mapRef.current, generator, loadedTileKeys, logEvent, setMockInventory);
    
    useIntelMessages(mapRef.current, liveMode, patternMode, selected, setSelected, (m, l, p) => syncToMap(m, l, p), logEvent);
    useScores(isVis, liveMode, mapState.lat, mapState.lng);
    usePlayerStats(isVis, liveMode);
    const { playerHistories } = usePlayerTracker(isVis, liveMode, logEvent, plextBounds);
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

        playerHistories.forEach((history, name) => {
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
    }, [playerHistories, pulseTick]);

    useEffect(() => {
        playerTrailDataRef.current = playerTrailData;
    }, [playerTrailData]);

    const checkAndLoad = useCallback((currentMap: maplibregl.Map, currentPatternMode: number, currentLiveMode: boolean): void => {
        if (!currentMap || !currentMap.getStyle()) return;

        const zoom = currentMap.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
        const gridSize = getGridSizeForZoom(zoom);
        const bounds = currentMap.getBounds();
        
        if (currentPatternMode > 0 || currentLiveMode) {
            syncToMap(currentMap, currentLiveMode, currentPatternMode);
            return;
        }

        if (zoom < 3) return;
        const startLat = Math.floor(bounds.getSouth() / gridSize);
        const endLat = Math.floor(bounds.getNorth() / gridSize);
        const startLng = Math.floor(bounds.getWest() / gridSize);
        const endLng = Math.floor(bounds.getEast() / gridSize);
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
        syncToMap(currentMap, currentLiveMode, currentPatternMode);
        if (addedAny) logEvent(`Sim Tiles Loaded (Min L:${minLevel})`);
    }, [loadedTileKeys, syncToMap, logEvent]);

    const checkAndLoadRef = useRef(checkAndLoad);

    useEffect(() => {
        checkAndLoadRef.current = checkAndLoad;
    }, [checkAndLoad]);

    const throttledSync = useMemo(() => throttle((m: maplibregl.Map): void => {
        const center = m.getCenter();
        setMapState({ zoom: m.getZoom(), lat: center.lat, lng: center.lng });
    }, 100), []);

    const scheduleMoveSettleLoad = useCallback((m: maplibregl.Map): void => {
        clearMoveSettleTimer();

        const center = m.getCenter();
        const currentZoom = m.getZoom();
        const currentLive = liveModeRef.current;
        const currentPattern = patternModeRef.current;
        const bounds = m.getBounds();
        const nextBounds = {
            minLatE6: Math.round(bounds.getSouth() * 1e6),
            minLngE6: Math.round(bounds.getWest() * 1e6),
            maxLatE6: Math.round(bounds.getNorth() * 1e6),
            maxLngE6: Math.round(bounds.getEast() * 1e6),
        };

        const nextState = { zoom: currentZoom, lat: center.lat, lng: center.lng };
        setMapState(nextState);
        setPlextBounds(nextBounds);
        persistMapState(nextState);

        if (currentLive) {
            window.postMessage({ type: 'IRIS_SYNC_INTEL_MAP', lat: center.lat, lng: center.lng, zoom: Math.round(currentZoom) }, '*');
        }

        const settleMs = currentLive ? 300 : 300;
        moveSettleTimerRef.current = window.setTimeout(() => {
            moveSettleTimerRef.current = null;
            checkAndLoadRef.current(m, currentPattern, currentLive);
        }, settleMs);
    }, [clearMoveSettleTimer, persistMapState]);

    const handlePortalClick = useCallback((lat: number, lng: number, name: string): void => {
        if (!mapRef.current) return;
        logEvent(`Jumping to Portal: ${name}`);
        mapRef.current.flyTo({ center: [lng, lat], zoom: 17, duration: 2000 });
        
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

    const handleSelectionPanelOpen = useCallback((): void => {
        mapRef.current?.panBy([0, 140], { duration: 200 });
    }, []);

    const handleSelectionPanelClose = useCallback((): void => {
        mapRef.current?.panBy([0, -140], { duration: 200 });
    }, []);

    useEffect(() => {
        if (mapRef.current) return; // Only init once

        const initialCenter: [number, number] = [
            savedMapState?.lng ?? DEFAULT_MAP_CENTER[0],
            savedMapState?.lat ?? DEFAULT_MAP_CENTER[1],
        ];
        const initialZoom = savedMapState?.zoom ?? DEFAULT_MAP_ZOOM;
        
        const m = new maplibregl.Map({
            container: 'map-poc-container',
            style: {
                version: 8,
                glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
                sources: {
                    'carto': { type: 'raster', tiles: MAP_STYLES[initialMapStyle], tileSize: 256 },
                    'entities': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
                    'players': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
                    'selection': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
                },
                layers: [
                    { id: 'carto', type: 'raster', source: 'carto' },
                    { id: 'f-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'E']], paint: { 'fill-color': COLORS.E, 'fill-opacity': 0.3 } },
                    { id: 'f-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'R']], paint: { 'fill-color': COLORS.R, 'fill-opacity': 0.3 } },
                    { id: 'f-mac', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'M']], paint: { 'fill-color': COLORS.M, 'fill-opacity': 0.3 } },
                    { id: 'l-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'E']], paint: { 'line-color': COLORS.E, 'line-width': ['coalesce', ['get', 'width'], 2] } },
                    { id: 'l-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'R']], paint: { 'line-color': COLORS.R, 'line-width': ['coalesce', ['get', 'width'], 2] } },
                    { id: 'l-mac', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'M']], paint: { 'line-color': COLORS.M, 'line-width': ['coalesce', ['get', 'width'], 2] } },
                    { id: 'f-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'E']], paint: { 'fill-extrusion-color': COLORS.E, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                    { id: 'f-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'R']], paint: { 'fill-extrusion-color': COLORS.R, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                    { id: 'f-ext-mac', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'M']], paint: { 'fill-extrusion-color': COLORS.M, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                    { id: 'l-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'E']], paint: { 'fill-extrusion-color': COLORS.E, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                    { id: 'l-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'R']], paint: { 'fill-extrusion-color': COLORS.R, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                    { id: 'l-ext-mac', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'M']], paint: { 'fill-extrusion-color': COLORS.M, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                    { id: 'p-ext', type: 'fill-extrusion', source: 'entities', filter: ['==', 'type', 'portal-ext'], paint: { 'fill-extrusion-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.9 }, layout: { visibility: 'none' } },
                    { id: 'player-trails', type: 'line', source: 'players', filter: ['==', 'type', 'player-trail'], paint: { 'line-color': PLAYER_TRACKER_COLORS.trail, 'line-width': 3, 'line-opacity': ['interpolate', ['linear'], ['get', 'ageMinutes'], 0, 0.95, 5, 0.75, 20, 0.45, 60, 0.2, 180, 0.08], 'line-blur': 0.6, 'line-dasharray': [1.2, 1.6] } },
                    { id: 'player-points-glow', type: 'circle', source: 'players', filter: ['==', 'type', 'player-point'], paint: { 'circle-color': PLAYER_TRACKER_COLORS.point, 'circle-radius': ['interpolate', ['linear'], ['get', 'pulse'], 0, 7, 0.5, 13, 1, 7], 'circle-opacity': ['interpolate', ['linear'], ['get', 'pulse'], 0, 0.12, 0.5, 0.26, 1, 0.12] } },
                    { id: 'player-points', type: 'circle', source: 'players', filter: ['==', 'type', 'player-point'], paint: { 'circle-color': PLAYER_TRACKER_COLORS.point, 'circle-radius': ['interpolate', ['linear'], ['get', 'pulse'], 0, 4.5, 0.5, 6.5, 1, 4.5], 'circle-stroke-width': 2, 'circle-stroke-color': PLAYER_TRACKER_COLORS.stroke, 'circle-opacity': 0.98 } },
                    { id: 'player-label-bg', type: 'circle', source: 'players', filter: ['==', 'type', 'player-label'], paint: { 'circle-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, INGRESS_COLORS.XM], 'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 8, 2, 11, 5, 15], 'circle-opacity': 0.08 } },
                    { id: 'player-labels', type: 'symbol', source: 'players', filter: ['==', 'type', 'player-label'], layout: { 'text-field': ['get', 'label'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-max-width': 12 }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.4, 'text-opacity': 0.96 } },
                    { id: 'sel-f', type: 'line', source: 'selection', filter: ['==', 'type', 'field'], paint: { 'line-color': '#fff', 'line-width': 3 } },
                    { id: 'sel-l', type: 'line', source: 'selection', filter: ['==', 'type', 'link'], paint: { 'line-color': '#fff', 'line-width': 4 } },
                    { id: 'sel-p', type: 'circle', source: 'selection', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': 12, 'circle-color': 'transparent', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } },
                    { id: 'p', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': ['coalesce', ['get', 'radius'], 2], 'circle-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N] } },
                    { id: 'p-history-visited-highlight', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'visitedHighlight', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 5], 'circle-color': 'transparent', 'circle-stroke-color': PORTAL_HISTORY_COLORS.visited, 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
                    { id: 'p-history-captured-highlight', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'capturedHighlight', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 8], 'circle-color': 'transparent', 'circle-stroke-color': PORTAL_HISTORY_COLORS.captured, 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
                    { id: 'p-history-scanned-highlight', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'scannedHighlight', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 11], 'circle-color': 'transparent', 'circle-stroke-color': PORTAL_HISTORY_COLORS.scanned, 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
                    { id: 'p-history-visited-inverse', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'visitedInverse', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 5], 'circle-color': PORTAL_HISTORY_COLORS.visited, 'circle-opacity': 0.14, 'circle-stroke-color': PORTAL_HISTORY_COLORS.visited, 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.85 } },
                    { id: 'p-history-captured-inverse', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'capturedInverse', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 8], 'circle-color': PORTAL_HISTORY_COLORS.captured, 'circle-opacity': 0.14, 'circle-stroke-color': PORTAL_HISTORY_COLORS.captured, 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.85 } },
                    { id: 'p-history-scanned-inverse', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'scannedInverse', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 11], 'circle-color': PORTAL_HISTORY_COLORS.scanned, 'circle-opacity': 0.14, 'circle-stroke-color': PORTAL_HISTORY_COLORS.scanned, 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.85 } },
                    { id: 'p-key-count-bg', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal-key-count'], paint: { 'circle-color': '#000000', 'circle-radius': 12, 'circle-translate': [0, -18], 'circle-opacity': 0.78, 'circle-stroke-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N], 'circle-stroke-width': 1.8, 'circle-stroke-opacity': 0.95 } },
                    { id: 'p-key-count-total', type: 'symbol', source: 'entities', filter: ['==', 'type', 'portal-key-count'], layout: { 'text-field': ['get', 'totalLabel'], 'text-size': 12, 'text-anchor': 'center', 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': INGRESS_COLORS.KEY, 'text-halo-color': '#000000', 'text-halo-width': 1.4, 'text-opacity': 1, 'text-translate': [0, -20] } },
                    { id: 'p-key-count-split', type: 'symbol', source: 'entities', filter: ['==', 'type', 'portal-key-count'], layout: { 'text-field': ['get', 'splitLabel'], 'text-size': 8, 'text-offset': [0, 0.95], 'text-anchor': 'center', 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.2, 'text-opacity': 0.95, 'text-translate': [0, -20] } }
                ]
            },
            center: initialCenter, zoom: initialZoom
        });

        m.once('load', (): void => {
            const bounds = m.getBounds();
            setPlextBounds({
                minLatE6: Math.round(bounds.getSouth() * 1e6),
                minLngE6: Math.round(bounds.getWest() * 1e6),
                maxLatE6: Math.round(bounds.getNorth() * 1e6),
                maxLngE6: Math.round(bounds.getEast() * 1e6),
            });
            const playerSource = m.getSource('players') as maplibregl.GeoJSONSource | undefined;
            if (playerSource) {
                playerSource.setData(playerTrailDataRef.current);
            }
        });

        m.on('movestart', clearMoveSettleTimer);
        m.on('move', (): void => { throttledSync(m); });
        m.on('moveend', (): void => { scheduleMoveSettleLoad(m); });

        m.on('click', (e): void => {
            const isLive = liveModeRef.current;
            logEvent(`Map Click @ ${e.lngLat.lng.toFixed(4)}, ${e.lngLat.lat.toFixed(4)}`);
            const pixelBuffer = 40;
            const pLow = m.unproject([e.point.x - pixelBuffer, e.point.y + pixelBuffer]);
            const pHigh = m.unproject([e.point.x + pixelBuffer, e.point.y - pixelBuffer]);
            const qG = { minLat: pLow.lat, minLng: pLow.lng, maxLat: pHigh.lat, maxLng: pHigh.lng };
            let results: ReturnType<typeof globalSpatialIndex.query>;
            if (isLive) {
                useStore.getState().syncIndex();
                results = globalSpatialIndex.query(qG);
            } else {
                results = generator.query({ minX: qG.minLng, minY: qG.minLat, maxX: qG.maxLng, maxY: qG.maxLat });
            }
            
            if (!results || results.length === 0) { 
                setSelected(null);
                (m.getSource('selection') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
                return; 
            }

            const store = useStore.getState();
            const portals = results.filter(r => r.type === 'portal').map(r => isLive ? store.portals[r.id] : generator.portals.get(r.id)).filter((p): p is Portal => !!p);
            const links = results.filter(r => r.type === 'link').map(r => isLive ? store.links[r.id] : generator.linksMap.get(r.id)).filter((l): l is Link => !!l);
            const allFields = results.filter(r => r.type === 'field').map(r => {
                const f = isLive ? store.fields[r.id] : generator.fieldsMap.get(r.id);
                return f && generator.isPointInField(e.lngLat, f) ? f : null;
            }).filter((f): f is Field => !!f);

            const portalHits = portals.map(p => {
                const screenP = m.project([p.lng, p.lat]);
                const dist = Math.hypot(screenP.x - e.point.x, screenP.y - e.point.y);
                return { p, dist };
            }).filter(h => h.dist < 10).sort((a, b) => a.dist - b.dist);

            if (portalHits.length > 0) {
                const p = portalHits[0].p;
                setSelected({ type: 'portal', data: p });
                if (isLive) window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: p.id }, '*');
                return;
            }

            if (allFields.length > 0) {
                setSelected({ type: 'field', data: allFields[0] });
                return;
            }

            const linkHits = links.map(l => {
                const p1 = m.project([l.fromLng, l.fromLat]);
                const p2 = m.project([l.toLng, l.toLat]);
                const A = e.point.x - p1.x; const B = e.point.y - p1.y;
                const C = p2.x - p1.x; const D = p2.y - p1.y;
                const dot = A * C + B * D; const len_sq = C * C + D * D;
                let param = -1; if (len_sq !== 0) param = dot / len_sq;
                let xx: number, yy: number;
                if (param < 0) { xx = p1.x; yy = p1.y; }
                else if (param > 1) { xx = p2.x; yy = p2.y; }
                else { xx = p1.x + param * C; yy = p1.y + param * D; }
                const dist = Math.hypot(e.point.x - xx, e.point.y - yy);
                return { l, dist };
            }).filter(h => h.dist < 5).sort((a, b) => a.dist - b.dist);

            if (linkHits.length > 0) {
                setSelected({ type: 'link', data: linkHits[0].l });
                return;
            }

            setSelected(null);
            (m.getSource('selection') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
        });

        mapRef.current = m;
        return (): void => { m.remove(); mapRef.current = null; };
    }, [clearMoveSettleTimer, generator, logEvent, savedMapState?.lat, savedMapState?.lng, savedMapState?.zoom, scheduleMoveSettleLoad, throttledSync]);

    useEffect(() => {
        return (): void => {
            clearMoveSettleTimer();
        };
    }, [clearMoveSettleTimer]);

    useEffect(() => {
        const m = mapRef.current;
        if (!m || !m.getSource('players')) return;
        (m.getSource('players') as maplibregl.GeoJSONSource).setData(playerTrailData);
    }, [playerTrailData]);

    useEffect(() => {
        if (!mapRef.current) return;
        syncToMap(mapRef.current, liveMode, patternMode);
    }, [keyOverlayEnabled, liveMode, patternMode, syncToMap]);

    // 2. Selection highlights
    useEffect(() => {
        const m = mapRef.current;
        if (!m || !selected) return;
        const selSource = m.getSource('selection') as maplibregl.GeoJSONSource;
        if (!selSource) return;
        const selFeat: GeoJSON.Feature[] = [];
        const store = useStore.getState();

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
        selSource.setData({ type: 'FeatureCollection', features: selFeat });
    }, [selected, liveMode, generator]);

    const handleNav = useCallback((action: string): void => {
        const m = mapRef.current;
        if (!m) return;
        if (action === '+') m.zoomIn();
        else if (action === '-') m.zoomOut();
        else if (action === '↑') m.panBy([0, -200]);
        else if (action === '↓') m.panBy([0, 200]);
        else if (action === '←') m.panBy([-200, 0]);
        else if (action === '→') m.panBy([200, 0]);
        else if (action === 'R') {
            m.setCenter(DEFAULT_MAP_CENTER);
            m.setZoom(DEFAULT_MAP_ZOOM);
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
                m.flyTo({ center: [longitude, latitude], zoom: 16 });
                logEvent(`Located: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            }, (err): void => {
                logEvent(`Location Failed: ${err.message}`);
            }, { enableHighAccuracy: true, timeout: 5000 });
        }
    }, [logEvent, persistMapState]);

    const handleStyle = useCallback((style: string): void => {
        const m = mapRef.current;
        if (!m || !m.getStyle() || !MAP_STYLES[style]) return;
        if (m.getLayer('carto')) m.removeLayer('carto');
        if (m.getSource('carto')) m.removeSource('carto');
        m.addSource('carto', { type: 'raster', tiles: MAP_STYLES[style], tileSize: 256, attribution: style === 'OSM' ? '&copy; OpenStreetMap' : '&copy; CARTO' });
        const layers = m.getStyle().layers;
        m.addLayer({ id: 'carto', type: 'raster', source: 'carto' }, layers?.[0]?.id);
        writeSavedMapStyle(style);
        logEvent(`Style: ${style}`);
    }, [logEvent]);

    const handleMode = useCallback((mode: string): void => {
        const m = mapRef.current;
        if (!m || !m.getStyle()) return;
        if (mode === '3D') {
            const nextExtrusion = !extrusionEnabled;
            setExtrusionEnabled(nextExtrusion);
            const visibility = nextExtrusion ? 'visible' : 'none';
            const flatVisibility = nextExtrusion ? 'none' : 'visible';
            const layers3D = ['f-ext-enl', 'f-ext-res', 'f-ext-mac', 'l-ext-enl', 'l-ext-res', 'l-ext-mac', 'p-ext'];
            const layersFlat = ['f-enl', 'f-res', 'f-mac', 'l-enl', 'l-res', 'l-mac', 'p'];
            layers3D.forEach(id => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', visibility); });
            layersFlat.forEach(id => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', flatVisibility); });
            if (nextExtrusion) m.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
            else m.easeTo({ pitch: 0, bearing: 0, duration: 800 });
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
            if (liveMode && mapRef.current && (
                state.portals !== prevState.portals ||
                state.links !== prevState.links ||
                state.fields !== prevState.fields ||
                (keyOverlayEnabled && state.inventory !== prevState.inventory)
            )) {
                syncToMap(mapRef.current, liveMode, patternMode);
            }
        });
        return (): void => unsub();
    }, [keyOverlayEnabled, liveMode, patternMode, syncToMap]);

    // 4. Pattern loading and data sync
    useEffect(() => {
        if (!mapRef.current) return;
        if (patternMode === 1) loadPattern1();
        else if (patternMode === 2) loadPattern2();
        else if (patternMode === 3) loadPattern3();
    }, [patternMode, liveMode, loadPattern1, loadPattern2, loadPattern3]);

    useEffect(() => {
        if (!mapRef.current) return;
        checkAndLoad(mapRef.current, patternMode, liveMode);
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
                        playerHistories={playerHistories}
                        selected={selected}
                        portalHistoryLayers={portalHistoryLayers}
                        onPortalHistoryLayerToggle={handlePortalHistoryLayerToggle}
                        keyOverlayEnabled={keyOverlayEnabled}
                        onKeyOverlayToggle={handleKeyOverlayToggle}
                        onNav={handleNav} onStyle={handleStyle} onMode={handleMode}
                        onPortalClick={handlePortalClick}
                        onSelectionPanelOpen={handleSelectionPanelOpen}
                        onSelectionPanelClose={handleSelectionPanelClose}
                    />
                </Fragment>
            )}
            <LaunchButton isVis={isVis} onClick={(): void => {
                setIsVis(!isVis);
                if (!isVis && mapRef.current && mapRef.current.getStyle()) {
                    mapRef.current.resize();
                    checkAndLoad(mapRef.current, patternMode, liveMode);
                    logEvent("Tactical Map Opened");
                }
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

function initApp(): void {
    const uiRoot = document.createElement('div');
    document.body.appendChild(uiRoot);
    render(h(TacticalOverlay, {}), uiRoot);
}

injectInterceptor();

if (document.body) {
    setTimeout(initApp, 500);
} else {
    window.addEventListener('DOMContentLoaded', () => {
        setTimeout(initApp, 500);
    }, { once: true });
}
