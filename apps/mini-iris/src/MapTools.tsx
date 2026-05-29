import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { PortalHistoryKey, PortalHistoryLayerState, PortalHistoryMode } from './portalHistory';
import { PORTAL_HISTORY_COLORS } from './portalHistory';
import { INGRESS_COLORS, ITEM_LEVEL_COLORS } from './MapConstants';
import { postMiniPageMapCommand } from './pageMapProtocol';
import {
    buildSearchHighlight,
    centerFromBounds,
    combineBounds,
    estimateLocationSearchZoom,
    parseNominatimBounds,
    type NominatimResult,
} from './locationSearch';
import amsterdamNominatimResults from './fixtures/nominatim-amsterdam-nederland.json';
import damrakNominatimResults from './fixtures/nominatim-amsterdam-damrak.json';

interface MapToolsProps {
    openDrawer: string | null;
    diagnosticsOpen: boolean;
    onToggle: (id: string) => void;
    onDiagnosticsToggle: () => void;
    onNav: (action: string) => void;
    onStyle: (style: string) => void;
    onMode: (mode: string) => void;
    portalHistoryLayers: PortalHistoryLayerState;
    onPortalHistoryLayerToggle: (key: PortalHistoryKey) => void;
    keyOverlayEnabled: boolean;
    onKeyOverlayToggle: () => void;
    artifactsEnabled: boolean;
    onArtifactsToggle: () => void;
    ornamentsEnabled: boolean;
    onOrnamentsToggle: () => void;
    portalLevelColorEnabled: boolean;
    onPortalLevelColorToggle: () => void;
    portalHealthColorEnabled: boolean;
    onPortalHealthColorToggle: () => void;
}

const HISTORY_LAYER_LABELS: Record<PortalHistoryKey, string> = {
    visited: 'V',
    captured: 'C',
    scanned: 'S',
};

const HISTORY_MODE_LABELS: Record<PortalHistoryMode, string> = {
    off: 'Off',
    highlight: 'On',
    inverse: 'Inv',
};

const FIXTURE_LOCATION_RESULTS: Record<string, {label: string; title: string; results: NominatimResult[]}> = {
    amsterdam: {
        label: 'Amsterdam',
        title: 'Show captured Amsterdam Nederland Nominatim results',
        results: amsterdamNominatimResults as NominatimResult[],
    },
    damrak: {
        label: 'Damrak',
        title: 'Show captured Amsterdam Damrak Nominatim results',
        results: damrakNominatimResults as NominatimResult[],
    },
};

function parseCoordinateQuery(value: string): {lat: number; lng: number} | null {
    const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return {lat, lng};
}

function publishLocationResults(results: NominatimResult[]): void {
    const bounds = combineBounds(results.map(parseNominatimBounds).filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null));
    const first = results[0];
    const center = bounds
        ? centerFromBounds(bounds)
        : {lat: Number(first.lat), lng: Number(first.lon)};
    const dimensions = {width: window.innerWidth, height: window.innerHeight};
    const zoom = estimateLocationSearchZoom(bounds, dimensions);

    postMiniPageMapCommand({action: 'sync-search-highlight', data: buildSearchHighlight(results)});
    postMiniPageMapCommand({action: 'fly-to', lat: center.lat, lng: center.lng, zoom, duration: 350});
}

function publishCoordinateResult(lat: number, lng: number): void {
    postMiniPageMapCommand({
        action: 'sync-search-highlight',
        data: {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {id: 'mini-search:coordinate', label: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, type: 'coordinate'},
                geometry: {type: 'Point', coordinates: [lng, lat]},
            }],
        },
    });
    postMiniPageMapCommand({action: 'fly-to', lat, lng, zoom: 15, duration: 350});
}

function clearLocationResults(): void {
    postMiniPageMapCommand({action: 'sync-search-highlight', data: {type: 'FeatureCollection', features: []}});
}

function formatFixtureOption(result: NominatimResult, index: number): string {
    const parts = result.display_name.split(',').map((part) => part.trim()).filter(Boolean);
    const context = parts.slice(1, 3).join(', ');
    return `${index + 1}. ${result.type}${context ? ` - ${context}` : ''}`;
}

