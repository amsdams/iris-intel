import {ComponentChildren, h, JSX} from 'preact';

interface PopupActionRowProps {
    children: ComponentChildren;
}

interface PopupActionButtonProps {
    children: ComponentChildren;
    disabled?: boolean;
    onClick: () => void;
    title?: string;
    variant?: 'default' | 'primary';
}

export function PopupActionRow({children}: PopupActionRowProps): JSX.Element {
    return (
        <div className="iris-popup-action-row">
            {children}
        </div>
    );
}

export function PopupActionButton({children, disabled = false, onClick, title, variant = 'default'}: PopupActionButtonProps): JSX.Element {
    return (
        <button
            type="button"
            className={`iris-popup-action-button ${variant === 'primary' ? 'iris-popup-action-button-primary' : ''}`}
            disabled={disabled}
            onClick={onClick}
            title={title}
        >
            {children}
        </button>
    );
}
