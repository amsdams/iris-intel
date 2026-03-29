import { h, JSX } from 'preact';
import { useStore, pluginManager } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { UI_COLORS } from '../../theme';

interface PluginsPopupProps {
    onClose: () => void;
}

export function PluginsPopup({ onClose }: PluginsPopupProps): JSX.Element {
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
            style={{
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '350px',
            }}
        >
            <div className="iris-plugins-list">
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
                                className={`iris-plugin-item ${isEnabled ? 'iris-plugin-item-enabled' : 'iris-plugin-item-disabled'}`}
                            >
                                <div className="iris-plugin-header">
                                    <span className="iris-plugin-name">
                                        {plugin.manifest.name}
                                    </span>
                                    <button 
                                        className="iris-plugin-toggle-btn"
                                        onClick={() => togglePlugin(plugin.manifest.id)}
                                        style={{
                                            background: isEnabled ? '#ff4444' : UI_COLORS.AQUA,
                                        }}
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
