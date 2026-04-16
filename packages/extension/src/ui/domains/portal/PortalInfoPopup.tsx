import {h, JSX} from 'preact';
import {PortalMod, PortalResonator, useStore, InventoryParser} from '@iris/core';
import {Popup} from '../../shared/Popup';
import {THEMES, TEAM_NAME, UI_COLORS, getItemRarityColor} from '../../theme';
import { getOrnamentLabel } from '../../../content/domains/entities/ornaments';

// ---------------------------------------------------------------------------
// PortalInfoPopup
// ---------------------------------------------------------------------------

const MAX_RESO_ENERGY = [0, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 6000];

function formatModStat(key: string, val: string | number): string {
    const label = key.replace(/_/g, ' ').toLowerCase();
    let displayVal = String(val);

    if (key === 'HACK_SPEED' || key === 'HIT_BONUS' || key === 'REMOVAL_STICKINESS') {
        displayVal = `${Number(val) / 10000}%`;
    } else if (key === 'ATTACK_FREQUENCY' || key === 'FORCE_AMPLIFIER' || key === 'LINK_RANGE_MULTIPLIER' || key === 'LINK_DEFENSE_BOOST') {
        displayVal = `${Number(val) / 1000}x`;
    }

    return `${displayVal} ${label}`;
}

