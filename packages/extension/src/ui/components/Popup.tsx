import { h, ComponentChildren } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';

interface PopupProps {
    onClose: () => void;
    title?: string;
    children: ComponentChildren;
    style?: h.JSX.CSSProperties;
    headerExtras?: ComponentChildren;
}

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

    // Merge styles. If pos is set, we override positioning from props
    const finalStyle: h.JSX.CSSProperties = {
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
        <div ref={popupRef} style={finalStyle} className="iris-popup">
            <button onClick={onClose} className="iris-popup-close">✕</button>

            {/* Drag Handle: Title or a spacer if no title */}
            <div
                onMouseDown={onStart}
                onTouchStart={onStart}
                className="iris-popup-header"
            >
                {title ? (
                    <h2 className="iris-popup-title">
                        {title}
                    </h2>
                ) : (
                    <div className="iris-popup-drag-spacer" />
                )}
                {headerExtras}
            </div>

            <div className="iris-popup-content">
                {children}
            </div>
        </div>
    );
}
