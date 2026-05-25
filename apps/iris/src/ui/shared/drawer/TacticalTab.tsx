import { h, JSX, Fragment } from 'preact';
import { EntityLogic, PORTAL_HISTORY_KEYS, useStore, type PortalHistoryKey, type PortalHistoryMode } from '@iris/core';
import {DrawerButton, DrawerSection} from './DrawerControls';

interface TacticalTabProps {
    onAction: (action: string) => void;
}

interface ActivePlayerRow {
    id: string;
    name: string;
    team: string;
    color: string;
    lat: number;
    lng: number;
    time: number | null;
    portalName: string;
    actionText: string;
    distanceKm: number;
    feature: GeoJSON.Feature;
}

const MIN_PLAYER_TRACKER_ZOOM = 9;
const HISTORY_RING_LABELS: Record<PortalHistoryKey, string> = {
    visited: 'Visited',
    captured: 'Captured',
    scanned: 'Scanned',
};
const HISTORY_RING_MODE_LABELS: Record<PortalHistoryMode, string> = {
    off: 'Off',
    highlight: 'On',
    inverse: 'Inv',
};

function isPlayerMarkerFeature(feature: GeoJSON.Feature): boolean {
    const properties = feature.properties as Record<string, unknown> | null | undefined;
    return properties?.isPlayerMarker === true || properties?.isPlayerMarker === 'true';
}

function getStringProperty(properties: GeoJSON.GeoJsonProperties, key: string, fallback = ''): string {
    const record = properties as Record<string, unknown> | null | undefined;
    const value = record?.[key];
    return typeof value === 'string' ? value : fallback;
}

function getNumberProperty(properties: GeoJSON.GeoJsonProperties, key: string): number | null {
    const record = properties as Record<string, unknown> | null | undefined;
    const value = record?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isPlayerAction(value: unknown): value is {text: string; time?: number} {
    if (typeof value !== 'object' || value === null) return false;
    const record = value as Record<string, unknown>;
    return typeof record.text === 'string' &&
        (record.time === undefined || typeof record.time === 'number');
}

function getActionText(properties: GeoJSON.GeoJsonProperties): string {
    const record = properties as Record<string, unknown> | null | undefined;
    const actions = record?.actions;
    if (Array.isArray(actions)) {
        const latestAction = actions
            .filter(isPlayerAction)
            .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))[0];
        if (latestAction?.text) return latestAction.text;
    }

    const label = getStringProperty(properties, 'label');
    const name = getStringProperty(properties, 'name');
    return label && name ? label.replace(name, '').replace(/^,\s*/, '').trim() : '';
}

function formatAgo(time: number | null): string {
    if (time === null) return '-';
    const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours < 24) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
}

