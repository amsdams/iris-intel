import { h, JSX, Fragment } from 'preact';
import { useStore, pluginManager } from '@iris/core';
import {DrawerButton, DrawerSection} from './DrawerControls';

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
            <DrawerSection label="Structural Layers">
                <DrawerButton active={layerShowFields} icon="🌐" label="Fields" onClick={toggleLayerFields} />
                <DrawerButton active={layerShowLinks} icon="⛓️" label="Links" onClick={toggleLayerLinks} />
                
                {pluginStates['player-tracker'] && (
                    <DrawerButton
                        active={activeVisualOverlayIds.includes('player-tracker')}
                        icon="🏃"
                        label="Players"
                        onClick={() => {
                            toggleVisualOverlay('player-tracker');
                            setTimeout(() => pluginManager.syncVisualOverlays(), 0);
                        }}
                    />
                )}

                <DrawerButton active={layerShowOrnaments} icon="💠" label="Ornaments" onClick={toggleLayerOrnaments} />
                <DrawerButton active={layerShowArtifacts} icon="💎" label="Artifacts" onClick={toggleLayerArtifacts} />
            </DrawerSection>
        </Fragment>
    );
}
