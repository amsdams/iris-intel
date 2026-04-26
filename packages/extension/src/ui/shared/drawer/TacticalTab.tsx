import { h, JSX, Fragment } from 'preact';
import { useStore } from '@iris/core';

export function TacticalTab(): JSX.Element {
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
    const showHealth = useStore((state) => state.showHealth);
    const toggleShowHealth = useStore((state) => state.toggleShowHealth);
    
    const showVisited = useStore((state) => state.showVisited);
    const toggleShowVisited = useStore((state) => state.toggleShowVisited);
    const showCaptured = useStore((state) => state.showCaptured);
    const toggleShowCaptured = useStore((state) => state.toggleShowCaptured);
    const showScanned = useStore((state) => state.showScanned);
    const toggleShowScanned = useStore((state) => state.toggleShowScanned);

    return (
        <Fragment>
            <div className="iris-drawer-section-label">Faction Filters</div>
            <div className="iris-drawer-scroll-group">
                <button className={`iris-drawer-btn ${showEnlightened ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowEnlightened}>
                    <div className="iris-drawer-btn-icon">💚</div>
                    <div className="iris-drawer-btn-label">ENL</div>
                </button>
                <button className={`iris-drawer-btn ${showResistance ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowResistance}>
                    <div className="iris-drawer-btn-icon">💙</div>
                    <div className="iris-drawer-btn-label">RES</div>
                </button>
                <button className={`iris-drawer-btn ${showMachina ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowMachina}>
                    <div className="iris-drawer-btn-icon">❤️</div>
                    <div className="iris-drawer-btn-label">MAC</div>
                </button>
                <button className={`iris-drawer-btn ${showUnclaimedPortals ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowUnclaimedPortals}>
                    <div className="iris-drawer-btn-icon">🤍</div>
                    <div className="iris-drawer-btn-label">NEU</div>
                </button>
            </div>

            <div className="iris-drawer-section-label">Level Filters</div>
            <div className="iris-drawer-scroll-group">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                    <button key={l} className={`iris-drawer-btn ${showLevel[l] ? 'iris-drawer-btn-active' : ''}`} onClick={() => toggleShowLevel(l)}>
                        <div className="iris-drawer-btn-label">L{l}</div>
                    </button>
                ))}
            </div>

            <div className="iris-drawer-section-label">Health Filters</div>
            <div className="iris-drawer-scroll-group">
                {[25, 50, 75, 100].map(h => (
                    <button key={h} className={`iris-drawer-btn ${showHealth[h] ? 'iris-drawer-btn-active' : ''}`} onClick={() => toggleShowHealth(h)}>
                        <div className="iris-drawer-btn-label">{h}%</div>
                    </button>
                ))}
            </div>

            <div className="iris-drawer-section-label">Agent History</div>
            <div className="iris-drawer-scroll-group">
                <button className={`iris-drawer-btn ${showVisited ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowVisited}>
                    <div className="iris-drawer-btn-label">Visited</div>
                </button>
                <button className={`iris-drawer-btn ${showCaptured ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowCaptured}>
                    <div className="iris-drawer-btn-label">Captured</div>
                </button>
                <button className={`iris-drawer-btn ${showScanned ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowScanned}>
                    <div className="iris-drawer-btn-label">Scanned</div>
                </button>
            </div>
        </Fragment>
    );
}
