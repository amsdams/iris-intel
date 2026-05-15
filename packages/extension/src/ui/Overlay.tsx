import { h, JSX } from 'preact';
import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { MapPerfSnapshot, useStore } from '@iris/core';
import { PlayerStatsPopup } from './domains/player/PlayerStatsPopup';
import { DiagnosticsPopup } from './domains/debug/DiagnosticsPopup';
import { PortalInfoPopup } from './domains/portal/PortalInfoPopup';
import { FieldInfoPopup } from './domains/portal/FieldInfoPopup';
import { LinkInfoPopup } from './domains/portal/LinkInfoPopup';
import { CommPopup } from './domains/comm/CommPopup';
import { GameScorePopup } from './domains/scores/GameScorePopup';
import { RegionScorePopup } from './domains/scores/RegionScorePopup';
import { ExportPopup } from '../../../plugins/src/export-data/ExportPopup';
import { ThemePopup } from '../../../plugins/src/theme-selector/ThemePopup';
import { MapSettingsPopup } from './domains/map/MapSettingsPopup';
import { PluginsPopup } from './domains/plugins/PluginsPopup';
import { StatusBar } from './domains/status/StatusBar';
import { SessionAlert } from './domains/status/SessionAlert';
import { PluginFeaturePopup } from './domains/plugins/PluginFeaturePopup';
import { InventoryPopup } from './domains/inventory/InventoryPopup';
import { MissionDetailsPopup } from './domains/missions/MissionDetailsPopup';
import { MissionsPopup } from './domains/missions/MissionsPopup';
import { PasscodePopup } from './domains/passcodes/PasscodePopup';
import { NavigationPopup } from './domains/map/NavigationPopup';
import { BottomDock } from './shared/BottomDock';
import { DockDrawer, DrawerTab } from './shared/DockDrawer';
import { LocationSearchPopup } from './shared/LocationSearchPopup';
import { MockToolsBar } from './shared/MockToolsBar';
import { PlanningBar } from './shared/PlanningBar';
import {
    PAGE_MAP_RUNTIME_MESSAGES,
    PageMapRuntimeCameraChangedMessage,
    PageMapRuntimeSelectionMessage,
} from '../shared/page-map-runtime-protocol';
import {buildPageMapRuntimeSnapshotMessage, getMapThemeTiles} from './domains/map/page-map-runtime-snapshot';

// ---------------------------------------------------------------------------
// IRISOverlay
// ---------------------------------------------------------------------------

const PAGE_MAP_RUNTIME_INITIAL_SYNC_DEBOUNCE_MS = 300;
const PAGE_MAP_RUNTIME_DATA_SYNC_DEBOUNCE_MS = 300;
const PAGE_MAP_RUNTIME_CAMERA_SYNC_DEBOUNCE_MS = 80;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isPageRuntimeCameraChangedMessage(
    value: unknown
): value is PageMapRuntimeCameraChangedMessage & {
    camera: {lat: number; lng: number; zoom: number};
    bounds: {minLatE6: number; minLngE6: number; maxLatE6: number; maxLngE6: number};
} {
    if (!isRecord(value) || value.type !== PAGE_MAP_RUNTIME_MESSAGES.cameraChanged || !isRecord(value.camera)) {
        return false;
    }

    return typeof value.camera.lat === 'number' &&
        typeof value.camera.lng === 'number' &&
        typeof value.camera.zoom === 'number' &&
        isRecord(value.bounds) &&
        typeof value.bounds.minLatE6 === 'number' &&
        typeof value.bounds.minLngE6 === 'number' &&
        typeof value.bounds.maxLatE6 === 'number' &&
        typeof value.bounds.maxLngE6 === 'number';
}

function isPageRuntimeSelectionMessage(
    value: unknown
): value is PageMapRuntimeSelectionMessage & {selection: {id: string; kind: string}} {
    if (!isRecord(value) || value.type !== PAGE_MAP_RUNTIME_MESSAGES.selection || !isRecord(value.selection)) {
        return false;
    }

    return typeof value.selection.id === 'string' &&
        typeof value.selection.kind === 'string';
}

