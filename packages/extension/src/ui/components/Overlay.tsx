import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '@iris/core';
import { MapOverlay } from './MapOverlay';
import { Topbar } from './Topbar';
import { PlayerStatsPopup } from './PlayerStatsPopup';
import { StateDebugPopup } from './StateDebugPopup';
import { FiltersPopup } from './FiltersPopup';
import { PortalInfoPopup } from './PortalInfoPopup';
import { CommPopup } from './CommPopup';
import { GameScorePopup } from './GameScorePopup';
import { RegionScorePopup } from './RegionScorePopup';
import { ExportPopup } from '../../../../plugins/src/export-data/ExportPopup';
import { ThemePopup } from '../../../../plugins/src/theme-selector/ThemePopup';
import { MapThemePopup } from './MapThemePopup';
import { PluginsPopup } from './PluginsPopup';
import { StatusBar } from './StatusBar';
import { PluginFeaturePopup } from './PluginFeaturePopup';

// ---------------------------------------------------------------------------
// IRISOverlay
// ---------------------------------------------------------------------------

export function IRISOverlay() {
    const [showPlayerStatsPopup, setShowPlayerStatsPopup] = useState(false);
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

    const togglePlayerStatsPopup = () => setShowPlayerStatsPopup(!showPlayerStatsPopup);
    const toggleStateDebugPopup = () => setShowStateDebugPopup(!showStateDebugPopup);
    const toggleFiltersPopup = () => setShowFiltersPopup(!showFiltersPopup);
    const toggleCommPopup = () => setShowCommPopup(!showCommPopup);
    const toggleThemePopup = () => setShowThemePopup((v) => !v);
    const toggleMapThemePopup = () => setShowMapThemePopup(!showMapThemePopup);
    const togglePluginsPopup = () => setShowPluginsPopup(!showPluginsPopup);
    const toggleGameScorePopup = () => {
        if (!showGameScorePopup) {
            window.postMessage({ type: 'IRIS_GAME_SCORE_FETCH' }, '*');
        }
        setShowGameScorePopup(!showGameScorePopup);
    };
    const toggleRegionScorePopup = () => {
        if (!showRegionScorePopup) {
            const { lat, lng } = useStore.getState().mapState;
            window.postMessage({ 
                type: 'IRIS_REGION_SCORE_REQUEST',
                lat, 
                lng 
            }, '*');
        }
        setShowRegionScorePopup(!showRegionScorePopup);
    };
    const toggleExportPopup = () => setShowExportPopup(!showExportPopup);
    const toggleMapVisibility = () => setShowMap(!showMap);

    useEffect(() => {
        const themeHandler = () => toggleThemePopup();
        const exportHandler = () => toggleExportPopup();
        
        document.addEventListener('iris:plugin:theme:toggle', themeHandler);
        document.addEventListener('iris:plugin:export:toggle', exportHandler);

        // Periodic COMM refresh (every 120s) matching original Intel
        const commInterval = setInterval(() => {
            const activeTab = useStore.getState().activeCommTab;
            window.postMessage({ 
                type: 'IRIS_PLEXTS_REQUEST', 
                minTimestampMs: -1,
                tab: activeTab.toLowerCase()
            }, '*');
        }, 120000);
        
        return () => {
            document.removeEventListener('iris:plugin:theme:toggle', themeHandler);
            document.removeEventListener('iris:plugin:export:toggle', exportHandler);
            clearInterval(commInterval);
        };
    }, []);

    return (
        <div className="iris-overlay-root">
            <Topbar
                onTogglePlayerStats={togglePlayerStatsPopup}
                onToggleStateDebug={toggleStateDebugPopup}
                onToggleFiltersPopup={toggleFiltersPopup}
                onToggleComm={toggleCommPopup}
                onTogglePlugins={togglePluginsPopup}
                onToggleMapVisibility={toggleMapVisibility}
                onToggleMapTheme={toggleMapThemePopup}
                onToggleGameScore={toggleGameScorePopup}
                onToggleRegionScore={toggleRegionScorePopup}
                showMap={showMap}
            />
            <div style={{ display: showMap ? 'block' : 'none' }}>
                <MapOverlay />
            </div>

            <PortalInfoPopup />
            <PluginFeaturePopup />

            {showCommPopup && (
                <CommPopup onClose={toggleCommPopup} />
            )}

            {showPlayerStatsPopup && (
                <PlayerStatsPopup onClose={togglePlayerStatsPopup} />
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