function historyButtonStyle(mode: PortalHistoryMode, color: string): h.JSX.CSSProperties {
    const isOff = mode === 'off';
    const isInverse = mode === 'inverse';
    return {
        width: '42px',
        height: '36px',
        background: isOff ? 'rgba(40,40,40,0.9)' : (isInverse ? `${color}10` : `${color}22`),
        color: isOff ? '#777' : color,
        border: `${isInverse ? 2 : 1}px ${isInverse ? 'dashed' : 'solid'} ${isOff ? '#555' : color}`,
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1px',
        pointerEvents: 'auto',
        boxShadow: isInverse ? `0 0 10px ${color}33 inset` : 'none',
    };
}

export function MapTools({ openDrawer, diagnosticsOpen, onToggle, onDiagnosticsToggle, onNav, onStyle, onMode, portalHistoryLayers, onPortalHistoryLayerToggle, keyOverlayEnabled, onKeyOverlayToggle, artifactsEnabled, onArtifactsToggle, ornamentsEnabled, onOrnamentsToggle, portalLevelColorEnabled, onPortalLevelColorToggle, portalHealthColorEnabled, onPortalHealthColorToggle }: MapToolsProps): JSX.Element {
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);

    const runSearch = async (): Promise<void> => {
        const trimmed = searchQuery.trim();
        if (!trimmed || searching) return;

        const coords = parseCoordinateQuery(trimmed);
        if (coords) {
            setSearchError('');
            setSearchResults([]);
            publishCoordinateResult(coords.lat, coords.lng);
            return;
        }

        setSearching(true);
        setSearchError('');
        setSearchResults([]);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}&format=json&limit=5&polygon_geojson=1`,
                {headers: {'Accept-Language': 'en'}}
            );
            const results = await response.json() as NominatimResult[];
            if (results.length === 0) {
                setSearchError('Not found');
                return;
            }
            if (results.length === 1) {
                publishLocationResults(results);
                return;
            }
            setSearchResults(results);
        } catch {
            setSearchError('Search failed');
        } finally {
            setSearching(false);
        }
    };

    return (
        <div id="map-tools-container" style={{ position: 'fixed', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', zIndex: 2000001, pointerEvents: 'none' }}>
            
            {/* Navigation Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('nav')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto', boxShadow: '0 0 10px rgba(0,255,255,0.2)' }}>🧭</div>
                <div className="drawer-content" style={{ display: openDrawer === 'nav' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    {['🎯', 'R', '+', '-', '↑', '↓', '←', '→'].map(l => (
                        <div key={l} className="debug-btn" onClick={() => onNav(l)} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>{l}</div>
                    ))}
                </div>
            </div>

            {/* Places Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('places')} title="Search places" style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>LOC</div>
                <div className="drawer-content" style={{ display: openDrawer === 'places' ? 'flex' : 'none', flexDirection: 'column', gap: '6px', width: 'min(280px, calc(100vw - 70px))', padding: '8px', background: 'rgba(20,20,20,0.94)', borderRadius: '8px', border: '1px solid #00ffff', pointerEvents: 'auto' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                            value={searchQuery}
                            onInput={(event): void => setSearchQuery((event.target as HTMLInputElement).value)}
                            onKeyDown={(event): void => {
                                if (event.key === 'Enter') void runSearch();
                            }}
                            placeholder="Place or lat,lng"
                            style={{ flex: 1, minWidth: 0, height: '32px', background: 'rgba(0,0,0,0.45)', color: '#eaffff', border: '1px solid rgba(0,255,255,0.35)', borderRadius: '4px', padding: '0 8px', font: 'inherit', fontSize: '12px' }}
                        />
                        <button type="button" onClick={() => void runSearch()} disabled={searching} style={{ height: '32px', minWidth: '44px', background: 'rgba(0,255,255,0.12)', color: searching ? '#708080' : '#7ef9ff', border: '1px solid rgba(126,249,255,0.35)', borderRadius: '4px', font: 'inherit', fontSize: '11px', fontWeight: 'bold', cursor: searching ? 'default' : 'pointer' }}>
                            {searching ? '...' : 'GO'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {Object.entries(FIXTURE_LOCATION_RESULTS).map(([key, fixture]) => (
                            <select
                                key={key}
                                title={fixture.title}
                                value=""
                                onChange={(event): void => {
                                    const placeId = Number((event.target as HTMLSelectElement).value);
                                    const result = fixture.results.find((candidate) => candidate.place_id === placeId);
                                    if (result) publishLocationResults([result]);
                                }}
                                style={{ height: '30px', maxWidth: '126px', background: 'rgba(40,40,40,0.9)', color: '#d8fdfd', border: '1px solid rgba(126,249,255,0.35)', borderRadius: '4px', padding: '0 6px', font: 'inherit', fontSize: '11px', cursor: 'pointer' }}
                            >
                                <option value="">{fixture.label}</option>
                                {fixture.results.map((result, index) => (
                                    <option key={result.place_id} value={result.place_id}>
                                        {formatFixtureOption(result, index)}
                                    </option>
                                ))}
                            </select>
                        ))}
                        <button type="button" onClick={clearLocationResults} style={{ height: '30px', background: 'rgba(40,40,40,0.9)', color: '#ffb7b7', border: '1px solid rgba(255,80,80,0.35)', borderRadius: '4px', padding: '0 8px', font: 'inherit', fontSize: '11px', cursor: 'pointer' }}>
                            Clear
                        </button>
                    </div>
                    {searchError && <div style={{ color: '#ffb7b7', fontSize: '11px' }}>{searchError}</div>}
                    {searchResults.length > 0 && (
                        <div style={{ display: 'grid', gap: '4px', maxHeight: '170px', overflowY: 'auto' }}>
                            {searchResults.map((result) => (
                                <button key={result.place_id} type="button" onClick={(): void => publishLocationResults([result])} style={{ background: 'rgba(255,255,255,0.05)', color: '#eaffff', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '4px', padding: '6px 7px', font: 'inherit', fontSize: '11px', textAlign: 'left', cursor: 'pointer' }}>
                                    <strong style={{ color: '#7ef9ff' }}>{result.display_name.split(',')[0]}</strong>
                                    <span style={{ display: 'block', color: '#a9caca', marginTop: '2px' }}>{result.display_name.split(',').slice(1, 4).join(',')}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Style Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('style')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>🎨</div>
                <div className="drawer-content" style={{ display: openDrawer === 'style' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    {['Dark', 'Light', 'Voyager', 'OSM'].map(l => (
                        <div key={l} className="debug-btn" onClick={() => onStyle(l)} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>{l[0]}</div>
                    ))}
                </div>
            </div>

            {/* Mode Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('mode')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>🛠</div>
                <div className="drawer-content" style={{ display: openDrawer === 'mode' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    <div className="debug-btn" onClick={() => onMode('3D')} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>3D</div>
                    <div className="debug-btn" onClick={() => onMode('Src')} style={{ width: '36px', height: '36px', background: 'rgba(40,40,40,0.9)', color: '#fff', border: '1px solid #555', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>Src</div>
                </div>
            </div>

            {/* Portal History Drawer */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('history')} style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>◎</div>
                <div className="drawer-content" style={{ display: openDrawer === 'history' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    {(Object.keys(HISTORY_LAYER_LABELS) as PortalHistoryKey[]).map((key) => {
                        const mode = portalHistoryLayers[key];
                        const color = PORTAL_HISTORY_COLORS[key];
                        return (
                            <div
                                key={key}
                                className="debug-btn"
                                onClick={() => onPortalHistoryLayerToggle(key)}
                                title={`${key}: ${mode}`}
                                style={historyButtonStyle(mode, color)}
                            >
                                <span>{HISTORY_LAYER_LABELS[key]}</span>
                                <span style={{ fontSize: '8px', color: mode === 'off' ? '#666' : color }}>{HISTORY_MODE_LABELS[mode]}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Event / Artifact Toggles */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('special-overlays')} title="Event and shard overlays" style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>◇</div>
                <div className="drawer-content" style={{ display: openDrawer === 'special-overlays' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    <div
                        className="debug-btn"
                        onClick={onOrnamentsToggle}
                        title={`Events: ${ornamentsEnabled ? 'on' : 'off'}`}
                        style={{ width: '42px', height: '36px', background: ornamentsEnabled ? `${INGRESS_COLORS.ORNAMENT}22` : 'rgba(40,40,40,0.9)', color: ornamentsEnabled ? INGRESS_COLORS.ORNAMENT : '#777', border: `1px solid ${ornamentsEnabled ? INGRESS_COLORS.ORNAMENT : '#555'}`, borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}
                    >
                        EVT
                    </div>
                    <div
                        className="debug-btn"
                        onClick={onArtifactsToggle}
                        title={`Shards: ${artifactsEnabled ? 'on' : 'off'}`}
                        style={{ width: '42px', height: '36px', background: artifactsEnabled ? `${INGRESS_COLORS.ARTIFACT}22` : 'rgba(40,40,40,0.9)', color: artifactsEnabled ? INGRESS_COLORS.ARTIFACT : '#777', border: `1px solid ${artifactsEnabled ? INGRESS_COLORS.ARTIFACT : '#555'}`, borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}
                    >
                        SHD
                    </div>
                </div>
            </div>

            {/* Inventory Keys Toggle */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div
                    className="debug-btn"
                    onClick={onKeyOverlayToggle}
                    title={`Inventory keys: ${keyOverlayEnabled ? 'on' : 'off'}`}
                    style={{
                        width: '40px',
                        height: '40px',
                        background: keyOverlayEnabled ? `${INGRESS_COLORS.KEY}22` : 'rgba(34,34,34,0.9)',
                        color: keyOverlayEnabled ? INGRESS_COLORS.KEY : '#fff',
                        border: `1px solid ${keyOverlayEnabled ? INGRESS_COLORS.KEY : '#00ffff'}`,
                        borderRadius: '50%',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                        boxShadow: keyOverlayEnabled ? `0 0 10px ${INGRESS_COLORS.KEY}33` : 'none',
                    }}
                >
                    KEY
                </div>
            </div>

            {/* Portal Visual Modes */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div className="debug-btn" onClick={() => onToggle('portal-visuals')} title="Portal visual modes" style={{ width: '40px', height: '40px', background: 'rgba(34,34,34,0.9)', color: '#fff', border: '1px solid #00ffff', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>◉</div>
                <div className="drawer-content" style={{ display: openDrawer === 'portal-visuals' ? 'flex' : 'none', flexDirection: 'column', gap: '4px', padding: '4px', background: 'rgba(20,20,20,0.9)', borderRadius: '8px', border: '1px solid #00ffff' }}>
                    <div
                        className="debug-btn"
                        onClick={onPortalLevelColorToggle}
                        title={`Portal level coloring: ${portalLevelColorEnabled ? 'on' : 'off'}`}
                        style={{
                            width: '42px',
                            height: '36px',
                            background: portalLevelColorEnabled ? `${ITEM_LEVEL_COLORS[8]}22` : 'rgba(40,40,40,0.9)',
                            color: portalLevelColorEnabled ? ITEM_LEVEL_COLORS[8] : '#777',
                            border: `1px solid ${portalLevelColorEnabled ? ITEM_LEVEL_COLORS[8] : '#555'}`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            boxShadow: portalLevelColorEnabled ? `0 0 10px ${ITEM_LEVEL_COLORS[8]}33 inset` : 'none',
                        }}
                    >
                        LVL
                    </div>
                    <div
                        className="debug-btn"
                        onClick={onPortalHealthColorToggle}
                        title={`Portal health coloring: ${portalHealthColorEnabled ? 'on' : 'off'}`}
                        style={{
                            width: '42px',
                            height: '36px',
                            background: portalHealthColorEnabled ? `${INGRESS_COLORS.ENLIGHTENED}22` : 'rgba(40,40,40,0.9)',
                            color: portalHealthColorEnabled ? INGRESS_COLORS.ENLIGHTENED : '#777',
                            border: `1px solid ${portalHealthColorEnabled ? INGRESS_COLORS.ENLIGHTENED : '#555'}`,
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'auto',
                            boxShadow: portalHealthColorEnabled ? `0 0 10px ${INGRESS_COLORS.ENLIGHTENED}33 inset` : 'none',
                        }}
                    >
                        HP
                    </div>
                </div>
            </div>

            {/* Compact Diagnostics */}
            <div className="drawer-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div
                    className="debug-btn"
                    onClick={onDiagnosticsToggle}
                    title="Diagnostics"
                    style={{
                        width: '40px',
                        height: '40px',
                        background: diagnosticsOpen ? 'rgba(0,255,255,0.18)' : 'rgba(34,34,34,0.9)',
                        color: diagnosticsOpen ? '#7ef9ff' : '#fff',
                        border: `1px solid ${diagnosticsOpen ? '#7ef9ff' : '#00ffff'}`,
                        borderRadius: '50%',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'auto',
                    }}
                >
                    DBG
                </div>
            </div>
        </div>
    );
}
