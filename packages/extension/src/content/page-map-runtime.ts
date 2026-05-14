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

let pageMapPromise: Promise<maplibregl.Map> | null = null;
let suppressNextCameraChangedEvent = false;

const DEFAULT_LAYER_VISIBILITY: PageMapRuntimeLayerVisibility = {
    portals: true,
    links: true,
    fields: true,
};

let currentLayerVisibility: PageMapRuntimeLayerVisibility = DEFAULT_LAYER_VISIBILITY;

type RuntimeDisplayMode = 'hidden' | 'probe' | 'full';

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
                    'poc-source': {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: [
                                {
                                    type: 'Feature',
                                    properties: {
                                        id: 'page-runtime-poc-point',
                                        source: 'page-world',
                                    },
                                    geometry: {
                                        type: 'Point',
                                        coordinates: [0, 0],
                                    },
                                },
                            ],
                        },
                    },
                    'iris-poc-portals': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-portal-selected': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-links': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-link-selected': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-fields': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-field-selected': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-artifacts': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-ornaments': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-mission-route': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-mission-waypoints': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-plugin-features': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-planned-features': {
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
                        id: 'iris-poc-field-selected',
                        type: 'line',
                        source: 'iris-poc-field-selected',
                        paint: {
                            'line-color': '#ffffff',
                            'line-width': 3,
                        },
                    },
                    {
                        id: 'iris-poc-fields',
                        type: 'fill',
                        source: 'iris-poc-fields',
                        paint: {
                            'fill-color': [
                                'match', ['get', 'team'],
                                'E', '#03fe03',
                                'R', '#0088ff',
                                'M', '#ff0028',
                                '#999999',
                            ],
                            'fill-opacity': 0.25,
                        },
                    },
                    {
                        id: 'iris-poc-link-selected',
                        type: 'line',
                        source: 'iris-poc-link-selected',
                        paint: {
                            'line-color': '#ffffff',
                            'line-width': 4,
                        },
                    },
                    {
                        id: 'iris-poc-planned-links',
                        type: 'line',
                        source: 'iris-poc-planned-features',
                        filter: ['all', ['==', '$type', 'LineString'], ['!=', 'plannedType', 'crossing']],
                        paint: {
                            'line-width': ['case', ['==', ['get', 'selected'], true], 6, 3],
                            'line-color': ['coalesce', ['get', 'color'], '#37e6ff'],
                            'line-opacity': ['coalesce', ['get', 'opacity'], 0.92],
                            'line-dasharray': [2, 2],
                        },
                    },
                    {
                        id: 'iris-poc-plugin-lines',
                        type: 'line',
                        source: 'iris-poc-plugin-features',
                        filter: ['==', '$type', 'LineString'],
                        paint: {
                            'line-width': ['coalesce', ['get', 'weight'], 3],
                            'line-dasharray': [5, 8],
                            'line-color': ['coalesce', ['get', 'color'], '#37e6ff'],
                            'line-opacity': ['coalesce', ['get', 'opacity'], 1],
                        },
                    },
                    {
                        id: 'iris-poc-mission-route',
                        type: 'line',
                        source: 'iris-poc-mission-route',
                        paint: {
                            'line-width': 4,
                            'line-color': '#EF8E2E',
                            'line-opacity': 0.7,
                        },
                    },
                    {
                        id: 'iris-poc-links',
                        type: 'line',
                        source: 'iris-poc-links',
                        paint: {
                            'line-color': [
                                'match', ['get', 'team'],
                                'E', '#03fe03',
                                'R', '#0088ff',
                                'M', '#ff0028',
                                '#999999',
                            ],
                            'line-width': 2,
                        },
                    },
                    {
                        id: 'poc-point',
                        type: 'circle',
                        source: 'poc-source',
                        paint: {
                            'circle-radius': 24,
                            'circle-color': '#37e6ff',
                        },
                    },
                    {
                        id: 'iris-poc-portals',
                        type: 'circle',
                        source: 'iris-poc-portals',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                10, 2,
                                15, 6,
                            ],
                            'circle-color': [
                                'match', ['get', 'team'],
                                'E', '#03fe03',
                                'R', '#0088ff',
                                'M', '#ff0028',
                                'N', '#aaaaaa',
                                '#999999',
                            ],
                            'circle-stroke-width': 1,
                            'circle-stroke-color': '#ffffff',
                        },
                    },
                    {
                        id: 'iris-poc-portal-selected',
                        type: 'circle',
                        source: 'iris-poc-portal-selected',
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
                        id: 'iris-poc-mission-waypoints',
                        type: 'circle',
                        source: 'iris-poc-mission-waypoints',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 3,
                                10, 6,
                                15, 10,
                            ],
                            'circle-color': '#EF8E2E',
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#ffffff',
                        },
                    },
                    {
                        id: 'iris-poc-artifacts',
                        type: 'circle',
                        source: 'iris-poc-artifacts',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 3,
                                10, 7,
                                15, 14,
                            ],
                            'circle-color': 'transparent',
                            'circle-stroke-width': 2.5,
                            'circle-stroke-color': '#FF00FF',
                            'circle-stroke-opacity': 0.85,
                        },
                    },
                    {
                        id: 'iris-poc-ornaments',
                        type: 'circle',
                        source: 'iris-poc-ornaments',
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                3, 2,
                                10, 4,
                                15, 10,
                            ],
                            'circle-color': 'transparent',
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#FFCE00',
                            'circle-stroke-opacity': 0.8,
                        },
                    },
                    {
                        id: 'iris-poc-plugin-points',
                        type: 'circle',
                        source: 'iris-poc-plugin-features',
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
                        id: 'iris-poc-plugin-html-points',
                        type: 'circle',
                        source: 'iris-poc-plugin-features',
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
                        id: 'iris-poc-plugin-player-points',
                        type: 'circle',
                        source: 'iris-poc-plugin-features',
                        filter: ['all', ['==', '$type', 'Point'], ['==', 'isPlayerMarker', true]],
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                10, 5,
                                15, 8,
                            ],
                            'circle-color': ['coalesce', ['get', 'color'], '#ffffff'],
                            'circle-stroke-width': 2,
                            'circle-stroke-color': '#ffffff',
                            'circle-opacity': ['coalesce', ['get', 'opacity'], 1],
                            'circle-stroke-opacity': ['coalesce', ['get', 'opacity'], 1],
                        },
                    },
                    {
                        id: 'iris-poc-planned-anchor',
                        type: 'circle',
                        source: 'iris-poc-planned-features',
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
                        id: 'iris-poc-planned-markers',
                        type: 'circle',
                        source: 'iris-poc-planned-features',
                        filter: ['all', ['==', '$type', 'Point'], ['==', 'plannedType', 'marker']],
                        paint: {
                            'circle-radius': [
                                'interpolate', ['linear'], ['zoom'],
                                10, 5,
                                15, 9,
                            ],
                            'circle-color': ['coalesce', ['get', 'color'], '#37e6ff'],
                            'circle-opacity': 0.9,
                            'circle-stroke-width': ['case', ['==', ['get', 'selected'], true], 4, 2],
                            'circle-stroke-color': ['case', ['==', ['get', 'selected'], true], '#ffffff', '#000000'],
                            'circle-stroke-opacity': ['case', ['==', ['get', 'selected'], true], 1, 0.85],
                        },
                    },
                    {
                        id: 'iris-poc-planned-crossings',
                        type: 'line',
                        source: 'iris-poc-planned-features',
                        filter: ['all', ['==', '$type', 'LineString'], ['==', 'plannedType', 'crossing']],
                        paint: {
                            'line-width': 4,
                            'line-color': '#ff4d4d',
                            'line-opacity': 0.95,
                            'line-dasharray': [1, 1],
                        },
                    },
                    {
                        id: 'iris-poc-plugin-labels',
                        type: 'symbol',
                        source: 'iris-poc-plugin-features',
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
                    {
                        id: 'iris-poc-plugin-player-labels',
                        type: 'symbol',
                        source: 'iris-poc-plugin-features',
                        filter: ['all', ['==', '$type', 'Point'], ['==', 'isPlayerMarker', true]],
                        layout: {
                            'text-field': ['coalesce', ['get', 'label'], ['get', 'name'], ''],
                            'text-size': 11,
                            'text-anchor': 'left',
                            'text-offset': [0.9, 0],
                            'text-allow-overlap': true,
                            'text-ignore-placement': true,
                        },
                        paint: {
                            'text-color': '#ffffff',
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
            map.on('moveend', () => {
                if (suppressNextCameraChangedEvent) {
                    suppressNextCameraChangedEvent = false;
                    return;
                }

                const camera = getMapCamera(map);
                const bounds = getMapBounds(map);
                const message: PageMapRuntimeCameraChangedMessage = {
                    type: PAGE_MAP_RUNTIME_MESSAGES.cameraChanged,
                    camera,
                    bounds,
                };
                window.postMessage(message, '*');
                postDiagnosticResult('PAGE CAMERA CHANGED', {...camera, bounds});
            });

            map.on('click', (event) => {
                const startedAt = performance.now();
                const features = map.queryRenderedFeatures(event.point, {
                    layers: getVisibleIrisLayerIds(),
                });
                const summary = {
                    count: features.length,
                    elapsedMs: Math.round(performance.now() - startedAt),
                    point: {x: Math.round(event.point.x), y: Math.round(event.point.y)},
                    sample: summarizeFeature(features[0]),
                };
                console.info('[IRIS page map runtime visible click POC]', summary);
                postDiagnosticResult('PAGE VISIBLE CLICK', summary);
                postSelection(features[0]);
            });
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

function setRasterTiles(map: maplibregl.Map, sourceId: string, tiles: string[]): void {
    const source = map.getSource(sourceId);
    if (source && 'setTiles' in source) {
        (source as SetTilesRasterSource).setTiles(tiles);
    }
}

function getVisibleIrisLayerIds(): string[] {
    return [
        currentLayerVisibility.portals ? 'iris-poc-portals' : null,
        currentLayerVisibility.links ? 'iris-poc-links' : null,
        currentLayerVisibility.fields ? 'iris-poc-fields' : null,
    ].filter((layerId): layerId is string => Boolean(layerId));
}

function setLayerVisibility(map: maplibregl.Map, layerId: string, visible: boolean): void {
    if (!map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
}

function setIrisLayerVisibility(map: maplibregl.Map, visibility: PageMapRuntimeLayerVisibility): void {
    currentLayerVisibility = visibility;
    setLayerVisibility(map, 'iris-poc-portals', visibility.portals);
    setLayerVisibility(map, 'iris-poc-links', visibility.links);
    setLayerVisibility(map, 'iris-poc-fields', visibility.fields);
    setLayerVisibility(map, 'iris-poc-link-selected', visibility.links);
    setLayerVisibility(map, 'iris-poc-field-selected', visibility.fields);
}

function getEmptyFeatureCollection(): GeoJSON.FeatureCollection {
    return {type: 'FeatureCollection', features: []};
}

function setIrisData(map: maplibregl.Map, message: PageMapRuntimeCommandMessage): void {
    setGeoJsonSourceData(map, 'iris-poc-portals', message.data?.portals ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-links', message.data?.links ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-fields', message.data?.fields ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-artifacts', message.data?.artifacts ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-ornaments', message.data?.ornaments ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-mission-route', message.data?.missionRoute ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-mission-waypoints', message.data?.missionWaypoints ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-plugin-features', message.data?.pluginFeatures ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-planned-features', message.data?.plannedFeatures ?? getEmptyFeatureCollection());
    setSelectedData(map, message);
}

function setSelectedData(map: maplibregl.Map, message: PageMapRuntimeCommandMessage): void {
    setGeoJsonSourceData(map, 'iris-poc-portal-selected', message.data?.selectedPortal ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-link-selected', message.data?.selectedLink ?? getEmptyFeatureCollection());
    setGeoJsonSourceData(map, 'iris-poc-field-selected', message.data?.selectedField ?? getEmptyFeatureCollection());
}

function getIrisDataCounts(message: PageMapRuntimeCommandMessage): Record<string, unknown> {
    return {
        portals: message.data?.portals?.features.length ?? 0,
        links: message.data?.links?.features.length ?? 0,
        fields: message.data?.fields?.features.length ?? 0,
    };
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

function getFirstPointFeature(collection: GeoJSON.FeatureCollection | undefined): GeoJSON.Feature<GeoJSON.Point> | null {
    const feature = collection?.features.find((candidate): candidate is GeoJSON.Feature<GeoJSON.Point> =>
        candidate.geometry.type === 'Point'
    );

    return feature ?? null;
}

function postDiagnosticResult(label: string, summary: Record<string, unknown>): void {
    const message: PageMapRuntimeResultMessage = {
        type: PAGE_MAP_RUNTIME_MESSAGES.result,
        label,
        summary,
    };
    window.postMessage(message, '*');
}

function postSelection(feature: maplibregl.MapGeoJSONFeature | undefined): void {
    if (!feature) return;
    const properties = feature.properties as Record<string, unknown>;
    const id = properties.id;
    if (typeof id !== 'string') return;

    const layerId = feature.layer.id;
    if (layerId !== 'iris-poc-portals' && layerId !== 'iris-poc-links' && layerId !== 'iris-poc-fields') {
        return;
    }

    const selection: PageMapRuntimeSelectionPayload = {
        id,
        kind: layerId === 'iris-poc-portals' ? 'portal' : layerId === 'iris-poc-links' ? 'link' : 'field',
    };
    window.postMessage({type: PAGE_MAP_RUNTIME_MESSAGES.selection, selection}, '*');
}

async function runPageMapRuntimePoc(): Promise<void> {
    const map = await getPageMap();
    const point = map.project([0, 0]);
    const startedAt = performance.now();
    const features = map.queryRenderedFeatures(point, {layers: ['poc-point']});

    const summary = {
        count: features.length,
        elapsedMs: Math.round(performance.now() - startedAt),
        sample: features[0]
            ? {
                layerId: features[0].layer.id,
                properties: {...features[0].properties},
                geometryType: features[0].geometry.type,
            }
            : null,
    };

    console.info('[IRIS page map runtime POC]', summary);
    postDiagnosticResult('PAGE RUNTIME', summary);
}

async function runPageMapRuntimeIrisDataPoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    const map = await getPageMap();
    const firstPortal = getFirstPointFeature(message.data?.portals);
    const firstPortalCoordinates = firstPortal
        ? [firstPortal.geometry.coordinates[0], firstPortal.geometry.coordinates[1]] as [number, number]
        : null;

    if (firstPortalCoordinates) {
        map.jumpTo({
            center: firstPortalCoordinates,
            zoom: Math.max(message.zoom ?? map.getZoom(), 15),
        });
    } else if (message.center) {
        map.jumpTo({
            center: [message.center.lng, message.center.lat],
            zoom: message.zoom ?? map.getZoom(),
        });
    }

    setIrisData(map, message);
    await waitForMapIdle(map);

    const center = map.project(map.getCenter());
    const firstPortalPoint = firstPortalCoordinates ? map.project(firstPortalCoordinates) : null;
    const visibleLayers = getVisibleIrisLayerIds();
    const startedAt = performance.now();
    const centerFeatures = map.queryRenderedFeatures(center, {
        layers: visibleLayers,
    });
    const firstPortalFeatures = firstPortalPoint
        ? map.queryRenderedFeatures(firstPortalPoint, {
            layers: visibleLayers,
        })
        : [];
    const viewportFeatures = map.queryRenderedFeatures({
        layers: visibleLayers,
    });

    const summary = {
        centerCount: centerFeatures.length,
        firstPortalCount: firstPortalFeatures.length,
        viewportCount: viewportFeatures.length,
        elapsedMs: Math.round(performance.now() - startedAt),
        sourceCounts: getIrisDataCounts(message),
        visibleLayers,
        center: {x: Math.round(center.x), y: Math.round(center.y)},
        firstPortalPoint: firstPortalPoint ? {x: Math.round(firstPortalPoint.x), y: Math.round(firstPortalPoint.y)} : null,
        centerSample: summarizeFeature(centerFeatures[0]),
        firstPortalSample: summarizeFeature(firstPortalFeatures[0]),
        viewportSample: summarizeFeature(viewportFeatures[0]),
    };

    console.info('[IRIS page map runtime IRIS data POC]', summary);
    postDiagnosticResult('PAGE IRIS DATA', summary);
}

async function runVisibleRuntimePoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    setRuntimeContainerVisible(true);
    const map = await getPageMap();
    map.resize();
    await applySnapshot(map, message);
    postDiagnosticResult('PAGE VISIBLE RUNTIME', {
        visible: true,
        sourceCounts: getIrisDataCounts(message),
        visibleLayers: getVisibleIrisLayerIds(),
        camera: {...getMapCamera(map)},
        note: 'Click features in the cyan bordered page-world map pane.',
    });
}

async function runFullMapRuntimePoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    setRuntimeContainerFullMap();
    const map = await getPageMap();
    map.resize();
    await applySnapshot(map, message);
    postDiagnosticResult('PAGE FULL MAP RUNTIME', {
        visible: true,
        sourceCounts: getIrisDataCounts(message),
        visibleLayers: getVisibleIrisLayerIds(),
        camera: {...getMapCamera(map)},
        note: 'Page-world map is now the full viewport map surface.',
    });
}

function runHideVisibleRuntimePoc(): void {
    setRuntimeContainerVisible(false);
    postDiagnosticResult('PAGE HIDE VISIBLE RUNTIME', {
        visible: false,
    });
}

async function runSyncDataPoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    const map = await getPageMap();
    setIrisData(map, message);
    await waitForMapIdle(map);
    if (message.diagnostic) {
        postDiagnosticResult('PAGE SYNC DATA', {
            sourceCounts: getIrisDataCounts(message),
            camera: {...getMapCamera(map)},
        });
    }
}

async function runSyncLayersPoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    if (!message.layers) return;

    const map = await getPageMap();
    setIrisLayerVisibility(map, message.layers);
    if (message.diagnostic) {
        postDiagnosticResult('PAGE SYNC LAYERS', {...message.layers});
    }
}

async function runSyncCameraPoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    if (!message.camera) return;

    const map = await getPageMap();
    syncMapCamera(map, message.camera);
    if (message.diagnostic) {
        postDiagnosticResult('PAGE SYNC CAMERA', {...getMapCamera(map)});
    }
}