function isPageRuntimeFrameBenchmarkMessage(value: unknown): value is {type: string; snapshot: Record<string, unknown>} {
    return isRecord(value) &&
        value.type === PAGE_MAP_RUNTIME_MESSAGES.frameBenchmark &&
        isRecord(value.snapshot);
}

function isPageRuntimeViewportPerformanceMessage(value: unknown): value is {type: string; snapshot: Record<string, unknown>} {
    return isRecord(value) &&
        value.type === PAGE_MAP_RUNTIME_MESSAGES.viewportPerformance &&
        isRecord(value.snapshot);
}

function toFrameSnapshot(snapshot: Record<string, unknown>): MapPerfSnapshot {
    const getNumber = (key: string, fallback = 0): number =>
        typeof snapshot[key] === 'number' ? snapshot[key] : fallback;

    return {
        type: 'frame',
        time: getNumber('time', Date.now()),
        totalMs: getNumber('totalMs'),
        frameCount: getNumber('frameCount'),
        averageFrameMs: getNumber('averageFrameMs'),
        maxFrameMs: getNumber('maxFrameMs'),
        slowFrameCount: getNumber('slowFrameCount'),
        estimatedFps: getNumber('estimatedFps'),
        benchmarkRunCount: getNumber('benchmarkRunCount'),
        benchmarkMedianAverageFrameMs: getNumber('benchmarkMedianAverageFrameMs'),
        benchmarkMinAverageFrameMs: getNumber('benchmarkMinAverageFrameMs'),
        benchmarkMaxAverageFrameMs: getNumber('benchmarkMaxAverageFrameMs'),
        benchmarkMaxFrameMs: getNumber('benchmarkMaxFrameMs'),
    };
}

function toRecordOfNumbers(value: unknown): Record<string, number> | undefined {
    if (!isRecord(value)) return undefined;

    const entries = Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number');
    return Object.fromEntries(entries);
}

function toViewportPerformanceSnapshot(snapshot: Record<string, unknown>): MapPerfSnapshot {
    const getNumber = (key: string, fallback = 0): number =>
        typeof snapshot[key] === 'number' ? snapshot[key] : fallback;
    const getOptionalNumber = (key: string): number | undefined =>
        typeof snapshot[key] === 'number' ? snapshot[key] : undefined;

    return {
        type: 'viewport',
        time: getNumber('time', Date.now()),
        totalMs: getNumber('totalMs'),
        queryMs: getOptionalNumber('queryMs'),
        setDataMs: getNumber('setDataMs'),
        zoom: getOptionalNumber('zoom'),
        sourceSetDataMs: toRecordOfNumbers(snapshot.sourceSetDataMs),
        sourceFeatureCounts: toRecordOfNumbers(snapshot.sourceFeatureCounts),
        itemCount: getNumber('itemCount'),
        portalCount: getNumber('portalCount'),
        linkCount: getNumber('linkCount'),
        fieldCount: getNumber('fieldCount'),
        artifactCount: getNumber('artifactCount'),
        ornamentCount: getNumber('ornamentCount'),
        pluginCount: getNumber('pluginCount'),
    };
}

