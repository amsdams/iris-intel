import { h, JSX, Fragment } from 'preact';
import { useStore } from '@iris/core';

export function TacticalTab(): JSX.Element {
    const filterShowResistance = useStore((state) => state.filterShowResistance);
    const toggleFilterResistance = useStore((state) => state.toggleFilterResistance);
    const filterShowEnlightened = useStore((state) => state.filterShowEnlightened);
    const toggleFilterEnlightened = useStore((state) => state.toggleFilterEnlightened);
    const filterShowMachina = useStore((state) => state.filterShowMachina);
    const toggleFilterMachina = useStore((state) => state.toggleFilterMachina);
    const filterShowUnclaimedPortals = useStore((state) => state.filterShowUnclaimedPortals);
    const toggleFilterUnclaimedPortals = useStore((state) => state.toggleFilterUnclaimedPortals);
    
    const filterShowLevel = useStore((state) => state.filterShowLevel);
    const toggleFilterLevel = useStore((state) => state.toggleFilterLevel);
    const filterShowHealth = useStore((state) => state.filterShowHealth);
    const toggleFilterHealth = useStore((state) => state.toggleFilterHealth);
    
    const filterShowVisited = useStore((state) => state.filterShowVisited);
    const toggleFilterVisited = useStore((state) => state.toggleFilterVisited);
    const filterShowCaptured = useStore((state) => state.filterShowCaptured);
    const toggleFilterCaptured = useStore((state) => state.toggleFilterCaptured);
    const filterShowScanned = useStore((state) => state.filterShowScanned);
    const toggleFilterScanned = useStore((state) => state.toggleFilterScanned);

    return (
        <Fragment>
            <div className="iris-drawer-section-label">Faction Filters</div>
            <div className="iris-drawer-scroll-group">
                <button className={`iris-drawer-btn ${filterShowEnlightened ? 'iris-drawer-btn-active' : ''}`} onClick={toggleFilterEnlightened}>
                    <div className="iris-drawer-btn-icon">💚</div>
                    <div className="iris-drawer-btn-label">ENL</div>
                </button>
                <button className={`iris-drawer-btn ${filterShowResistance ? 'iris-drawer-btn-active' : ''}`} onClick={toggleFilterResistance}>
                    <div className="iris-drawer-btn-icon">💙</div>
                    <div className="iris-drawer-btn-label">RES</div>
                </button>
                <button className={`iris-drawer-btn ${filterShowMachina ? 'iris-drawer-btn-active' : ''}`} onClick={toggleFilterMachina}>
                    <div className="iris-drawer-btn-icon">❤️</div>
                    <div className="iris-drawer-btn-label">MAC</div>
                </button>
                <button className={`iris-drawer-btn ${filterShowUnclaimedPortals ? 'iris-drawer-btn-active' : ''}`} onClick={toggleFilterUnclaimedPortals}>
                    <div className="iris-drawer-btn-icon">🤍</div>
                    <div className="iris-drawer-btn-label">NEU</div>
                </button>
            </div>

            <div className="iris-drawer-section-label">Level Filters</div>
            <div className="iris-drawer-scroll-group">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                    <button key={l} className={`iris-drawer-btn ${filterShowLevel[l] ? 'iris-drawer-btn-active' : ''}`} onClick={() => toggleFilterLevel(l)}>
                        <div className="iris-drawer-btn-label">L{l}</div>
                    </button>
                ))}
            </div>

            <div className="iris-drawer-section-label">Health Filters</div>
            <div className="iris-drawer-scroll-group">
                {[25, 50, 75, 100].map(h => (
                    <button key={h} className={`iris-drawer-btn ${filterShowHealth[h] ? 'iris-drawer-btn-active' : ''}`} onClick={() => toggleFilterHealth(h)}>
                        <div className="iris-drawer-btn-label">{h}%</div>
                    </button>
                ))}
            </div>

            <div className="iris-drawer-section-label">Agent History</div>
            <div className="iris-drawer-scroll-group">
                <button className={`iris-drawer-btn ${filterShowVisited ? 'iris-drawer-btn-active' : ''}`} onClick={toggleFilterVisited}>
                    <div className="iris-drawer-btn-label">Visited</div>
                </button>
                <button className={`iris-drawer-btn ${filterShowCaptured ? 'iris-drawer-btn-active' : ''}`} onClick={toggleFilterCaptured}>
                    <div className="iris-drawer-btn-label">Captured</div>
                </button>
                <button className={`iris-drawer-btn ${filterShowScanned ? 'iris-drawer-btn-active' : ''}`} onClick={toggleFilterScanned}>
                    <div className="iris-drawer-btn-label">Scanned</div>
                </button>
            </div>
        </Fragment>
    );
}
