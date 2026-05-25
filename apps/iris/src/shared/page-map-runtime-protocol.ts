import type { RuntimeMapBoundsE6, RuntimeMapCamera, RuntimeMapEntitySelectionKind } from '@iris/core';

export const PAGE_MAP_RUNTIME_MESSAGES = {
    showMap: 'IRIS_PAGE_MAP_RUNTIME_SHOW_MAP',
    hideMap: 'IRIS_PAGE_MAP_RUNTIME_HIDE_MAP',
    syncSnapshot: 'IRIS_PAGE_MAP_RUNTIME_SYNC_SNAPSHOT',
    syncData: 'IRIS_PAGE_MAP_RUNTIME_SYNC_DATA',
    syncLayers: 'IRIS_PAGE_MAP_RUNTIME_SYNC_LAYERS',
    syncCamera: 'IRIS_PAGE_MAP_RUNTIME_SYNC_CAMERA',
    syncSelection: 'IRIS_PAGE_MAP_RUNTIME_SYNC_SELECTION',
    syncTiles: 'IRIS_PAGE_MAP_RUNTIME_SYNC_TILES',
    ready: 'IRIS_PAGE_MAP_RUNTIME_READY',
    cameraChanged: 'IRIS_PAGE_MAP_RUNTIME_CAMERA_CHANGED',
    frameBenchmark: 'IRIS_PAGE_MAP_RUNTIME_FRAME_BENCHMARK',
    viewportPerformance: 'IRIS_PAGE_MAP_RUNTIME_VIEWPORT_PERFORMANCE',
    result: 'IRIS_PAGE_MAP_RUNTIME_RESULT',
    selection: 'IRIS_PAGE_MAP_RUNTIME_SELECTION',
} as const;

export const IRIS_PAGE_MAP_MIN_ZOOM = 3;

export type PageMapRuntimeSelectionKind = RuntimeMapEntitySelectionKind | 'planned-link' | 'planned-marker' | 'plugin-feature';

export type PageMapRuntimeCamera = RuntimeMapCamera;
export type PageMapRuntimeBounds = RuntimeMapBoundsE6;

export interface PageMapRuntimeLayerVisibility {
    portals: boolean;
    links: boolean;
    fields: boolean;
}

export interface PageMapRuntimeDataPayload {
    center?: {lat: number; lng: number};
    zoom?: number;
    camera?: PageMapRuntimeCamera;
    layers?: PageMapRuntimeLayerVisibility;
    tiles?: string[];
    planning?: {
        enabled: boolean;
        tool: 'links' | 'markers';
    };
    data?: {
        portals?: GeoJSON.FeatureCollection;
        links?: GeoJSON.FeatureCollection;
        fields?: GeoJSON.FeatureCollection;
        selectedPortal?: GeoJSON.FeatureCollection;
        selectedLink?: GeoJSON.FeatureCollection;
        selectedField?: GeoJSON.FeatureCollection;
        artifacts?: GeoJSON.FeatureCollection;
        ornaments?: GeoJSON.FeatureCollection;
        missionRoute?: GeoJSON.FeatureCollection;
        missionWaypoints?: GeoJSON.FeatureCollection;
        pluginFeatures?: GeoJSON.FeatureCollection;
        plannedFeatures?: GeoJSON.FeatureCollection;
    };
}

export interface PageMapRuntimeCommandMessage extends PageMapRuntimeDataPayload {
    type?: string;
    diagnostic?: boolean;
}

export interface PageMapRuntimeResultMessage {
    type?: string;
    label?: string;
    summary?: Record<string, unknown>;
}

export interface PageMapRuntimeSelectionMessage {
    type?: string;
    selection?: {
        id?: string;
        kind?: string;
        openInfo?: boolean;
        feature?: GeoJSON.Feature;
    };
}

export interface PageMapRuntimeSelectionPayload {
    id: string;
    kind: PageMapRuntimeSelectionKind;
    openInfo?: boolean;
    feature?: GeoJSON.Feature;
}

export interface PageMapRuntimeCameraChangedMessage {
    type?: string;
    camera?: PageMapRuntimeCamera;
    bounds?: PageMapRuntimeBounds;
}
