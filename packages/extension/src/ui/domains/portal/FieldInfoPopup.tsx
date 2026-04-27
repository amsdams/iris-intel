import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, TEAM_NAME } from '../../theme';

interface FieldInfoPopupProps {
    onClose: () => void;
    visible: boolean;
}

export function FieldInfoPopup({ onClose, visible }: FieldInfoPopupProps): JSX.Element | null {
    const fields = useStore((state) => state.fields);
    const portals = useStore((state) => state.portals);
    const selectedFieldId = useStore((state) => state.selectedFieldId);
    const themeId = useStore((state) => state.themeId);
    
    const field = selectedFieldId ? fields[selectedFieldId] : null;
    const theme = THEMES[themeId] || THEMES.INGRESS;

    if (!field || !visible) return null;

    const factionKey = field.team as 'E' | 'R' | 'M' | 'N';
    const colour = theme[factionKey] || theme.N;
    const teamName = TEAM_NAME[field.team] || 'Unknown';

    // MU Estimation based on triangle area
    // Planar approximation for small fields: 
    // Area in square degrees * factor (approx 1.2e8 for MU/sq deg in many areas, but we'll use a simpler scale)
    const calculateEstimatedMU = (): number => {
        if (field.points.length < 3) return 0;
        const p1 = field.points[0];
        const p2 = field.points[1];
        const p3 = field.points[2];
        
        // Shoelace formula for area in square degrees
        const area = Math.abs(
            p1.lng * (p2.lat - p3.lat) + 
            p2.lng * (p3.lat - p1.lat) + 
            p3.lng * (p1.lat - p2.lat)
        ) / 2;
        
        // Rough factor for MU estimation (1 sq deg is roughly 12,000 km2)
        // Average population density varies, but let's use a conservative scale
        return Math.max(1, Math.round(area * 1000000));
    };

    const estimatedMU = calculateEstimatedMU();

    const handlePortalClick = (id: string, lat: number, lng: number): void => {
        onClose();
        window.postMessage({ type: 'IRIS_MOVE_MAP', center: { lat, lng }, zoom: 15 }, '*');
        useStore.getState().selectPortal(id);
    };

    return (
        <Popup
            onClose={onClose}
            title={'Field Details'}
            className="iris-popup-top-center iris-popup-medium"
            contentClassName="iris-popup-content-no-padding"
            style={{
                '--iris-popup-border': colour,
                '--iris-popup-shadow': `${colour}55`,
                '--iris-popup-title-color': colour,
            } as Record<string, string>}
        >
            <div className="iris-portal-info">
                <div className="iris-portal-name" style={{ color: colour }}>
                    {teamName} Field
                </div>

                <div className="iris-portal-summary-table">
                    <div className="iris-portal-summary-col">
                        <div className="iris-portal-summary-row">
                            <span className="iris-portal-summary-label">Mind Units</span>
                            <span className="iris-portal-summary-value" style={{ color: colour }}>~{estimatedMU.toLocaleString()} MU</span>
                        </div>
                    </div>
                    <div className="iris-portal-summary-col">
                        <div className="iris-portal-summary-row">
                            <span className="iris-portal-summary-label">Team</span>
                            <span className="iris-portal-summary-value" style={{ color: colour }}>{teamName}</span>
                        </div>
                    </div>
                </div>

                <div className="iris-portal-details-section">
                    <div className="iris-portal-section-title">ANCHORS</div>
                    <div className="iris-portal-details-table">
                        {field.points.map((pt, i) => {
                            const p = pt.portalId ? portals[pt.portalId] : null;
                            return (
                                <div 
                                    key={i} 
                                    className="iris-portal-details-row"
                                    style={{ cursor: p ? 'pointer' : 'default' }}
                                    onClick={() => p && handlePortalClick(p.id, p.lat, p.lng)}
                                >
                                    <span className="iris-portal-details-label">Anchor {i+1}</span>
                                    <span className="iris-portal-details-value" style={{ color: p ? '#00ffff' : colour, textDecoration: p ? 'underline' : 'none' }}>
                                        {p?.name || 'Unknown Portal'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="iris-portal-details-section">
                    <div className="iris-portal-section-title">BOUNDS (E6)</div>
                    <div className="iris-portal-details-table">
                        <div className="iris-portal-details-row">
                            <span className="iris-portal-details-label">Lat Range</span>
                            <span className="iris-portal-details-value">
                                {Math.min(...field.points.map(p => p.lat)).toFixed(4)} to {Math.max(...field.points.map(p => p.lat)).toFixed(4)}
                            </span>
                        </div>
                        <div className="iris-portal-details-row">
                            <span className="iris-portal-details-label">Lng Range</span>
                            <span className="iris-portal-details-value">
                                {Math.min(...field.points.map(p => p.lng)).toFixed(4)} to {Math.max(...field.points.map(p => p.lng)).toFixed(4)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Popup>
    );
}
