import { h, JSX } from 'preact';
import { useStore, EntityLogic } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, TEAM_NAME } from '../../theme';

interface LinkInfoPopupProps {
    onClose: () => void;
    visible: boolean;
}

export function LinkInfoPopup({ onClose, visible }: LinkInfoPopupProps): JSX.Element | null {
    const links = useStore((state) => state.links);
    const portals = useStore((state) => state.portals);
    const selectedLinkId = useStore((state) => state.selectedLinkId);
    const themeId = useStore((state) => state.themeId);
    
    const link = selectedLinkId ? links[selectedLinkId] : null;
    const theme = THEMES[themeId] || THEMES.INGRESS;

    if (!link || !visible) return null;

    const fromPortal = portals[link.fromPortalId];
    const toPortal = portals[link.toPortalId];

    const factionKey = link.team as 'E' | 'R' | 'M' | 'N';
    const colour = theme[factionKey] || theme.N;
    const teamName = TEAM_NAME[link.team] || 'Unknown';

    const distKm = (fromPortal && toPortal) 
        ? EntityLogic.getDistKm(fromPortal.lat, fromPortal.lng, toPortal.lat, toPortal.lng)
        : 0;
    const distStr = distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(2)}km`;

    const handlePortalClick = (id: string, lat: number, lng: number): void => {
        onClose();
        window.postMessage({ type: 'IRIS_MOVE_MAP', center: { lat, lng }, zoom: 15 }, '*');
        useStore.getState().selectPortal(id);
    };

    return (
        <Popup
            onClose={onClose}
            title={'Link Details'}
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
                    {teamName} Link
                </div>

                <div className="iris-portal-summary-table">
                    <div className="iris-portal-summary-col">
                        <div className="iris-portal-summary-row">
                            <span className="iris-portal-summary-label">Length</span>
                            <span className="iris-portal-summary-value iris-portal-summary-value-faction">{distStr}</span>
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
                        <div 
                            className={`iris-portal-details-row ${fromPortal ? 'iris-portal-details-row-clickable' : ''}`}
                            onClick={() => fromPortal && handlePortalClick(fromPortal.id, fromPortal.lat, fromPortal.lng)}
                        >
                            <span className="iris-portal-details-label">From</span>
                            <span className={`iris-portal-details-value ${fromPortal ? 'iris-portal-details-value-link' : 'iris-portal-details-value-faction'}`}>
                                {fromPortal?.name || 'Unknown Portal'}
                            </span>
                        </div>
                        <div 
                            className={`iris-portal-details-row ${toPortal ? 'iris-portal-details-row-clickable' : ''}`}
                            onClick={() => toPortal && handlePortalClick(toPortal.id, toPortal.lat, toPortal.lng)}
                        >
                            <span className="iris-portal-details-label">To</span>
                            <span className={`iris-portal-details-value ${toPortal ? 'iris-portal-details-value-link' : 'iris-portal-details-value-faction'}`}>
                                {toPortal?.name || 'Unknown Portal'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="iris-portal-details-section">
                    <div className="iris-portal-section-title">COORDINATES</div>
                    <div className="iris-portal-details-table">
                        <div className="iris-portal-details-row">
                            <span className="iris-portal-details-label">From</span>
                            <span className="iris-portal-details-value">
                                {link.fromLat.toFixed(6)}, {link.fromLng.toFixed(6)}
                            </span>
                        </div>
                        <div className="iris-portal-details-row">
                            <span className="iris-portal-details-label">To</span>
                            <span className="iris-portal-details-value">
                                {link.toLat.toFixed(6)}, {link.toLng.toFixed(6)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Popup>
    );
}
