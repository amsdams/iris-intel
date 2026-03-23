import { h } from 'preact';
import { useStore, pluginManager } from '@iris/core';
import { Popup } from './Popup';
import { UI_COLORS, SPACING } from '../theme';

interface PluginsPopupProps {
    onClose: () => void;
}

export function PluginsPopup({ onClose }: PluginsPopupProps) {
    const pluginStates = useStore((state) => state.pluginStates);
    const availablePlugins = pluginManager.getAvailablePlugins();

    const togglePlugin = (id: string) => {
        const isEnabled = !!pluginStates[id];
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {availablePlugins.length === 0 ? (
                    <div style={{ textAlign: 'center', color: UI_COLORS.TEXT_MUTED, padding: SPACING.MD }}>
                        No plugins loaded.
                    </div>
                ) : (
                    availablePlugins.map((plugin) => {
                        const isEnabled = !!pluginStates[plugin.manifest.id];
                        return (
                            <div 
                                key={plugin.manifest.id}
                                style={{
                                    background: '#111',
                                    padding: '10px',
                                    borderRadius: '4px',
                                    border: `1px solid ${isEnabled ? UI_COLORS.AQUA : '#333'}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold', color: isEnabled ? UI_COLORS.AQUA : '#fff' }}>
                                        {plugin.manifest.name}
                                    </span>
                                    <button 
                                        onClick={() => togglePlugin(plugin.manifest.id)}
                                        style={{
                                            background: isEnabled ? '#ff4444' : UI_COLORS.AQUA,
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '3px',
                                            padding: '4px 8px',
                                            fontSize: '0.75em',
                                            fontWeight: 'bold',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {isEnabled ? 'DISABLE' : 'ENABLE'}
                                    </button>
                                </div>
                                <div style={{ fontSize: '0.75em', color: UI_COLORS.TEXT_MUTED }}>
                                    {plugin.manifest.description}
                                </div>
                                <div style={{ fontSize: '0.7em', color: '#666' }}>
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
