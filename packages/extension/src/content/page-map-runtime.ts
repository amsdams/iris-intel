import maplibregl from 'maplibre-gl';
import {
    PAGE_MAP_RUNTIME_MESSAGES,
    PageMapRuntimeBounds,
    PageMapRuntimeCamera,
    PageMapRuntimeCameraChangedMessage,
    PageMapRuntimeCommandMessage,
    PageMapRuntimeLayerVisibility,
    PageMapRuntimeResultMessage,
    PageMapRuntimeSelectionPayload,
} from '../shared/page-map-runtime-protocol';

interface SetDataGeoJsonSource {
    setData: (data: GeoJSON.FeatureCollection) => void;
}

interface SetTilesRasterSource {
    setTiles: (tiles: string[]) => void;
}

interface FrameSnapshot {
    type: 'frame';
    time: number;
    totalMs: number;
    frameCount: number;
    averageFrameMs: number;
    maxFrameMs: number;
    slowFrameCount: number;
    estimatedFps: number;
    benchmarkRunCount?: number;
    benchmarkMedianAverageFrameMs?: number;
    benchmarkMinAverageFrameMs?: number;
    benchmarkMaxAverageFrameMs?: number;
    benchmarkMaxFrameMs?: number;
    benchmarkVariant?: BenchmarkVariant;
    benchmarkZoom?: number;
    benchmarkMode?: BenchmarkMode;
    benchmarkMovingEntityMode?: MovingEntityRenderMode;
    benchmarkLayerVisibility?: Record<string, string>;
    benchmarkSourceFeatureCounts?: Record<string, number>;
    benchmarkPluginFeatureCounts?: Record<string, number>;
}

interface MovingFrameSample {
    active: boolean;
    startedAt: number;
    lastFrameAt: number | null;
    frameCount: number;
    totalFrameMs: number;
    maxFrameMs: number;
    slowFrameCount: number;
    requestId: number | null;
}

interface SourceUpdatePerformance {
    startedAt: number;
    setDataMs: number;
    sourceSetDataMs: Record<string, number>;
    sourceFeatureCounts: Record<string, number>;
    pluginFeatureCounts?: Record<string, number>;
}

interface PlannedMarkerRuntimeData {
    id: string;
    lng: number;
    lat: number;
    color: string;
    selected: boolean;
    label: string;
}

interface PlannedMarkerRegistryEntry {
    marker: maplibregl.Marker;
    element: HTMLDivElement;
    pin: HTMLDivElement;
}

interface PlayerMarkerRuntimeData {
    id: string;
    lng: number;
    lat: number;
    color: string;
    opacity: number;
    label: string;
    name: string;
    feature: GeoJSON.Feature;
    spreadIndex: number;
    spreadCount: number;
}

interface PlayerMarkerRegistryEntry {
    marker: maplibregl.Marker;
    element: HTMLDivElement;
    pin: HTMLDivElement;
    label: HTMLDivElement;
}

interface PlayerClusterRuntimeData {
    id: string;
    key: string;
    lng: number;
    lat: number;
    color: string;
    count: number;
    mixedTeams: boolean;
    expanded: boolean;
}

interface PlayerClusterRegistryEntry {
    marker: maplibregl.Marker;
    element: HTMLDivElement;
    badge: HTMLDivElement;
}

interface PinCoreOptions {
    background: string;
    boxShadow?: string;
}

interface PinBodyOptions {
    left: string;
    top: string;
    color: string;
    border: string;
}

type MarkerOffset = [number, number];
type BenchmarkVariant = 'normal' | 'base' | 'no-plugins' | 'no-links' | 'no-fields';
type BenchmarkMode = 'pan' | 'zoom';

let pageMapPromise: Promise<maplibregl.Map> | null = null;
let suppressNextCameraChangedEvent = false;
let panBenchmarkSettleTimer: number | null = null;
let panBenchmarkAnimation: number | null = null;
let panBenchmarkActive = false;
let panBenchmarkMode: BenchmarkMode = 'pan';
let panBenchmarkRestoreVisibility: (() => void) | null = null;
let activeBenchmarkVariant: BenchmarkVariant = 'normal';
let movingEntityRenderMode: MovingEntityRenderMode = 'full';
let movingEntityRenderRestoreTimer: number | null = null;
let movingOverlayVisible = true;
const plannedMarkerRegistry = new Map<string, PlannedMarkerRegistryEntry>();
const playerMarkerRegistry = new Map<string, PlayerMarkerRegistryEntry>();
const playerClusterRegistry = new Map<string, PlayerClusterRegistryEntry>();
const expandedPlayerClusterKeys = new Set<string>();
let lastPlayerMarkerFeatures: GeoJSON.FeatureCollection = {type: 'FeatureCollection', features: []};
const currentSourceFeatureCounts: Record<string, number> = {
    portals: 0,
    links: 0,
    fields: 0,
    artifacts: 0,
    ornaments: 0,
    'plugin-features': 0,
    'planned-features': 0,
};
let currentPluginFeatureCounts: Record<string, number> | undefined;

const SLOW_FRAME_MS = 34;
const PAN_BENCHMARK_STEP_PX = 220;
const ZOOM_BENCHMARK_STEP = 1.25;
const PAN_BENCHMARK_RUN_COUNT = 3;
const PAN_BENCHMARK_RUN_DURATION_MS = 3000;
const PAN_BENCHMARK_START = {lat: 52.371094, lng: 4.906375};
const PAN_BENCHMARK_SETTLE_MS = 600;
const MOVING_ENTITY_SIMPLIFY_MAX_ZOOM = 10.5;
const MOVING_ENTITY_HIDE_LINKS_MAX_ZOOM = 8.5;
const MOVING_ENTITY_RESTORE_SETTLE_MS = 180;
const PLAYER_MARKER_CIRCLE_SPREAD_RADIUS_PX = 26;
const PLAYER_MARKER_SPIRAL_START_COUNT = 8;
const PLAYER_MARKER_SPIRAL_STEP_PX = 8;
const PLAYER_MARKER_SPIRAL_START_RADIUS_PX = 22;
const MOBILE_LONG_PRESS_MS = 650;
const MOBILE_LONG_PRESS_MOVE_TOLERANCE_PX = 12;
const MOBILE_LONG_PRESS_CLICK_SUPPRESS_MS = 500;
const SOURCE_COUNT_LABELS: Record<string, string> = {
    'iris-map-portals': 'portals',
    'iris-map-links': 'links',
    'iris-map-fields': 'fields',
    'iris-map-artifacts': 'artifacts',
    'iris-map-ornaments': 'ornaments',
    'iris-map-plugin-features': 'plugin-features',
    'iris-map-plugin-highlights': 'plugin-features',
    'iris-map-planned-features': 'planned-features',
};

const DEFAULT_LAYER_VISIBILITY: PageMapRuntimeLayerVisibility = {
    portals: true,
    links: true,
    fields: true,
};

const BENCHMARK_PLUGIN_LAYER_IDS = [
    'iris-map-plugin-lines',
    'iris-map-plugin-points',
    'iris-map-plugin-portal-highlights',
    'iris-map-plugin-html-points',
    'iris-map-plugin-labels',
    'iris-map-mission-route',
    'iris-map-mission-waypoints',
    'iris-map-planned-links',
    'iris-map-planned-anchor',
    'iris-map-planned-crossings',
];
const MOVING_OVERLAY_LAYER_IDS = BENCHMARK_PLUGIN_LAYER_IDS;

let currentLayerVisibility: PageMapRuntimeLayerVisibility = DEFAULT_LAYER_VISIBILITY;
let currentPlanningState: {enabled: boolean; tool: 'links' | 'markers'} = {
    enabled: false,
    tool: 'links',
};
let suppressClickUntil = 0;

type RuntimeDisplayMode = 'hidden' | 'probe' | 'full';
type MovingEntityRenderMode = 'full' | 'simplified' | 'minimal';

function getBenchmarkVariant(value: unknown): BenchmarkVariant {
    if (
        value === 'base' ||
        value === 'no-plugins' ||
        value === 'no-links' ||
        value === 'no-fields'
    ) {
        return value;
    }
    return 'normal';
}

function getBenchmarkZoom(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 14.36;
    }
    return Math.max(3, Math.min(20, value));
}

function getBenchmarkMode(value: unknown): BenchmarkMode {
    return value === 'zoom' ? 'zoom' : 'pan';
}

function createRuntimeContainer(): HTMLDivElement {
    const existing = document.getElementById('iris-page-map-runtime');
    if (existing instanceof HTMLDivElement) {
        return existing;
    }

    const container = document.createElement('div');
    container.id = 'iris-page-map-runtime';
    container.style.position = 'fixed';
    container.style.background = '#000';
    setRuntimeContainerMode(container, 'hidden');
    document.documentElement.appendChild(container);
    return container;
}

function setRuntimeContainerMode(container: HTMLDivElement, mode: RuntimeDisplayMode): void {
    container.style.position = 'fixed';
    container.style.background = '#000';
    if (mode === 'full') {
        container.style.left = '0';
        container.style.top = '0';
        container.style.right = 'auto';
        container.style.width = '100vw';
        container.style.height = '100vh';
        container.style.pointerEvents = 'auto';
        container.style.opacity = '1';
        container.style.zIndex = '9998';
        container.style.border = '0';
        return;
    }

    container.style.left = 'auto';
    container.style.right = '12px';
    container.style.top = '72px';
    container.style.width = mode === 'probe' ? '320px' : '128px';
    container.style.height = mode === 'probe' ? '240px' : '128px';
    container.style.pointerEvents = mode === 'probe' ? 'auto' : 'none';
    container.style.opacity = mode === 'probe' ? '0.92' : '0';
    container.style.zIndex = '10060';
    container.style.border = '1px solid #37e6ff';
}

function setRuntimeContainerVisible(visible: boolean): void {
    setRuntimeContainerMode(createRuntimeContainer(), visible ? 'probe' : 'hidden');
}

function setRuntimeContainerFullMap(): void {
    setRuntimeContainerMode(createRuntimeContainer(), 'full');
}

