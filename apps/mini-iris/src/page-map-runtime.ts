import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CircleLayerSpecification, SymbolLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { addFrameDelta, aggregateBenchmarkFrameSnapshots, createFrameSampleAccumulator } from '@iris/core';
import { INGRESS_ENTITY_STYLE, INGRESS_HEALTH_COLORS, INGRESS_MISC_COLORS, INGRESS_NEUTRAL_PORTAL_COLORS } from '@iris/core/ingress-map-style';
import { COLORS, INGRESS_COLORS, ITEM_LEVEL_COLORS, MAP_STYLES, PLAYER_TRACKER_COLORS, type MapStyleName } from './MapConstants';
import {
    MINI_PAGE_MAP_COMMAND,
    MINI_PAGE_MAP_EVENT,
    type MiniBenchmarkMode,
    type MiniBenchmarkVariant,
    type MiniMapSelectionIntent,
    type MiniMapView,
    type MiniPageMapCommandMessage,
    type MiniPageMapEventMessage,
} from './pageMapProtocol';

let map: maplibregl.Map | null = null;
let container: HTMLElement | null = null;
let suppressNextCameraEvent = false;
let settleTimer: number | null = null;
let suppressClickUntil = 0;
let currentPortalPaint = {
    levelColorEnabled: false,
    healthColorEnabled: false,
};
let currentEntities: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
let currentPlayers: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
let benchmarkActive = false;

type CirclePaint = NonNullable<CircleLayerSpecification['paint']>;
type SymbolLayout = NonNullable<SymbolLayerSpecification['layout']>;
const PORTAL_TEAM_COLOR_EXPR: CirclePaint['circle-color'] = ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N];
const PORTAL_STROKE_COLOR_EXPR: CirclePaint['circle-stroke-color'] = ['match', ['get', 'team'], 'N', INGRESS_NEUTRAL_PORTAL_COLORS.stroke, PORTAL_TEAM_COLOR_EXPR];
const PORTAL_LEVEL_COLOR_EXPR: CirclePaint['circle-color'] = [
    'match',
    ['get', 'level'],
    1, ITEM_LEVEL_COLORS[1],
    2, ITEM_LEVEL_COLORS[2],
    3, ITEM_LEVEL_COLORS[3],
    4, ITEM_LEVEL_COLORS[4],
    5, ITEM_LEVEL_COLORS[5],
    6, ITEM_LEVEL_COLORS[6],
    7, ITEM_LEVEL_COLORS[7],
    8, ITEM_LEVEL_COLORS[8],
    COLORS.N,
];
const PORTAL_HEALTH_COLOR_EXPR: CirclePaint['circle-color'] = [
    'case',
    ['any', ['==', ['get', 'team'], 'N'], ['>=', ['coalesce', ['get', 'health'], 100], 100]],
    PORTAL_TEAM_COLOR_EXPR,
    ['>', ['coalesce', ['get', 'health'], 100], 85],
    INGRESS_HEALTH_COLORS.medium,
    ['>', ['coalesce', ['get', 'health'], 100], 50],
    INGRESS_HEALTH_COLORS.warning,
    ['>', ['coalesce', ['get', 'health'], 100], 15],
    INGRESS_HEALTH_COLORS.low,
    INGRESS_HEALTH_COLORS.critical,
];
const PORTAL_HEALTH_LEVEL_COLOR_EXPR: CirclePaint['circle-color'] = [
    'case',
    ['any', ['==', ['get', 'team'], 'N'], ['>=', ['coalesce', ['get', 'health'], 100], 100]],
    PORTAL_LEVEL_COLOR_EXPR,
    ['>', ['coalesce', ['get', 'health'], 100], 85],
    INGRESS_HEALTH_COLORS.medium,
    ['>', ['coalesce', ['get', 'health'], 100], 50],
    INGRESS_HEALTH_COLORS.warning,
    ['>', ['coalesce', ['get', 'health'], 100], 15],
    INGRESS_HEALTH_COLORS.low,
    INGRESS_HEALTH_COLORS.critical,
];
const PORTAL_HEALTH_OPACITY_EXPR: CirclePaint['circle-opacity'] = [
    'interpolate', ['linear'], ['coalesce', ['get', 'health'], 100],
    0, INGRESS_ENTITY_STYLE.portalMinHealthOpacity,
    100, INGRESS_ENTITY_STYLE.portalBaseOpacity,
];
const PORTAL_RADIUS_EXPR: CirclePaint['circle-radius'] = [
    'interpolate', ['linear'], ['zoom'],
    INGRESS_ENTITY_STYLE.portalRadiusStops[0].zoom, INGRESS_ENTITY_STYLE.portalRadiusStops[0].radius,
    INGRESS_ENTITY_STYLE.portalRadiusStops[1].zoom, INGRESS_ENTITY_STYLE.portalRadiusStops[1].radius,
    INGRESS_ENTITY_STYLE.portalRadiusStops[2].zoom, INGRESS_ENTITY_STYLE.portalRadiusStops[2].radius,
];
const SELECTABLE_LAYERS = ['p', 'f-enl', 'f-res', 'f-mac', 'l-enl', 'l-res', 'l-mac'] as const;
const FIELD_LAYERS = ['f-enl', 'f-res', 'f-mac', 'f-ext-enl', 'f-ext-res', 'f-ext-mac'] as const;
const LINK_LAYERS = ['l-enl', 'l-res', 'l-mac', 'l-ext-enl', 'l-ext-res', 'l-ext-mac'] as const;
const PLAYER_LAYERS = ['player-trails', 'player-pins', 'player-label-bg', 'player-labels'] as const;
const SECONDARY_LAYERS = ['p-artifacts', 'p-ornaments', 'p-key-count-bg', 'p-key-count-total', 'p-key-count-split'] as const;
const BENCHMARK_RUN_MS = 2200;
const BENCHMARK_SETTLE_MS = 140;
const BENCHMARK_PAN_PX = 280;
const BENCHMARK_ZOOM_DELTA = 1.35;
const MOBILE_LONG_PRESS_MS = 650;
const MOBILE_LONG_PRESS_MOVE_TOLERANCE_PX = 12;
const MOBILE_LONG_PRESS_CLICK_SUPPRESS_MS = 500;
const PLAYER_PIN_ICON_EXPR: SymbolLayout['icon-image'] = ['match', ['get', 'team'], 'E', 'player-pin-e', 'R', 'player-pin-r', 'M', 'player-pin-m', 'player-pin-n'];

