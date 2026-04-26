import { h, JSX, Fragment } from 'preact';
import { useStore, pluginManager } from '@iris/core';

export function LayersTab(): JSX.Element {
    const showFields = useStore((state) => state.showFields);
    const toggleShowFields = useStore((state) => state.toggleShowFields);
    const showLinks = useStore((state) => state.showLinks);
    const toggleShowLinks = useStore((state) => state.toggleShowLinks);
    const showOrnaments = useStore((state) => state.showOrnaments);
    const toggleShowOrnaments = useStore((state) => state.toggleShowOrnaments);
    const showArtifacts = useStore((state) => state.showArtifacts);
    const toggleShowArtifacts = useStore((state) => state.toggleShowArtifacts);
    const pluginStates = useStore((state) => state.pluginStates);
    const activeHighlighterIds = useStore((state) => state.activeHighlighterIds);
    const toggleHighlighter = useStore((state) => state.toggleHighlighter);

    return (
        <Fragment>
            <div className="iris-drawer-section-label">Structural Layers</div>
            <div className="iris-drawer-grid">
                <button className={`iris-drawer-btn ${showFields ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowFields}>
                    <div className="iris-drawer-btn-icon">🌐</div>
                    <div className="iris-drawer-btn-label">Fields</div>
                </button>
                <button className={`iris-drawer-btn ${showLinks ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowLinks}>
                    <div className="iris-drawer-btn-icon">⛓️</div>
                    <div className="iris-drawer-btn-label">Links</div>
                </button>
                
                {pluginStates['player-tracker'] && (
                    <button 
                        className={`iris-drawer-btn ${activeHighlighterIds.includes('player-tracker') ? 'iris-drawer-btn-active' : ''}`} 
                        onClick={() => {
                            toggleHighlighter('player-tracker');
                            setTimeout(() => pluginManager.syncHighlighters(), 0);
                        }}
                    >
                        <div className="iris-drawer-btn-icon">🏃</div>
                        <div className="iris-drawer-btn-label">Players</div>
                    </button>
                )}

                <button className={`iris-drawer-btn ${showOrnaments ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowOrnaments}>
                    <div className="iris-drawer-btn-icon">💠</div>
                    <div className="iris-drawer-btn-label">Event</div>
                </button>
                <button className={`iris-drawer-btn ${showArtifacts ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowArtifacts}>
                    <div className="iris-drawer-btn-icon">💎</div>
                    <div className="iris-drawer-btn-label">Shard</div>
                </button>
            </div>
        </Fragment>
    );
}
