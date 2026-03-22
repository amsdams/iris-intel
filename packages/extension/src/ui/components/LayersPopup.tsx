import { h, Fragment } from 'preact';
import { useStore } from '@iris/core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const popupStyle: h.JSX.CSSProperties = {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10002,
    background: 'rgba(0, 0, 0, 0.92)',
    color: '#ffffff',
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #00ffff',
    boxShadow: '0 0 20px #00ffff55',
    fontFamily: 'monospace',
    minWidth: '300px',
    maxWidth: '420px',
    maxHeight: '80vh',
    overflowY: 'auto',
    pointerEvents: 'auto',
};

const closeButtonStyle: h.JSX.CSSProperties = {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '18px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
};

const checkboxContainerStyle: h.JSX.CSSProperties = {
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
};

const checkboxStyle: h.JSX.CSSProperties = {
    marginRight: '8px',
};

// ---------------------------------------------------------------------------
// LayersPopup
// ---------------------------------------------------------------------------

interface LayersPopupProps {
    onClose: () => void;
}

export function LayersPopup({ onClose }: LayersPopupProps) {
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

    const handleLevelToggle = (level: number) => () => {
        toggleShowLevel(level);
    };

    return (
        <div style={popupStyle}>
            {/* Close button */}
            <button onClick={onClose} style={closeButtonStyle}>✕</button>

            <h2 style={{ margin: '0 0 10px 0', color: '#00ffff', paddingRight: '20px' }}>Map Layers</h2>

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

            <h3 style={{ margin: '15px 0 8px 0', color: '#00ffff' }}>Teams</h3>
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

            <h3 style={{ margin: '15px 0 8px 0', color: '#00ffff' }}>Portal Levels</h3>
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
        </div>
    );
}
