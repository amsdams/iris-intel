import type { MapStyleName } from './MapConstants';

export const MINI_PAGE_MAP_COMMAND = 'MINI_IRIS_PAGE_MAP_COMMAND';
export const MINI_PAGE_MAP_EVENT = 'MINI_IRIS_PAGE_MAP_EVENT';

export interface MiniMapCamera {
    lat: number;
    lng: number;
    zoom: number;
}

export interface MiniMapBounds {
    south: number;
    west: number;
    north: number;
    east: number;
}

export interface MiniMapView extends MiniMapCamera {
    bounds: MiniMapBounds;
}

export type MiniMapSelectionKind = 'portal' | 'link' | 'field';
export type MiniMapSelectionIntent = 'select' | 'details';

export type MiniPageMapCommand =
    | {
        action: 'init';
        containerId: string;
        center: [number, number];
        zoom: number;
        styleName: MapStyleName;
        visible: boolean;
    }
    | { action: 'set-visible'; visible: boolean }
    | { action: 'sync-data'; data: GeoJSON.FeatureCollection }
    | { action: 'sync-players'; data: GeoJSON.FeatureCollection }
    | { action: 'sync-selection'; data: GeoJSON.FeatureCollection }
    | { action: 'set-style'; styleName: MapStyleName }
    | { action: 'set-extrusion'; enabled: boolean }
    | { action: 'set-portal-paint'; levelColorEnabled: boolean; healthColorEnabled: boolean }
    | { action: 'nav'; nav: '+' | '-' | 'up' | 'down' | 'left' | 'right' | 'reset' }
    | { action: 'fly-to'; lat: number; lng: number; zoom: number; duration?: number }
    | { action: 'resize' };

export type MiniPageMapEvent =
    | { event: 'ready'; view: MiniMapView }
    | { event: 'camera'; view: MiniMapView; settled: boolean }
    | { event: 'selection'; kind: MiniMapSelectionKind; id: string; intent: MiniMapSelectionIntent }
    | { event: 'clear-selection' };

export interface MiniPageMapCommandMessage {
    type: typeof MINI_PAGE_MAP_COMMAND;
    command: MiniPageMapCommand;
}

export interface MiniPageMapEventMessage {
    type: typeof MINI_PAGE_MAP_EVENT;
    payload: MiniPageMapEvent;
}

export function postMiniPageMapCommand(command: MiniPageMapCommand): void {
    window.postMessage({ type: MINI_PAGE_MAP_COMMAND, command } satisfies MiniPageMapCommandMessage, '*');
}
