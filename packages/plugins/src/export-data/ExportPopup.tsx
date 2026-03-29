import { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { Field, Link, Portal, useStore } from '@iris/core';
import { Popup } from '../../../extension/src/ui/shared/Popup';
import { UI_COLORS, THEMES, SHARED_STYLES } from '../../../extension/src/ui/theme';

interface ExportPopupProps {
    onClose: () => void;
}

interface ExportData {
    portals?: Portal[];
    links?: Link[];
    fields?: Field[];
}

export function ExportPopup({ onClose }: ExportPopupProps): JSX.Element {
    const [exportType, setExportType] = useState<'JSON' | 'KML' | 'GEOJSON'>('JSON');
    const [includePortals, setIncludePortals] = useState(true);
    const [includeLinks, setIncludeLinks] = useState(true);
    const [includeFields, setIncludeFields] = useState(true);

    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.DEFAULT;

    const doExport = (): void => {
        const state = useStore.getState();
        const data: ExportData = {};

        if (includePortals) data.portals = Object.values(state.portals);
        if (includeLinks) data.links = Object.values(state.links);
        if (includeFields) data.fields = Object.values(state.fields);

        let content = '';
        let mimeType = 'application/json';
        let extension = 'json';

        if (exportType === 'JSON') {
            content = JSON.stringify(data, null, 2);
        } else if (exportType === 'GEOJSON') {
            const features: GeoJSON.Feature[] = [];
            
            if (includePortals) {
                Object.values(state.portals).forEach(p => {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                        properties: {
                            id: p.id,
                            name: p.name,
                            team: p.team,
                            level: p.level,
                            health: p.health,
                            type: 'portal'
                        }
                    });
                });
            }

            if (includeLinks) {
                Object.values(state.links).forEach(l => {
                    features.push({
                        type: 'Feature',
                        geometry: { 
                            type: 'LineString', 
                            coordinates: [[l.fromLng, l.fromLat], [l.toLng, l.toLat]] 
                        },
                        properties: {
                            id: l.id,
                            team: l.team,
                            fromPortalId: l.fromPortalId,
                            toPortalId: l.toPortalId,
                            type: 'link'
                        }
                    });
                });
            }

            if (includeFields) {
                Object.values(state.fields).forEach(f => {
                    features.push({
                        type: 'Feature',
                        geometry: { 
                            type: 'Polygon', 
                            coordinates: [[...f.points.map(p => [p.lng, p.lat]), [f.points[0].lng, f.points[0].lat]]] 
                        },
                        properties: {
                            id: f.id,
                            team: f.team,
                            type: 'field'
                        }
                    });
                });
            }

            content = JSON.stringify({ type: 'FeatureCollection', features }, null, 2);
        } else if (exportType === 'KML') {
            // Simple KML generator
            let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>IRIS Data Export</name>\n`;
            
            if (includePortals) {
                Object.values(state.portals).forEach(p => {
                    kml += `<Placemark>\n<name>${p.name || p.id}</name>\n<Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>\n</Placemark>\n`;
                });
            }

            if (includeLinks) {
                Object.values(state.links).forEach(l => {
                    kml += `<Placemark>\n<name>Link ${l.id}</name>\n<LineString><coordinates>${l.fromLng},${l.fromLat},0 ${l.toLng},${l.toLat},0</coordinates></LineString>\n</Placemark>\n`;
                });
            }

            if (includeFields) {
                Object.values(state.fields).forEach(f => {
                    const coords = f.points.map(p => `${p.lng},${p.lat},0`).join(' ');
                    const first = `${f.points[0].lng},${f.points[0].lat},0`;
                    kml += `<Placemark>\n<name>Field ${f.id}</name>\n<Polygon><outerBoundaryIs><LinearRing><coordinates>${coords} ${first}</coordinates></LinearRing></outerBoundaryIs></Polygon>\n</Placemark>\n`;
                });
            }

            kml += `</Document>\n</kml>`;
            content = kml;
            mimeType = 'application/vnd.google-earth.kml+xml';
            extension = 'kml';
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iris-export-${new Date().toISOString().split('T')[0]}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const checkboxStyle: JSX.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        padding: '5px 0'
    };

    return (
        <Popup
            onClose={onClose}
            title="Export Data"
            style={{
                bottom: '200px',
                right: '20px',
                minWidth: '250px',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '0.8em', color: UI_COLORS.TEXT_MUTED }}>FORMAT</div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        {(['JSON', 'GEOJSON', 'KML'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setExportType(type)}
                                style={{
                                    ...SHARED_STYLES.btnStyle(exportType === type, theme.AQUA),
                                    flex: 1,
                                    fontSize: '0.7em',
                                    padding: '4px'
                                }}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontSize: '0.8em', color: UI_COLORS.TEXT_MUTED }}>INCLUDE</div>
                    <label style={checkboxStyle}>
                        <input type="checkbox" checked={includePortals} onChange={e => setIncludePortals((e.target as HTMLInputElement).checked)} />
                        <span>Portals</span>
                    </label>
                    <label style={checkboxStyle}>
                        <input type="checkbox" checked={includeLinks} onChange={e => setIncludeLinks((e.target as HTMLInputElement).checked)} />
                        <span>Links</span>
                    </label>
                    <label style={checkboxStyle}>
                        <input type="checkbox" checked={includeFields} onChange={e => setIncludeFields((e.target as HTMLInputElement).checked)} />
                        <span>Fields</span>
                    </label>
                </div>

                <button
                    onClick={doExport}
                    style={{
                        ...SHARED_STYLES.btnStyle(true, theme.AQUA),
                        marginTop: '10px',
                        padding: '8px'
                    }}
                >
                    DOWNLOAD
                </button>
            </div>
        </Popup>
    );
}