function buildPageRuntimeSnapshotFromStore(type: string, diagnostic?: boolean): ReturnType<typeof buildPageMapRuntimeSnapshotMessage> {
    const state = useStore.getState();
    return buildPageMapRuntimeSnapshotMessage({
        type,
        diagnostic,
        portals: state.portals,
        links: state.links,
        fields: state.fields,
        artifacts: state.artifacts,
        mockOrnaments: state.mockOrnaments,
        missionDetails: state.missionDetails,
        pluginFeatures: state.pluginFeatures,
        plannedLinks: state.plannedLinks,
        plannedMarkers: state.plannedMarkers,
        planningMode: state.planningMode,
        planningTool: state.planningTool,
        planningAnchorPortalId: state.planningAnchorPortalId,
        planningPortalPath: state.planningPortalPath,
        mapState: state.mapState,
        themeId: state.themeId,
        mapThemeId: state.mapThemeId,
        layerShowLinks: state.layerShowLinks,
        layerShowFields: state.layerShowFields,
        layerShowOrnaments: state.layerShowOrnaments,
        layerShowArtifacts: state.layerShowArtifacts,
        filterShowResistance: state.filterShowResistance,
        filterShowEnlightened: state.filterShowEnlightened,
        filterShowMachina: state.filterShowMachina,
        filterShowUnclaimedPortals: state.filterShowUnclaimedPortals,
        filterShowLevel: state.filterShowLevel,
        filterShowHealth: state.filterShowHealth,
        filterShowVisited: state.filterShowVisited,
        filterShowCaptured: state.filterShowCaptured,
        filterShowScanned: state.filterShowScanned,
        selectedPortalId: state.selectedPortalId,
        selectedLinkId: state.selectedLinkId,
        selectedFieldId: state.selectedFieldId,
        selectedPlannedItemId: state.selectedPlannedItemId,
        plannedLinksEnabled: state.pluginStates['planned-links'] ?? false,
        plannedShowLinks: state.plannedShowLinks,
        plannedShowMarkers: state.plannedShowMarkers,
    });
}

