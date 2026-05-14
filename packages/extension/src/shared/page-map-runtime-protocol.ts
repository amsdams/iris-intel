export const PAGE_MAP_RUNTIME_MESSAGES = {
    qrfProbe: 'IRIS_PAGE_MAP_RUNTIME_QRF_POC',
    irisDataProbe: 'IRIS_PAGE_MAP_RUNTIME_IRIS_DATA_QRF_POC',
    visibleProbe: 'IRIS_PAGE_MAP_RUNTIME_VISIBLE_POC',
    fullMapProbe: 'IRIS_PAGE_MAP_RUNTIME_FULL_MAP_POC',
    hideVisibleProbe: 'IRIS_PAGE_MAP_RUNTIME_HIDE_VISIBLE_POC',
    syncSnapshot: 'IRIS_PAGE_MAP_RUNTIME_SYNC_SNAPSHOT',
    syncData: 'IRIS_PAGE_MAP_RUNTIME_SYNC_DATA',
    syncLayers: 'IRIS_PAGE_MAP_RUNTIME_SYNC_LAYERS',
    syncCamera: 'IRIS_PAGE_MAP_RUNTIME_SYNC_CAMERA',
    syncSelection: 'IRIS_PAGE_MAP_RUNTIME_SYNC_SELECTION',
    syncTiles: 'IRIS_PAGE_MAP_RUNTIME_SYNC_TILES',
    cameraChanged: 'IRIS_PAGE_MAP_RUNTIME_CAMERA_CHANGED',
    result: 'IRIS_PAGE_MAP_RUNTIME_QRF_POC_RESULT',
    selection: 'IRIS_PAGE_MAP_RUNTIME_SELECTION',
} as const;

export type PageMapRuntimeSelectionKind = 'portal' | 'link' | 'field';

export interface PageMapRuntimeCamera {
    lat: number;
    lng: number;
    zoom: number;
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
    data?: {
        portals?: GeoJSON.FeatureCollection;
        links?: GeoJSON.FeatureCollection;
        fields?: GeoJSON.FeatureCollection;
        selectedPortal?: GeoJSON.FeatureCollection;
        selectedLink?: GeoJSON.FeatureCollection;
        selectedField?: GeoJSON.FeatureCollection;
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
    };
}

export interface PageMapRuntimeSelectionPayload {
    id: string;
    kind: PageMapRuntimeSelectionKind;
}

export interface PageMapRuntimeCameraChangedMessage {
    type?: string;
    camera?: PageMapRuntimeCamera;
}
