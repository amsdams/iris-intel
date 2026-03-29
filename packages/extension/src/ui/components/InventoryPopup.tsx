import { JSX } from 'preact';
import { useStore, InventoryItemData } from '@iris/core';
import { Popup } from './Popup';
import { useState, useMemo } from 'preact/hooks';

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
    const [activeCategory, setActiveCategory] = useState<Category>('ALL');

    const categories: { label: string; value: Category }[] = [
        { label: 'All', value: 'ALL' },
        { label: 'Weapons', value: 'WEAPONS' },
        { label: 'Resonators', value: 'RESONATORS' },
        { label: 'Mods', value: 'MODS' },
        { label: 'Powerups', value: 'POWERUPS' },
        { label: 'Capsules', value: 'CAPSULES' },
        { label: 'Keys', value: 'KEYS' },
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

    return (
        <Popup title="Inventory" onClose={onClose} width={500}>
            {!hasSubscription ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ color: 'var(--iris-text-warn)', marginBottom: '10px', fontSize: '1.2em' }}>
                        C.O.R.E. Subscription Required
                    </div>
                    <p>Niantic restricts inventory access to C.O.R.E. subscribers on the Intel Map.</p>
                </div>
            ) : (
                <div className="iris-inventory">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 10px' }}>
                        <div style={{ fontSize: '0.9em', color: 'var(--iris-text-secondary)' }}>
                            Total Items: <span style={{ color: 'var(--iris-text-primary)' }}>{totalCount}</span> / 2500
                        </div>
                        <button 
                            className="iris-button" 
                            onClick={() => window.postMessage({ type: 'IRIS_DATA_REQUEST', url: 'getInventory' }, '*')}
                            title="Refresh inventory data"
                        >
                            Refresh
                        </button>
                    </div>

                    <div className="iris-tabs" style={{ marginBottom: '10px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
                        {categories.map(cat => (
                            <div 
                                key={cat.value}
                                className={`iris-tab ${activeCategory === cat.value ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.value)}
                            >
                                {cat.label}
                            </div>
                        ))}
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '0 10px' }}>
                        {filteredItems.length === 0 ? (
                            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--iris-text-secondary)' }}>
                                No items found in this category.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--iris-border)' }}>
                                        <th style={{ padding: '8px 4px' }}>Item</th>
                                        <th style={{ padding: '8px 4px', textAlign: 'right' }}>Count</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--iris-border-subtle)' }}>
                                            <td style={{ padding: '8px 4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className={`iris-rarity-${(item.rarity || 'common').toLowerCase().replace(/_/g, '-')}`}>
                                                        {item.name}
                                                        {item.level && ` [L${item.level}]`}
                                                        {item.rarity && ` (${item.rarity.replace(/_/g, ' ')})`}
                                                        {item.moniker && ` [${item.moniker}]`}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 'bold' }}>
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
