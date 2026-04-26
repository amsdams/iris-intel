import { h, JSX, Fragment } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { useStore } from '@iris/core';
import { MapOverlay } from './domains/map/MapOverlay';
import { PlayerStatsPopup } from './domains/player/PlayerStatsPopup';
import { DiagnosticsPopup } from './domains/debug/DiagnosticsPopup';
import { LayersPopup } from './domains/filters/LayersPopup';
import { TacticalFiltersPopup } from './domains/filters/TacticalFiltersPopup';
import { HistoryFiltersPopup } from './domains/filters/HistoryFiltersPopup';
import { PortalInfoPopup } from './domains/portal/PortalInfoPopup';
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

// ---------------------------------------------------------------------------
// IRISOverlay
// ---------------------------------------------------------------------------

export function IRISOverlay(): JSX.Element {
    const sessionStatus = useStore((state) => state.sessionStatus);
    const [showPlayerStatsPopup, setShowPlayerStatsPopup] = useState(false);
    const [showInventoryPopup, setShowInventoryPopup] = useState(false);
    const [showDiagnosticsPopup, setShowDiagnosticsPopup] = useState(false);
    const [showLayersPopup, setShowLayersPopup] = useState(false);
    const [showTacticalFiltersPopup, setShowTacticalFiltersPopup] = useState(false);
    const [showHistoryFiltersPopup, setShowHistoryFiltersPopup] = useState(false);
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
    
    const [activeDrawerTab, setActiveDrawerTab] = useState<DrawerTab>(null);
    const [locating, setLocating] = useState(false);

    const togglePlayerStatsPopup = (): void => setShowPlayerStatsPopup((v) => !v);
    const toggleInventoryPopup = (): void => {
        if (!showInventoryPopup) window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
        setShowInventoryPopup((v) => !v);
    };
    const toggleDiagnosticsPopup = (): void => setShowDiagnosticsPopup((v) => !v);
    const toggleLayersPopup = (): void => setShowLayersPopup((v) => !v);
    const toggleTacticalFiltersPopup = (): void => setShowTacticalFiltersPopup((v) => !v);
    const toggleHistoryFiltersPopup = (): void => setShowHistoryFiltersPopup((v) => !v);
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
            case 'stats': togglePlayerStatsPopup(); break;
            case 'inventory': toggleInventoryPopup(); break;
            case 'gameScore': toggleGameScorePopup(); break;
            case 'regionScore': toggleRegionScorePopup(); break;
            case 'comm': toggleCommPopup(); break;
            case 'passcodes': togglePasscodePopup(); break;
            case 'search': toggleSearchPopup(); break;
            case 'nav': toggleNavigationPopup(); break;
            case 'missions': toggleMissionsPopup(); break;
            case 'layers': toggleLayersPopup(); break;
            case 'plugins': togglePluginsPopup(); break;
            case 'settings': toggleMapSettingsPopup(); break;
            case 'diag': toggleDiagnosticsPopup(); break;
            case 'toggle': toggleMapVisibility(); break;
        }
    };

    useEffect(() => {
        const themeHandler = (): void => toggleThemePopup();
        const exportHandler = (): void => toggleExportPopup();
        document.addEventListener('iris:plugin:theme:toggle', themeHandler);
        document.addEventListener('iris:plugin:export:toggle', exportHandler);
        const missionsOpenHandler = (event: Event): void => {
            const detail = (event as CustomEvent<{ portalId?: string | null }>).detail;
            useStore.getState().setMissionsPortalId(detail?.portalId ?? null);
            setShowMissionsPopup(true);
        };
        document.addEventListener('iris:missions:open', missionsOpenHandler);
        return (): void => {
            document.removeEventListener('iris:plugin:theme:toggle', themeHandler);
            document.removeEventListener('iris:plugin:export:toggle', exportHandler);
            document.removeEventListener('iris:missions:open', missionsOpenHandler);
        };
    }, [toggleExportPopup, toggleThemePopup]);

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
            
            <div style={{ display: showMap ? 'block' : 'none' }}>
                <MapOverlay />
            </div>

            {/* Click-to-close Backdrop for Drawer */}
            {activeDrawerTab && (
                <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10009, pointerEvents: 'auto' }} 
                    onClick={() => setActiveDrawerTab(null)} 
                />
            )}

            <PortalInfoPopup />
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
            {showLayersPopup && <LayersPopup onClose={toggleLayersPopup} />}
            {showTacticalFiltersPopup && <TacticalFiltersPopup onClose={toggleTacticalFiltersPopup} />}
            {showHistoryFiltersPopup && <HistoryFiltersPopup onClose={toggleHistoryFiltersPopup} />}
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
                style={{ bottom: activeDrawerTab ? '48vh' : '100px', transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
                {locating ? '...' : '◎'}
            </button>

            <BottomDock 
                activeDashboard={activeDrawerTab} 
                onToggleDashboard={(tab) => setActiveDrawerTab(current => current === tab ? null : tab)} 
            />

            <StatusBar />
        </div>
    );
}
