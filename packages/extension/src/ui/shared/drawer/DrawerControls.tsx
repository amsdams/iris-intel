import {h, ComponentChildren, JSX} from 'preact';

interface DrawerButtonProps {
    active?: boolean;
    children?: ComponentChildren;
    icon?: ComponentChildren;
    label: ComponentChildren;
    onClick: () => void;
}

interface DrawerSectionProps {
    children: ComponentChildren;
    label: string;
    scroll?: boolean;
}

export function DrawerButton({active = false, children, icon, label, onClick}: DrawerButtonProps): JSX.Element {
    return (
        <button className={`iris-drawer-btn ${active ? 'iris-drawer-btn-active' : ''}`} onClick={onClick}>
            {icon && <div className="iris-drawer-btn-icon">{icon}</div>}
            <div className="iris-drawer-btn-label">{label}</div>
            {children}
        </button>
    );
}

export function DrawerSection({children, label, scroll = false}: DrawerSectionProps): JSX.Element {
    return (
        <div>
            <div className="iris-drawer-section-label">{label}</div>
            <div className={scroll ? 'iris-drawer-scroll-group' : 'iris-drawer-grid'}>
                {children}
            </div>
        </div>
    );
}
