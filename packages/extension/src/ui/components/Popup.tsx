import { h, ComponentChildren } from 'preact';
import { UI_COLORS } from '../theme';

interface PopupProps {
    onClose: () => void;
    title?: string;
    children: ComponentChildren;
    style?: h.JSX.CSSProperties;
}

const basePopupStyle: h.JSX.CSSProperties = {
    position: 'fixed',
    zIndex: 10002,
    background: UI_COLORS.BG_BASE,
    color: UI_COLORS.TEXT_BASE,
    padding: '16px',
    borderRadius: '8px',
    border: `2px solid ${UI_COLORS.AQUA}`,
    boxShadow: `0 0 20px ${UI_COLORS.GLOW}`,
    fontFamily: 'monospace',
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
    color: UI_COLORS.TEXT_BASE,
    fontSize: '18px',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0 4px',
};

export function Popup({ onClose, title, children, style }: PopupProps) {
    return (
        <div style={{ ...basePopupStyle, ...style }}>
            <button onClick={onClose} style={closeButtonStyle}>✕</button>
            {title && (
                <h2 style={{
                    margin: '0 0 10px 0',
                    color: UI_COLORS.AQUA,
                    paddingRight: '20px',
                    fontSize: '1.2em'
                }}>
                    {title}
                </h2>
            )}
            {children}
        </div>
    );
}
