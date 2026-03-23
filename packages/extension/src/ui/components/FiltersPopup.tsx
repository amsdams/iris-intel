import { h } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from './Popup';
import { UI_COLORS, FONT_SIZES } from '../theme';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const checkboxContainerStyle: h.JSX.CSSProperties = {
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    fontSize: '0.85em',
};

const checkboxStyle: h.JSX.CSSProperties = {
    marginRight: '8px',
};

// ---------------------------------------------------------------------------
// FiltersPopup
// ---------------------------------------------------------------------------

interface FiltersPopupProps {
    onClose: () => void;
}

export function FiltersPopup({ onClose }: FiltersPopupProps) {
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

    const themeId = useStore((state) => state.themeId);
    const setTheme = useStore((state) => state.setTheme);

    const handleLevelToggle = (level: number) => () => {
        toggleShowLevel(level);
    };

    return (
        <Popup
            onClose={onClose}
            title="Filters"
            style={{
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                minWidth: '300px',
                maxWidth: '420px',
            }}
        >
            <h3 style={{ margin: '15px 0 8px 0', color: UI_COLORS.AQUA, fontSize: FONT_SIZES.H3 }}>Layers</h3>
            <label style={checkboxContainerStyle}>
                <input
                    type="checkbox"
                    checked={showFields}
                    onChange={toggleShowFields}
                    style={checkboxStyle}
                />
                Fields
            </label>

            <label style={checkboxContainerStyle}>
                <input
                    type="checkbox"
                    checked={showLinks}
                    onChange={toggleShowLinks}
                    style={checkboxStyle}
                />
                Links
            </label>

            <h3 style={{ margin: '15px 0 8px 0', color: UI_COLORS.AQUA, fontSize: FONT_SIZES.H3 }}>Faction</h3>
            <label style={checkboxContainerStyle}>
                <input
                    type="checkbox"
                    checked={showResistance}
                    onChange={toggleShowResistance}
                    style={checkboxStyle}
                />
                Resistance
            </label>
            <label style={checkboxContainerStyle}>
                <input
                    type="checkbox"
                    checked={showEnlightened}
                    onChange={toggleShowEnlightened}
                    style={checkboxStyle}
                />
                Enlightened
            </label>
            <label style={checkboxContainerStyle}>
                <input
                    type="checkbox"
                    checked={showMachina}
                    onChange={toggleShowMachina}
                    style={checkboxStyle}
                />
                Machina
            </label>
            <label style={checkboxContainerStyle}>
                <input
                    type="checkbox"
                    checked={showUnclaimedPortals}
                    onChange={toggleShowUnclaimedPortals}
                    style={checkboxStyle}
                />
                Unclaimed Portals
            </label>

            <h3 style={{ margin: '15px 0 8px 0', color: UI_COLORS.AQUA, fontSize: FONT_SIZES.H3 }}>Portal Levels</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px' }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
                    <label key={level} style={checkboxContainerStyle}>
                        <input
                            type="checkbox"
                            checked={showLevel[level]}
                            onChange={handleLevelToggle(level)}
                            style={checkboxStyle}
                        />
                        L{level}
                    </label>
                ))}
            </div>
        </Popup>
    );
}
