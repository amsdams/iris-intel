import {ComponentChildren, h, JSX} from 'preact';

interface PopupActionRowProps {
    children: ComponentChildren;
}

interface PopupActionButtonProps {
    children: ComponentChildren;
    disabled?: boolean;
    onClick: () => void;
    title?: string;
}

export function PopupActionRow({children}: PopupActionRowProps): JSX.Element {
    return (
        <div className="iris-popup-action-row">
            {children}
        </div>
    );
}

export function PopupActionButton({children, disabled = false, onClick, title}: PopupActionButtonProps): JSX.Element {
    return (
        <button
            type="button"
            className="iris-popup-action-button"
            disabled={disabled}
            onClick={onClick}
            title={title}
        >
            {children}
        </button>
    );
}
