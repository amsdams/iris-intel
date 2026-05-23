import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CircleLayerSpecification } from '@maplibre/maplibre-gl-style-spec';
import { COLORS, INGRESS_COLORS, ITEM_LEVEL_COLORS, MAP_STYLES, PLAYER_TRACKER_COLORS, type MapStyleName } from './MapConstants';
import {
    MINI_PAGE_MAP_COMMAND,
    MINI_PAGE_MAP_EVENT,
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

type CirclePaint = NonNullable<CircleLayerSpecification['paint']>;
const PORTAL_TEAM_COLOR_EXPR: CirclePaint['circle-color'] = ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N];
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
const PORTAL_HEALTH_OPACITY_EXPR: CirclePaint['circle-opacity'] = ['interpolate', ['linear'], ['coalesce', ['get', 'health'], 100], 0, 0.15, 100, 1];
const SELECTABLE_LAYERS = ['p', 'f-enl', 'f-res', 'f-mac', 'l-enl', 'l-res', 'l-mac'] as const;
const MOBILE_LONG_PRESS_MS = 650;
const MOBILE_LONG_PRESS_MOVE_TOLERANCE_PX = 12;
const MOBILE_LONG_PRESS_CLICK_SUPPRESS_MS = 500;

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
    const source = map?.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    source?.setData(data);
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
            { id: 'p', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': ['coalesce', ['get', 'radius'], 2], 'circle-color': PORTAL_TEAM_COLOR_EXPR, 'circle-opacity': 1, 'circle-stroke-color': PORTAL_TEAM_COLOR_EXPR, 'circle-stroke-width': 1.5, 'circle-stroke-opacity': 1 } },
            { id: 'p-history-visited-highlight', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'visitedHighlight', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 5], 'circle-color': 'transparent', 'circle-stroke-color': '#B56DFF', 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
            { id: 'p-history-captured-highlight', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'capturedHighlight', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 8], 'circle-color': 'transparent', 'circle-stroke-color': '#FF8A3D', 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
            { id: 'p-history-scanned-highlight', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'scannedHighlight', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 11], 'circle-color': 'transparent', 'circle-stroke-color': '#00D9FF', 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
            { id: 'p-history-visited-inverse', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'visitedInverse', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 5], 'circle-color': '#B56DFF', 'circle-opacity': 0.14, 'circle-stroke-color': '#B56DFF', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.85 } },
            { id: 'p-history-captured-inverse', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'capturedInverse', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 8], 'circle-color': '#FF8A3D', 'circle-opacity': 0.14, 'circle-stroke-color': '#FF8A3D', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.85 } },
            { id: 'p-history-scanned-inverse', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'scannedInverse', true]], paint: { 'circle-radius': ['+', ['coalesce', ['get', 'radius'], 2], 11], 'circle-color': '#00D9FF', 'circle-opacity': 0.14, 'circle-stroke-color': '#00D9FF', 'circle-stroke-width': 2, 'circle-stroke-opacity': 0.85 } },
            { id: 'p-key-count-bg', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal-key-count'], paint: { 'circle-color': '#000000', 'circle-radius': 12, 'circle-translate': [0, -18], 'circle-opacity': 0.78, 'circle-stroke-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N], 'circle-stroke-width': 1.8, 'circle-stroke-opacity': 0.95 } },
            { id: 'p-key-count-total', type: 'symbol', source: 'entities', filter: ['==', 'type', 'portal-key-count'], layout: { 'text-field': ['get', 'totalLabel'], 'text-size': 12, 'text-anchor': 'center', 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': INGRESS_COLORS.KEY, 'text-halo-color': '#000000', 'text-halo-width': 1.4, 'text-opacity': 1, 'text-translate': [0, -20] } },
            { id: 'p-key-count-split', type: 'symbol', source: 'entities', filter: ['==', 'type', 'portal-key-count'], layout: { 'text-field': ['get', 'splitLabel'], 'text-size': 8, 'text-offset': [0, 0.95], 'text-anchor': 'center', 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#ffffff', 'text-halo-color': '#000000', 'text-halo-width': 1.2, 'text-opacity': 0.95, 'text-translate': [0, -20] } },
        ],
    };
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
    map.setPaintProperty('p', 'circle-color', levelColorEnabled ? PORTAL_LEVEL_COLOR_EXPR : PORTAL_TEAM_COLOR_EXPR);
    map.setPaintProperty('p', 'circle-opacity', healthColorEnabled ? PORTAL_HEALTH_OPACITY_EXPR : 1);
}

function initMap(command: Extract<MiniPageMapCommandMessage['command'], { action: 'init' }>): void {
    container = document.getElementById(command.containerId);
    if (!container) return;
    setContainerVisible(command.visible);
    if (map) {
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