export function PortalInfoPopup(): JSX.Element | null {
    const portals = useStore((state) => state.portals);
    const artifacts = useStore((state) => state.artifacts);
    const inventory = useStore((state) => state.inventory);
    const inventoryEndpoint = useStore((state) => state.endpointDiagnostics.inventory);
    const links = useStore((state) => state.links);
    const selectedPortalId = useStore((state) => state.selectedPortalId);
    const portal = selectedPortalId ? portals[selectedPortalId] : null;
    const artifact = selectedPortalId ? artifacts[selectedPortalId] : null;

    const selectPortal = useStore((state) => state.selectPortal);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;

    if (!portal) return null;

    const factionKey = portal.team as 'E' | 'R' | 'M' | 'N';
    const colour = theme[factionKey] || theme.N || UI_COLORS.TEXT_BASE;
    const teamName = TEAM_NAME[portal.team] || 'Unknown';

    const allResonators: (PortalResonator | null)[] = Array.from({length: 8}, () => null);
    if (portal.resonators) {
        portal.resonators.forEach((r: PortalResonator, i: number) => {
            if (i < 8) allResonators[i] = r;
        });
    }

    const allMods: (PortalMod | null)[] = Array.from({length: 4}, () => null);
    if (portal.mods) {
        portal.mods.forEach((m: PortalMod, i: number) => {
            if (i < 4) allMods[i] = m;
        });
    }

    const totalEnergy = (portal.resonators || []).reduce((sum, resonator) => sum + resonator.energy, 0);
    const maxEnergy = (portal.resonators || []).reduce((sum, resonator) => sum + (MAX_RESO_ENERGY[resonator.level] || 0), 0);
    const linksIn = Object.values(links).filter((link) => link.toPortalId === portal.id).length;
    const linksOut = Object.values(links).filter((link) => link.fromPortalId === portal.id).length;
    const keyCount = InventoryParser.countPortalKeys(inventory, portal.id);
    const inventoryHasLoaded = inventoryEndpoint.lastSuccessAt !== null;
    const ornaments = portal.ornaments || [];

    const openPortalMissions = (): void => {
        document.dispatchEvent(
            new CustomEvent('iris:missions:open', {detail: {portalId: portal.id}})
        );
    };

    return (
        <Popup
            onClose={() => selectPortal(null)}
            title={'Portal Details'}
            className="iris-popup-top-center iris-popup-medium"
            contentClassName="iris-popup-content-no-padding"
            style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
                '--iris-rarity-very-common': theme.ITEM_RARITY.VERY_COMMON || '#fff',
                '--iris-rarity-common': theme.ITEM_RARITY.COMMON || '#8cffbf',
                '--iris-rarity-rare': theme.ITEM_RARITY.RARE || '#73a8ff',
                '--iris-rarity-very-rare': theme.ITEM_RARITY.VERY_RARE || '#b08cff',
                '--iris-rarity-extremely-rare': theme.ITEM_RARITY.EXTREMELY_RARE || '#f00',
            } as Record<string, string>}
        >
            <div className="iris-portal-info">
                {portal.image && (
                    <div className="iris-portal-image-container">
                        <img
                            src={portal.image}
                            alt={portal.name || 'Portal'}
                            className="iris-portal-image"
                        />
                    </div>
                )}

                <div className="iris-portal-name" style={{ color: colour }}>
                    {portal.name || 'Loading...'}
                </div>

                <div className="iris-portal-summary-table">
                    <div className="iris-portal-summary-col">
                        <div className="iris-portal-summary-row">
                            <span className="iris-portal-summary-label">Team</span>
                            <span
                                className="iris-portal-summary-value iris-portal-summary-value-faction" style={{ color: colour }}>{teamName}</span>
                        </div>
                        <div className="iris-portal-summary-row">
                            <span className="iris-portal-summary-label">Owner</span>
                            <span className="iris-portal-summary-value iris-portal-summary-value-faction"  style={{ color: colour }}>
                                {portal.owner || 'Unknown'}
                            </span>
                        </div>
                    </div>
                    <div className="iris-portal-summary-col">
                        <div className="iris-portal-summary-row">
                            <span className="iris-portal-summary-label">Level</span>
                            <span
                                className="iris-portal-summary-value iris-portal-summary-value-level"
                                style={{'--iris-level-color': portal.level !== undefined ? (theme.LEVELS[portal.level] || '#ffff00') : undefined} as Record<string, string>}
                            >
                                {portal.level !== undefined ? portal.level : 'Unknown'}
                            </span>
                        </div>
                        <div className="iris-portal-summary-row">
                            <span className="iris-portal-summary-label">Health</span>
                            <span className="iris-portal-summary-value iris-portal-summary-value-health">
                                {portal.health !== undefined ? `${portal.health}%` : 'Unknown'}
                            </span>
                        </div>
                    </div>
                </div>

                {artifact && (
                    <div className="iris-portal-artifact-section">
                        <div className="iris-portal-artifact-title">
                            ARTIFACT: {artifact.type.toUpperCase()}
                        </div>
                        <div className="iris-portal-artifact-grid">
                            {artifact.ids.map(id => (
                                <span key={id} className="iris-portal-artifact-badge">
                                    #{id}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {ornaments.length > 0 && (
                    <div className="iris-portal-ornament-section">
                        <div className="iris-portal-ornament-title">
                            ORNAMENTS
                        </div>
                        <div className="iris-portal-ornament-grid">
                            {ornaments.map((ornament) => (
                                <span key={ornament} className="iris-portal-ornament-badge">
                                    {getOrnamentLabel(ornament)}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="iris-portal-mods-section">
                    <div className="iris-portal-section-title">
                        MODS
                    </div>
                    <div className="iris-portal-mods-grid">
                        {allMods.map((m, i) => {
                            if (!m) {
                                return (
                                    <div key={i} className="iris-portal-mod-item iris-portal-mod-item-empty">
                                        <span className="iris-portal-mod-name">EMPTY</span>
                                        <span className="iris-portal-mod-owner">-</span>
                                    </div>
                                );
                            }
                            const modRarityColor = getItemRarityColor(theme, m.rarity);
                            return (
                                <div
                                    key={i}
                                    className="iris-portal-mod-item"
                                    style={{'--iris-mod-rarity-color': modRarityColor} as Record<string, string>}
                                >
                                    <span className="iris-portal-mod-name">
                                        {m.rarity} {m.name}
                                    </span>
                                    <span className="iris-portal-mod-owner" style={{ color: colour }}>{m.owner}</span>
                                    {m.stats && Object.keys(m.stats).length > 0 && (
                                        <div className="iris-portal-mod-stats">
                                            {Object.keys(m.stats).map(key => (
                                                <div key={key}>
                                                    +{formatModStat(key, m.stats[key])}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="iris-portal-resonators-section">
                    <div className="iris-portal-section-title">
                        RESONATORS ({portal.resonators?.length || 0}/8)
                    </div>
                    <div className="iris-portal-resonators-grid">
                        {allResonators.map((r, i) => {
                            if (!r) {
                                return (
                                    <div key={i}
                                         className="iris-portal-resonator-item iris-portal-resonator-item-empty">
                                        <div>EMPTY</div>
                                        <div style={{color: 'transparent'}}>-</div>
                                    </div>
                                );
                            }
                            const resonatorMaxEnergy = MAX_RESO_ENERGY[r.level] || 1000;
                            const healthPct = Math.round((r.energy / resonatorMaxEnergy) * 100);
                            const resoColor = theme.LEVELS[r.level] || UI_COLORS.BORDER_DIM;
                            const healthColor = healthPct > 50 ? '#00ff00' : (healthPct > 20 ? '#ffff00' : '#ff0000');
                            return (
                                <div
                                    key={i}
                                    className="iris-portal-resonator-item"
                                    style={{
                                        '--iris-reso-color': resoColor,
                                        '--iris-health-pct': `${healthPct}%`,
                                        '--iris-health-color': healthColor,
                                    } as Record<string, string>}
                                >
                                    <div className="iris-portal-resonator-header">
                                        <span className="iris-portal-resonator-level">
                                            L{r.level}
                                        </span>
                                        <span className="iris-portal-resonator-health-text">{healthPct}%</span>
                                    </div>
                                    <div className="iris-portal-resonator-owner" style={{ color: colour }}>{r.owner}</div>
                                    <div className="iris-portal-resonator-health-bar"/>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="iris-portal-details-section">
                    <div className="iris-portal-section-title">
                        DETAILS
                    </div>
                    <div className="iris-portal-details-grid">
                        <div className="iris-portal-details-table">
                            <div className="iris-portal-details-row">
                                <span className="iris-portal-details-label">Energy</span>
                                <span className="iris-portal-details-value">
                                    <span className="iris-portal-energy-current">{totalEnergy.toLocaleString()}</span>
                                    {maxEnergy > 0 &&
                                        <span className="iris-portal-energy-max"> / {maxEnergy.toLocaleString()}</span>}
                                </span>
                            </div>
                            <div className="iris-portal-details-row">
                                <span className="iris-portal-details-label">Keys</span>
                                <span className="iris-portal-details-value iris-portal-details-value-faction">
                                    {inventoryEndpoint.status === 'in_flight'
                                        ? 'loading...'
                                        : !inventoryHasLoaded
                                            ? 'not loaded'
                                            : inventory.length === 0
                                                ? 'unavailable'
                                                : keyCount.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="iris-portal-details-table">
                            <div className="iris-portal-details-row">
                                <span className="iris-portal-details-label">Links</span>
                                <span className="iris-portal-details-value iris-portal-details-value-faction">
                                    {linksIn} in / {linksOut} out
                                </span>
                            </div>
                            <div className="iris-portal-details-row">
                                <span className="iris-portal-details-label">Mitigation</span>
                                <span className="iris-portal-details-value">
                                    {portal.mitigation?.total || 0}
                                    {portal.mitigation?.excess && portal.mitigation.excess > 0 ? ` (+${portal.mitigation.excess})` : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {portal.hasMissionsStartingHere && (
                    <div style={{marginBottom: '8px'}}>
                        <button
                            onClick={openPortalMissions}
                            className="iris-portal-missions-button"
                        >
                            Missions Starting Here
                        </button>
                    </div>
                )}
                <div className="iris-portal-history-section">
                    <div className="iris-portal-section-title">
                        HISTORY
                    </div>
                    <div className="iris-portal-history-badges">
                        <span
                            className={`iris-portal-history-badge iris-portal-history-badge-visited ${portal.visited ? 'iris-portal-history-badge-active' : ''}`}>
                            Visited
                        </span>
                        <span
                            className={`iris-portal-history-badge iris-portal-history-badge-captured ${portal.captured ? 'iris-portal-history-badge-active' : ''}`}>
                            Captured
                        </span>
                        <span
                            className={`iris-portal-history-badge iris-portal-history-badge-scout-controlled ${portal.scoutControlled ? 'iris-portal-history-badge-active' : ''}`}>
                            Scout Controlled
                        </span>
                    </div>
                </div>
                <div className="iris-portal-coords">
                    {portal.lat.toFixed(6)}, {portal.lng.toFixed(6)}
                </div>
            </div>
        </Popup>
    );
}