function getPageMap(): Promise<maplibregl.Map> {
    if (pageMapPromise) {
        return pageMapPromise;
    }

    pageMapPromise = new Promise((resolve) => {
        const map = new maplibregl.Map({
            container: createRuntimeContainer(),
            style: {
                version: 8,
                sources: {
                    osm: {
                        type: 'raster',
                        tiles: ['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        maxzoom: 20,
                    },
                    'iris-map-portals': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-portal-selected': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-links': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-link-selected': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-fields': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-field-selected': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-artifacts': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-ornaments': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-mission-route': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-mission-waypoints': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-plugin-features': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-plugin-highlights': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-map-planned-features': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                },
                layers: [
                    {
                        id: 'osm',
                        type: 'raster',
                        source: 'osm',
                    },
                    {
                        id: 'iris-map-field-selected',
                        type: 'line',
                        source: 'iris-map-field-selected',
                        paint: {
                            'line-color': '#ffffff',
                            'line-width': 3,
                        },
                    },
                    {
                        id: 'iris-map-fields',
                        type: 'fill',
                        source: 'iris-map-fields',
                        paint: {
                            'fill-color': ['coalesce', ['get', 'color'], '#999999'],
                            'fill-opacity': 0.3,
                            'fill-antialias': false,
                        },
                    },
                    {
                        id: 'iris-map-link-selected',
                        type: 'line',
                        source: 'iris-map-link-selected',
                        paint: {
                            'line-color': '#ffffff',
                            'line-width': 4,
                        },
                    },
                    {
                        id: 'iris-map-planned-links',
                        type: 'line',
                        source: 'iris-map-planned-features',
                        filter: ['all', ['==', '$type', 'LineString'], ['!=', 'plannedType', 'crossing']],
                        paint: {
                            'line-width': ['case', ['==', ['get', 'selected'], true], 6, 3],
                            'line-color': ['coalesce', ['get', 'color'], '#37e6ff'],
                            'line-opacity': ['coalesce', ['get', 'opacity'], 0.92],
                            'line-dasharray': [2, 2],
                        },
                    },
                    {
                        id: 'iris-map-plugin-lines',
                        type: 'line',
                        source: 'iris-map-plugin-features',
                        filter: ['==', '$type', 'LineString'],
                        paint: {
                            'line-width': ['coalesce', ['get', 'weight'], 3],
                            'line-dasharray': [5, 8],
                            'line-color': ['coalesce', ['get', 'color'], '#37e6ff'],
                            'line-opacity': ['coalesce', ['get', 'opacity'], 1],
                        },
                    },
                    {
                        id: 'iris-map-mission-route',
                        type: 'line',
                        source: 'iris-map-mission-route',
                        paint: {
                            'line-width': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 2,
                                10, 3.5,
                                15, 5,
                            ],
                            'line-color': '#EF8E2E',
                            'line-opacity': 0.85,
                        },
                    },
                    {
                        id: 'iris-map-links',
                        type: 'line',
                        source: 'iris-map-links',
                        paint: {
                            'line-color': ['coalesce', ['get', 'color'], '#999999'],
                            'line-width': 2,
                            'line-opacity': 1,
                        },
                    },
                    {
                        id: 'iris-map-portals',
                        type: 'circle',
                        source: 'iris-map-portals',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 1,
                                10, 2,
                                15, 6,
                            ],
                            'circle-color': ['coalesce', ['get', 'color'], '#999999'],
                            'circle-opacity': [
                                'interpolate', ['linear'], ['coalesce', ['get', 'health'], 100],
                                0, 0.1,
                                100, 0.7,
                            ],
                            'circle-stroke-width': 1.5,
                            'circle-stroke-color': ['coalesce', ['get', 'color'], '#999999'],
                            'circle-stroke-opacity': 1,
                        },
                    },
                    {
                        id: 'iris-map-portal-selected',
                        type: 'circle',
                        source: 'iris-map-portal-selected',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 3,
                                10, 6,
                                15, 12,
                            ],
                            'circle-color': 'transparent',
                            'circle-stroke-width': 3,
                            'circle-stroke-color': '#ffffff',
                            'circle-stroke-opacity': 0.8,
                        },
                    },
                    {
                        id: 'iris-map-mission-waypoints',
                        type: 'circle',
                        source: 'iris-map-mission-waypoints',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 3,
                                10, 6,
                                15, 10,
                            ],
                            'circle-color': '#EF8E2E',
                            'circle-opacity': 0.9,
                            'circle-stroke-width': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 1.5,
                                10, 2,
                                15, 2.75,
                            ],
                            'circle-stroke-color': '#ffffff',
                            'circle-stroke-opacity': 0.95,
                        },
                    },
                    {
                        id: 'iris-map-artifacts',
                        type: 'circle',
                        source: 'iris-map-artifacts',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 3,
                                10, 7,
                                15, 14,
                            ],
                            'circle-color': '#FF00FF',
                            'circle-opacity': 0.12,
                            'circle-stroke-width': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 2,
                                10, 2.5,
                                15, 3.25,
                            ],
                            'circle-stroke-color': '#FF00FF',
                            'circle-stroke-opacity': 0.95,
                        },
                    },
                    {
                        id: 'iris-map-ornaments',
                        type: 'circle',
                        source: 'iris-map-ornaments',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 3,
                                10, 5,
                                15, 11,
                            ],
                            'circle-color': '#FFCE00',
                            'circle-opacity': 0.16,
                            'circle-stroke-width': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 1.5,
                                10, 2.25,
                                15, 3,
                            ],
                            'circle-stroke-color': '#FFCE00',
                            'circle-stroke-opacity': 0.95,
                        },
                    },
                    {
                        id: 'iris-map-plugin-points',
                        type: 'circle',
                        source: 'iris-map-plugin-features',
                        filter: [
                            'all',
                            ['==', '$type', 'Point'],
                            ['!=', 'isPlayerMarker', true],
                            ['!=', 'isHtmlMarker', true],
                            ['!=', 'isLabelMarker', true],
                        ],
                        paint: {
                            'circle-radius': 8,
                            'circle-color': ['coalesce', ['get', 'color'], '#37e6ff'],
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#ffffff',
                            'circle-opacity': ['coalesce', ['get', 'opacity'], 1],
                            'circle-stroke-opacity': ['coalesce', ['get', 'opacity'], 1],
                        },
                    },
                    {
                        id: 'iris-map-plugin-portal-highlights',
                        type: 'circle',
                        source: 'iris-map-plugin-highlights',
                        filter: ['==', '$type', 'Point'],
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                10, 5,
                                15, 9,
                            ],
                            'circle-color': ['coalesce', ['get', 'color'], '#ffffff'],
                            'circle-opacity': ['coalesce', ['get', 'opacity'], 0.9],
                            'circle-stroke-width': 2,
                            'circle-stroke-color': ['coalesce', ['get', 'teamColor'], '#ffffff'],
                            'circle-stroke-opacity': ['coalesce', ['get', 'opacity'], 1],
                        },
                    },
                    {
                        id: 'iris-map-plugin-html-points',
                        type: 'circle',
                        source: 'iris-map-plugin-features',
                        filter: [
                            'all',
                            ['==', '$type', 'Point'],
                            ['==', 'isHtmlMarker', true],
                            ['!=', 'isLabelMarker', true],
                        ],
                        paint: {
                            'circle-radius': 7,
                            'circle-color': ['coalesce', ['get', 'color'], '#37e6ff'],
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#ffffff',
                            'circle-opacity': ['coalesce', ['get', 'opacity'], 1],
                            'circle-stroke-opacity': ['coalesce', ['get', 'opacity'], 1],
                        },
                    },
                    {
                        id: 'iris-map-planned-anchor',
                        type: 'circle',
                        source: 'iris-map-planned-features',
                        filter: ['all', ['==', '$type', 'Point'], ['any', ['==', 'plannedType', 'anchor'], ['==', 'plannedType', 'target']]],
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                10, 7,
                                15, 12,
                            ],
                            'circle-color': 'transparent',
                            'circle-stroke-width': 3,
                            'circle-stroke-color': '#37e6ff',
                            'circle-stroke-opacity': 0.95,
                        },
                    },
                    {
                        id: 'iris-map-planned-crossings',
                        type: 'line',
                        source: 'iris-map-planned-features',
                        filter: ['all', ['==', '$type', 'LineString'], ['==', 'plannedType', 'crossing']],
                        paint: {
                            'line-width': 4,
                            'line-color': '#ff4d4d',
                            'line-opacity': 0.95,
                            'line-dasharray': [1, 1],
                        },
                    },
                    {
                        id: 'iris-map-plugin-labels',
                        type: 'symbol',
                        source: 'iris-map-plugin-features',
                        filter: ['all', ['==', '$type', 'Point'], ['==', 'isLabelMarker', true]],
                        layout: {
                            'text-field': ['coalesce', ['get', 'label'], ''],
                            'text-size': 11,
                            'text-anchor': 'center',
                            'text-allow-overlap': true,
                            'text-ignore-placement': true,
                        },
                        paint: {
                            'text-color': ['coalesce', ['get', 'color'], '#ffffff'],
                            'text-halo-color': '#000000',
                            'text-halo-width': 1.6,
                            'text-opacity': ['coalesce', ['get', 'opacity'], 1],
                        },
                    },
                ],
            },
            center: [0, 0],
            zoom: 2,
            interactive: true,
            attributionControl: false,
        });

        map.once('load', () => {
            map.on('movestart', () => {
                beginMovingEntityRenderMode(map);
            });
            map.on('zoomstart', () => {
                beginMovingEntityRenderMode(map);
            });
            map.on('move', () => {
                refreshMovingEntityRenderMode(map);
            });
            map.on('moveend', () => {
                if (panBenchmarkActive) {
                    return;
                }
                scheduleMovingEntityRenderRestore(map);
                if (suppressNextCameraChangedEvent) {
                    suppressNextCameraChangedEvent = false;
                    return;
                }

                postCameraChanged(map);
            });

            map.on('click', (event) => {
                if (Date.now() < suppressClickUntil) {
                    return;
                }

                const startedAt = performance.now();
                const features = map.queryRenderedFeatures(event.point, {
                    layers: getClickableIrisLayerIds(),
                });
                const summary = {
                    count: features.length,
                    elapsedMs: Math.round(performance.now() - startedAt),
                    point: {x: Math.round(event.point.x), y: Math.round(event.point.y)},
                    sample: summarizeFeature(features[0]),
                };
                postDiagnosticResult('MAP CLICK', summary);
                if (features.length === 0) {
                    collapseExpandedPlayerClusters();
                }
                postSelection(features);
            });
            map.on('contextmenu', (event) => {
                event.preventDefault();
                const features = map.queryRenderedFeatures(event.point, {
                    layers: getClickableIrisLayerIds(),
                });
                postSelection(features, true);
            });
            installMobileLongPressInfo(map);
            resolve(map);
        });
    });

    return pageMapPromise;
}

