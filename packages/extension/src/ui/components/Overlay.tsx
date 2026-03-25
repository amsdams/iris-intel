import { h } from 'preact';
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

    const loginRequired = useStore((state) => state.loginRequired);

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

    const handleLogin = () => {
        // Broad search for any login-related link/button on Intel landing page
        const loginBtn = document.querySelector('#google_login, a[href*="/login"], a[href*="signin"], #login-container a, .login-button, .button_link') as HTMLElement;
        if (loginBtn) {
            loginBtn.click();
        } else {
            // If IRIS is overlaid on the landing page but we can't find the button,
            // direct the browser to the standard login path.
            window.location.href = '/intel';
        }
    };

    useEffect(() => {
        const themeHandler = () => toggleThemePopup();
        const exportHandler = () => toggleExportPopup();
        
        document.addEventListener('iris:plugin:theme:toggle', themeHandler);
        document.addEventListener('iris:plugin:export:toggle', exportHandler);
        
        return () => {
            document.removeEventListener('iris:plugin:theme:toggle', themeHandler);
            document.removeEventListener('iris:plugin:export:toggle', exportHandler);
        };
    }, []);

    if (loginRequired) {
        return (
            <div className="iris-overlay-root" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: 'rgba(0,0,0,0.85)',
                pointerEvents: 'auto'
            }}>
                <div style={{
                    padding: '40px',
                    border: '2px solid #00ffff',
                    borderRadius: '10px',
                    textAlign: 'center',
                    backgroundColor: '#000',
                    boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)'
                }}>
                    <h1 style={{ color: '#00ffff', marginBottom: '20px' }}>IRIS</h1>
                    <p style={{ color: '#fff', marginBottom: '30px' }}>Authentication Required</p>
                    <button 
                        onClick={handleLogin}
                        style={{
                            padding: '12px 24px',
                            fontSize: '1.2em',
                            fontWeight: 'bold',
                            backgroundColor: '#00ffff',
                            color: '#000',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer'
                        }}
                    >
                        LOGIN TO INGRESS INTEL
                    </button>
                    <p style={{ color: '#666', marginTop: '20px', fontSize: '0.8em' }}>
                        Click to use the original Intel login page.
                    </p>
                </div>
            </div>
        );
    }

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
