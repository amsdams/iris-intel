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
    result: 'IRIS_PAGE_MAP_RUNTIME_RESULT',
    selection: 'IRIS_PAGE_MAP_RUNTIME_SELECTION',
} as const;

export type PageMapRuntimeSelectionKind = 'portal' | 'link' | 'field' | 'planned-link' | 'planned-marker';

export interface PageMapRuntimeCamera {
    lat: number;
    lng: number;
    zoom: number;
}

export interface PageMapRuntimeBounds {
    minLatE6: number;
    minLngE6: number;
    maxLatE6: number;
    maxLngE6: number;
}

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
    };
}

export interface PageMapRuntimeSelectionPayload {
    id: string;
    kind: PageMapRuntimeSelectionKind;
    openInfo?: boolean;
}

export interface PageMapRuntimeCameraChangedMessage {
    type?: string;
    camera?: PageMapRuntimeCamera;
    bounds?: PageMapRuntimeBounds;
}
