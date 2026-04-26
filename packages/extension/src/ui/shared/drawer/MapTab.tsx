import { h, JSX, Fragment } from 'preact';

interface MapTabProps {
    onAction: (action: string) => void;
}

export function MapTab({ onAction }: MapTabProps): JSX.Element {
    return (
        <Fragment>
            <div className="iris-drawer-section-label">Map Navigation</div>
            <div className="iris-drawer-grid">
                <button className="iris-drawer-btn" onClick={() => onAction('search')}>
                    <div className="iris-drawer-btn-icon">🔍</div>
                    <div className="iris-drawer-btn-label">Search</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('nav')}>
                    <div className="iris-drawer-btn-icon">🧭</div>
                    <div className="iris-drawer-btn-label">Controls</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('missions')}>
                    <div className="iris-drawer-btn-icon">🚀</div>
                    <div className="iris-drawer-btn-label">Missions</div>
                </button>
            </div>
        </Fragment>
    );
}