async function runSyncSelectionPoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    const map = await getPageMap();
    setSelectedData(map, message);
    if (message.diagnostic) {
        postDiagnosticResult('PAGE SYNC SELECTION', {
            selectedPortal: message.data?.selectedPortal?.features.length ?? 0,
            selectedLink: message.data?.selectedLink?.features.length ?? 0,
            selectedField: message.data?.selectedField?.features.length ?? 0,
        });
    }
}

async function runSyncTilesPoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    if (!message.tiles?.length) return;

    const map = await getPageMap();
    setRasterTiles(map, 'osm', message.tiles);
    if (message.diagnostic) {
        postDiagnosticResult('PAGE SYNC TILES', {
            tileCount: message.tiles.length,
        });
    }
}

async function runSyncSnapshotPoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    const map = await getPageMap();
    await applySnapshot(map, message);
    if (message.diagnostic) {
        postDiagnosticResult('PAGE SYNC SNAPSHOT', {
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

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.qrfProbe) {
        void runPageMapRuntimePoc();
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.irisDataProbe) {
        void runPageMapRuntimeIrisDataPoc(event.data);
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.visibleProbe) {
        void runVisibleRuntimePoc(event.data);
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.fullMapProbe) {
        void runFullMapRuntimePoc(event.data);
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.hideVisibleProbe) {
        runHideVisibleRuntimePoc();
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncSnapshot) {
        void runSyncSnapshotPoc(event.data);
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncData) {
        void runSyncDataPoc(event.data);
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncLayers) {
        void runSyncLayersPoc(event.data);
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncCamera) {
        void runSyncCameraPoc(event.data);
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncSelection) {
        void runSyncSelectionPoc(event.data);
    }

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncTiles) {
        void runSyncTilesPoc(event.data);
    }
});

window.postMessage({type: PAGE_MAP_RUNTIME_MESSAGES.ready}, '*');

console.info('IRIS page map runtime loaded');
