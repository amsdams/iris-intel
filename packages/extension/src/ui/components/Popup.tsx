import { h, ComponentChildren } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { UI_COLORS, FONT_SIZES, SPACING } from '../theme';

interface PopupProps {
    onClose: () => void;
    title?: string;
    children: ComponentChildren;
    style?: h.JSX.CSSProperties;
    headerExtras?: ComponentChildren;
}

const basePopupStyle: h.JSX.CSSProperties = {
    position: 'fixed',
    zIndex: 10002,
    background: UI_COLORS.BG_BASE,
    color: UI_COLORS.TEXT_BASE,
    padding: SPACING.MD,
    borderRadius: '8px',
    border: `2px solid ${UI_COLORS.AQUA}`,
    boxShadow: `0 0 20px ${UI_COLORS.GLOW}`,
    fontFamily: 'monospace',
    maxHeight: '80vh',
    overflowY: 'auto',
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
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
    zIndex: 1,
};

export function Popup({ onClose, title, children, style, headerExtras }: PopupProps) {
    const [pos, setPos] = useState<{ x: number, y: number } | null>(null);
    const [dragging, setDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const popupRef = useRef<HTMLDivElement>(null);

    const onStart = (e: MouseEvent | TouchEvent) => {
        // Don't drag if clicking buttons
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;

        setDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (popupRef.current) {
            const rect = popupRef.current.getBoundingClientRect();
            dragStart.current = {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }
    };

    useEffect(() => {
        if (!dragging) return;

        const onMove = (e: MouseEvent | TouchEvent) => {
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            setPos({
                x: clientX - dragStart.current.x,
                y: clientY - dragStart.current.y
            });
        };

        const onEnd = () => setDragging(false);

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);

        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [dragging]);

    const dragHandleStyle: h.JSX.CSSProperties = {
        cursor: 'move',
        userSelect: 'none',
        touchAction: 'none', // Prevents scrolling while dragging on mobile
        marginBottom: SPACING.SM,
        paddingRight: '30px', // Space for close button
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    };

    // Merge styles. If pos is set, we override positioning from props
    const finalStyle: h.JSX.CSSProperties = {
        ...basePopupStyle,
        ...style,
        ...(pos ? {
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            bottom: 'auto',
            right: 'auto',
            transform: 'none'
        } : {})
    };

    return (
        <div ref={popupRef} style={finalStyle}>
            <button onClick={onClose} style={closeButtonStyle}>✕</button>

            {/* Drag Handle: Title or a spacer if no title */}
            <div
                onMouseDown={onStart}
                onTouchStart={onStart}
                style={dragHandleStyle}
            >
                {title ? (
                    <h2 style={{
                        margin: 0,
                        color: UI_COLORS.AQUA,
                        fontSize: FONT_SIZES.H2,
                        pointerEvents: 'none'
                    }}>
                        {title}
                    </h2>
                ) : (
                    <div style={{ height: '10px', width: '100%', pointerEvents: 'none' }} />
                )}
                {headerExtras}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {children}
            </div>
        </div>
    );
}
