import { h, JSX, Fragment } from 'preact';
import { useStore, pluginManager } from '@iris/core';
import { THEMES } from '../theme';
import './dock-drawer.css';

export type DrawerTab = 'intel' | 'nav' | 'highlighters' | 'layers' | 'system' | null;

interface DockDrawerProps {
    tab: DrawerTab;
    onClose: () => void;
    onAction: (action: string) => void;
    showMap: boolean;
}

export function DockDrawer({ tab, onClose, onAction, showMap }: DockDrawerProps): JSX.Element | null {
    if (!tab) return null;

    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    
    // Store states for live toggles
    const showResistance = useStore((state) => state.showResistance);
    const toggleShowResistance = useStore((state) => state.toggleShowResistance);
    const showEnlightened = useStore((state) => state.showEnlightened);
    const toggleShowEnlightened = useStore((state) => state.toggleShowEnlightened);
    const showMachina = useStore((state) => state.showMachina);
    const toggleShowMachina = useStore((state) => state.toggleShowMachina);
    const showUnclaimedPortals = useStore((state) => state.showUnclaimedPortals);
    const toggleShowUnclaimedPortals = useStore((state) => state.toggleShowUnclaimedPortals);
    
    const showFields = useStore((state) => state.showFields);
    const toggleShowFields = useStore((state) => state.toggleShowFields);
    const showLinks = useStore((state) => state.showLinks);
    const toggleShowLinks = useStore((state) => state.toggleShowLinks);
    const showOrnaments = useStore((state) => state.showOrnaments);
    const toggleShowOrnaments = useStore((state) => state.toggleShowOrnaments);
    const showArtifacts = useStore((state) => state.showArtifacts);
    const toggleShowArtifacts = useStore((state) => state.toggleShowArtifacts);

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

    const activeHighlighterIds = useStore((state) => state.activeHighlighterIds);
    const toggleHighlighter = useStore((state) => state.toggleHighlighter);
    const pluginStates = useStore((state) => state.pluginStates);
    const menuItems = useStore((state) => state.menuItems);

    const renderIntelContent = () => (
        <Fragment>
            <div className="iris-drawer-section-label">Agent Tools</div>
            <div className="iris-drawer-grid">
                <button className="iris-drawer-btn" onClick={() => onAction('stats')}>
                    <div className="iris-drawer-btn-icon">👤</div>
                    <div className="iris-drawer-btn-label">Stats</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('inventory')}>
                    <div className="iris-drawer-btn-icon">🎒</div>
                    <div className="iris-drawer-btn-label">Items</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('comm')}>
                    <div className="iris-drawer-btn-icon">💬</div>
                    <div className="iris-drawer-btn-label">COMM</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('passcodes')}>
                    <div className="iris-drawer-btn-icon">🔑</div>
                    <div className="iris-drawer-btn-label">Codes</div>
                </button>
            </div>
            <div className="iris-drawer-section-label">MU Scores</div>
            <div className="iris-drawer-grid">
                <button className="iris-drawer-btn" onClick={() => onAction('gameScore')}>
                    <div className="iris-drawer-btn-icon">📊</div>
                    <div className="iris-drawer-btn-label">Global</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('regionScore')}>
                    <div className="iris-drawer-btn-icon">📉</div>
                    <div className="iris-drawer-btn-label">Cell</div>
                </button>
            </div>
        </Fragment>
    );

    const renderNavContent = () => (
        <Fragment>
            <div className="iris-drawer-section-label">Map Navigation</div>
            <div className="iris-drawer-grid">
                <button className="iris-drawer-btn" onClick={() => onAction('search')}>
                    <div className="iris-drawer-btn-icon">🔍</div>
                    <div className="iris-drawer-btn-label">Search</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('nav')}>
                    <div className="iris-drawer-btn-icon">🧭</div>
                    <div className="iris-drawer-btn-label">Controls</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('missions')}>
                    <div className="iris-drawer-btn-icon">🚀</div>
                    <div className="iris-drawer-btn-label">Missions</div>
                </button>
            </div>
        </Fragment>
    );

    const renderHighlightersContent = () => {
        // Highlighters EXCLUDING player-tracker (which is now in Layers)
        const highlighters = pluginManager.getAvailablePlugins().filter(p => 
            p.manifest.capabilities?.includes('highlighter') && 
            p.manifest.id !== 'player-tracker' &&
            (pluginStates[p.manifest.id] ?? false)
        );

        return (
            <Fragment>
                <div className="iris-drawer-section-label">Tactical Highlighters</div>
                {highlighters.length === 0 ? (
                    <div className="iris-text-small iris-mt-2" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                        No highlighters enabled. Check Plugin Manager.
                    </div>
                ) : (
                    <div className="iris-drawer-grid">
                        {highlighters.map(p => (
                            <button 
                                key={p.manifest.id} 
                                className={`iris-drawer-btn ${activeHighlighterIds.includes(p.manifest.id) ? 'iris-drawer-btn-active' : ''}`}
                                onClick={() => {
                                    toggleHighlighter(p.manifest.id);
                                    setTimeout(() => pluginManager.syncHighlighters(), 0);
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
    };

    const renderLayersContent = () => (
        <Fragment>
            <div className="iris-drawer-section-label">Map Layers</div>
            <div className="iris-drawer-scroll-group">
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
                    <div className="iris-drawer-btn-label">Ornaments</div>
                </button>
                <button className={`iris-drawer-btn ${showArtifacts ? 'iris-drawer-btn-active' : ''}`} onClick={toggleShowArtifacts}>
                    <div className="iris-drawer-btn-icon">💎</div>
                    <div className="iris-drawer-btn-label">Artifacts</div>
                </button>
            </div>

            <div className="iris-drawer-section-label">Factions</div>
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

            <div className="iris-drawer-section-label">Levels</div>
            <div className="iris-drawer-scroll-group">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                    <button key={l} className={`iris-drawer-btn ${showLevel[l] ? 'iris-drawer-btn-active' : ''}`} onClick={() => toggleShowLevel(l)}>
                        <div className="iris-drawer-btn-label">L{l}</div>
                    </button>
                ))}
            </div>

            <div className="iris-drawer-section-label">Health</div>
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

    const renderSystemContent = () => (
        <Fragment>
            <div className="iris-drawer-section-label">System</div>
            <div className="iris-drawer-grid">
                <button className="iris-drawer-btn" onClick={() => onAction('plugins')}>
                    <div className="iris-drawer-btn-icon">🧩</div>
                    <div className="iris-drawer-btn-label">Manager</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('settings')}>
                    <div className="iris-drawer-btn-icon">⚙️</div>
                    <div className="iris-drawer-btn-label">Display</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('diag')}>
                    <div className="iris-drawer-btn-icon">🛠️</div>
                    <div className="iris-drawer-btn-label">Debug</div>
                </button>
                <button className="iris-drawer-btn" onClick={() => onAction('toggle')}>
                    <div className="iris-drawer-btn-icon">🔄</div>
                    <div className="iris-drawer-btn-label">{showMap ? 'Intel' : 'IRIS'}</div>
                </button>
            </div>
            
            {menuItems.length > 0 && (
                <Fragment>
                    <div className="iris-drawer-section-label">Plugin Actions</div>
                    <div className="iris-drawer-scroll-group">
                        {menuItems.map(m => (
                            <button key={m.id} className="iris-drawer-btn" onClick={() => { m.onClick(); onClose(); }}>
                                <div className="iris-drawer-btn-icon">📦</div>
                                <div className="iris-drawer-btn-label">{m.label}</div>
                            </button>
                        ))}
                    </div>
                </Fragment>
            )}
        </Fragment>
    );

    return (
        <div className="iris-dock-drawer">
            <div className="iris-drawer-header">
                <h3 className="iris-drawer-title">{tab.toUpperCase()} CONTROL</h3>
                <button className="iris-drawer-close" onClick={onClose}>✕</button>
            </div>
            <div className="iris-drawer-content">
                {tab === 'intel' && renderIntelContent()}
                {tab === 'nav' && renderNavContent()}
                {tab === 'highlighters' && renderHighlightersContent()}
                {tab === 'layers' && renderLayersContent()}
                {tab === 'system' && renderSystemContent()}
            </div>
        </div>
    );
}
