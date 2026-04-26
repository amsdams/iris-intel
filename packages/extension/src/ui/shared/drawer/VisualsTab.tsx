import { h, JSX, Fragment } from 'preact';
import { useStore, pluginManager } from '@iris/core';

export function VisualsTab(): JSX.Element {
    const activeVisualOverlayIds = useStore((state) => state.activeVisualOverlayIds);
    const toggleVisualOverlay = useStore((state) => state.toggleVisualOverlay);
    const pluginStates = useStore((state) => state.pluginStates);

    const highlighters = pluginManager.getAvailablePlugins().filter(p => 
        p.manifest.capabilities?.includes('highlighter') && 
        p.manifest.id !== 'player-tracker' &&
        (pluginStates[p.manifest.id] ?? false)
    );

    return (
        <Fragment>
            <div className="iris-drawer-section-label">Visual Augmentations</div>
            {highlighters.length === 0 ? (
                <div className="iris-text-small iris-mt-2" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                    No highlighters enabled.
                </div>
            ) : (
                <div className="iris-drawer-grid">
                    {highlighters.map(p => (
                        <button 
                            key={p.manifest.id} 
                            className={`iris-drawer-btn ${activeVisualOverlayIds.includes(p.manifest.id) ? 'iris-drawer-btn-active' : ''}`}
                            onClick={() => {
                                toggleVisualOverlay(p.manifest.id);
                                setTimeout(() => pluginManager.syncVisualOverlays(), 0);
                            }}
                        >
                            <div className="iris-drawer-btn-icon">✨</div>
                            <div className="iris-drawer-btn-label">{p.manifest.name.replace('Portal ', '')}</div>
                        </button>
                    ))}
                </div>
            )}
        </Fragment>
    );
}