function postEvent(payload: MiniPageMapEventMessage['payload']): void {
    window.postMessage({ type: MINI_PAGE_MAP_EVENT, payload } satisfies MiniPageMapEventMessage, '*');
}

function getView(currentMap: maplibregl.Map): MiniMapView {
    const center = currentMap.getCenter();
    const bounds = currentMap.getBounds();
    return {
        lat: center.lat,
        lng: center.lng,
        zoom: currentMap.getZoom(),
        bounds: {
            south: bounds.getSouth(),
            west: bounds.getWest(),
            north: bounds.getNorth(),
            east: bounds.getEast(),
        },
    };
}

function syncCamera(settled: boolean): void {
    if (!map) return;
    if (benchmarkActive) return;
    postEvent({ event: 'camera', view: getView(map), settled });
}

function setContainerVisible(visible: boolean): void {
    if (!container) return;
    container.style.display = visible ? 'block' : 'none';
    container.style.pointerEvents = visible ? 'auto' : 'none';
    if (visible) {
        window.requestAnimationFrame(() => map?.resize());
    }
}

function setSourceData(sourceId: string, data: GeoJSON.FeatureCollection): void {
    if (sourceId === 'entities') currentEntities = data;
    if (sourceId === 'players') currentPlayers = data;
    const source = map?.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    source?.setData(data);
}

function countFeatureType(data: GeoJSON.FeatureCollection, type: string): number {
    return data.features.filter((feature) => feature.properties?.type === type).length;
}

function getSourceCounts(): { portals: number; links: number; fields: number; keys: number; players: number; total: number } {
    const portals = countFeatureType(currentEntities, 'portal');
    const links = countFeatureType(currentEntities, 'link');
    const fields = countFeatureType(currentEntities, 'field');
    const keys = countFeatureType(currentEntities, 'portal-key-count');
    const players = currentPlayers.features.length;
    return {
        portals,
        links,
        fields,
        keys,
        players,
        total: currentEntities.features.length + players,
    };
}

function getVisibleCounts(variant: MiniBenchmarkVariant): { portals: number; links: number; fields: number; keys: number; players: number; total: number } {
    const counts = getSourceCounts();
    const visible = {...counts};
    if (variant === 'base' || variant === 'no-links') visible.links = 0;
    if (variant === 'base' || variant === 'no-fields') visible.fields = 0;
    if (variant === 'base' || variant === 'no-players') visible.players = 0;
    if (variant === 'base') visible.keys = 0;
    visible.total = visible.portals + visible.links + visible.fields + visible.keys + visible.players;
    return visible;
}

