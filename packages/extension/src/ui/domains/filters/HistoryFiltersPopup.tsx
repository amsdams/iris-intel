import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from "../../theme";
import './filters.css';

interface HistoryFiltersPopupProps {
    onClose: () => void;
}

export function HistoryFiltersPopup({ onClose }: HistoryFiltersPopupProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const showVisited = useStore((state) => state.showVisited);
    const toggleShowVisited = useStore((state) => state.toggleShowVisited);
    const showCaptured = useStore((state) => state.showCaptured);
    const toggleShowCaptured = useStore((state) => state.toggleShowCaptured);
    const showScanned = useStore((state) => state.showScanned);
    const toggleShowScanned = useStore((state) => state.toggleShowScanned);

    return (
        <Popup
            onClose={onClose}
            title="Agent History"
            className="iris-popup-top-center iris-popup-small"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-filters">
                <label className="iris-choice-item iris-label">
                    <input type="checkbox" checked={showVisited} onChange={toggleShowVisited} className="iris-checkbox" />
                    Visited Status
                </label>
                <label className="iris-choice-item iris-label iris-mt-2">
                    <input type="checkbox" checked={showCaptured} onChange={toggleShowCaptured} className="iris-checkbox" />
                    Captured Status
                </label>
                <label className="iris-choice-item iris-label iris-mt-2">
                    <input type="checkbox" checked={showScanned} onChange={toggleShowScanned} className="iris-checkbox" />
                    Scanned Status
                </label>

                <div className="iris-mt-3 iris-text-small" style={{ color: '#888', fontStyle: 'italic' }}>
                    Note: These filters highlight portals you have previously interacted with.
                </div>
            </div>
        </Popup>
    );
}