export function IRISOverlay(): JSX.Element {
    const sessionStatus = useStore((state) => state.sessionStatus);
    const [showPlayerStatsPopup, setShowPlayerStatsPopup] = useState(false);
    const [showInventoryPopup, setShowInventoryPopup] = useState(false);
    const [showDiagnosticsPopup, setShowDiagnosticsPopup] = useState(false);
    const [showCommPopup, setShowCommPopup] = useState(false);
    const [showThemePopup, setShowThemePopup] = useState(false);
    const [showMapSettingsPopup, setShowMapSettingsPopup] = useState(false);
    const [showPluginsPopup, setShowPluginsPopup] = useState(false);
    const [showGameScorePopup, setShowGameScorePopup] = useState(false);
    const [showRegionScorePopup, setShowRegionScorePopup] = useState(false);
    const [showExportPopup, setShowExportPopup] = useState(false);
    const [showMap, setShowMap] = useState(true);
    const [showMissionsPopup, setShowMissionsPopup] = useState(false);
    const [showPasscodePopup, setShowPasscodePopup] = useState(false);
    const [showNavigationPopup, setShowNavigationPopup] = useState(false);
    const [showSearchPopup, setShowSearchPopup] = useState(false);
    const [showSelectionInfo, setShowSelectionInfo] = useState(false);
    
    const [activeDrawerTab, setActiveDrawerTab] = useState<DrawerTab>(null);
    const [locating, setLocating] = useState(false);

    const selectedPortalId = useStore((state) => state.selectedPortalId);
    const selectedFieldId = useStore((state) => state.selectedFieldId);
    const selectedLinkId = useStore((state) => state.selectedLinkId);
    const portals = useStore((state) => state.portals);
    const links = useStore((state) => state.links);
    const fields = useStore((state) => state.fields);
    const mapState = useStore((state) => state.mapState);
    const themeId = useStore((state) => state.themeId);
    const mapThemeId = useStore((state) => state.mapThemeId);
    const layerShowLinks = useStore((state) => state.layerShowLinks);
    const layerShowFields = useStore((state) => state.layerShowFields);
    const layerShowOrnaments = useStore((state) => state.layerShowOrnaments);
    const layerShowArtifacts = useStore((state) => state.layerShowArtifacts);
    const artifacts = useStore((state) => state.artifacts);
    const mockOrnaments = useStore((state) => state.mockOrnaments);
    const missionDetails = useStore((state) => state.missionDetails);
    const pluginFeatures = useStore((state) => state.pluginFeatures);
    const plannedLinks = useStore((state) => state.plannedLinks);
    const plannedMarkers = useStore((state) => state.plannedMarkers);
    const planningMode = useStore((state) => state.planningMode);
    const planningTool = useStore((state) => state.planningTool);
    const planningAnchorPortalId = useStore((state) => state.planningAnchorPortalId);
    const planningPortalPath = useStore((state) => state.planningPortalPath);
    const selectedPlannedItemId = useStore((state) => state.selectedPlannedItemId);
    const plannedLinksEnabled = useStore((state) => state.pluginStates['planned-links'] ?? false);
    const plannedShowLinks = useStore((state) => state.plannedShowLinks);
    const plannedShowMarkers = useStore((state) => state.plannedShowMarkers);
    const filterShowResistance = useStore((state) => state.filterShowResistance);
    const filterShowEnlightened = useStore((state) => state.filterShowEnlightened);
    const filterShowMachina = useStore((state) => state.filterShowMachina);
    const filterShowUnclaimedPortals = useStore((state) => state.filterShowUnclaimedPortals);
    const filterShowLevel = useStore((state) => state.filterShowLevel);
    const filterShowHealth = useStore((state) => state.filterShowHealth);
    const filterShowVisited = useStore((state) => state.filterShowVisited);
    const filterShowCaptured = useStore((state) => state.filterShowCaptured);
    const filterShowScanned = useStore((state) => state.filterShowScanned);
    const pageRuntimeInitialSyncDoneRef = useRef(false);
    const pageRuntimeStartsInFullMapRef = useRef(showMap);

    // If selection is cleared externally, hide the info popup
    useEffect(() => {
        if (!selectedPortalId && !selectedFieldId && !selectedLinkId) {
            setShowSelectionInfo(false);
        }
    }, [selectedPortalId, selectedFieldId, selectedLinkId]);

    const togglePlayerStatsPopup = (): void => setShowPlayerStatsPopup((v) => !v);
    const toggleInventoryPopup = (): void => {
        if (!showInventoryPopup) window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
        setShowInventoryPopup((v) => !v);
    };
    const toggleDiagnosticsPopup = (): void => setShowDiagnosticsPopup((v) => !v);
    const toggleCommPopup = (): void => setShowCommPopup((v) => !v);
    const toggleThemePopup = useCallback((): void => setShowThemePopup((v) => !v), []);
    const toggleMapSettingsPopup = (): void => setShowMapSettingsPopup((v) => !v);
    const togglePluginsPopup = (): void => setShowPluginsPopup((v) => !v);
    const toggleGameScorePopup = (): void => {
        if (!showGameScorePopup) window.postMessage({ type: 'IRIS_GAME_SCORE_REQUEST' }, '*');
        setShowGameScorePopup((v) => !v);
    };
    const toggleRegionScorePopup = (): void => {
        if (!showRegionScorePopup) {
            const { lat, lng } = useStore.getState().mapState;
            window.postMessage({ type: 'IRIS_REGION_SCORE_REQUEST', lat, lng }, '*');
        }
        setShowRegionScorePopup((v) => !v);
    };
    const toggleExportPopup = useCallback((): void => setShowExportPopup((v) => !v), []);
    const toggleMapVisibility = (): void => setShowMap((v) => !v);
    const togglePasscodePopup = (): void => {
        if (!showPasscodePopup) useStore.getState().clearPasscodeRedeemState();
        setShowPasscodePopup((v) => !v);
    };
    const toggleMissionsPopup = (): void => {
        if (!showMissionsPopup) useStore.getState().setMissionsPortalId(null);
        setShowMissionsPopup((v) => !v);
    };
    const toggleNavigationPopup = (): void => setShowNavigationPopup((v) => !v);
    const toggleSearchPopup = (): void => setShowSearchPopup((v) => !v);

    const handleGeolocate = (): void => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                window.postMessage({ type: 'IRIS_MOVE_MAP', center: { lat: coords.latitude, lng: coords.longitude }, zoom: 15 }, '*');
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleDrawerAction = (action: string): void => {
        switch (action) {
            case 'stats': togglePlayerStatsPopup(); setActiveDrawerTab(null); break;
            case 'inventory': toggleInventoryPopup(); setActiveDrawerTab(null); break;
            case 'gameScore': toggleGameScorePopup(); setActiveDrawerTab(null); break;
            case 'regionScore': toggleRegionScorePopup(); setActiveDrawerTab(null); break;
            case 'comm': toggleCommPopup(); setActiveDrawerTab(null); break;
            case 'passcodes': togglePasscodePopup(); setActiveDrawerTab(null); break;
            case 'search': toggleSearchPopup(); setActiveDrawerTab(null); break;
            case 'nav': toggleNavigationPopup(); setActiveDrawerTab(null); break;
            case 'missions': toggleMissionsPopup(); setActiveDrawerTab(null); break;
            case 'planning-links': useStore.getState().setPlanningTool('links'); setShowSelectionInfo(false); setActiveDrawerTab(null); break;
            case 'planning-markers': useStore.getState().setPlanningTool('markers'); setShowSelectionInfo(false); setActiveDrawerTab(null); break;
            case 'plugins': togglePluginsPopup(); setActiveDrawerTab(null); break;
            case 'settings': toggleMapSettingsPopup(); setActiveDrawerTab(null); break;
            case 'diag': toggleDiagnosticsPopup(); setActiveDrawerTab(null); break;
            case 'toggle': toggleMapVisibility(); break;
        }
    };

    useEffect(() => {
        const themeHandler = (): void => toggleThemePopup();
        const exportHandler = (): void => toggleExportPopup();
        const selectionInfoOpenHandler = (): void => {
            setActiveDrawerTab(null);
            setShowSelectionInfo(true);
        };
        document.addEventListener('iris:plugin:theme:toggle', themeHandler);
        document.addEventListener('iris:plugin:export:toggle', exportHandler);
        document.addEventListener('iris:selection-info:open', selectionInfoOpenHandler);
        const missionsOpenHandler = (event: Event): void => {
            const detail = (event as CustomEvent<{ portalId?: string | null }>).detail;
            useStore.getState().setMissionsPortalId(detail?.portalId ?? null);
            setShowMissionsPopup(true);
        };
        document.addEventListener('iris:missions:open', missionsOpenHandler);
        return (): void => {
            document.removeEventListener('iris:plugin:theme:toggle', themeHandler);
            document.removeEventListener('iris:plugin:export:toggle', exportHandler);
            document.removeEventListener('iris:selection-info:open', selectionInfoOpenHandler);
            document.removeEventListener('iris:missions:open', missionsOpenHandler);
        };
    }, [toggleExportPopup, toggleThemePopup]);

    useEffect(() => {
        const handler = (event: MessageEvent<unknown>): void => {
            if (event.origin !== location.origin) return;
            if (isPageRuntimeCameraChangedMessage(event.data)) {
                const camera = event.data.camera;
                if (showMap) {
                    window.postMessage({
                        type: 'IRIS_MOVE_MAP',
                        center: {lat: camera.lat, lng: camera.lng},
                        zoom: camera.zoom,
                        bounds: event.data.bounds,
                    }, '*');
                }
                return;
            }
            if (isRecord(event.data) && event.data.type === PAGE_MAP_RUNTIME_MESSAGES.ready) {
                if (showMap) {
                    window.postMessage(buildPageRuntimeSnapshotFromStore(PAGE_MAP_RUNTIME_MESSAGES.showMap), '*');
                    pageRuntimeInitialSyncDoneRef.current = true;
                }
                return;
            }
            if (isPageRuntimeFrameBenchmarkMessage(event.data)) {
                useStore.getState().setMapPerfSnapshot(toFrameSnapshot(event.data.snapshot));
                return;
            }
            if (isPageRuntimeViewportPerformanceMessage(event.data)) {
                useStore.getState().setMapPerfSnapshot(toViewportPerformanceSnapshot(event.data.snapshot));
                return;
            }
            if (!isPageRuntimeSelectionMessage(event.data)) return;

            const selection = event.data.selection;
            const shouldOpenInfo = selection.openInfo === true;

            const store = useStore.getState();
            if (selection.kind === 'portal') {
                if (store.planningMode) {
                    store.selectPlanningPortal(selection.id);
                    setShowSelectionInfo(false);
                    return;
                }

                store.selectPortal(selection.id);
                window.postMessage({type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: selection.id}, '*');
                setActiveDrawerTab(null);
                setShowSelectionInfo(shouldOpenInfo);
            } else if (selection.kind === 'link') {
                store.selectLink(selection.id);
                setActiveDrawerTab(null);
                setShowSelectionInfo(shouldOpenInfo);
            } else if (selection.kind === 'field') {
                store.selectField(selection.id);
                setActiveDrawerTab(null);
                setShowSelectionInfo(shouldOpenInfo);
            } else if (selection.kind === 'planned-link') {
                store.selectPlannedItem(selection.id, 'link');
                setShowSelectionInfo(false);
            } else if (selection.kind === 'planned-marker') {
                store.selectPlannedItem(selection.id, 'marker');
                setShowSelectionInfo(false);
            }
        };

        window.addEventListener('message', handler);
        return (): void => window.removeEventListener('message', handler);
    }, [showMap]);

    useEffect(() => {
        const retryDelays = [
            PAGE_MAP_RUNTIME_INITIAL_SYNC_DEBOUNCE_MS,
            1000,
            2500,
        ];
        const timeouts = retryDelays.map((delay) => window.setTimeout(() => {
            window.postMessage(buildPageRuntimeSnapshotFromStore(
                pageRuntimeStartsInFullMapRef.current
                    ? PAGE_MAP_RUNTIME_MESSAGES.showMap
                    : PAGE_MAP_RUNTIME_MESSAGES.syncSnapshot
            ), '*');
            pageRuntimeInitialSyncDoneRef.current = true;
        }, delay));

        return (): void => timeouts.forEach((timeout) => window.clearTimeout(timeout));
    }, []);

    useEffect(() => {
        if (!pageRuntimeInitialSyncDoneRef.current) return;

        if (showMap) {
            window.postMessage(buildPageRuntimeSnapshotFromStore(PAGE_MAP_RUNTIME_MESSAGES.showMap), '*');
            return;
        }

        window.postMessage({type: PAGE_MAP_RUNTIME_MESSAGES.hideMap}, '*');
    }, [showMap]);

    useEffect(() => {
        if (!pageRuntimeInitialSyncDoneRef.current) return;

        const timeout = window.setTimeout(() => {
            window.postMessage(buildPageRuntimeSnapshotFromStore(PAGE_MAP_RUNTIME_MESSAGES.syncData), '*');
        }, PAGE_MAP_RUNTIME_DATA_SYNC_DEBOUNCE_MS);

        return (): void => window.clearTimeout(timeout);
    }, [
        portals,
        links,
        fields,
        artifacts,
        mockOrnaments,
        missionDetails,
        pluginFeatures,
        plannedLinks,
        plannedMarkers,
        planningMode,
        planningTool,
        planningAnchorPortalId,
        planningPortalPath,
        selectedPlannedItemId,
        plannedLinksEnabled,
        plannedShowLinks,
        plannedShowMarkers,
        layerShowOrnaments,
        layerShowArtifacts,
        filterShowResistance,
        filterShowEnlightened,
        filterShowMachina,
        filterShowUnclaimedPortals,
        filterShowLevel,
        filterShowHealth,
        filterShowVisited,
        filterShowCaptured,
        filterShowScanned,
        themeId,
    ]);

    useEffect(() => {
        if (!pageRuntimeInitialSyncDoneRef.current) return;

        const timeout = window.setTimeout(() => {
            window.postMessage({
                type: PAGE_MAP_RUNTIME_MESSAGES.syncCamera,
                camera: {
                    lat: mapState.lat,
                    lng: mapState.lng,
                    zoom: mapState.zoom,
                },
            }, '*');
        }, PAGE_MAP_RUNTIME_CAMERA_SYNC_DEBOUNCE_MS);

        return (): void => window.clearTimeout(timeout);
    }, [mapState]);

    useEffect(() => {
        if (!pageRuntimeInitialSyncDoneRef.current) return;

        window.postMessage({
            type: PAGE_MAP_RUNTIME_MESSAGES.syncLayers,
            layers: {
                portals: true,
                links: layerShowLinks,
                fields: layerShowFields,
            },
        }, '*');
    }, [layerShowLinks, layerShowFields]);

    useEffect(() => {
        if (!pageRuntimeInitialSyncDoneRef.current) return;

        window.postMessage(buildPageRuntimeSnapshotFromStore(PAGE_MAP_RUNTIME_MESSAGES.syncSelection), '*');
    }, [selectedPortalId, selectedLinkId, selectedFieldId, selectedPlannedItemId]);

    useEffect(() => {
        if (!pageRuntimeInitialSyncDoneRef.current) return;

        window.postMessage({
            type: PAGE_MAP_RUNTIME_MESSAGES.syncTiles,
            tiles: getMapThemeTiles(mapThemeId),
        }, '*');
    }, [mapThemeId]);

    if (sessionStatus === 'initial_login_required') {
        return (
            <div className="iris-overlay-root">
                <SessionAlert />
            </div>
        );
    }

    return (
        <div className="iris-overlay-root">
            <SessionAlert />
            
            <MockToolsBar />
            <PlanningBar />

            {/* Click-to-close Backdrop for Drawer */}
            {activeDrawerTab && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10009, pointerEvents: 'auto' }} 
                    onClick={() => setActiveDrawerTab(null)} 
                />
            )}

            <PortalInfoPopup visible={showSelectionInfo && !!selectedPortalId} onClose={() => setShowSelectionInfo(false)} />
            <FieldInfoPopup visible={showSelectionInfo && !!selectedFieldId} onClose={() => setShowSelectionInfo(false)} />
            <LinkInfoPopup visible={showSelectionInfo && !!selectedLinkId} onClose={() => setShowSelectionInfo(false)} />
            <MissionDetailsPopup />
            <PluginFeaturePopup />

            {showCommPopup && <CommPopup onClose={toggleCommPopup} />}
            {showMissionsPopup && <MissionsPopup onClose={toggleMissionsPopup} />}
            {showPasscodePopup && <PasscodePopup onClose={togglePasscodePopup} />}
            {showPlayerStatsPopup && <PlayerStatsPopup onClose={togglePlayerStatsPopup} />}
            {showInventoryPopup && <InventoryPopup onClose={toggleInventoryPopup} />}
            {showGameScorePopup && <GameScorePopup onClose={toggleGameScorePopup} />}
            {showRegionScorePopup && <RegionScorePopup onClose={toggleRegionScorePopup} />}
            {showExportPopup && <ExportPopup onClose={toggleExportPopup} />}
            {showDiagnosticsPopup && <DiagnosticsPopup onClose={toggleDiagnosticsPopup} />}
            {showThemePopup && <ThemePopup onClose={toggleThemePopup} />}
            {showMapSettingsPopup && <MapSettingsPopup onClose={toggleMapSettingsPopup} />}
            {showPluginsPopup && <PluginsPopup onClose={togglePluginsPopup} />}
            {showNavigationPopup && <NavigationPopup onClose={toggleNavigationPopup} />}
            {showSearchPopup && <LocationSearchPopup onClose={toggleSearchPopup} />}

            <DockDrawer 
                tab={activeDrawerTab} 
                onClose={() => setActiveDrawerTab(null)} 
                onAction={handleDrawerAction}
                showMap={showMap}
            />

            <button 
                className="iris-fab-geolocate" 
                onClick={handleGeolocate} 
                disabled={locating}
                title="Navigate to Me"
            >
                {locating ? '...' : '◎'}
            </button>

            <BottomDock 
                activeDashboard={activeDrawerTab} 
                onToggleDashboard={(tab) => setActiveDrawerTab(current => current === tab ? null : tab)} 
                isSelectionVisible={showSelectionInfo}
                onToggleSelection={() => setShowSelectionInfo(v => !v)}
            />

            <StatusBar />
        </div>
    );
}
