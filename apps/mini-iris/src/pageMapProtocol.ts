import type { MapStyleName } from './MapConstants';
import type { BenchmarkMode, MiniBenchmarkVariant as CoreMiniBenchmarkVariant, RuntimeMapBoundsDegrees, RuntimeMapCamera, RuntimeMapEntitySelectionKind, RuntimeMapSelectionIntent, RuntimeMapView } from '@iris/core';

export const MINI_PAGE_MAP_COMMAND = 'MINI_IRIS_PAGE_MAP_COMMAND';
export const MINI_PAGE_MAP_EVENT = 'MINI_IRIS_PAGE_MAP_EVENT';

export type MiniMapCamera = RuntimeMapCamera;
export type MiniMapBounds = RuntimeMapBoundsDegrees;
export type MiniMapView = RuntimeMapView;

export type MiniMapSelectionKind = RuntimeMapEntitySelectionKind;
export type MiniMapSelectionIntent = RuntimeMapSelectionIntent;
export type MiniBenchmarkVariant = CoreMiniBenchmarkVariant;
export type MiniBenchmarkMode = BenchmarkMode;

export type MiniPageMapCommand =
    | {
        action: 'init';
        containerId: string;
        center: [number, number];
        zoom: number;
        styleName: MapStyleName;
        visible: boolean;
        portalPaint?: {
            levelColorEnabled: boolean;
            healthColorEnabled: boolean;
        };
    }
    | { action: 'set-visible'; visible: boolean }
    | { action: 'sync-data'; data: GeoJSON.FeatureCollection }
    | { action: 'sync-players'; data: GeoJSON.FeatureCollection }
    | { action: 'sync-selection'; data: GeoJSON.FeatureCollection }
    | { action: 'set-style'; styleName: MapStyleName }
    | { action: 'set-extrusion'; enabled: boolean }
    | { action: 'set-portal-paint'; levelColorEnabled: boolean; healthColorEnabled: boolean }
    | {
        action: 'run-benchmark-batch';
        context: {
            liveMode: boolean;
            patternMode: number;
            portalLevelColorEnabled: boolean;
            portalHealthColorEnabled: boolean;
            keyOverlayEnabled: boolean;
            extrusionEnabled: boolean;
        };
    }
    | { action: 'benchmark-preload-complete'; id: string; summary: string }
    | { action: 'nav'; nav: '+' | '-' | 'up' | 'down' | 'left' | 'right' | 'reset' }
    | { action: 'fly-to'; lat: number; lng: number; zoom: number; duration?: number }
    | { action: 'ease-to'; lat: number; lng: number; zoom: number; duration?: number }
    | { action: 'resize' };

export type MiniPageMapEvent =
    | { event: 'ready'; view: MiniMapView }
    | { event: 'camera'; view: MiniMapView; settled: boolean }
    | { event: 'selection'; kind: MiniMapSelectionKind; id: string; intent: MiniMapSelectionIntent }
    | { event: 'benchmark-preload'; id: string; view: MiniMapView; zoom: number }
    | { event: 'benchmark-batch'; report: string }
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
