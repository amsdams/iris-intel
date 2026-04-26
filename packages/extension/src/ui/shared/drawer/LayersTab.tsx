import { h, JSX, Fragment } from 'preact';
import { useStore, pluginManager } from '@iris/core';

export function LayersTab(): JSX.Element {
    const layerShowFields = useStore((state) => state.layerShowFields);
    const toggleLayerFields = useStore((state) => state.toggleLayerFields);
    const layerShowLinks = useStore((state) => state.layerShowLinks);
    const toggleLayerLinks = useStore((state) => state.toggleLayerLinks);
    const layerShowOrnaments = useStore((state) => state.layerShowOrnaments);
    const toggleLayerOrnaments = useStore((state) => state.toggleLayerOrnaments);
    const layerShowArtifacts = useStore((state) => state.layerShowArtifacts);
    const toggleLayerArtifacts = useStore((state) => state.toggleLayerArtifacts);
    const pluginStates = useStore((state) => state.pluginStates);
    const activeVisualOverlayIds = useStore((state) => state.activeVisualOverlayIds);
    const toggleVisualOverlay = useStore((state) => state.toggleVisualOverlay);

    return (
        <Fragment>
            <div className="iris-drawer-section-label">Structural Layers</div>
            <div className="iris-drawer-grid">
                <button className={`iris-drawer-btn ${layerShowFields ? 'iris-drawer-btn-active' : ''}`} onClick={toggleLayerFields}>
                    <div className="iris-drawer-btn-icon">🌐</div>
                    <div className="iris-drawer-btn-label">Fields</div>
                </button>
                <button className={`iris-drawer-btn ${layerShowLinks ? 'iris-drawer-btn-active' : ''}`} onClick={toggleLayerLinks}>
                    <div className="iris-drawer-btn-icon">⛓️</div>
                    <div className="iris-drawer-btn-label">Links</div>
                </button>
                
                {pluginStates['player-tracker'] && (
                    <button 
                        className={`iris-drawer-btn ${activeVisualOverlayIds.includes('player-tracker') ? 'iris-drawer-btn-active' : ''}`} 
                        onClick={() => {
                            toggleVisualOverlay('player-tracker');
                            setTimeout(() => pluginManager.syncVisualOverlays(), 0);
                        }}
                    >
                        <div className="iris-drawer-btn-icon">🏃</div>
                        <div className="iris-drawer-btn-label">Players</div>
                    </button>
                )}

                <button className={`iris-drawer-btn ${layerShowOrnaments ? 'iris-drawer-btn-active' : ''}`} onClick={toggleLayerOrnaments}>
                    <div className="iris-drawer-btn-icon">💠</div>
                    <div className="iris-drawer-btn-label">Event</div>
                </button>
                <button className={`iris-drawer-btn ${layerShowArtifacts ? 'iris-drawer-btn-active' : ''}`} onClick={toggleLayerArtifacts}>
                    <div className="iris-drawer-btn-icon">💎</div>
                    <div className="iris-drawer-btn-label">Shard</div>
                </button>
            </div>
        </Fragment>
    );
}