function getMapCamera(map: maplibregl.Map): PageMapRuntimeCamera {
    const center = map.getCenter();
    return {
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
    };
}

function getMapBounds(map: maplibregl.Map): PageMapRuntimeBounds {
    const bounds = map.getBounds();
    return {
        minLatE6: Math.round(bounds.getSouth() * 1e6),
        minLngE6: Math.round(bounds.getWest() * 1e6),
        maxLatE6: Math.round(bounds.getNorth() * 1e6),
        maxLngE6: Math.round(bounds.getEast() * 1e6),
    };
}

function postCameraChanged(map: maplibregl.Map, label = 'MAP CAMERA CHANGED'): void {
    const camera = getMapCamera(map);
    const bounds = getMapBounds(map);
    const message: PageMapRuntimeCameraChangedMessage = {
        type: PAGE_MAP_RUNTIME_MESSAGES.cameraChanged,
        camera,
        bounds,
    };
    window.postMessage(message, '*');
    postDiagnosticResult(label, {...camera, bounds});
}

function syncMapCamera(map: maplibregl.Map, camera: PageMapRuntimeCamera): void {
    suppressNextCameraChangedEvent = true;
    map.jumpTo({
        center: [camera.lng, camera.lat],
        zoom: camera.zoom,
    });
    window.setTimeout(() => {
        suppressNextCameraChangedEvent = false;
    }, 0);
}

async function resetMapOrientation(): Promise<void> {
    const map = await getPageMap();
    map.jumpTo({
        bearing: 0,
        pitch: 0,
    });
    postCameraChanged(map, 'MAP RESET ORIENTATION');
}

function getMessageCamera(message: PageMapRuntimeCommandMessage): PageMapRuntimeCamera | null {
    if (message.camera) {
        return message.camera;
    }
    if (message.center) {
        return {
            lat: message.center.lat,
            lng: message.center.lng,
            zoom: message.zoom ?? 15,
        };
    }

    return null;
}

function setGeoJsonSourceData(map: maplibregl.Map, sourceId: string, data: GeoJSON.FeatureCollection): void {
    const source = map.getSource(sourceId);
    if (source && 'setData' in source) {
        (source as SetDataGeoJsonSource).setData(data);
    }
}

function createSourceUpdatePerformance(): SourceUpdatePerformance {
    return {
        startedAt: performance.now(),
        setDataMs: 0,
        sourceSetDataMs: {},
        sourceFeatureCounts: {},
    };
}

function setMeasuredGeoJsonSourceData(
    map: maplibregl.Map,
    perf: SourceUpdatePerformance,
    sourceId: string,
    data: GeoJSON.FeatureCollection
): void {
    const source = map.getSource(sourceId);
    if (!source || !('setData' in source)) return;

    const startedAt = performance.now();
    (source as SetDataGeoJsonSource).setData(data);
    const elapsed = performance.now() - startedAt;
    const sourceLabel = SOURCE_COUNT_LABELS[sourceId] ?? sourceId;
    perf.setDataMs += elapsed;
    perf.sourceSetDataMs[sourceLabel] = (perf.sourceSetDataMs[sourceLabel] ?? 0) + elapsed;
    perf.sourceFeatureCounts[sourceLabel] = data.features.length;
    currentSourceFeatureCounts[sourceLabel] = data.features.length;
}

function setRasterTiles(map: maplibregl.Map, sourceId: string, tiles: string[]): void {
    const source = map.getSource(sourceId);
    if (source && 'setTiles' in source) {
        (source as SetTilesRasterSource).setTiles(tiles);
        map.triggerRepaint();
    }
}

function getVisibleIrisLayerIds(): string[] {
    return [
        currentLayerVisibility.portals ? 'iris-map-portals' : null,
        currentLayerVisibility.links ? 'iris-map-links' : null,
        currentLayerVisibility.fields ? 'iris-map-fields' : null,
    ].filter((layerId): layerId is string => Boolean(layerId));
}

function getClickableIrisLayerIds(): string[] {
    return [
        'iris-map-planned-links',
        ...getVisibleIrisLayerIds(),
    ].filter((layerId) => Boolean(layerId));
}

