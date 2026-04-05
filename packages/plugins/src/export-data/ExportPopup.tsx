import { JSX } from 'preact';
import { useState } from 'preact/hooks';
import { Field, Link, Portal, useStore } from '@iris/core';
import { Popup } from '../../../extension/src/ui/shared/Popup';
import { THEMES, SHARED_STYLES } from '../../../extension/src/ui/theme';
import './ExportPopup.css';

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
    const theme = THEMES[themeId] || THEMES.INGRESS;

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

    return (
        <Popup
            onClose={onClose}
            title="Export Data"
            className="iris-popup-top-center iris-popup-medium"
            style={{
                ['--iris-popup-border' as any]: theme.AQUA,
                ['--iris-popup-shadow' as any]: `${theme.AQUA}55`,
                ['--iris-popup-title-color' as any]: theme.AQUA,
            }}
        >
            <div className="iris-export-content">
                <div className="iris-export-section">
                    <div className="iris-export-section-title">FORMAT</div>
                    <div className="iris-export-format-grid">
                        {(['JSON', 'GEOJSON', 'KML'] as const).map(type => (
                            <button
                                key={type}
                                onClick={() => setExportType(type)}
                                className="iris-export-format-btn"
                                style={SHARED_STYLES.btnStyle(exportType === type, theme.AQUA)}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="iris-export-section">
                    <div className="iris-export-section-title">INCLUDE</div>
                    <div className="iris-export-options">
                        <label className="iris-export-option-label">
                            <input type="checkbox" checked={includePortals} onChange={e => setIncludePortals((e.target as HTMLInputElement).checked)} />
                            <span>Portals</span>
                        </label>
                        <label className="iris-export-option-label">
                            <input type="checkbox" checked={includeLinks} onChange={e => setIncludeLinks((e.target as HTMLInputElement).checked)} />
                            <span>Links</span>
                        </label>
                        <label className="iris-export-option-label">
                            <input type="checkbox" checked={includeFields} onChange={e => setIncludeFields((e.target as HTMLInputElement).checked)} />
                            <span>Fields</span>
                        </label>
                    </div>
                </div>

                <button
                    onClick={doExport}
                    className="iris-export-submit-btn"
                    style={SHARED_STYLES.btnStyle(true, theme.AQUA)}
                >
                    DOWNLOAD
                </button>
            </div>
        </Popup>
    );
}
