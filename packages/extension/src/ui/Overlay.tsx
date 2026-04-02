import { h, JSX } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { useStore } from '@iris/core';
import { MapOverlay } from './domains/map/MapOverlay';
import { Topbar } from './shared/Topbar';
import { PlayerStatsPopup } from './domains/player/PlayerStatsPopup';
import { StateDebugPopup } from './domains/debug/StateDebugPopup';
import { FiltersPopup } from './domains/filters/FiltersPopup';
import { PortalInfoPopup } from './domains/portal/PortalInfoPopup';
import { CommPopup } from './domains/comm/CommPopup';
import { GameScorePopup } from './domains/scores/GameScorePopup';
import { RegionScorePopup } from './domains/scores/RegionScorePopup';
import { ExportPopup } from '../../../plugins/src/export-data/ExportPopup';
import { ThemePopup } from '../../../plugins/src/theme-selector/ThemePopup';
import { MapThemePopup } from './domains/map/MapThemePopup';
import { PluginsPopup } from './domains/plugins/PluginsPopup';
import { StatusBar } from './domains/status/StatusBar';
import { SessionAlert } from './domains/status/SessionAlert';
import { PluginFeaturePopup } from './domains/plugins/PluginFeaturePopup';
import { InventoryPopup } from './domains/inventory/InventoryPopup';
import { MissionDetailsPopup } from './domains/missions/MissionDetailsPopup';
import { MissionsPopup } from './domains/missions/MissionsPopup';
import { PasscodePopup } from './domains/passcodes/PasscodePopup';

// ---------------------------------------------------------------------------
// IRISOverlay
// ---------------------------------------------------------------------------

export function IRISOverlay(): JSX.Element {
    const sessionStatus = useStore((state) => state.sessionStatus);
    const [showPlayerStatsPopup, setShowPlayerStatsPopup] = useState(false);
    const [showInventoryPopup, setShowInventoryPopup] = useState(false);
    const [showStateDebugPopup, setShowStateDebugPopup] = useState(false);
    const [showFiltersPopup, setShowFiltersPopup] = useState(false);
    const [showCommPopup, setShowCommPopup] = useState(false);
    const [showThemePopup, setShowThemePopup] = useState(false);
    const [showMapThemePopup, setShowMapThemePopup] = useState(false);
    const [showPluginsPopup, setShowPluginsPopup] = useState(false);
    const [showGameScorePopup, setShowGameScorePopup] = useState(false);
    const [showRegionScorePopup, setShowRegionScorePopup] = useState(false);
    const [showExportPopup, setShowExportPopup] = useState(false);
    const [showMap, setShowMap] = useState(true);
    const [showMissionsPopup, setShowMissionsPopup] = useState(false);
    const [showPasscodePopup, setShowPasscodePopup] = useState(false);

    const togglePlayerStatsPopup = (): void => setShowPlayerStatsPopup((value) => !value);
    const toggleInventoryPopup = (): void => {
        if (!showInventoryPopup) {
            window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
        }
        setShowInventoryPopup((value) => !value);
    };
    const toggleStateDebugPopup = (): void => setShowStateDebugPopup((value) => !value);
    const toggleFiltersPopup = (): void => setShowFiltersPopup((value) => !value);
    const toggleCommPopup = (): void => setShowCommPopup((value) => !value);
    const toggleThemePopup = useCallback((): void => setShowThemePopup((value) => !value), []);
    const toggleMapThemePopup = (): void => setShowMapThemePopup((value) => !value);
    const togglePluginsPopup = (): void => setShowPluginsPopup((value) => !value);
    const toggleGameScorePopup = (): void => {
        if (!showGameScorePopup) {
            window.postMessage({ type: 'IRIS_GAME_SCORE_REQUEST' }, '*');
        }
        setShowGameScorePopup((value) => !value);
    };
    const toggleRegionScorePopup = (): void => {
        if (!showRegionScorePopup) {
            const { lat, lng } = useStore.getState().mapState;
            window.postMessage({ 
                type: 'IRIS_REGION_SCORE_REQUEST',
                lat, 
                lng 
            }, '*');
        }
        setShowRegionScorePopup((value) => !value);
    };
    const toggleExportPopup = useCallback((): void => setShowExportPopup((value) => !value), []);
    const toggleMapVisibility = (): void => setShowMap((value) => !value);
    const togglePasscodePopup = (): void => {
        if (!showPasscodePopup) {
            useStore.getState().clearPasscodeRedeemState();
        }
        setShowPasscodePopup((value) => !value);
    };
    const toggleMissionsPopup = (): void => {
        if (!showMissionsPopup) {
            useStore.getState().setMissionsPortalId(null);
        }
        setShowMissionsPopup((value) => !value);
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
            <Topbar
                onTogglePlayerStats={togglePlayerStatsPopup}
                onToggleInventory={toggleInventoryPopup}
                onToggleStateDebug={toggleStateDebugPopup}
                onToggleFiltersPopup={toggleFiltersPopup}
                onToggleComm={toggleCommPopup}
                onTogglePlugins={togglePluginsPopup}
                onToggleMissions={toggleMissionsPopup}
                onToggleMapVisibility={toggleMapVisibility}
                onToggleMapTheme={toggleMapThemePopup}
                onToggleGameScore={toggleGameScorePopup}
                onToggleRegionScore={toggleRegionScorePopup}
                onTogglePasscodes={togglePasscodePopup}
                showMap={showMap}
            />
            <div style={{ display: showMap ? 'block' : 'none' }}>
                <MapOverlay />
            </div>

            <PortalInfoPopup />
            <MissionDetailsPopup />
            <PluginFeaturePopup />

            {showCommPopup && (
                <CommPopup onClose={toggleCommPopup} />
            )}

            {showMissionsPopup && (
                <MissionsPopup onClose={toggleMissionsPopup} />
            )}

            {showPasscodePopup && (
                <PasscodePopup onClose={togglePasscodePopup} />
            )}

            {showPlayerStatsPopup && (
                <PlayerStatsPopup onClose={togglePlayerStatsPopup} />
            )}

            {showInventoryPopup && (
                <InventoryPopup onClose={toggleInventoryPopup} />
            )}

            {showGameScorePopup && (
                <GameScorePopup onClose={toggleGameScorePopup} />
            )}

            {showRegionScorePopup && (
                <RegionScorePopup onClose={toggleRegionScorePopup} />
            )}

            {showExportPopup && (
                <ExportPopup onClose={toggleExportPopup} />
            )}

            {showStateDebugPopup && (
                <StateDebugPopup onClose={toggleStateDebugPopup} />
            )}

            {showFiltersPopup && (
                <FiltersPopup onClose={toggleFiltersPopup} />
            )}

            {showThemePopup && (
                <ThemePopup onClose={toggleThemePopup} />
            )}

            {showMapThemePopup && (
                <MapThemePopup onClose={toggleMapThemePopup} />
            )}

            {showPluginsPopup && (
                <PluginsPopup onClose={togglePluginsPopup} />
            )}

            <StatusBar />
        </div>
    );
}
