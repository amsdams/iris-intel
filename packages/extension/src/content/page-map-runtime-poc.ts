import maplibregl from 'maplibre-gl';
import {
    PAGE_MAP_RUNTIME_MESSAGES,
    PageMapRuntimeCamera,
    PageMapRuntimeCameraChangedMessage,
    PageMapRuntimeCommandMessage,
    PageMapRuntimeResultMessage,
    PageMapRuntimeSelectionPayload,
} from '../shared/page-map-runtime-protocol';

interface SetDataGeoJsonSource {
    setData: (data: GeoJSON.FeatureCollection) => void;
}

let pocMapPromise: Promise<maplibregl.Map> | null = null;
let suppressNextCameraChangedEvent = false;

function createPocContainer(): HTMLDivElement {
    const existing = document.getElementById('iris-page-map-runtime-poc');
    if (existing instanceof HTMLDivElement) {
        return existing;
    }

    const container = document.createElement('div');
    container.id = 'iris-page-map-runtime-poc';
    container.style.position = 'fixed';
    container.style.right = '12px';
    container.style.top = '72px';
    container.style.width = '128px';
    container.style.height = '128px';
    container.style.pointerEvents = 'none';
    container.style.opacity = '0';
    container.style.zIndex = '10060';
    container.style.border = '1px solid #37e6ff';
    container.style.background = '#000';
    document.documentElement.appendChild(container);
    return container;
}

function setPocContainerVisible(visible: boolean): void {
    const container = createPocContainer();
    container.style.width = visible ? '320px' : '128px';
    container.style.height = visible ? '240px' : '128px';
    container.style.pointerEvents = visible ? 'auto' : 'none';
    container.style.opacity = visible ? '0.92' : '0';
}

function getPocMap(): Promise<maplibregl.Map> {
    if (pocMapPromise) {
        return pocMapPromise;
    }

    pocMapPromise = new Promise((resolve) => {
        const map = new maplibregl.Map({
            container: createPocContainer(),
            style: {
                version: 8,
                sources: {
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
                    'iris-poc-links': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                    'iris-poc-fields': {
                        type: 'geojson',
                        data: {type: 'FeatureCollection', features: []},
                    },
                },
                layers: [
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
                const message: PageMapRuntimeCameraChangedMessage = {
                    type: PAGE_MAP_RUNTIME_MESSAGES.cameraChanged,
                    camera,
                };
                window.postMessage(message, '*');
                postPocResult('PAGE CAMERA CHANGED', {...camera});
            });

            map.on('click', (event) => {
                const startedAt = performance.now();
                const features = map.queryRenderedFeatures(event.point, {
                    layers: ['iris-poc-portals', 'iris-poc-links', 'iris-poc-fields'],
                });
                const summary = {
                    count: features.length,
                    elapsedMs: Math.round(performance.now() - startedAt),
                    point: {x: Math.round(event.point.x), y: Math.round(event.point.y)},
                    sample: summarizeFeature(features[0]),
                };
                console.info('[IRIS page map runtime visible click POC]', summary);
                postPocResult('PAGE VISIBLE CLICK', summary);
                postSelection(features[0]);
            });
            resolve(map);
        });
    });

    return pocMapPromise;
}

function getMapCamera(map: maplibregl.Map): PageMapRuntimeCamera {
    const center = map.getCenter();
    return {
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
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

function setGeoJsonSourceData(map: maplibregl.Map, sourceId: string, data: GeoJSON.FeatureCollection): void {
    const source = map.getSource(sourceId);
    if (source && 'setData' in source) {
        (source as SetDataGeoJsonSource).setData(data);
    }
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

function postPocResult(label: string, summary: Record<string, unknown>): void {
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
    const map = await getPocMap();
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
    postPocResult('PAGE RUNTIME', summary);
}

async function runPageMapRuntimeIrisDataPoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    const map = await getPocMap();
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

    setGeoJsonSourceData(map, 'iris-poc-portals', message.data?.portals ?? {type: 'FeatureCollection', features: []});
    setGeoJsonSourceData(map, 'iris-poc-links', message.data?.links ?? {type: 'FeatureCollection', features: []});
    setGeoJsonSourceData(map, 'iris-poc-fields', message.data?.fields ?? {type: 'FeatureCollection', features: []});

    await new Promise<void>((resolve) => {
        map.once('idle', () => resolve());
        map.triggerRepaint();
    });

    const center = map.project(map.getCenter());
    const firstPortalPoint = firstPortalCoordinates ? map.project(firstPortalCoordinates) : null;
    const startedAt = performance.now();
    const centerFeatures = map.queryRenderedFeatures(center, {
        layers: ['iris-poc-portals', 'iris-poc-links', 'iris-poc-fields'],
    });
    const firstPortalFeatures = firstPortalPoint
        ? map.queryRenderedFeatures(firstPortalPoint, {
            layers: ['iris-poc-portals', 'iris-poc-links', 'iris-poc-fields'],
        })
        : [];
    const viewportFeatures = map.queryRenderedFeatures({
        layers: ['iris-poc-portals', 'iris-poc-links', 'iris-poc-fields'],
    });

    const summary = {
        centerCount: centerFeatures.length,
        firstPortalCount: firstPortalFeatures.length,
        viewportCount: viewportFeatures.length,
        elapsedMs: Math.round(performance.now() - startedAt),
        sourceCounts: {
            portals: message.data?.portals?.features.length ?? 0,
            links: message.data?.links?.features.length ?? 0,
            fields: message.data?.fields?.features.length ?? 0,
        },
        center: {x: Math.round(center.x), y: Math.round(center.y)},
        firstPortalPoint: firstPortalPoint ? {x: Math.round(firstPortalPoint.x), y: Math.round(firstPortalPoint.y)} : null,
        centerSample: summarizeFeature(centerFeatures[0]),
        firstPortalSample: summarizeFeature(firstPortalFeatures[0]),
        viewportSample: summarizeFeature(viewportFeatures[0]),
    };

    console.info('[IRIS page map runtime IRIS data POC]', summary);
    postPocResult('PAGE IRIS DATA', summary);
}

async function runVisibleRuntimePoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    setPocContainerVisible(true);
    const map = await getPocMap();
    map.resize();
    await runPageMapRuntimeIrisDataPoc(message);
    postPocResult('PAGE VISIBLE RUNTIME', {
        visible: true,
        note: 'Click features in the cyan bordered page-world map pane.',
    });
}

async function runSyncCameraPoc(message: PageMapRuntimeCommandMessage): Promise<void> {
    if (!message.camera) return;

    const map = await getPocMap();
    syncMapCamera(map, message.camera);
    postPocResult('PAGE SYNC CAMERA', {...getMapCamera(map)});
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

    if (event.data?.type === PAGE_MAP_RUNTIME_MESSAGES.syncCamera) {
        void runSyncCameraPoc(event.data);
    }
});

console.info('IRIS page map runtime POC loaded');
