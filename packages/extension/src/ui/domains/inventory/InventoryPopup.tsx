import { JSX } from 'preact';
import { useStore, InventoryItemData, normalizeTeam } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { useState, useMemo } from 'preact/hooks';
import { THEMES, UI_COLORS } from '../../theme';
import './inventory.css';

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
    const theme = THEMES[themeId] || THEMES.INGRESS;
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
        window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
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
                >
                    REFRESH
                </button>
            }
            className="iris-popup-center iris-popup-medium"
            style={{
                ['--iris-popup-border' as any]: theme.AQUA,
                ['--iris-popup-shadow' as any]: `${theme.AQUA}55`,
                ['--iris-popup-title-color' as any]: theme.AQUA,
            }}
        >
            {!hasSubscription ? (
                <div className="iris-inventory-subscription-warning">
                    <div className="iris-inventory-subscription-warning-title">
                        C.O.R.E. SUBSCRIPTION REQUIRED
                    </div>
                    <p className="iris-inventory-subscription-warning-text">Niantic restricts inventory access to C.O.R.E. subscribers on the Intel Map.</p>
                </div>
            ) : (
                <div className="iris-inventory">
                    <div className="iris-inventory-total">
                        TOTAL: <span className="iris-inventory-total-value">{totalCount}</span> / 2500
                    </div>

                    <div className="iris-inventory-tabs">
                        {categories.map(cat => (
                            <div 
                                key={cat.value}
                                className={`iris-inventory-tab ${activeCategory === cat.value ? 'iris-inventory-tab-active' : ''}`}
                                onClick={() => setActiveCategory(cat.value)}
                            >
                                {cat.label}
                            </div>
                        ))}
                    </div>

                    <div className="iris-inventory-scroll-container">
                        {filteredItems.length === 0 ? (
                            <div className="iris-inventory-empty">
                                No items found
                            </div>
                        ) : (
                            <table className="iris-inventory-table">
                                <thead>
                                    <tr>
                                        <th>ITEM</th>
                                        <th>COUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className="iris-inventory-item-name">
                                                    <span 
                                                        className="iris-inventory-item-name-value"
                                                        style={{ ['--iris-item-color' as any]: getItemColor(item) }}
                                                    >
                                                        {item.name}
                                                        {item.level && <span className="iris-inventory-item-level"> [L{item.level}]</span>}
                                                        {item.rarity && <span className="iris-inventory-item-rarity"> ({item.rarity.replace(/_/g, ' ')})</span>}
                                                        {item.moniker && <span className="iris-inventory-item-moniker"> [{item.moniker}]</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
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