function formatDistance(distanceKm: number): string {
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m`;
    if (distanceKm < 10) return `${distanceKm.toFixed(1)}km`;
    return `${Math.round(distanceKm)}km`;
}

export function TacticalTab({ onAction }: TacticalTabProps): JSX.Element {
    const filterShowResistance = useStore((state) => state.filterShowResistance);
    const toggleFilterResistance = useStore((state) => state.toggleFilterResistance);
    const filterShowEnlightened = useStore((state) => state.filterShowEnlightened);
    const toggleFilterEnlightened = useStore((state) => state.toggleFilterEnlightened);
    const filterShowMachina = useStore((state) => state.filterShowMachina);
    const toggleFilterMachina = useStore((state) => state.toggleFilterMachina);
    const filterShowUnclaimedPortals = useStore((state) => state.filterShowUnclaimedPortals);
    const toggleFilterUnclaimedPortals = useStore((state) => state.toggleFilterUnclaimedPortals);
    
    const filterShowLevel = useStore((state) => state.filterShowLevel);
    const toggleFilterLevel = useStore((state) => state.toggleFilterLevel);
    const filterShowHealth = useStore((state) => state.filterShowHealth);
    const toggleFilterHealth = useStore((state) => state.toggleFilterHealth);
    const portalHistoryLayers = useStore((state) => state.portalHistoryLayers);
    const togglePortalHistoryLayer = useStore((state) => state.togglePortalHistoryLayer);
    
    const filterShowVisited = useStore((state) => state.filterShowVisited);
    const toggleFilterVisited = useStore((state) => state.toggleFilterVisited);
    const filterShowCaptured = useStore((state) => state.filterShowCaptured);
    const toggleFilterCaptured = useStore((state) => state.toggleFilterCaptured);
    const filterShowScanned = useStore((state) => state.filterShowScanned);
    const toggleFilterScanned = useStore((state) => state.toggleFilterScanned);
    const resetTacticalFilters = useStore((state) => state.resetTacticalFilters);
    const pluginFeatures = useStore((state) => state.pluginFeatures);
    const mapState = useStore((state) => state.mapState);
    const playerTrackerEnabled = useStore((state) => state.pluginStates['player-tracker'] ?? false);
    const playerTrackerVisible = useStore((state) => state.activeVisualOverlayIds.includes('player-tracker'));

    const activePlayers = pluginFeatures.features
        .filter(isPlayerMarkerFeature)
        .flatMap((feature): ActivePlayerRow[] => {
            if (feature.geometry.type !== 'Point') return [];
            const [lng, lat] = feature.geometry.coordinates;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

            const properties = feature.properties;
            const id = getStringProperty(properties, 'id', typeof feature.id === 'string' ? feature.id : '');
            const name = getStringProperty(properties, 'name', id.replace(/^player:/u, '') || 'Unknown Player');
            const team = getStringProperty(properties, 'team', 'UNKNOWN');
            const color = getStringProperty(properties, 'color', '#ffffff');
            const time = getNumberProperty(properties, 'time');
            const portalName = getStringProperty(properties, 'portalName');
            const actionText = getActionText(properties);

            return [{
                id: id || `player:${name}`,
                name,
                team,
                color,
                lat,
                lng,
                time,
                portalName,
                actionText,
                distanceKm: EntityLogic.getDistKm(mapState.lat, mapState.lng, lat, lng),
                feature,
            }];
        })
        .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
        .slice(0, 12);

    const navigateToPlayer = (player: ActivePlayerRow): void => {
        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center: {lat: player.lat, lng: player.lng},
            zoom: Math.max(mapState.zoom, 16),
        }, '*');
        onAction('active-player-map-focus');
    };

    return (
        <Fragment>
            {playerTrackerEnabled && playerTrackerVisible && (
                <Fragment>
                    <div className="iris-drawer-section-label">Active Players</div>
                    {mapState.zoom < MIN_PLAYER_TRACKER_ZOOM ? (
                        <div className="iris-drawer-empty-note">
                            Player Tracker is hidden below z{MIN_PLAYER_TRACKER_ZOOM}.
                        </div>
                    ) : activePlayers.length === 0 ? (
                        <div className="iris-drawer-empty-note">
                            No recent player activity loaded.
                        </div>
                    ) : (
                        <div className="iris-active-player-list iris-ui-list">
                            {activePlayers.map((player) => (
                                <button
                                    key={player.id}
                                    type="button"
                                    className="iris-active-player-row iris-ui-list-row"
                                    onClick={() => navigateToPlayer(player)}
                                >
                                    <span className="iris-active-player-swatch" style={{'--iris-active-player-color': player.color} as JSX.CSSProperties} />
                                    <span className="iris-active-player-main iris-ui-list-main">
                                        <span className="iris-active-player-name iris-ui-list-title">{player.name}</span>
                                        <span className="iris-active-player-detail iris-ui-list-meta">
                                            {player.portalName || player.actionText || `${player.lat.toFixed(5)}, ${player.lng.toFixed(5)}`}
                                        </span>
                                    </span>
                                    <span className="iris-active-player-meta">
                                        <span>{formatAgo(player.time)}</span>
                                        <span>{formatDistance(player.distanceKm)}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </Fragment>
            )}

            <DrawerSection label="Filter Actions">
                <DrawerButton icon="↺" label="Clear All" onClick={resetTacticalFilters} />
            </DrawerSection>

            <DrawerSection label="Faction Filters" scroll>
                <DrawerButton active={filterShowEnlightened} icon="💚" label="ENL" onClick={toggleFilterEnlightened} />
                <DrawerButton active={filterShowResistance} icon="💙" label="RES" onClick={toggleFilterResistance} />
                <DrawerButton active={filterShowMachina} icon="❤️" label="MAC" onClick={toggleFilterMachina} />
                <DrawerButton active={filterShowUnclaimedPortals} icon="🤍" label="NEU" onClick={toggleFilterUnclaimedPortals} />
            </DrawerSection>

            <DrawerSection label="Level Filters" scroll>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                    <DrawerButton key={l} active={filterShowLevel[l]} label={`L${l}`} onClick={() => toggleFilterLevel(l)} />
                ))}
            </DrawerSection>

            <DrawerSection label="Health Filters" scroll>
                {[25, 50, 75, 100].map(h => (
                    <DrawerButton key={h} active={filterShowHealth[h]} label={`${h}%`} onClick={() => toggleFilterHealth(h)} />
                ))}
            </DrawerSection>

            <DrawerSection label="History Rings" scroll>
                {PORTAL_HISTORY_KEYS.map((key) => {
                    const mode = portalHistoryLayers[key];
                    return (
                        <DrawerButton
                            key={key}
                            active={mode !== 'off'}
                            label={`${HISTORY_RING_LABELS[key]}: ${HISTORY_RING_MODE_LABELS[mode]}`}
                            onClick={() => togglePortalHistoryLayer(key)}
                        />
                    );
                })}
            </DrawerSection>

            <DrawerSection label="History Filters" scroll>
                <DrawerButton
                    active={filterShowVisited !== 'ALL'}
                    label={`Visited: ${filterShowVisited === 'ALL' ? 'All' : (filterShowVisited === 'TRUE' ? 'Yes' : 'No')}`}
                    onClick={toggleFilterVisited}
                />
                <DrawerButton
                    active={filterShowCaptured !== 'ALL'}
                    label={`Captured: ${filterShowCaptured === 'ALL' ? 'All' : (filterShowCaptured === 'TRUE' ? 'Yes' : 'No')}`}
                    onClick={toggleFilterCaptured}
                />
                <DrawerButton
                    active={filterShowScanned !== 'ALL'}
                    label={`Scanned: ${filterShowScanned === 'ALL' ? 'All' : (filterShowScanned === 'TRUE' ? 'Yes' : 'No')}`}
                    onClick={toggleFilterScanned}
                />
            </DrawerSection>
        </Fragment>
    );
}
