import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import './filters.css';
import {THEMES} from "../../theme";

// ---------------------------------------------------------------------------
// FiltersPopup
// ---------------------------------------------------------------------------

interface FiltersPopupProps {
    onClose: () => void;
}

export function FiltersPopup({ onClose }: FiltersPopupProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);

    const theme = THEMES[themeId] || THEMES.INGRESS;

    const showFields = useStore((state) => state.showFields);
    const toggleShowFields = useStore((state) => state.toggleShowFields);

    const showLinks = useStore((state) => state.showLinks);
    const toggleShowLinks = useStore((state) => state.toggleShowLinks);

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

    const showVisited = useStore((state) => state.showVisited);
    const toggleShowVisited = useStore((state) => state.toggleShowVisited);

    const showCaptured = useStore((state) => state.showCaptured);
    const toggleShowCaptured = useStore((state) => state.toggleShowCaptured);

    const showScanned = useStore((state) => state.showScanned);
    const toggleShowScanned = useStore((state) => state.toggleShowScanned);

    const handleLevelToggle = (level: number): (() => void) => () => {
        toggleShowLevel(level);
    };

    const handleHealthToggle = (bucket: number): (() => void) => () => {
        toggleShowHealth(bucket);
    };

    return (
        <Popup
            onClose={onClose}
            title="Filters"
            className="iris-popup-top-center iris-popup-medium"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-filters">
                <h3 className="iris-filter-section-title">Layers</h3>
                <label className="iris-choice-item iris-label">
                    <input
                        type="checkbox"
                        checked={showFields}
                        onChange={toggleShowFields}
                        className="iris-checkbox"
                    />
                    Fields
                </label>

                <label className="iris-choice-item iris-label">
                    <input
                        type="checkbox"
                        checked={showLinks}
                        onChange={toggleShowLinks}
                        className="iris-checkbox"
                    />
                    Links
                </label>

                <h3 className="iris-filter-section-title">Faction</h3>
                <label className="iris-choice-item iris-label">
                    <input
                        type="checkbox"
                        checked={showResistance}
                        onChange={toggleShowResistance}
                        className="iris-checkbox"
                    />
                    Resistance
                </label>
                <label className="iris-choice-item iris-label">
                    <input
                        type="checkbox"
                        checked={showEnlightened}
                        onChange={toggleShowEnlightened}
                        className="iris-checkbox"
                    />
                    Enlightened
                </label>
                <label className="iris-choice-item iris-label">
                    <input
                        type="checkbox"
                        checked={showMachina}
                        onChange={toggleShowMachina}
                        className="iris-checkbox"
                    />
                    Machina
                </label>
                <label className="iris-choice-item iris-label">
                    <input
                        type="checkbox"
                        checked={showUnclaimedPortals}
                        onChange={toggleShowUnclaimedPortals}
                        className="iris-checkbox"
                    />
                    Unclaimed Portals
                </label>

                <h3 className="iris-filter-section-title">Portal Levels</h3>
                <div className="iris-filter-levels-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                        <label key={level} className="iris-label">
                            <input
                                type="checkbox"
                                checked={showLevel[level]}
                                onChange={handleLevelToggle(level)}
                                className="iris-checkbox"
                            />
                            L{level}
                        </label>
                    ))}
                </div>

                <h3 className="iris-filter-section-title">Portal Health</h3>
                <div className="iris-filter-health-grid">
                    {[25, 50, 75, 100].map((bucket) => (
                        <label key={bucket} className="iris-label">
                            <input
                                type="checkbox"
                                checked={showHealth[bucket]}
                                onChange={handleHealthToggle(bucket)}
                                className="iris-checkbox"
                            />
                            {bucket}%
                        </label>
                    ))}
                </div>

                <h3 className="iris-filter-section-title">Portal History</h3>
                <div className="iris-filter-history-grid">
                    <label className="iris-choice-item iris-label">
                        <input
                            type="checkbox"
                            checked={showVisited}
                            onChange={toggleShowVisited}
                            className="iris-checkbox"
                        />
                        Visited
                    </label>
                    <label className="iris-choice-item iris-label">
                        <input
                            type="checkbox"
                            checked={showCaptured}
                            onChange={toggleShowCaptured}
                            className="iris-checkbox"
                        />
                        Captured
                    </label>
                    <label className="iris-choice-item iris-label">
                        <input
                            type="checkbox"
                            checked={showScanned}
                            onChange={toggleShowScanned}
                            className="iris-checkbox"
                        />
                        Scanned
                    </label>
                </div>
            </div>
        </Popup>
    );
}
