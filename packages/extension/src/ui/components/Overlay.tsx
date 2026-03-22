import { h, Fragment } from 'preact';
import { useState } from 'preact/hooks';
import { MapOverlay } from './MapOverlay';
import { Topbar } from './Topbar';
import { PlayerStatsPopup } from './PlayerStatsPopup';
import { StateDebugPopup } from './StateDebugPopup';
import { FiltersPopup } from './FiltersPopup';
import { PortalInfoPopup } from './PortalInfoPopup';
import { CommPopup } from './CommPopup';

// ---------------------------------------------------------------------------
// IRISOverlay
// ---------------------------------------------------------------------------

export function IRISOverlay() {
    const [showPlayerStatsPopup, setShowPlayerStatsPopup] = useState(false);
    const [showStateDebugPopup, setShowStateDebugPopup] = useState(false);
    const [showFiltersPopup, setShowFiltersPopup] = useState(false);
    const [showCommPopup, setShowCommPopup] = useState(false);
    const [showMap, setShowMap] = useState(true);

    const togglePlayerStatsPopup = () => setShowPlayerStatsPopup(!showPlayerStatsPopup);
    const toggleStateDebugPopup = () => setShowStateDebugPopup(!showStateDebugPopup);
    const toggleFiltersPopup = () => setShowFiltersPopup(!showFiltersPopup);
    const toggleCommPopup = () => setShowCommPopup(!showCommPopup);
    const toggleMapVisibility = () => setShowMap(!showMap);

    return (
        <Fragment>
            <Topbar
                onTogglePlayerStats={togglePlayerStatsPopup}
                onToggleStateDebug={toggleStateDebugPopup}
                onToggleFiltersPopup={toggleFiltersPopup}
                onToggleComm={toggleCommPopup}
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
        </Fragment>
    );
}
