import { h, JSX, Fragment } from 'preact';

interface AgentTabProps {
    onAction: (action: string) => void;
}

export function AgentTab({ onAction }: AgentTabProps): JSX.Element {
    return (
        <Fragment>
            <div className="iris-drawer-section-label">Agent Tools</div>
            <div className="iris-drawer-grid">
                <button className="iris-drawer-btn" onClick={() => onAction('stats')}>
                    <div className="iris-drawer-btn-icon">👤</div>
                    <div className="iris-drawer-btn-label">Stats</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('inventory')}>
                    <div className="iris-drawer-btn-icon">🎒</div>
                    <div className="iris-drawer-btn-label">Items</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('comm')}>
                    <div className="iris-drawer-btn-icon">💬</div>
                    <div className="iris-drawer-btn-label">COMM</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('passcodes')}>
                    <div className="iris-drawer-btn-icon">🔑</div>
                    <div className="iris-drawer-btn-label">Codes</div>
                </button>
            </div>
            <div className="iris-drawer-section-label">MU Scores</div>
            <div className="iris-drawer-grid">
                <button className="iris-drawer-btn" onClick={() => onAction('gameScore')}>
                    <div className="iris-drawer-btn-icon">📊</div>
                    <div className="iris-drawer-btn-label">Global</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('regionScore')}>
                    <div className="iris-drawer-btn-icon">📉</div>
                    <div className="iris-drawer-btn-label">Cell</div>
                </button>
            </div>
        </Fragment>
    );
}