function setLayerVisibility(map: maplibregl.Map, layerId: string, visible: boolean): void {
    if (!map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
}

function getLayerVisibility(map: maplibregl.Map, layerId: string): string {
    if (!map.getLayer(layerId)) return 'missing';
    return map.getLayoutProperty(layerId, 'visibility') === 'none' ? 'none' : 'visible';
}

function setLayerPaintProperty(map: maplibregl.Map, layerId: string, property: string, value: unknown): void {
    if (!map.getLayer(layerId)) return;
    map.setPaintProperty(layerId, property, value);
}

function setMarkerRegistryVisibility<T extends {element: HTMLElement}>(registry: Map<string, T>, visible: boolean): void {
    registry.forEach((entry) => {
        entry.element.style.display = visible ? 'block' : 'none';
    });
}

function getMarkerRegistryVisibility<T extends {element: HTMLElement}>(registry: Map<string, T>): string {
    if (registry.size === 0) return 'empty';
    for (const entry of registry.values()) {
        if (entry.element.style.display !== 'none') return 'visible';
    }
    return 'none';
}

function shouldShowBenchmarkMarkers(): boolean {
    return activeBenchmarkVariant === 'normal';
}

function shouldShowRuntimeMarkers(): boolean {
    return shouldShowBenchmarkMarkers() && movingOverlayVisible;
}

function applyRuntimeMarkerVisibility(element: HTMLElement): void {
    element.style.display = shouldShowRuntimeMarkers() ? 'block' : 'none';
}

function setMovingOverlayVisibility(map: maplibregl.Map, visible: boolean): void {
    movingOverlayVisible = visible;
    MOVING_OVERLAY_LAYER_IDS.forEach((layerId) => setLayerVisibility(map, layerId, visible));
    setMarkerRegistryVisibility(plannedMarkerRegistry, visible && shouldShowBenchmarkMarkers());
    setMarkerRegistryVisibility(playerMarkerRegistry, visible && shouldShowBenchmarkMarkers());
    setMarkerRegistryVisibility(playerClusterRegistry, visible && shouldShowBenchmarkMarkers());
}

function getMovingEntityRenderMode(map: maplibregl.Map): MovingEntityRenderMode {
    const zoom = map.getZoom();
    if (zoom <= MOVING_ENTITY_HIDE_LINKS_MAX_ZOOM) return 'minimal';
    if (zoom <= MOVING_ENTITY_SIMPLIFY_MAX_ZOOM) return 'simplified';
    return 'full';
}

function setMovingEntityRenderMode(map: maplibregl.Map, mode: MovingEntityRenderMode): void {
    if (movingEntityRenderMode === mode) return;
    movingEntityRenderMode = mode;

    if (mode === 'minimal') {
        setLayerVisibility(map, 'iris-map-links', false);
        setLayerVisibility(map, 'iris-map-link-selected', false);
        setLayerVisibility(map, 'iris-map-fields', false);
        setLayerVisibility(map, 'iris-map-field-selected', false);
        return;
    }

    if (mode === 'simplified') {
        setLayerVisibility(map, 'iris-map-links', currentLayerVisibility.links);
        setLayerVisibility(map, 'iris-map-link-selected', currentLayerVisibility.links);
        setLayerVisibility(map, 'iris-map-fields', false);
        setLayerVisibility(map, 'iris-map-field-selected', false);
        setLayerPaintProperty(map, 'iris-map-links', 'line-width', 1);
        setLayerPaintProperty(map, 'iris-map-links', 'line-opacity', 0.35);
        setLayerPaintProperty(map, 'iris-map-link-selected', 'line-width', 2);
        setLayerPaintProperty(map, 'iris-map-link-selected', 'line-opacity', 0.8);
        return;
    }

    setLayerVisibility(map, 'iris-map-links', currentLayerVisibility.links);
    setLayerVisibility(map, 'iris-map-link-selected', currentLayerVisibility.links);
    setLayerVisibility(map, 'iris-map-fields', currentLayerVisibility.fields);
    setLayerVisibility(map, 'iris-map-field-selected', currentLayerVisibility.fields);
    setLayerPaintProperty(map, 'iris-map-links', 'line-width', 2);
    setLayerPaintProperty(map, 'iris-map-links', 'line-opacity', 1);
    setLayerPaintProperty(map, 'iris-map-link-selected', 'line-width', 4);
    setLayerPaintProperty(map, 'iris-map-link-selected', 'line-opacity', 1);
}

function clearMovingEntityRenderRestoreTimer(): void {
    if (movingEntityRenderRestoreTimer !== null) {
        window.clearTimeout(movingEntityRenderRestoreTimer);
        movingEntityRenderRestoreTimer = null;
    }
}

function beginMovingEntityRenderMode(map: maplibregl.Map): void {
    clearMovingEntityRenderRestoreTimer();
    setMovingOverlayVisibility(map, false);
    refreshMovingEntityRenderMode(map);
}

function refreshMovingEntityRenderMode(map: maplibregl.Map): void {
    setMovingEntityRenderMode(map, getMovingEntityRenderMode(map));
}

function scheduleMovingEntityRenderRestore(map: maplibregl.Map): void {
    clearMovingEntityRenderRestoreTimer();
    movingEntityRenderRestoreTimer = window.setTimeout(() => {
        movingEntityRenderRestoreTimer = null;
        setMovingEntityRenderMode(map, 'full');
        setMovingOverlayVisibility(map, true);
    }, MOVING_ENTITY_RESTORE_SETTLE_MS);
}

function applyBenchmarkVariant(map: maplibregl.Map, variant: BenchmarkVariant): () => void {
    const previousBenchmarkVariant = activeBenchmarkVariant;
    activeBenchmarkVariant = variant;

    if (variant === 'normal') {
        return () => {
            activeBenchmarkVariant = previousBenchmarkVariant;
        };
    }

    let layerIdsToHide: string[];
    if (variant === 'base') {
        layerIdsToHide = (map.getStyle().layers ?? []).map((layer) => layer.id).filter((layerId) => layerId !== 'osm');
    } else if (variant === 'no-links') {
        layerIdsToHide = ['iris-map-links', 'iris-map-link-selected'];
    } else if (variant === 'no-fields') {
        layerIdsToHide = ['iris-map-fields', 'iris-map-field-selected'];
    } else {
        layerIdsToHide = BENCHMARK_PLUGIN_LAYER_IDS;
    }
    const previousLayerVisibility = new Map<string, unknown>();

    layerIdsToHide.forEach((layerId) => {
        if (!map.getLayer(layerId)) return;
        previousLayerVisibility.set(layerId, map.getLayoutProperty(layerId, 'visibility'));
        setLayerVisibility(map, layerId, false);
    });

    setMarkerRegistryVisibility(plannedMarkerRegistry, false);
    setMarkerRegistryVisibility(playerMarkerRegistry, false);
    setMarkerRegistryVisibility(playerClusterRegistry, false);

    return () => {
        layerIdsToHide.forEach((layerId) => {
            if (!map.getLayer(layerId)) return;
            const previousVisibility = previousLayerVisibility.get(layerId);
            map.setLayoutProperty(layerId, 'visibility', previousVisibility === 'none' ? 'none' : 'visible');
        });

        setMarkerRegistryVisibility(plannedMarkerRegistry, true);
        setMarkerRegistryVisibility(playerMarkerRegistry, true);
        setMarkerRegistryVisibility(playerClusterRegistry, true);
        activeBenchmarkVariant = previousBenchmarkVariant;
    };
}

function setIrisLayerVisibility(map: maplibregl.Map, visibility: PageMapRuntimeLayerVisibility): void {
    currentLayerVisibility = visibility;
    setLayerVisibility(map, 'iris-map-portals', visibility.portals);
    setLayerVisibility(map, 'iris-map-links', visibility.links && movingEntityRenderMode !== 'minimal');
    setLayerVisibility(map, 'iris-map-fields', visibility.fields && movingEntityRenderMode === 'full');
    setLayerVisibility(map, 'iris-map-link-selected', visibility.links && movingEntityRenderMode !== 'minimal');
    setLayerVisibility(map, 'iris-map-field-selected', visibility.fields && movingEntityRenderMode === 'full');
}

function setIrisData(map: maplibregl.Map, message: PageMapRuntimeCommandMessage): void {
    const perf = createSourceUpdatePerformance();
    if (message.planning) {
        currentPlanningState = message.planning;
    }
    if (message.data?.portals) {
        setMeasuredGeoJsonSourceData(map, perf, 'iris-map-portals', message.data.portals);
    }
    if (message.data?.links) {
        setMeasuredGeoJsonSourceData(map, perf, 'iris-map-links', message.data.links);
    }
    if (message.data?.fields) {
        setMeasuredGeoJsonSourceData(map, perf, 'iris-map-fields', message.data.fields);
    }
    if (message.data?.artifacts) {
        setMeasuredGeoJsonSourceData(map, perf, 'iris-map-artifacts', message.data.artifacts);
    }
    if (message.data?.ornaments) {
        setMeasuredGeoJsonSourceData(map, perf, 'iris-map-ornaments', message.data.ornaments);
    }
    if (message.data?.missionRoute) {
        setMeasuredGeoJsonSourceData(map, perf, 'iris-map-mission-route', message.data.missionRoute);
    }
    if (message.data?.missionWaypoints) {
        setMeasuredGeoJsonSourceData(map, perf, 'iris-map-mission-waypoints', message.data.missionWaypoints);
    }
    if (message.data?.pluginFeatures) {
        setPluginFeatureData(map, perf, message.data.pluginFeatures);
    }
    if (message.data?.plannedFeatures) {
        setMeasuredGeoJsonSourceData(map, perf, 'iris-map-planned-features', message.data.plannedFeatures);
        syncPlannedMarkerPins(map, message.data.plannedFeatures);
    }
    setSelectedData(map, perf, message);
    publishViewportPerformance(map, message, perf);
}

function setPluginFeatureData(
    map: maplibregl.Map,
    perf: SourceUpdatePerformance,
    features: GeoJSON.FeatureCollection
): void {
    const portalHighlights: GeoJSON.Feature[] = [];
    const playerMarkers: GeoJSON.Feature[] = [];
    const remainingFeatures: GeoJSON.Feature[] = [];

    for (const feature of features.features) {
        const id = getFeatureId(feature);
        if (id.startsWith('portal-level:') || id.startsWith('portal-recharge:')) {
            portalHighlights.push(feature);
        } else if (isPlayerMarkerFeature(feature)) {
            playerMarkers.push(feature);
        } else {
            remainingFeatures.push(feature);
        }
    }

    perf.pluginFeatureCounts = getPluginFeatureCounts(features.features, {
        playerMarkerCount: playerMarkers.length,
        highlightCount: portalHighlights.length,
        renderedSourceCount: remainingFeatures.length,
    });
    currentPluginFeatureCounts = perf.pluginFeatureCounts;
    setMeasuredGeoJsonSourceData(map, perf, 'iris-map-plugin-features', {
        type: 'FeatureCollection',
        features: remainingFeatures,
    });
    setMeasuredGeoJsonSourceData(map, perf, 'iris-map-plugin-highlights', {
        type: 'FeatureCollection',
        features: portalHighlights,
    });
    syncPlayerMarkerPins(map, {
        type: 'FeatureCollection',
        features: playerMarkers,
    });
    perf.sourceFeatureCounts['plugin-features'] = features.features.length;
    currentSourceFeatureCounts['plugin-features'] = features.features.length;
}

function getPluginFeatureCounts(
    features: GeoJSON.Feature[],
    renderedCounts: {playerMarkerCount: number; highlightCount: number; renderedSourceCount: number}
): Record<string, number> {
    const counts: Record<string, number> = {
        total: features.length,
        renderedSource: renderedCounts.renderedSourceCount,
        highlights: renderedCounts.highlightCount,
        playerMarkers: renderedCounts.playerMarkerCount,
        htmlMarkers: 0,
        labels: 0,
        lines: 0,
        fills: 0,
        points: 0,
        interactive: 0,
    };

    for (const feature of features) {
        const properties = feature.properties as Record<string, unknown> | null;
        if (properties?.isHtmlMarker === true || properties?.isHtmlMarker === 'true') counts.htmlMarkers += 1;
        if (properties?.isLabelMarker === true || properties?.isLabelMarker === 'true') counts.labels += 1;
        if (properties?.isInteractive === true || properties?.isInteractive === 'true') counts.interactive += 1;
        if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') counts.lines += 1;
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') counts.fills += 1;
        if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') counts.points += 1;
    }

    return counts;
}

function isPlayerMarkerFeature(feature: GeoJSON.Feature): boolean {
    if (feature.geometry.type !== 'Point') return false;
    const properties = feature.properties as Record<string, unknown> | null;
    return properties?.isPlayerMarker === true || properties?.isPlayerMarker === 'true';
}

function syncPlayerMarkerPins(map: maplibregl.Map, features: GeoJSON.FeatureCollection): void {
    lastPlayerMarkerFeatures = features;
    const markerFeatures = extractPlayerMarkerRuntimeData(features);
    const groups = getPlayerMarkerGroups(markerFeatures);
    pruneExpandedPlayerClusterKeys(groups);
    const expandedMarkers = getExpandedPlayerMarkers(groups);
    const clusters = getPlayerClusters(groups);
    const activeMarkerIds = new Set<string>();
    const activeClusterIds = new Set<string>();

    for (const playerMarker of expandedMarkers) {
        activeMarkerIds.add(playerMarker.id);
        const existing = playerMarkerRegistry.get(playerMarker.id);
        if (existing) {
            existing.marker.setLngLat([playerMarker.lng, playerMarker.lat]);
            existing.marker.setOffset(getPlayerMarkerOffset(playerMarker));
            updatePlayerMarkerPinElement(existing, playerMarker);
            applyRuntimeMarkerVisibility(existing.element);
            continue;
        }

        const entry = createPlayerMarkerPinEntry(playerMarker);
        entry.marker
            .setLngLat([playerMarker.lng, playerMarker.lat])
            .setOffset(getPlayerMarkerOffset(playerMarker))
            .addTo(map);
        applyRuntimeMarkerVisibility(entry.element);
        playerMarkerRegistry.set(playerMarker.id, entry);
    }

    playerMarkerRegistry.forEach((entry, markerId) => {
        if (!activeMarkerIds.has(markerId)) {
            entry.marker.remove();
            playerMarkerRegistry.delete(markerId);
        }
    });

    for (const cluster of clusters) {
        activeClusterIds.add(cluster.id);
        const existing = playerClusterRegistry.get(cluster.id);
        if (existing) {
            existing.marker.setLngLat([cluster.lng, cluster.lat]);
            updatePlayerClusterElement(existing, cluster);
            applyRuntimeMarkerVisibility(existing.element);
            continue;
        }

        const entry = createPlayerClusterEntry(cluster);
        entry.marker.setLngLat([cluster.lng, cluster.lat]).addTo(map);
        applyRuntimeMarkerVisibility(entry.element);
        playerClusterRegistry.set(cluster.id, entry);
    }

    playerClusterRegistry.forEach((entry, clusterId) => {
        if (!activeClusterIds.has(clusterId)) {
            entry.marker.remove();
            playerClusterRegistry.delete(clusterId);
        }
    });

}

function resyncPlayerMarkers(): void {
    getPageMap()
        .then((map) => syncPlayerMarkerPins(map, lastPlayerMarkerFeatures))
        .catch(() => undefined);
}

function collapseExpandedPlayerClusters(): void {
    if (expandedPlayerClusterKeys.size === 0) return;
    expandedPlayerClusterKeys.clear();
    resyncPlayerMarkers();
}

function extractPlayerMarkerRuntimeData(features: GeoJSON.FeatureCollection): PlayerMarkerRuntimeData[] {
    return features.features.flatMap((feature): PlayerMarkerRuntimeData[] => {
        if (feature.geometry.type !== 'Point') return [];
        const properties = feature.properties as Record<string, unknown> | null;
        const id = typeof properties?.id === 'string' ? properties.id : typeof feature.id === 'string' ? feature.id : '';
        const coordinates = feature.geometry.coordinates;
        if (!id || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') return [];

        return [{
            id,
            lng: coordinates[0],
            lat: coordinates[1],
            color: typeof properties?.color === 'string' ? properties.color : '#ffffff',
            opacity: typeof properties?.opacity === 'number' ? properties.opacity : 1,
            label: typeof properties?.label === 'string' ? properties.label : typeof properties?.name === 'string' ? properties.name : 'Player',
            name: typeof properties?.name === 'string' ? properties.name : 'Player',
            feature: {
                ...feature,
                properties: {
                    ...properties,
                    lat: coordinates[1],
                    lng: coordinates[0],
                },
            },
            spreadIndex: 0,
            spreadCount: 1,
        }];
    });
}

function getPlayerMarkerGroups(markers: PlayerMarkerRuntimeData[]): Map<string, PlayerMarkerRuntimeData[]> {
    const byLocation = new Map<string, PlayerMarkerRuntimeData[]>();
    for (const marker of markers) {
        const key = getPlayerMarkerLocationKey(marker);
        const group = byLocation.get(key);
        if (group) {
            group.push(marker);
        } else {
            byLocation.set(key, [marker]);
        }
    }

    for (const [key, group] of byLocation) {
        byLocation.set(key, [...group].sort((a, b) => a.id.localeCompare(b.id)));
    }

    return byLocation;
}

function pruneExpandedPlayerClusterKeys(groups: Map<string, PlayerMarkerRuntimeData[]>): void {
    for (const key of expandedPlayerClusterKeys) {
        const group = groups.get(key);
        if (!group || group.length <= 1) {
            expandedPlayerClusterKeys.delete(key);
        }
    }
}

function getExpandedPlayerMarkers(groups: Map<string, PlayerMarkerRuntimeData[]>): PlayerMarkerRuntimeData[] {
    const markers: PlayerMarkerRuntimeData[] = [];
    for (const [key, group] of groups) {
        if (group.length > 1 && !expandedPlayerClusterKeys.has(key)) continue;
        markers.push(...withPlayerMarkerSpread(group));
    }
    return markers;
}

function getPlayerClusters(groups: Map<string, PlayerMarkerRuntimeData[]>): PlayerClusterRuntimeData[] {
    const clusters: PlayerClusterRuntimeData[] = [];
    for (const [key, group] of groups) {
        if (group.length <= 1) continue;
        const teams = new Set(group
            .map((marker) => {
                const properties = marker.feature.properties as Record<string, unknown> | null;
                return properties?.team;
            })
            .filter((team): team is string => typeof team === 'string'));
        const mixedTeams = teams.size > 1;
        clusters.push({
            id: `player-cluster:${key}`,
            key,
            lng: group[0].lng,
            lat: group[0].lat,
            color: mixedTeams ? '#37e6ff' : group[0].color,
            count: group.length,
            mixedTeams,
            expanded: expandedPlayerClusterKeys.has(key),
        });
    }
    return clusters;
}

function withPlayerMarkerSpread(markers: PlayerMarkerRuntimeData[]): PlayerMarkerRuntimeData[] {
    const byLocation = getPlayerMarkerGroups(markers);

    return markers.map((marker) => {
        const group = byLocation.get(getPlayerMarkerLocationKey(marker)) ?? [marker];
        const spreadIndex = group.findIndex((item) => item.id === marker.id);
        return {
            ...marker,
            spreadIndex: Math.max(0, spreadIndex),
            spreadCount: group.length,
        };
    });
}

function getPlayerMarkerLocationKey(marker: PlayerMarkerRuntimeData): string {
    return `${marker.lat.toFixed(6)},${marker.lng.toFixed(6)}`;
}

function getPlayerMarkerOffset(marker: PlayerMarkerRuntimeData): MarkerOffset {
    if (marker.spreadCount <= 1) return [0, 0];

    if (marker.spreadCount >= PLAYER_MARKER_SPIRAL_START_COUNT) {
        const angle = marker.spreadIndex * 1.35 - (Math.PI / 2);
        const radius = PLAYER_MARKER_SPIRAL_START_RADIUS_PX + (marker.spreadIndex * PLAYER_MARKER_SPIRAL_STEP_PX);
        return [
            Math.round(Math.cos(angle) * radius),
            Math.round(Math.sin(angle) * radius),
        ];
    }

    const angle = ((Math.PI * 2) / marker.spreadCount) * marker.spreadIndex - (Math.PI / 2);
    return [
        Math.round(Math.cos(angle) * PLAYER_MARKER_CIRCLE_SPREAD_RADIUS_PX),
        Math.round(Math.sin(angle) * PLAYER_MARKER_CIRCLE_SPREAD_RADIUS_PX),
    ];
}

function createPlayerMarkerPinEntry(playerMarker: PlayerMarkerRuntimeData): PlayerMarkerRegistryEntry {
    const element = document.createElement('div');
    const pin = document.createElement('div');
    const core = document.createElement('div');
    const label = document.createElement('div');
    let longPressTimer: number | null = null;
    let touchStart: {x: number; y: number} | null = null;
    let suppressNextClick = false;

    const openPlayerMarkerInfo = (): void => {
        window.postMessage({
            type: PAGE_MAP_RUNTIME_MESSAGES.selection,
            selection: {
                id: playerMarker.id,
                kind: 'plugin-feature',
                feature: playerMarker.feature,
            } satisfies PageMapRuntimeSelectionPayload,
        }, '*');
    };

    const clearLongPressTimer = (): void => {
        if (longPressTimer !== null) {
            window.clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    const cancelLongPress = (): void => {
        clearLongPressTimer();
        touchStart = null;
    };

    element.className = 'iris-page-player-marker-pin';
    pin.className = 'iris-page-player-marker-pin__body';
    core.className = 'iris-page-player-marker-pin__core';
    label.className = 'iris-page-player-marker-pin__label';
    pin.appendChild(core);
    element.appendChild(pin);
    element.appendChild(label);

    element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        suppressNextClick = false;
    });

    element.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openPlayerMarkerInfo();
    });

    element.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) {
            cancelLongPress();
            return;
        }

        const touch = event.touches[0];
        touchStart = {x: touch.clientX, y: touch.clientY};
        clearLongPressTimer();
        longPressTimer = window.setTimeout(() => {
            if (!touchStart) return;
            suppressNextClick = true;
            openPlayerMarkerInfo();
            cancelLongPress();
        }, MOBILE_LONG_PRESS_MS);
    }, {passive: true});

    element.addEventListener('touchmove', (event) => {
        if (!touchStart || event.touches.length !== 1) {
            cancelLongPress();
            return;
        }

        const touch = event.touches[0];
        const distance = Math.hypot(touch.clientX - touchStart.x, touch.clientY - touchStart.y);
        if (distance > MOBILE_LONG_PRESS_MOVE_TOLERANCE_PX) {
            cancelLongPress();
        }
    }, {passive: true});

    element.addEventListener('touchend', (event) => {
        if (suppressNextClick) {
            event.preventDefault();
        }
        cancelLongPress();
    });
    element.addEventListener('touchcancel', cancelLongPress, {passive: true});

    const marker = new maplibregl.Marker({element, anchor: 'bottom', offset: [0, 0]});
    const entry = {marker, element, pin, label};
    updatePlayerMarkerPinElement(entry, playerMarker);
    return entry;
}

