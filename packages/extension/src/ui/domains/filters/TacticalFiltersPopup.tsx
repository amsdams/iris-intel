import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from "../../theme";
import './filters.css';

interface TacticalFiltersPopupProps {
    onClose: () => void;
}

export function TacticalFiltersPopup({ onClose }: TacticalFiltersPopupProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    const showResistance = useStore((state) => state.showResistance);
    const toggleShowResistance = useStore((state) => state.toggleShowResistance);
    const showEnlightened = useStore((state) => state.showEnlightened);
    const toggleShowEnlightened = useStore((state) => state.toggleShowEnlightened);
    const showMachina = useStore((state) => state.showMachina);
    const toggleShowMachina = useStore((state) => state.toggleShowMachina);
    const showUnclaimedPortals = useStore((state) => state.showUnclaimedPortals);
    const toggleShowUnclaimedPortals = useStore((state) => state.toggleShowUnclaimedPortals);

    const showLevel = useStore((state) => state.showLevel);
    const toggleShowLevel = useStore((state) => state.toggleShowLevel);
    const showHealth = useStore((state) => state.showHealth);
    const toggleShowHealth = useStore((state) => state.toggleShowHealth);

    return (
        <Popup
            onClose={onClose}
            title="Tactical Filters"
            className="iris-popup-top-center iris-popup-medium"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-filters">
                <div className="iris-filter-section-title">FACTION</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <label className="iris-choice-item iris-label">
                        <input type="checkbox" checked={showResistance} onChange={toggleShowResistance} className="iris-checkbox" />
                        Resistance
                    </label>
                    <label className="iris-choice-item iris-label">
                        <input type="checkbox" checked={showEnlightened} onChange={toggleShowEnlightened} className="iris-checkbox" />
                        Enlightened
                    </label>
                    <label className="iris-choice-item iris-label">
                        <input type="checkbox" checked={showMachina} onChange={toggleShowMachina} className="iris-checkbox" />
                        Machina
                    </label>
                    <label className="iris-choice-item iris-label">
                        <input type="checkbox" checked={showUnclaimedPortals} onChange={toggleShowUnclaimedPortals} className="iris-checkbox" />
                        Neutral
                    </label>
                </div>

                <div className="iris-filter-section-title iris-mt-3">PORTAL LEVELS</div>
                <div className="iris-filter-levels-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                        <label key={level} className="iris-label">
                            <input type="checkbox" checked={showLevel[level]} onChange={() => toggleShowLevel(level)} className="iris-checkbox" />
                            L{level}
                        </label>
                    ))}
                </div>

                <div className="iris-filter-section-title iris-mt-3">PORTAL HEALTH</div>
                <div className="iris-filter-health-grid">
                    {[25, 50, 75, 100].map((bucket) => (
                        <label key={bucket} className="iris-label">
                            <input type="checkbox" checked={showHealth[bucket]} onChange={() => toggleShowHealth(bucket)} className="iris-checkbox" />
                            {bucket}%
                        </label>
                    ))}
                </div>
            </div>
        </Popup>
    );
}
