import { h, Fragment } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { MapOverlay } from './MapOverlay';
import { Topbar } from './Topbar';
import { PlayerStatsPopup } from './PlayerStatsPopup';
import { StateDebugPopup } from './StateDebugPopup';
import { FiltersPopup } from './FiltersPopup';
import { PortalInfoPopup } from './PortalInfoPopup';
import { CommPopup } from './CommPopup';
import { ThemePopup } from '../../../../plugins/src/theme-selector/ThemePopup';
import { PluginsPopup } from './PluginsPopup';
import { StatusBar } from './StatusBar';

// ---------------------------------------------------------------------------
// IRISOverlay
// ---------------------------------------------------------------------------

export function IRISOverlay() {
    const [showPlayerStatsPopup, setShowPlayerStatsPopup] = useState(false);
    const [showStateDebugPopup, setShowStateDebugPopup] = useState(false);
    const [showFiltersPopup, setShowFiltersPopup] = useState(false);
    const [showCommPopup, setShowCommPopup] = useState(false);
    const [showThemePopup, setShowThemePopup] = useState(false);
    const [showPluginsPopup, setShowPluginsPopup] = useState(false);
    const [showMap, setShowMap] = useState(true);

    const togglePlayerStatsPopup = () => setShowPlayerStatsPopup(!showPlayerStatsPopup);
    const toggleStateDebugPopup = () => setShowStateDebugPopup(!showStateDebugPopup);
    const toggleFiltersPopup = () => setShowFiltersPopup(!showFiltersPopup);
    const toggleCommPopup = () => setShowCommPopup(!showCommPopup);
    const toggleThemePopup = () => setShowThemePopup((v) => !v);
    const togglePluginsPopup = () => setShowPluginsPopup(!showPluginsPopup);
    const toggleMapVisibility = () => setShowMap(!showMap);

    useEffect(() => {
        const handler = () => toggleThemePopup();
        document.addEventListener('iris:plugin:theme:toggle', handler);
        return () => document.removeEventListener('iris:plugin:theme:toggle', handler);
    }, []);

    return (
        <Fragment>
            <Topbar
                onTogglePlayerStats={togglePlayerStatsPopup}
                onToggleStateDebug={toggleStateDebugPopup}
                onToggleFiltersPopup={toggleFiltersPopup}
                onToggleComm={toggleCommPopup}
                onTogglePlugins={togglePluginsPopup}
                onToggleMapVisibility={toggleMapVisibility}
                showMap={showMap}
            />
            <div style={{ display: showMap ? 'block' : 'none' }}>
                <MapOverlay />
            </div>

            <PortalInfoPopup />

            {showCommPopup && (
                <CommPopup onClose={toggleCommPopup} />
            )}

            {showPlayerStatsPopup && (
                <PlayerStatsPopup onClose={togglePlayerStatsPopup} />
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

            {showPluginsPopup && (
                <PluginsPopup onClose={togglePluginsPopup} />
            )}

            <StatusBar />
        </Fragment>
    );
}
