import { h, JSX } from 'preact';
import { estimateFieldMindUnits, useStore } from '@iris/core';
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

    const estimatedMU = estimateFieldMindUnits(field);

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
                '--iris-faction-color': colour,
            } as Record<string, string>}
        >
            <div className="iris-portal-info">
                <div className="iris-portal-name">
                    {teamName} Field
                </div>

                <div className="iris-portal-summary-table">
                    <div className="iris-portal-summary-col">
                        <div className="iris-portal-summary-row">
                            <span className="iris-portal-summary-label">Mind Units</span>
                            <span className="iris-portal-summary-value iris-portal-summary-value-faction">~{estimatedMU.toLocaleString()} MU</span>
                        </div>
                    </div>
                    <div className="iris-portal-summary-col">
                        <div className="iris-portal-summary-row">
                            <span className="iris-portal-summary-label">Team</span>
                            <span className="iris-portal-summary-value iris-portal-summary-value-faction">{teamName}</span>
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
                                    className={`iris-portal-details-row ${p ? 'iris-portal-details-row-clickable' : ''}`}
                                    onClick={() => p && handlePortalClick(p.id, p.lat, p.lng)}
                                >
                                    <span className="iris-portal-details-label">Anchor {i+1}</span>
                                    <span className={`iris-portal-details-value ${p ? 'iris-portal-details-value-link' : 'iris-portal-details-value-faction'}`}>
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

                <div className="iris-portal-details-section">
                    <div className="iris-portal-section-title">COORDINATES</div>
                    <div className="iris-portal-details-table">
                        {field.points.map((point, index) => (
                            <div className="iris-portal-details-row" key={`${point.portalId || 'field-point'}:${index}`}>
                                <span className="iris-portal-details-label">Anchor {index + 1}</span>
                                <span className="iris-portal-details-value">
                                    {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Popup>
    );
}