function createPlayerClusterEntry(cluster: PlayerClusterRuntimeData): PlayerClusterRegistryEntry {
    const element = document.createElement('div');
    const badge = document.createElement('div');

    element.className = 'iris-page-player-marker-cluster';
    badge.className = 'iris-page-player-marker-cluster__badge';
    element.appendChild(badge);

    element.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (expandedPlayerClusterKeys.has(cluster.key)) {
            expandedPlayerClusterKeys.delete(cluster.key);
        } else {
            expandedPlayerClusterKeys.add(cluster.key);
        }
        resyncPlayerMarkers();
    });

    const marker = new maplibregl.Marker({element, anchor: 'center', offset: [0, 0]});
    const entry = {marker, element, badge};
    updatePlayerClusterElement(entry, cluster);
    return entry;
}

function updatePlayerClusterElement(entry: PlayerClusterRegistryEntry, cluster: PlayerClusterRuntimeData): void {
    entry.element.title = cluster.expanded ? `Collapse ${cluster.count} players` : `${cluster.count} players`;
    applyMarkerRootStyles(entry.element, {
        width: '34px',
        height: '34px',
        cursor: 'pointer',
        pointerEvents: 'auto',
        opacity: '0.98',
        filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.8))',
    });
    entry.element.style.borderRadius = '50%';
    entry.element.style.background = cluster.expanded ? 'rgba(0,0,0,0.78)' : `${cluster.color}33`;
    entry.element.style.border = `2px solid ${cluster.color}`;
    entry.element.style.boxShadow = cluster.mixedTeams
        ? '0 0 0 2px rgba(255,255,255,0.35), inset 0 0 0 2px rgba(0,0,0,0.5)'
        : 'inset 0 0 0 2px rgba(0,0,0,0.55)';

    entry.badge.textContent = cluster.expanded ? 'x' : String(cluster.count);
    entry.badge.style.position = 'absolute';
    entry.badge.style.left = '50%';
    entry.badge.style.top = '50%';
    entry.badge.style.transform = 'translate(-50%, -50%)';
    entry.badge.style.minWidth = '20px';
    entry.badge.style.height = '20px';
    entry.badge.style.borderRadius = '999px';
    entry.badge.style.background = cluster.expanded ? cluster.color : 'rgba(0,0,0,0.82)';
    entry.badge.style.border = '1px solid rgba(255,255,255,0.9)';
    entry.badge.style.color = '#ffffff';
    entry.badge.style.font = '700 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    entry.badge.style.lineHeight = '20px';
    entry.badge.style.textAlign = 'center';
    entry.badge.style.boxSizing = 'border-box';
}

