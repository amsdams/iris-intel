import { JSX } from 'preact';
import { useStore, InventoryItemData, normalizeTeam } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { useState, useMemo } from 'preact/hooks';
import { THEMES, UI_COLORS, SPACING } from '../../theme';

type Category = 'ALL' | 'WEAPONS' | 'RESONATORS' | 'MODS' | 'POWERUPS' | 'CAPSULES' | 'KEYS';

interface GroupedInventoryItem {
    type: string;
    name: string;
    level?: number;
    rarity?: string;
    count: number;
    category: Category;
    moniker?: string;
}

export const InventoryPopup = ({ onClose }: { onClose: () => void }): JSX.Element => {
    const inventory = useStore((state) => state.inventory);
    const hasSubscription = useStore((state) => state.hasSubscription);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.DEFAULT;
    const [activeCategory, setActiveCategory] = useState<Category>('ALL');

    const categories: { label: string; value: Category }[] = [
        { label: 'ALL', value: 'ALL' },
        { label: 'WEAPONS', value: 'WEAPONS' },
        { label: 'RESONATORS', value: 'RESONATORS' },
        { label: 'MODS', value: 'MODS' },
        { label: 'POWERUPS', value: 'POWERUPS' },
        { label: 'CAPSULES', value: 'CAPSULES' },
        { label: 'KEYS', value: 'KEYS' },
    ];

    const parsedItems = useMemo((): GroupedInventoryItem[] => {
        const items: GroupedInventoryItem[] = [];

        const processItem = (data: InventoryItemData): GroupedInventoryItem | null => {
            if (data.resourceWithLevels) {
                return {
                    type: data.resourceWithLevels.resourceType,
                    level: data.resourceWithLevels.level,
                    name: data.resourceWithLevels.resourceType.replace(/_/g, ' '),
                    category: (data.resourceWithLevels.resourceType === 'EMITTER_A') ? 'RESONATORS' : 'WEAPONS',
                    count: 1
                };
            }
            if (data.modResource) {
                return {
                    type: data.modResource.resourceType,
                    name: data.modResource.displayName,
                    rarity: data.modResource.rarity,
                    category: 'MODS',
                    count: 1
                };
            }
            if (data.portalCoupler) {
                return {
                    type: 'PORTAL_LINK_KEY',
                    name: data.portalCoupler.portalTitle,
                    category: 'KEYS',
                    count: 1
                };
            }
            if (data.playerPowerupResource) {
                return {
                    type: data.playerPowerupResource.playerPowerupEnum,
                    name: data.playerPowerupResource.playerPowerupEnum,
                    category: 'POWERUPS',
                    count: 1
                };
            }
            if (data.timedPowerupResource) {
                return {
                    type: data.timedPowerupResource.designation,
                    name: data.timedPowerupResource.designation,
                    category: 'POWERUPS',
                    count: 1
                };
            }
            if (data.flipCard) {
                return {
                    type: data.flipCard.flipCardType,
                    name: data.flipCard.flipCardType,
                    category: 'WEAPONS',
                    count: 1
                };
            }
            if (data.container) {
                return {
                    type: data.resource?.resourceType || 'CAPSULE',
                    name: (data.resource?.resourceType || 'CAPSULE').replace(/_/g, ' '),
                    moniker: data.moniker?.differentiator,
                    category: 'CAPSULES',
                    count: 1
                };
            }
            return null;
        };

        inventory.forEach((item) => {
            const p = processItem(item);
            if (p) items.push(p);
        });

        return items;
    }, [inventory]);

    const groupedItems = useMemo((): GroupedInventoryItem[] => {
        const groups: Record<string, GroupedInventoryItem> = {};

        const addToGroup = (item: GroupedInventoryItem): void => {
            const key = `${item.type}-${item.level || ''}-${item.rarity || ''}-${item.name || ''}`;
            if (!groups[key]) {
                groups[key] = { ...item, count: 0 };
            }
            groups[key].count += 1;
        };

        parsedItems.forEach(item => {
            addToGroup(item);
        });

        return Object.values(groups).sort((a, b) => {
            if (a.category !== b.category) return a.category.localeCompare(b.category);
            if (a.level !== b.level) return (b.level || 0) - (a.level || 0);
            return a.name.localeCompare(b.name);
        });
    }, [parsedItems]);

    const filteredItems = useMemo((): GroupedInventoryItem[] => {
        if (activeCategory === 'ALL') return groupedItems;
        return groupedItems.filter(item => item.category === activeCategory);
    }, [groupedItems, activeCategory]);

    const totalCount = parsedItems.length;

    const handleRefresh = (): void => {
        window.postMessage({ type: 'IRIS_DATA_REQUEST', url: 'getInventory' }, '*');
    };

    const getItemColor = (item: GroupedInventoryItem): string => {
        if (item.category === 'RESONATORS' || item.category === 'WEAPONS') {
            if (item.type === 'ADA' || item.type === 'JARVIS') {
                return theme[normalizeTeam(item.type) as 'E' | 'R'] || theme.AQUA;
            }
            return theme.LEVELS[item.level || 0] || UI_COLORS.TEXT_BASE;
        }
        if (item.category === 'MODS' && item.rarity) {
            return theme.RARITY[item.rarity] || UI_COLORS.TEXT_BASE;
        }
        if (item.category === 'KEYS') {
            return theme.AQUA;
        }
        return UI_COLORS.TEXT_BASE;
    };

    return (
        <Popup 
            title="INVENTORY" 
            onClose={onClose}
            noScroll={true}
            headerExtras={
                <button 
                    className="iris-comm-refresh-btn"
                    onClick={handleRefresh}
                    style={{
                        background: 'transparent',
                        border: `1px solid ${UI_COLORS.AQUA}`,
                        color: UI_COLORS.AQUA,
                        fontSize: '9px',
                        padding: '2px 6px',
                        cursor: 'pointer',
                        borderRadius: '2px',
                        marginRight: SPACING.SM,
                    }}
                >
                    REFRESH
                </button>
            }
            style={{
                top: '50px',
                right: '10px',
                left: '10px',
                width: 'auto',
                maxWidth: '450px',
                height: 'calc(80vh - 60px)',
                marginLeft: 'auto',
            }}
        >
            {!hasSubscription ? (
                <div style={{ padding: '20px', textAlign: 'center', color: UI_COLORS.TEXT_MUTED }}>
                    <div style={{ color: UI_COLORS.ERROR, marginBottom: '10px', fontSize: '1.1em', fontWeight: 'bold' }}>
                        C.O.R.E. SUBSCRIPTION REQUIRED
                    </div>
                    <p style={{ fontSize: '0.85em' }}>Niantic restricts inventory access to C.O.R.E. subscribers on the Intel Map.</p>
                </div>
            ) : (
                <div className="iris-inventory" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ marginBottom: SPACING.SM, padding: `0 ${SPACING.XS}`, fontSize: '0.8em', color: UI_COLORS.TEXT_MUTED }}>
                        TOTAL: <span style={{ color: theme.AQUA, fontWeight: 'bold' }}>{totalCount}</span> / 2500
                    </div>

                    <div className="iris-comm-tabs" style={{ 
                        display: 'flex', 
                        borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`, 
                        marginBottom: SPACING.SM,
                        overflowX: 'auto',
                        whiteSpace: 'nowrap',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}>
                        {categories.map(cat => (
                            <div 
                                key={cat.value}
                                className={`iris-comm-tab ${activeCategory === cat.value ? 'iris-comm-tab-active' : ''}`}
                                onClick={() => setActiveCategory(cat.value)}
                                style={{
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontSize: '0.75em',
                                    borderBottom: activeCategory === cat.value ? `2px solid ${UI_COLORS.AQUA}` : 'none',
                                    color: activeCategory === cat.value ? UI_COLORS.AQUA : UI_COLORS.TEXT_MUTED,
                                    fontWeight: activeCategory === cat.value ? 'bold' : 'normal',
                                }}
                            >
                                {cat.label}
                            </div>
                        ))}
                    </div>

                    <div 
                        className="iris-comm-scroll-container"
                        style={{ 
                            flex: 1, 
                            overflowY: 'auto', 
                            paddingRight: '4px' 
                        }}
                    >
                        {filteredItems.length === 0 ? (
                            <div style={{ padding: SPACING.LG, textAlign: 'center', color: UI_COLORS.TEXT_MUTED, fontSize: '0.85em' }}>
                                No items found
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85em' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}`, color: UI_COLORS.TEXT_MUTED }}>
                                        <th style={{ padding: '4px', fontWeight: 'normal', fontSize: '0.8em' }}>ITEM</th>
                                        <th style={{ padding: '4px', textAlign: 'right', fontWeight: 'normal', fontSize: '0.8em' }}>COUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: `1px solid ${UI_COLORS.BORDER_DIM}` }}>
                                            <td style={{ padding: '6px 4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: getItemColor(item) }}>
                                                        {item.name}
                                                        {item.level && <span style={{ fontWeight: 'bold' }}> [L{item.level}]</span>}
                                                        {item.rarity && <span style={{ fontSize: '0.9em', opacity: 0.8 }}> ({item.rarity.replace(/_/g, ' ')})</span>}
                                                        {item.moniker && <span style={{ fontSize: '0.9em', color: UI_COLORS.TEXT_MUTED }}> [{item.moniker}]</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'bold', color: theme.AQUA }}>
                                                {item.count}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </Popup>
    );
};