function setLayersVisibility(layerIds: readonly string[], visibility: 'visible' | 'none'): void {
    layerIds.forEach((layerId) => {
        if (map?.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
    });
}

function applyBenchmarkVariant(variant: MiniBenchmarkVariant): () => void {
    if (!map) return () => undefined;
    const layerIds = [...FIELD_LAYERS, ...LINK_LAYERS, ...PLAYER_LAYERS, ...SECONDARY_LAYERS];
    const previous = new Map<string, unknown>();
    layerIds.forEach((layerId) => {
        if (map?.getLayer(layerId)) previous.set(layerId, map.getLayoutProperty(layerId, 'visibility') ?? 'visible');
    });

    const hideFields = variant === 'base' || variant === 'no-fields';
    const hideLinks = variant === 'base' || variant === 'no-links';
    const hidePlayers = variant === 'base' || variant === 'no-players';
    const hideSecondary = variant === 'base';

    setLayersVisibility(FIELD_LAYERS, hideFields ? 'none' : 'visible');
    setLayersVisibility(LINK_LAYERS, hideLinks ? 'none' : 'visible');
    setLayersVisibility(PLAYER_LAYERS, hidePlayers ? 'none' : 'visible');
    setLayersVisibility(SECONDARY_LAYERS, hideSecondary ? 'none' : 'visible');
    setPortalPaint(currentPortalPaint.levelColorEnabled, currentPortalPaint.healthColorEnabled);

    return () => {
        previous.forEach((visibility, layerId) => {
            if (map?.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
        });
        setPortalPaint(currentPortalPaint.levelColorEnabled, currentPortalPaint.healthColorEnabled);
    };
}

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitForIdle(currentMap: maplibregl.Map): Promise<void> {
    return new Promise((resolve) => {
        currentMap.once('idle', () => resolve());
        currentMap.triggerRepaint();
    });
}

async function runBenchmarkScenario(variant: MiniBenchmarkVariant, zoom: number, mode: MiniBenchmarkMode): Promise<string> {
    if (!map) return '';
    const restoreLayers = applyBenchmarkVariant(variant);
    const center = map.getCenter();
    const originalZoom = map.getZoom();
    const sourceCounts = getSourceCounts();
    const visibleCounts = getVisibleCounts(variant);
    const basePoint = map.project([center.lng, center.lat]);

    try {
        map.jumpTo({ center: [center.lng, center.lat], zoom });
        await waitForIdle(map);
        await wait(BENCHMARK_SETTLE_MS);

        const start = performance.now();
        const sample = createFrameSampleAccumulator(start);
        let lastFrameAt: number | null = null;

        await new Promise<void>((resolve) => {
            const tick = (now: number): void => {
                if (lastFrameAt !== null) {
                    const delta = now - lastFrameAt;
                    if (delta > 0 && delta < 1000) addFrameDelta(sample, delta, 20.000001);
                }
                lastFrameAt = now;

                const progress = Math.min((now - start) / BENCHMARK_RUN_MS, 1);
                if (mode === 'zoom') {
                    const wave = (Math.sin(progress * Math.PI * 4) + 1) / 2;
                    map?.jumpTo({ center: [center.lng, center.lat], zoom: zoom - BENCHMARK_ZOOM_DELTA + (BENCHMARK_ZOOM_DELTA * 2 * wave) });
                } else {
                    const offset = Math.sin(progress * Math.PI * 4) * BENCHMARK_PAN_PX;
                    const nextCenter = map?.unproject([basePoint.x + offset, basePoint.y]);
                    if (nextCenter) map?.jumpTo({ center: [nextCenter.lng, nextCenter.lat], zoom });
                }

                if (progress < 1) {
                    window.requestAnimationFrame(tick);
                } else {
                    resolve();
                }
            };
            window.requestAnimationFrame(tick);
        });

        const aggregate = aggregateBenchmarkFrameSnapshots([{
            type: 'frame',
            time: Date.now(),
            totalMs: performance.now() - start,
            frameCount: sample.frameCount,
            averageFrameMs: sample.frameCount > 0 ? sample.totalFrameMs / sample.frameCount : 0,
            maxFrameMs: sample.maxFrameMs,
            slowFrameCount: sample.slowFrameCount,
            estimatedFps: sample.frameCount > 0 ? Math.round(1000 / (sample.totalFrameMs / sample.frameCount)) : 0,
        }], {
            variant,
            zoom,
            mode,
        });

        const avg = aggregate?.averageFrameMs ?? 0;
        const max = aggregate?.maxFrameMs ?? 0;
        const fps = aggregate?.estimatedFps ?? 0;
        const slow = aggregate?.slowFrameCount ?? 0;
        const frames = aggregate?.frameCount ?? 0;
        return [
            `z${zoom.toFixed(0)} ${variant} ${mode}`,
            `items ${visibleCounts.total.toLocaleString()}`,
            `P ${visibleCounts.portals.toLocaleString()}`,
            `L ${visibleCounts.links.toLocaleString()}`,
            `F ${visibleCounts.fields.toLocaleString()}`,
            `keys ${visibleCounts.keys.toLocaleString()}`,
            `players ${visibleCounts.players.toLocaleString()}`,
            `sources P ${sourceCounts.portals.toLocaleString()} L ${sourceCounts.links.toLocaleString()} F ${sourceCounts.fields.toLocaleString()}`,
            `avg ${Math.round(avg)}ms`,
            `max ${Math.round(max)}ms`,
            `fps ${fps}`,
            `slow ${slow}/${frames}`,
            `median ${Math.round(aggregate?.benchmarkMedianAverageFrameMs ?? avg)}ms`,
            `benchMax ${Math.round(aggregate?.benchmarkMaxFrameMs ?? max)}ms`,
        ].join(' | ');
    } finally {
        restoreLayers();
        map.jumpTo({ center: [center.lng, center.lat], zoom: originalZoom });
        await waitForIdle(map);
    }
}

async function runBenchmarkBatch(context: Extract<MiniPageMapCommandMessage['command'], { action: 'run-benchmark-batch' }>['context']): Promise<void> {
    if (!map || benchmarkActive) return;
    benchmarkActive = true;
    const originalCenter = map.getCenter();
    const originalZoom = map.getZoom();
    const scenarios: { zoom: number; variant: MiniBenchmarkVariant; mode: MiniBenchmarkMode }[] = [
        { zoom: 14, variant: 'normal', mode: 'pan' },
        { zoom: 14, variant: 'base', mode: 'pan' },
        { zoom: 14, variant: 'normal', mode: 'zoom' },
        { zoom: 8, variant: 'normal', mode: 'pan' },
        { zoom: 8, variant: 'no-links', mode: 'pan' },
        { zoom: 8, variant: 'no-fields', mode: 'pan' },
        { zoom: 8, variant: 'base', mode: 'pan' },
        { zoom: 8, variant: 'no-players', mode: 'pan' },
    ];

    try {
        const header = [
            'MINI IRIS BENCH BATCH',
            `browser ${navigator.userAgent.match(/(Firefox|Chrome)\/[^\s]+/)?.[0] ?? navigator.userAgent}`,
            `platform ${navigator.platform}`,
            `viewport ${window.innerWidth}x${window.innerHeight}`,
            `dpr ${Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio.toFixed(2) : '-'}`,
            context.liveMode ? 'mode live' : `mode mock${context.patternMode}`,
            `toggles lvl ${context.portalLevelColorEnabled ? 'on' : 'off'} hp ${context.portalHealthColorEnabled ? 'on' : 'off'} keys ${context.keyOverlayEnabled ? 'on' : 'off'} 3d ${context.extrusionEnabled ? 'on' : 'off'}`,
        ].join(' ');

        const lines: string[] = [header];
        for (const scenario of scenarios) {
            lines.push(await runBenchmarkScenario(scenario.variant, scenario.zoom, scenario.mode));
            await wait(BENCHMARK_SETTLE_MS);
        }
        postEvent({ event: 'benchmark-batch', report: lines.join('\n') });
    } finally {
        map.jumpTo({ center: [originalCenter.lng, originalCenter.lat], zoom: originalZoom });
        benchmarkActive = false;
        syncCamera(true);
    }
}

function buildStyle(styleName: MapStyleName): maplibregl.StyleSpecification {
    return {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
            carto: { type: 'raster', tiles: MAP_STYLES[styleName], tileSize: 256 },
            entities: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
            players: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
            selection: { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
        },
        layers: [
            { id: 'carto', type: 'raster', source: 'carto' },
            { id: 'f-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'E']], paint: { 'fill-color': COLORS.E, 'fill-opacity': INGRESS_ENTITY_STYLE.fieldFillOpacity, 'fill-antialias': INGRESS_ENTITY_STYLE.fieldAntialias } },
            { id: 'f-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'R']], paint: { 'fill-color': COLORS.R, 'fill-opacity': INGRESS_ENTITY_STYLE.fieldFillOpacity, 'fill-antialias': INGRESS_ENTITY_STYLE.fieldAntialias } },
            { id: 'f-mac', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'M']], paint: { 'fill-color': COLORS.M, 'fill-opacity': INGRESS_ENTITY_STYLE.fieldFillOpacity, 'fill-antialias': INGRESS_ENTITY_STYLE.fieldAntialias } },
            { id: 'l-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'E']], paint: { 'line-color': COLORS.E, 'line-width': INGRESS_ENTITY_STYLE.linkWidth, 'line-opacity': INGRESS_ENTITY_STYLE.linkOpacity } },
            { id: 'l-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'R']], paint: { 'line-color': COLORS.R, 'line-width': INGRESS_ENTITY_STYLE.linkWidth, 'line-opacity': INGRESS_ENTITY_STYLE.linkOpacity } },
            { id: 'l-mac', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'M']], paint: { 'line-color': COLORS.M, 'line-width': INGRESS_ENTITY_STYLE.linkWidth, 'line-opacity': INGRESS_ENTITY_STYLE.linkOpacity } },
            { id: 'f-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'E']], paint: { 'fill-extrusion-color': COLORS.E, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
            { id: 'f-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'R']], paint: { 'fill-extrusion-color': COLORS.R, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
            { id: 'f-ext-mac', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'M']], paint: { 'fill-extrusion-color': COLORS.M, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
            { id: 'l-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'E']], paint: { 'fill-extrusion-color': COLORS.E, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
            { id: 'l-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'R']], paint: { 'fill-extrusion-color': COLORS.R, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
            { id: 'l-ext-mac', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'M']], paint: { 'fill-extrusion-color': COLORS.M, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
            { id: 'p-ext', type: 'fill-extrusion', source: 'entities', filter: ['==', 'type', 'portal-ext'], paint: { 'fill-extrusion-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.9 }, layout: { visibility: 'none' } },
            { id: 'sel-f', type: 'line', source: 'selection', filter: ['==', 'type', 'field'], paint: { 'line-color': '#fff', 'line-width': 3 } },
            { id: 'sel-l', type: 'line', source: 'selection', filter: ['==', 'type', 'link'], paint: { 'line-color': '#fff', 'line-width': 4 } },
            { id: 'sel-p', type: 'circle', source: 'selection', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': 12, 'circle-color': 'transparent', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } },
            { id: 'p', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': PORTAL_RADIUS_EXPR, 'circle-color': PORTAL_TEAM_COLOR_EXPR, 'circle-opacity': INGRESS_ENTITY_STYLE.portalBaseOpacity, 'circle-stroke-color': PORTAL_STROKE_COLOR_EXPR, 'circle-stroke-width': INGRESS_ENTITY_STYLE.portalStrokeWidth, 'circle-stroke-opacity': 1 } },
            { id: 'p-history-visited-highlight', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'visitedHighlight', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 5], 'circle-color': 'transparent', 'circle-stroke-color': INGRESS_COLORS.VISITED, 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
            { id: 'p-history-captured-highlight', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'capturedHighlight', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 8], 'circle-color': 'transparent', 'circle-stroke-color': INGRESS_COLORS.CAPTURED, 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
            { id: 'p-history-scanned-highlight', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'scannedHighlight', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 11], 'circle-color': 'transparent', 'circle-stroke-color': INGRESS_COLORS.SCANNED, 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
            { id: 'p-history-visited-inverse', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'visitedInverse', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 5], 'circle-color': INGRESS_COLORS.VISITED, 'circle-opacity': 0.14, 'circle-stroke-color': INGRESS_COLORS.VISITED, 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.85 } },
            { id: 'p-history-captured-inverse', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'capturedInverse', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 8], 'circle-color': INGRESS_COLORS.CAPTURED, 'circle-opacity': 0.14, 'circle-stroke-color': INGRESS_COLORS.CAPTURED, 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.85 } },
            { id: 'p-history-scanned-inverse', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'scannedInverse', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 11], 'circle-color': INGRESS_COLORS.SCANNED, 'circle-opacity': 0.14, 'circle-stroke-color': INGRESS_COLORS.SCANNED, 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.85 } },
            { id: 'p-artifacts', type: 'circle', source: 'entities', filter: ['==', 'type', 'artifact'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 10, 7, 15, 14], 'circle-color': INGRESS_MISC_COLORS.ARTIFACT, 'circle-opacity': 0.12, 'circle-stroke-color': INGRESS_MISC_COLORS.ARTIFACT, 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, 2, 10, 2.5, 15, 3.25], 'circle-stroke-opacity': 0.95 } },
            { id: 'p-ornaments', type: 'circle', source: 'entities', filter: ['==', 'type', 'ornament'], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 3, 10, 5, 15, 11], 'circle-color': INGRESS_MISC_COLORS.ORNAMENT, 'circle-opacity': 0.1, 'circle-stroke-color': INGRESS_MISC_COLORS.ORNAMENT, 'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 10, 2.25, 15, 3], 'circle-stroke-opacity': 0.92 } },
            { id: 'p-key-count-bg', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal-key-count'], paint: { 'circle-color': '#000000', 'circle-radius': 12, 'circle-translate': [0, -18], 'circle-opacity': 0.78, 'circle-stroke-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N], 'circle-stroke-width': 1.8, 'circle-stroke-opacity': 0.95 } },
            { id: 'p-key-count-total', type: 'symbol', source: 'entities', filter: ['==', 'type', 'portal-key-count'], layout: { 'text-field': ['get', 'totalLabel'], 'text-size': 12, 'text-anchor': 'center', 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': INGRESS_COLORS.KEY, 'text-halo-color': '#000000', 'text-halo-width': 1.4, 'text-opacity': 1, 'text-translate': [0, -20] } },
            { id: 'p-key-count-split', type: 'symbol', source: 'entities', filter: ['==', 'type', 'portal-key-count'], layout: { 'text-field': ['get', 'splitLabel'], 'text-size': 8, 'text-offset': [0, 0.95], 'text-anchor': 'center', 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.2, 'text-opacity': 0.95, 'text-translate': [0, -20] } },
            { id: 'player-trails', type: 'line', source: 'players', filter: ['==', 'type', 'player-trail'], paint: { 'line-color': PLAYER_TRACKER_COLORS.trail, 'line-width': 3, 'line-opacity': ['interpolate', ['linear'], ['get', 'ageMinutes'], 0, 0.95, 5, 0.75, 20, 0.45, 60, 0.2, 180, 0.08], 'line-blur': 0.6, 'line-dasharray': [1.2, 1.6] } },
            { id: 'player-pins', type: 'symbol', source: 'players', filter: ['==', 'type', 'player-point'], layout: { 'icon-image': PLAYER_PIN_ICON_EXPR, 'icon-anchor': 'bottom', 'icon-size': 0.82, 'icon-allow-overlap': true, 'icon-ignore-placement': true } },
            { id: 'player-label-bg', type: 'circle', source: 'players', filter: ['==', 'type', 'player-label'], paint: { 'circle-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, INGRESS_COLORS.XM], 'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 8, 2, 11, 5, 15], 'circle-opacity': 0.08 } },
            { id: 'player-labels', type: 'symbol', source: 'players', filter: ['==', 'type', 'player-label'], layout: { 'text-field': ['get', 'label'], 'text-size': 12, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-allow-overlap': true, 'text-ignore-placement': true, 'text-max-width': 12 }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.4, 'text-opacity': 0.96 } },
        ],
    };
}

function createPlayerPinImage(fillColor: string): ImageData {
    const pixelRatio = 2;
    const width = 34;
    const height = 44;
    const canvas = document.createElement('canvas');
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    const context = canvas.getContext('2d');
    if (!context) {
        return new ImageData(canvas.width, canvas.height);
    }

    context.scale(pixelRatio, pixelRatio);
    const centerX = width / 2;
    const centerY = 15;
    const radius = 11;
    const tipY = 38;

    const tracePin = (): void => {
        context.beginPath();
        context.moveTo(centerX, tipY);
        context.bezierCurveTo(centerX + 4, centerY + 12, centerX + radius, centerY + 7, centerX + radius, centerY);
        context.bezierCurveTo(centerX + radius, centerY - 7, centerX + 7, centerY - radius, centerX, centerY - radius);
        context.bezierCurveTo(centerX - 7, centerY - radius, centerX - radius, centerY - 7, centerX - radius, centerY);
        context.bezierCurveTo(centerX - radius, centerY + 7, centerX - 4, centerY + 12, centerX, tipY);
        context.closePath();
    };

    const drawPin = (offsetX: number, offsetY: number, color: string, alpha: number): void => {
        context.save();
        context.globalAlpha = alpha;
        context.translate(offsetX, offsetY);
        tracePin();
        context.fillStyle = color;
        context.fill();
        context.restore();
    };

    drawPin(1.5, 2, '#000000', 0.42);
    tracePin();
    context.fillStyle = fillColor;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PLAYER_TRACKER_COLORS.stroke;
    context.stroke();

    context.beginPath();
    context.arc(centerX, centerY, 3.5, 0, Math.PI * 2);
    context.fillStyle = '#ffffff';
    context.globalAlpha = 0.94;
    context.fill();

    return context.getImageData(0, 0, canvas.width, canvas.height);
}

function registerPlayerPinImages(currentMap: maplibregl.Map): void {
    const pins = [
        ['player-pin-e', COLORS.E],
        ['player-pin-r', COLORS.R],
        ['player-pin-m', COLORS.M],
        ['player-pin-n', PLAYER_TRACKER_COLORS.point],
    ] as const;

    pins.forEach(([id, color]) => {
        if (!currentMap.hasImage(id)) {
            currentMap.addImage(id, createPlayerPinImage(color), { pixelRatio: 2 });
        }
    });
}

function readFeatureString(feature: maplibregl.MapGeoJSONFeature, key: string): string | null {
    const properties = feature.properties as Record<string, unknown> | null | undefined;
    const value = properties?.[key];
    return typeof value === 'string' ? value : null;
}

function selectAtPoint(point: [number, number], intent: MiniMapSelectionIntent): void {
    if (!map) return;
    const layers = SELECTABLE_LAYERS.filter((layerId) => map?.getLayer(layerId));
    const features = map.queryRenderedFeatures(point, { layers });

    for (const wanted of ['portal', 'field', 'link'] as const) {
        const feature = features.find((candidate) => readFeatureString(candidate, 'type') === wanted);
        const id = feature ? readFeatureString(feature, 'id') : null;
        if (id) {
            postEvent({ event: 'selection', kind: wanted, id, intent });
            return;
        }
    }

    postEvent({ event: 'clear-selection' });
}

function selectAt(event: maplibregl.MapMouseEvent): void {
    selectAtPoint([event.point.x, event.point.y], 'select');
}

function installTouchLongPress(currentMap: maplibregl.Map): void {
    const target = currentMap.getCanvasContainer();
    let timer: number | null = null;
    let start: { clientX: number; clientY: number } | null = null;

    const clear = (): void => {
        if (timer !== null) {
            window.clearTimeout(timer);
            timer = null;
        }
        start = null;
    };

    target.addEventListener('touchstart', (event) => {
        if (event.touches.length !== 1) {
            clear();
            return;
        }

        const touch = event.touches[0];
        start = { clientX: touch.clientX, clientY: touch.clientY };
        timer = window.setTimeout(() => {
            if (!start) return;
            const rect = target.getBoundingClientRect();
            suppressClickUntil = Date.now() + MOBILE_LONG_PRESS_CLICK_SUPPRESS_MS;
            selectAtPoint([start.clientX - rect.left, start.clientY - rect.top], 'details');
            clear();
        }, MOBILE_LONG_PRESS_MS);
    }, { passive: true });

    target.addEventListener('touchmove', (event) => {
        if (!start || event.touches.length !== 1) return;
        const touch = event.touches[0];
        const distance = Math.hypot(touch.clientX - start.clientX, touch.clientY - start.clientY);
        if (distance > MOBILE_LONG_PRESS_MOVE_TOLERANCE_PX) {
            clear();
        }
    }, { passive: true });

    target.addEventListener('touchend', clear, { passive: true });
    target.addEventListener('touchcancel', clear, { passive: true });
}

function setExtrusion(enabled: boolean): void {
    if (!map) return;
    const visibility = enabled ? 'visible' : 'none';
    const flatVisibility = enabled ? 'none' : 'visible';
    ['f-ext-enl', 'f-ext-res', 'f-ext-mac', 'l-ext-enl', 'l-ext-res', 'l-ext-mac', 'p-ext'].forEach((id) => {
        if (map?.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
    });
    ['f-enl', 'f-res', 'f-mac', 'l-enl', 'l-res', 'l-mac', 'p'].forEach((id) => {
        if (map?.getLayer(id)) map.setLayoutProperty(id, 'visibility', flatVisibility);
    });
    if (enabled) map.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
    else map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
}

function setPortalPaint(levelColorEnabled: boolean, healthColorEnabled: boolean): void {
    currentPortalPaint = { levelColorEnabled, healthColorEnabled };
    if (!map?.getLayer('p')) return;
    const fillColor = healthColorEnabled
        ? (levelColorEnabled ? PORTAL_HEALTH_LEVEL_COLOR_EXPR : PORTAL_HEALTH_COLOR_EXPR)
        : (levelColorEnabled ? PORTAL_LEVEL_COLOR_EXPR : PORTAL_TEAM_COLOR_EXPR);
    map.setPaintProperty('p', 'circle-color', fillColor);
    map.setPaintProperty('p', 'circle-opacity', healthColorEnabled ? PORTAL_HEALTH_OPACITY_EXPR : INGRESS_ENTITY_STYLE.portalBaseOpacity);
}

function initMap(command: Extract<MiniPageMapCommandMessage['command'], { action: 'init' }>): void {
    container = document.getElementById(command.containerId);
    if (!container) return;
    setContainerVisible(command.visible);
    if (command.portalPaint) {
        currentPortalPaint = command.portalPaint;
    }
    if (map) {
        setPortalPaint(currentPortalPaint.levelColorEnabled, currentPortalPaint.healthColorEnabled);
        map.resize();
        postEvent({ event: 'ready', view: getView(map) });
        return;
    }

    map = new maplibregl.Map({
        container,
        style: buildStyle(command.styleName),
        center: command.center,
        zoom: command.zoom,
    });

    map.once('load', () => {
        if (!map) return;
        registerPlayerPinImages(map);
        setPortalPaint(currentPortalPaint.levelColorEnabled, currentPortalPaint.healthColorEnabled);
        postEvent({ event: 'ready', view: getView(map) });
    });
    map.on('move', () => {
        if (suppressNextCameraEvent) return;
        syncCamera(false);
    });
    map.on('moveend', () => {
        if (suppressNextCameraEvent) {
            suppressNextCameraEvent = false;
            return;
        }
        if (settleTimer !== null) window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => {
            settleTimer = null;
            syncCamera(true);
        }, 50);
    });
    map.on('click', (event) => {
        if (Date.now() < suppressClickUntil) return;
        selectAt(event);
    });
    map.on('contextmenu', (event) => {
        event.preventDefault();
        selectAtPoint([event.point.x, event.point.y], 'details');
    });
    installTouchLongPress(map);
}

function handleCommand(command: MiniPageMapCommandMessage['command']): void {
    if (command.action === 'init') {
        initMap(command);
        return;
    }
    if (!map) return;

    switch (command.action) {
        case 'set-visible':
            setContainerVisible(command.visible);
            break;
        case 'sync-data':
            setSourceData('entities', command.data);
            break;
        case 'sync-players':
            setSourceData('players', command.data);
            break;
        case 'sync-selection':
            setSourceData('selection', command.data);
            break;
        case 'set-style': {
            const source = map.getSource('carto') as { setTiles?: (tiles: string[]) => void } | undefined;
            source?.setTiles?.(MAP_STYLES[command.styleName]);
            break;
        }
        case 'set-extrusion':
            setExtrusion(command.enabled);
            break;
        case 'set-portal-paint':
            setPortalPaint(command.levelColorEnabled, command.healthColorEnabled);
            break;
        case 'run-benchmark-batch':
            void runBenchmarkBatch(command.context);
            break;
        case 'nav':
            if (command.nav === '+') map.zoomIn();
            else if (command.nav === '-') map.zoomOut();
            else if (command.nav === 'up') map.panBy([0, -200]);
            else if (command.nav === 'down') map.panBy([0, 200]);
            else if (command.nav === 'left') map.panBy([-200, 0]);
            else if (command.nav === 'right') map.panBy([200, 0]);
            else if (command.nav === 'reset') {
                suppressNextCameraEvent = true;
                map.setCenter([4.8952, 52.3702]);
                map.setZoom(13);
                syncCamera(true);
            }
            break;
        case 'fly-to':
            map.flyTo({ center: [command.lng, command.lat], zoom: command.zoom, duration: command.duration ?? 0 });
            break;
        case 'ease-to':
            map.easeTo({ center: [command.lng, command.lat], zoom: command.zoom, duration: command.duration ?? 0 });
            break;
        case 'resize':
            map.resize();
            break;
    }
}

window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as Partial<MiniPageMapCommandMessage> | undefined;
    if (!data || data.type !== MINI_PAGE_MAP_COMMAND || !data.command) return;
    handleCommand(data.command);
});