function updatePlayerMarkerPinElement(
    entry: PlayerMarkerRegistryEntry,
    playerMarker: PlayerMarkerRuntimeData
): void {
    entry.element.title = playerMarker.label;
    applyMarkerRootStyles(entry.element, {
        width: '150px',
        height: '42px',
        cursor: 'pointer',
        pointerEvents: 'auto',
        opacity: String(playerMarker.opacity),
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.75))',
    });
    applyPinBodyStyles(entry.pin, {
        left: '65px',
        top: '2px',
        color: playerMarker.color,
        border: '2px solid #ffffff',
    });
    applyPinCoreStyles(entry.pin, {background: '#ffffff'});

    entry.label.textContent = playerMarker.label;
    entry.label.style.position = 'absolute';
    entry.label.style.left = '90px';
    entry.label.style.top = '5px';
    entry.label.style.maxWidth = '125px';
    entry.label.style.overflow = 'hidden';
    entry.label.style.textOverflow = 'ellipsis';
    entry.label.style.whiteSpace = 'nowrap';
    entry.label.style.color = '#ffffff';
    entry.label.style.font = '11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    entry.label.style.fontWeight = '700';
    entry.label.style.lineHeight = '14px';
    entry.label.style.textShadow = '0 1px 2px #000, 0 0 3px #000';
}

function syncPlannedMarkerPins(map: maplibregl.Map, features: GeoJSON.FeatureCollection): void {
    const activeIds = new Set<string>();
    const markerFeatures = extractPlannedMarkerRuntimeData(features);
    const allowPointerEvents = !(currentPlanningState.enabled && currentPlanningState.tool === 'links');

    for (const plannedMarker of markerFeatures) {
        activeIds.add(plannedMarker.id);
        const existing = plannedMarkerRegistry.get(plannedMarker.id);
        if (existing) {
            existing.marker.setLngLat([plannedMarker.lng, plannedMarker.lat]);
            updatePlannedMarkerPinElement(existing, plannedMarker, allowPointerEvents);
            applyRuntimeMarkerVisibility(existing.element);
            continue;
        }

        const entry = createPlannedMarkerPinEntry(plannedMarker, allowPointerEvents);
        entry.marker.setLngLat([plannedMarker.lng, plannedMarker.lat]).addTo(map);
        applyRuntimeMarkerVisibility(entry.element);
        plannedMarkerRegistry.set(plannedMarker.id, entry);
    }

    plannedMarkerRegistry.forEach((entry, markerId) => {
        if (!activeIds.has(markerId)) {
            entry.marker.remove();
            plannedMarkerRegistry.delete(markerId);
        }
    });
}

function extractPlannedMarkerRuntimeData(features: GeoJSON.FeatureCollection): PlannedMarkerRuntimeData[] {
    return features.features.flatMap((feature): PlannedMarkerRuntimeData[] => {
        if (feature.geometry.type !== 'Point') return [];
        const properties = feature.properties as Record<string, unknown> | null;
        if (properties?.plannedType !== 'marker') return [];

        const id = typeof properties.id === 'string' ? properties.id : typeof feature.id === 'string' ? feature.id : '';
        const coordinates = feature.geometry.coordinates;
        if (!id || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') return [];

        return [{
            id,
            lng: coordinates[0],
            lat: coordinates[1],
            color: typeof properties.color === 'string' ? properties.color : '#37e6ff',
            selected: properties.selected === true,
            label: typeof properties.label === 'string' ? properties.label : 'Planned marker',
        }];
    });
}

function createPlannedMarkerPinEntry(
    plannedMarker: PlannedMarkerRuntimeData,
    allowPointerEvents: boolean
): PlannedMarkerRegistryEntry {
    const element = document.createElement('div');
    const pin = document.createElement('div');
    const core = document.createElement('div');

    element.className = 'iris-page-planned-marker-pin';
    pin.className = 'iris-page-planned-marker-pin__body';
    core.className = 'iris-page-planned-marker-pin__core';
    pin.appendChild(core);
    element.appendChild(pin);

    element.addEventListener('click', (event) => {
        if (currentPlanningState.enabled && currentPlanningState.tool === 'links') return;
        event.preventDefault();
        event.stopPropagation();
        window.postMessage({
            type: PAGE_MAP_RUNTIME_MESSAGES.selection,
            selection: {
                id: plannedMarker.id,
                kind: 'planned-marker',
                openInfo: false,
            } satisfies PageMapRuntimeSelectionPayload,
        }, '*');
    });

    const marker = new maplibregl.Marker({element, anchor: 'bottom', offset: [0, 0]});
    const entry = {marker, element, pin};
    updatePlannedMarkerPinElement(entry, plannedMarker, allowPointerEvents);
    return entry;
}

function applyMarkerRootStyles(element: HTMLDivElement, options: {
    width: string;
    height: string;
    cursor: string;
    pointerEvents: string;
    opacity: string;
    filter: string;
}): void {
    element.style.position = 'absolute';
    element.style.top = '0';
    element.style.left = '0';
    element.style.willChange = 'transform';
    element.style.display = 'block';
    element.style.width = options.width;
    element.style.height = options.height;
    element.style.cursor = options.cursor;
    element.style.pointerEvents = options.pointerEvents;
    element.style.opacity = options.opacity;
    element.style.filter = options.filter;
}

function applyPinBodyStyles(pin: HTMLDivElement, options: PinBodyOptions): void {
    pin.style.position = 'absolute';
    pin.style.display = 'block';
    pin.style.left = options.left;
    pin.style.top = options.top;
    pin.style.width = '20px';
    pin.style.height = '20px';
    pin.style.background = options.color;
    pin.style.border = options.border;
    pin.style.borderRadius = '50% 50% 50% 0';
    pin.style.transform = 'rotate(-45deg)';
    pin.style.boxSizing = 'border-box';
}

function applyPinCoreStyles(pin: HTMLDivElement, options: PinCoreOptions): void {
    const core = pin.firstElementChild;
    if (!(core instanceof HTMLDivElement)) return;

    core.style.position = 'absolute';
    core.style.left = '50%';
    core.style.top = '50%';
    core.style.width = '7px';
    core.style.height = '7px';
    core.style.marginLeft = '-3.5px';
    core.style.marginTop = '-3.5px';
    core.style.borderRadius = '50%';
    core.style.background = options.background;
    core.style.transform = 'rotate(45deg)';
    core.style.boxShadow = options.boxShadow ?? '0 0 0 1px rgba(0,0,0,0.35)';
}

function updatePlannedMarkerPinElement(
    entry: PlannedMarkerRegistryEntry,
    plannedMarker: PlannedMarkerRuntimeData,
    allowPointerEvents: boolean
): void {
    entry.element.title = plannedMarker.label;
    applyMarkerRootStyles(entry.element, {
        width: '30px',
        height: '42px',
        cursor: allowPointerEvents ? 'pointer' : 'default',
        pointerEvents: allowPointerEvents ? 'auto' : 'none',
        opacity: plannedMarker.selected ? '1' : '0.96',
        filter: plannedMarker.selected
            ? 'drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 2px 4px rgba(0,0,0,0.7))'
            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.75))',
    });
    applyPinBodyStyles(entry.pin, {
        left: '5px',
        top: '2px',
        color: plannedMarker.color,
        border: plannedMarker.selected ? '3px solid #ffffff' : '2px solid rgba(0,0,0,0.88)',
    });
    applyPinCoreStyles(entry.pin, {
        background: plannedMarker.selected ? '#ffffff' : 'rgba(255,255,255,0.9)',
    });
}

function getFeatureId(feature: GeoJSON.Feature): string {
    if (typeof feature.id === 'string') return feature.id;
    const properties = feature.properties as Record<string, unknown> | null;
    return typeof properties?.id === 'string' ? properties.id : '';
}

function setSelectedData(
    map: maplibregl.Map,
    perf: SourceUpdatePerformance | null,
    message: PageMapRuntimeCommandMessage
): void {
    const setData = perf
        ? (sourceId: string, data: GeoJSON.FeatureCollection): void => setMeasuredGeoJsonSourceData(map, perf, sourceId, data)
        : (sourceId: string, data: GeoJSON.FeatureCollection): void => setGeoJsonSourceData(map, sourceId, data);
    if (message.data?.selectedPortal) {
        setData('iris-map-portal-selected', message.data.selectedPortal);
    }
    if (message.data?.selectedLink) {
        setData('iris-map-link-selected', message.data.selectedLink);
    }
    if (message.data?.selectedField) {
        setData('iris-map-field-selected', message.data.selectedField);
    }
}

function getIrisDataCounts(message: PageMapRuntimeCommandMessage): Record<string, unknown> {
    return {
        portals: message.data?.portals?.features.length ?? 0,
        links: message.data?.links?.features.length ?? 0,
        fields: message.data?.fields?.features.length ?? 0,
    };
}

function publishViewportPerformance(
    map: maplibregl.Map,
    message: PageMapRuntimeCommandMessage,
    perf: SourceUpdatePerformance
): void {
    void message;
    const sourceFeatureCounts = {...currentSourceFeatureCounts};
    const snapshot = {
        type: 'viewport',
        time: Date.now(),
        totalMs: performance.now() - perf.startedAt,
        setDataMs: perf.setDataMs,
        zoom: map.getZoom(),
        sourceSetDataMs: perf.sourceSetDataMs,
        sourceFeatureCounts,
        pluginFeatureCounts: perf.pluginFeatureCounts,
        itemCount:
            (sourceFeatureCounts.portals ?? 0) +
            (sourceFeatureCounts.links ?? 0) +
            (sourceFeatureCounts.fields ?? 0) +
            (sourceFeatureCounts.artifacts ?? 0) +
            (sourceFeatureCounts.ornaments ?? 0) +
            (sourceFeatureCounts['plugin-features'] ?? 0) +
            (sourceFeatureCounts['planned-features'] ?? 0),
        portalCount: sourceFeatureCounts.portals ?? 0,
        linkCount: sourceFeatureCounts.links ?? 0,
        fieldCount: sourceFeatureCounts.fields ?? 0,
        artifactCount: sourceFeatureCounts.artifacts ?? 0,
        ornamentCount: sourceFeatureCounts.ornaments ?? 0,
        pluginCount: sourceFeatureCounts['plugin-features'] ?? 0,
    };

    window.postMessage({
        type: PAGE_MAP_RUNTIME_MESSAGES.viewportPerformance,
        snapshot,
    }, '*');
}

