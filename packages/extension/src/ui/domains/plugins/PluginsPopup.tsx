import { h, JSX } from 'preact';
import { useStore, pluginManager } from '@iris/core';
import { Popup } from '../../shared/Popup';
import './plugins.css';
import {THEMES} from "../../theme";

interface PluginsPopupProps {
    onClose: () => void;
}

export function PluginsPopup({ onClose }: PluginsPopupProps): JSX.Element {
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    const pluginStates = useStore((state) => state.pluginStates);
    const availablePlugins = pluginManager.getAvailablePlugins();

    const togglePlugin = (id: string): void => {
        const isEnabled = pluginStates[id];
        pluginManager.setEnabled(id, !isEnabled);
    };

    return (
        <Popup
            onClose={onClose}
            title="Plugin Manager"
            className="iris-popup-top-center iris-popup-medium"
            style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            <div className="iris-plugins-list iris-ui-list">
                {availablePlugins.length === 0 ? (
                    <div className="iris-plugins-empty">
                        No plugins loaded.
                    </div>
                ) : (
                    availablePlugins.map((plugin) => {
                        const isEnabled = pluginStates[plugin.manifest.id] ?? false;
                        return (
                            <div 
                                key={plugin.manifest.id}
                                className={`iris-plugin-item iris-ui-list-row iris-ui-list-row-static ${isEnabled ? 'iris-plugin-item-enabled iris-ui-list-row-active' : 'iris-plugin-item-disabled'}`}
                            >
                                <div className="iris-plugin-header">
                                    <span className="iris-plugin-name">
                                        {plugin.manifest.name}
                                    </span>
                                    <button 
                                        type="button"
                                        className={`iris-ui-list-action ${isEnabled ? 'iris-ui-list-action-danger' : 'iris-ui-list-action-primary'}`}
                                        onClick={() => togglePlugin(plugin.manifest.id)}
                                    >
                                        {isEnabled ? 'DISABLE' : 'ENABLE'}
                                    </button>
                                </div>
                                <div className="iris-plugin-description">
                                    {plugin.manifest.description}
                                </div>
                                <div className="iris-plugin-meta">
                                    v{plugin.manifest.version} by {plugin.manifest.author}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </Popup>
    );
}
