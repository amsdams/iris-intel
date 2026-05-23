import { h, JSX, Fragment } from 'preact';
import { useStore, pluginManager } from '@iris/core';
import {DrawerButton} from './DrawerControls';

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
                <div className="iris-drawer-empty-note">
                    No highlighters enabled.
                </div>
            ) : (
                <div className="iris-drawer-grid">
                    {highlighters.map(p => (
                        <DrawerButton
                            key={p.manifest.id}
                            active={activeVisualOverlayIds.includes(p.manifest.id)}
                            icon="✨"
                            label={p.manifest.name.replace('Portal ', '')}
                            onClick={() => {
                                toggleVisualOverlay(p.manifest.id);
                                setTimeout(() => pluginManager.syncVisualOverlays(), 0);
                            }}
                        />
                    ))}
                </div>
            )}
        </Fragment>
    );
}