function waitForMapIdle(map: maplibregl.Map): Promise<void> {
    return new Promise<void>((resolve) => {
        map.once('idle', () => resolve());
        map.triggerRepaint();
    });
}

function summarizeFeature(feature: maplibregl.MapGeoJSONFeature | undefined): Record<string, unknown> | null {
    if (!feature) return null;

    return {
        layerId: feature.layer.id,
        properties: {...feature.properties},
        geometryType: feature.geometry.type,
    };
}

function postDiagnosticResult(label: string, summary: Record<string, unknown>): void {
    const message: PageMapRuntimeResultMessage = {
        type: PAGE_MAP_RUNTIME_MESSAGES.result,
        label,
        summary,
    };
    window.postMessage(message, '*');
}

function reportPageRuntimeError(domain: string, error: unknown, detail?: string): void {
    const message = error instanceof Error ? error.message : String(error);
    window.postMessage({
        type: 'IRIS_DOMAIN_ERROR',
        domain,
        message,
        detail,
        time: Date.now(),
    }, '*');
}

function runPageRuntimeTask(domain: string, task: () => Promise<void> | void): void {
    try {
        const result = task();
        if (result instanceof Promise) {
            result.catch((error) => reportPageRuntimeError(domain, error));
        }
    } catch (error) {
        reportPageRuntimeError(domain, error);
    }
}

function postSelection(features: maplibregl.MapGeoJSONFeature[], openInfo = false): void {
    const feature = getSelectableFeature(features);
    if (!feature) return;
    const properties = feature.properties as Record<string, unknown>;
    const id = properties.id;
    if (typeof id !== 'string') return;

    const layerId = feature.layer.id;
    if (
        layerId !== 'iris-map-portals' &&
        layerId !== 'iris-map-links' &&
        layerId !== 'iris-map-fields' &&
        layerId !== 'iris-map-planned-links'
    ) {
        return;
    }

    const selection: PageMapRuntimeSelectionPayload = {
        id,
        kind: getSelectionKind(layerId),
        openInfo,
    };
    window.postMessage({type: PAGE_MAP_RUNTIME_MESSAGES.selection, selection}, '*');
}

function installMobileLongPressInfo(map: maplibregl.Map): void {
    const canvas = map.getCanvas();
    let longPressTimer: number | null = null;
    let startPoint: {x: number; y: number} | null = null;
    let didOpenInfo = false;

    const clearLongPressTimer = (): void => {
        if (longPressTimer !== null) {
            window.clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    const getTouchPoint = (touch: Touch): {x: number; y: number} => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    };

    const cancelLongPress = (): void => {
        clearLongPressTimer();
        startPoint = null;
    };

    canvas.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) {
            cancelLongPress();
            return;
        }

        didOpenInfo = false;
        startPoint = getTouchPoint(event.touches[0]);
        clearLongPressTimer();
        longPressTimer = window.setTimeout(() => {
            if (!startPoint) return;

            const startedAt = performance.now();
            const point = new maplibregl.Point(startPoint.x, startPoint.y);
            const features = map.queryRenderedFeatures(point, {
                layers: getClickableIrisLayerIds(),
            });
            const summary = {
                count: features.length,
                elapsedMs: Math.round(performance.now() - startedAt),
                point: {x: Math.round(point.x), y: Math.round(point.y)},
                sample: summarizeFeature(features[0]),
            };
            postDiagnosticResult('MAP LONG PRESS', summary);
            didOpenInfo = features.length > 0;
            if (didOpenInfo) {
                suppressClickUntil = Date.now() + MOBILE_LONG_PRESS_CLICK_SUPPRESS_MS;
            }
            postSelection(features, true);
            cancelLongPress();
        }, MOBILE_LONG_PRESS_MS);
    }, {passive: true});

    canvas.addEventListener('touchmove', (event) => {
        if (!startPoint || event.touches.length !== 1) {
            cancelLongPress();
            return;
        }

        const point = getTouchPoint(event.touches[0]);
        const distance = Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
        if (distance > MOBILE_LONG_PRESS_MOVE_TOLERANCE_PX) {
            cancelLongPress();
        }
    }, {passive: true});

    canvas.addEventListener('touchend', (event) => {
        if (didOpenInfo) {
            event.preventDefault();
            suppressClickUntil = Date.now() + MOBILE_LONG_PRESS_CLICK_SUPPRESS_MS;
        }
        cancelLongPress();
    });
    canvas.addEventListener('touchcancel', cancelLongPress, {passive: true});
}

function getSelectableFeature(features: maplibregl.MapGeoJSONFeature[]): maplibregl.MapGeoJSONFeature | undefined {
    const portals = features.find((feature) => feature.layer.id === 'iris-map-portals');
    if (currentPlanningState.enabled && currentPlanningState.tool === 'links' && portals) {
        return portals;
    }

    return features.find((feature) =>
        feature.layer.id === 'iris-map-planned-links' ||
        feature.layer.id === 'iris-map-portals' ||
        feature.layer.id === 'iris-map-links' ||
        feature.layer.id === 'iris-map-fields'
    );
}

function getSelectionKind(layerId: string): PageMapRuntimeSelectionPayload['kind'] {
    if (layerId === 'iris-map-portals') return 'portal';
    if (layerId === 'iris-map-links') return 'link';
    if (layerId === 'iris-map-fields') return 'field';
    return 'planned-link';
}

function createFrameSample(): MovingFrameSample {
    return {
        active: false,
        startedAt: 0,
        lastFrameAt: null,
        frameCount: 0,
        totalFrameMs: 0,
        maxFrameMs: 0,
        slowFrameCount: 0,
        requestId: null,
    };
}

function startFrameSample(sample: MovingFrameSample): void {
    sample.active = true;
    sample.startedAt = performance.now();
    sample.lastFrameAt = null;
    sample.frameCount = 0;
    sample.totalFrameMs = 0;
    sample.maxFrameMs = 0;
    sample.slowFrameCount = 0;

    const tick = (now: number): void => {
        if (!sample.active) return;

        if (sample.lastFrameAt !== null) {
            const frameMs = now - sample.lastFrameAt;
            sample.frameCount += 1;
            sample.totalFrameMs += frameMs;
            sample.maxFrameMs = Math.max(sample.maxFrameMs, frameMs);
            if (frameMs >= SLOW_FRAME_MS) {
                sample.slowFrameCount += 1;
            }
        }

        sample.lastFrameAt = now;
        sample.requestId = window.requestAnimationFrame(tick);
    };

    sample.requestId = window.requestAnimationFrame(tick);
}

function stopFrameSample(sample: MovingFrameSample): FrameSnapshot | null {
    sample.active = false;
    if (sample.requestId !== null) {
        window.cancelAnimationFrame(sample.requestId);
        sample.requestId = null;
    }

    if (sample.frameCount === 0) return null;

    const averageFrameMs = sample.totalFrameMs / sample.frameCount;
    return {
        type: 'frame',
        time: Date.now(),
        totalMs: performance.now() - sample.startedAt,
        frameCount: sample.frameCount,
        averageFrameMs,
        maxFrameMs: sample.maxFrameMs,
        slowFrameCount: sample.slowFrameCount,
        estimatedFps: Math.round(1000 / averageFrameMs),
    };
}

function publishBenchmarkFrameSnapshot(
    map: maplibregl.Map,
    snapshots: FrameSnapshot[],
    variant: BenchmarkVariant,
    zoom: number,
    mode: BenchmarkMode
): void {
    const averageValues = snapshots
        .map((snapshot) => snapshot.averageFrameMs)
        .sort((a, b) => a - b);
    if (averageValues.length === 0) return;

    const middle = Math.floor(averageValues.length / 2);
    const medianAverageFrameMs = averageValues.length % 2 === 0
        ? (averageValues[middle - 1] + averageValues[middle]) / 2
        : averageValues[middle];
    const totalFrameCount = snapshots.reduce((total, snapshot) => total + snapshot.frameCount, 0);
    const totalFrameMs = snapshots.reduce(
        (total, snapshot) => total + (snapshot.averageFrameMs * snapshot.frameCount),
        0
    );
    const averageFrameMs = totalFrameCount > 0 ? totalFrameMs / totalFrameCount : medianAverageFrameMs;

    const snapshot: FrameSnapshot = {
        type: 'frame',
        time: Date.now(),
        totalMs: snapshots.reduce((total, item) => total + item.totalMs, 0),
        frameCount: totalFrameCount,
        averageFrameMs,
        maxFrameMs: Math.max(...snapshots.map((item) => item.maxFrameMs)),
        slowFrameCount: snapshots.reduce((total, item) => total + item.slowFrameCount, 0),
        estimatedFps: Math.round(1000 / averageFrameMs),
        benchmarkRunCount: snapshots.length,
        benchmarkMedianAverageFrameMs: medianAverageFrameMs,
        benchmarkMinAverageFrameMs: averageValues[0],
        benchmarkMaxAverageFrameMs: averageValues[averageValues.length - 1],
        benchmarkMaxFrameMs: Math.max(...snapshots.map((item) => item.maxFrameMs)),
        benchmarkVariant: variant,
        benchmarkZoom: zoom,
        benchmarkMode: mode,
        benchmarkMovingEntityMode: movingEntityRenderMode,
        benchmarkLayerVisibility: {
            links: getLayerVisibility(map, 'iris-map-links'),
            fields: getLayerVisibility(map, 'iris-map-fields'),
            pluginLines: getLayerVisibility(map, 'iris-map-plugin-lines'),
            pluginPoints: getLayerVisibility(map, 'iris-map-plugin-points'),
            pluginLabels: getLayerVisibility(map, 'iris-map-plugin-labels'),
            pluginHighlights: getLayerVisibility(map, 'iris-map-plugin-portal-highlights'),
            plannedLinks: getLayerVisibility(map, 'iris-map-planned-links'),
            plannedMarkers: getMarkerRegistryVisibility(plannedMarkerRegistry),
            playerMarkers: getMarkerRegistryVisibility(playerMarkerRegistry),
            playerClusters: getMarkerRegistryVisibility(playerClusterRegistry),
        },
        benchmarkSourceFeatureCounts: {...currentSourceFeatureCounts},
        benchmarkPluginFeatureCounts: currentPluginFeatureCounts ? {...currentPluginFeatureCounts} : undefined,
    };

    window.postMessage({
        type: PAGE_MAP_RUNTIME_MESSAGES.frameBenchmark,
        snapshot,
    }, '*');
}

function stopPanBenchmark(map?: maplibregl.Map): void {
    if (panBenchmarkSettleTimer !== null) {
        window.clearTimeout(panBenchmarkSettleTimer);
        panBenchmarkSettleTimer = null;
    }
    if (panBenchmarkAnimation !== null) {
        window.cancelAnimationFrame(panBenchmarkAnimation);
        panBenchmarkAnimation = null;
    }
    panBenchmarkRestoreVisibility?.();
    panBenchmarkRestoreVisibility = null;
    clearMovingEntityRenderRestoreTimer();
    if (map) {
        setMovingEntityRenderMode(map, 'full');
        setMovingOverlayVisibility(map, true);
    }
    panBenchmarkActive = false;
    panBenchmarkMode = 'pan';
}

async function runPanBenchmark(variant: BenchmarkVariant = 'normal', zoom = 14.36, mode: BenchmarkMode = 'pan'): Promise<void> {
    const map = await getPageMap();
    stopPanBenchmark(map);
    panBenchmarkRestoreVisibility = applyBenchmarkVariant(map, variant);
    map.jumpTo({
        center: [PAN_BENCHMARK_START.lng, PAN_BENCHMARK_START.lat],
        zoom,
    });
    postCameraChanged(map, 'MAP BENCH CAMERA');

    const runSnapshots: FrameSnapshot[] = [];

    const runSingleBenchmark = (runIndex: number): void => {
        panBenchmarkMode = mode;
        if (panBenchmarkMode === 'pan') {
            setMovingOverlayVisibility(map, false);
            setMovingEntityRenderMode(map, getMovingEntityRenderMode(map));
        }
        map.jumpTo({
            center: [PAN_BENCHMARK_START.lng, PAN_BENCHMARK_START.lat],
            zoom,
        });
        if (panBenchmarkMode === 'pan') {
            setMovingEntityRenderMode(map, getMovingEntityRenderMode(map));
        }

        panBenchmarkSettleTimer = window.setTimeout(() => {
            panBenchmarkSettleTimer = null;
            panBenchmarkActive = true;
            const sample = createFrameSample();
            startFrameSample(sample);

            const startPoint = map.project([PAN_BENCHMARK_START.lng, PAN_BENCHMARK_START.lat]);
            const startedAt = performance.now();
            const minZoom = Math.max(3, zoom - ZOOM_BENCHMARK_STEP);
            const maxZoom = Math.min(20, zoom + ZOOM_BENCHMARK_STEP);

            const tick = (now: number): void => {
                if (!panBenchmarkActive) return;

                const elapsed = now - startedAt;
                const progress = Math.min(elapsed / PAN_BENCHMARK_RUN_DURATION_MS, 1);
                if (mode === 'zoom') {
                    const zoomProgress = (Math.sin(progress * Math.PI * 4) + 1) / 2;
                    map.jumpTo({
                        center: [PAN_BENCHMARK_START.lng, PAN_BENCHMARK_START.lat],
                        zoom: minZoom + ((maxZoom - minZoom) * zoomProgress),
                    });
                } else {
                    const offset = Math.sin(progress * Math.PI * 4) * PAN_BENCHMARK_STEP_PX;
                    const center = map.unproject([startPoint.x + offset, startPoint.y]);
                    map.jumpTo({
                        center: [center.lng, center.lat],
                        zoom,
                    });
                }

                if (progress < 1) {
                    panBenchmarkAnimation = window.requestAnimationFrame(tick);
                    return;
                }

                panBenchmarkAnimation = null;
                const snapshot = stopFrameSample(sample);
                if (snapshot) {
                    runSnapshots.push(snapshot);
                }

                if (runIndex + 1 < PAN_BENCHMARK_RUN_COUNT) {
                    panBenchmarkSettleTimer = window.setTimeout(() => {
                        runSingleBenchmark(runIndex + 1);
                    }, PAN_BENCHMARK_SETTLE_MS);
                    return;
                }

                publishBenchmarkFrameSnapshot(map, runSnapshots, variant, zoom, mode);
                panBenchmarkActive = false;
                if (panBenchmarkMode === 'pan') {
                    setMovingEntityRenderMode(map, 'full');
                    setMovingOverlayVisibility(map, true);
                }
                panBenchmarkMode = 'pan';
                panBenchmarkRestoreVisibility?.();
                panBenchmarkRestoreVisibility = null;
            };

            panBenchmarkAnimation = window.requestAnimationFrame(tick);
        }, PAN_BENCHMARK_SETTLE_MS);
    };

    panBenchmarkSettleTimer = window.setTimeout(() => {
        runSingleBenchmark(0);
    }, PAN_BENCHMARK_SETTLE_MS);
}

async function showPageMapRuntime(message: PageMapRuntimeCommandMessage): Promise<void> {
    setRuntimeContainerFullMap();
    const map = await getPageMap();
    map.resize();
    await applySnapshot(map, message);
    postDiagnosticResult('MAP RUNTIME', {
        visible: true,
        sourceCounts: getIrisDataCounts(message),
        visibleLayers: getVisibleIrisLayerIds(),
        camera: {...getMapCamera(map)},
    });
}

function hidePageMapRuntime(): void {
    setRuntimeContainerVisible(false);
    postDiagnosticResult('MAP RUNTIME', {
        visible: false,
    });
}

async function syncPageMapData(message: PageMapRuntimeCommandMessage): Promise<void> {
    const map = await getPageMap();
    setIrisData(map, message);
    await waitForMapIdle(map);
    if (message.diagnostic) {
        postDiagnosticResult('MAP SYNC DATA', {
            sourceCounts: getIrisDataCounts(message),
            camera: {...getMapCamera(map)},
        });
    }
}

async function syncPageMapLayers(message: PageMapRuntimeCommandMessage): Promise<void> {
    if (!message.layers) return;

    const map = await getPageMap();
    setIrisLayerVisibility(map, message.layers);
    if (message.diagnostic) {
        postDiagnosticResult('MAP SYNC LAYERS', {...message.layers});
    }
}

async function syncPageMapCamera(message: PageMapRuntimeCommandMessage): Promise<void> {
    if (!message.camera) return;

    const map = await getPageMap();
    syncMapCamera(map, message.camera);
    if (message.diagnostic) {
        postDiagnosticResult('MAP SYNC CAMERA', {...getMapCamera(map)});
    }
}

async function syncPageMapSelection(message: PageMapRuntimeCommandMessage): Promise<void> {
    const map = await getPageMap();
    setSelectedData(map, null, message);
    if (message.diagnostic) {
        postDiagnosticResult('MAP SYNC SELECTION', {
            selectedPortal: message.data?.selectedPortal?.features.length ?? 0,
            selectedLink: message.data?.selectedLink?.features.length ?? 0,
            selectedField: message.data?.selectedField?.features.length ?? 0,
        });
    }
}

async function syncPageMapTiles(message: PageMapRuntimeCommandMessage): Promise<void> {
    if (!message.tiles?.length) return;

    const map = await getPageMap();
    setRasterTiles(map, 'osm', message.tiles);
    if (message.diagnostic) {
        postDiagnosticResult('MAP SYNC TILES', {
            tileCount: message.tiles.length,
        });
    }
}

async function syncPageMapSnapshot(message: PageMapRuntimeCommandMessage): Promise<void> {
    const map = await getPageMap();
    await applySnapshot(map, message);
    if (message.diagnostic) {
        postDiagnosticResult('MAP SYNC SNAPSHOT', {
            sourceCounts: getIrisDataCounts(message),
            visibleLayers: getVisibleIrisLayerIds(),
            camera: {...getMapCamera(map)},
        });
    }
}

async function applySnapshot(map: maplibregl.Map, message: PageMapRuntimeCommandMessage): Promise<void> {
    const camera = getMessageCamera(message);
    if (camera) {
        syncMapCamera(map, camera);
    }
    if (message.layers) {
        setIrisLayerVisibility(map, message.layers);
    }
    if (message.tiles?.length) {
        setRasterTiles(map, 'osm', message.tiles);
    }
    setIrisData(map, message);
    await waitForMapIdle(map);
}

window.addEventListener('message', (event: MessageEvent<PageMapRuntimeCommandMessage>) => {
    if (event.origin !== location.origin) return;

    if ((event.data as {type?: string})?.type === 'IRIS_RUN_PAN_BENCHMARK') {
        const variant = getBenchmarkVariant((event.data as {benchmarkVariant?: unknown}).benchmarkVariant);
        const zoom = getBenchmarkZoom((event.data as {benchmarkZoom?: unknown}).benchmarkZoom);
        const mode = getBenchmarkMode((event.data as {benchmarkMode?: unknown}).benchmarkMode);
        runPageRuntimeTask('pageRuntime:bench', () => runPanBenchmark(variant, zoom, mode));
        return;
    }

    if ((event.data as {type?: string})?.type === 'IRIS_RESET_MAP_ORIENTATION') {
        runPageRuntimeTask('pageRuntime:resetOrientation', resetMapOrientation);
        return;
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.showMap) {
        runPageRuntimeTask('pageRuntime:showMap', () => showPageMapRuntime(event.data));
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.hideMap) {
        runPageRuntimeTask('pageRuntime:hideMap', hidePageMapRuntime);
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncSnapshot) {
        runPageRuntimeTask('pageRuntime:syncSnapshot', () => syncPageMapSnapshot(event.data));
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncData) {
        runPageRuntimeTask('pageRuntime:syncData', () => syncPageMapData(event.data));
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncLayers) {
        runPageRuntimeTask('pageRuntime:syncLayers', () => syncPageMapLayers(event.data));
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncCamera) {
        runPageRuntimeTask('pageRuntime:syncCamera', () => syncPageMapCamera(event.data));
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncSelection) {
        runPageRuntimeTask('pageRuntime:syncSelection', () => syncPageMapSelection(event.data));
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncTiles) {
        runPageRuntimeTask('pageRuntime:syncTiles', () => syncPageMapTiles(event.data));
    }
});

window.postMessage({type: PAGE_MAP_RUNTIME_MESSAGES.ready}, '*');

console.info('IRIS map runtime loaded');
