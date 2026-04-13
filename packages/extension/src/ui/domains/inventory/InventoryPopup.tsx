import { JSX } from 'preact';
import { useStore, normalizeTeam } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { useState, useMemo } from 'preact/hooks';
import { THEMES, UI_COLORS, getItemRarityColor } from '../../theme';
import { deriveInventoryDisplayItems, InventoryCategory } from '../../../content/domains/inventory/parser';
import './inventory.css';

interface GroupedInventoryItem {
    type: string;
    name: string;
    level?: number;
    rarity?: string;
    count: number;
    category: InventoryCategory;
    moniker?: string;
}

export const InventoryPopup = ({ onClose }: { onClose: () => void }): JSX.Element => {
    const inventory = useStore((state) => state.inventory);
    const hasSubscription = useStore((state) => state.hasSubscription);
    const inventoryEndpoint = useStore((state) => state.endpointDiagnostics.inventory);
    const inventoryStatus = inventoryEndpoint.status;
    const showMockTools = useStore((state) => state.showMockTools);
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    const [activeCategory, setActiveCategory] = useState<InventoryCategory>('ALL');

    const categories: { label: string; value: InventoryCategory }[] = [
        { label: 'ALL', value: 'ALL' },
        { label: 'WEAPONS', value: 'WEAPONS' },
        { label: 'RESONATORS', value: 'RESONATORS' },
        { label: 'MODS', value: 'MODS' },
        { label: 'POWERUPS', value: 'POWERUPS' },
        { label: 'CAPSULES', value: 'CAPSULES' },
        { label: 'KEYS', value: 'KEYS' },
    ];

    const parsedItems = useMemo(
        (): GroupedInventoryItem[] => deriveInventoryDisplayItems(inventory).map((item) => ({
            type: item.type,
            name: item.name,
            level: item.level,
            rarity: item.rarity,
            moniker: item.moniker,
            category: item.category,
            count: 1,
        })),
        [inventory],
    );

    const groupedItems = useMemo((): GroupedInventoryItem[] => {
        const groups: Record<string, GroupedInventoryItem> = {};

        const addToGroup = (item: GroupedInventoryItem): void => {
            const key = `${item.type}-${item.level || ''}-${item.rarity || ''}-${item.name || ''}-${item.moniker || ''}`;
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
    const inventoryHasLoaded = inventoryEndpoint.lastSuccessAt !== null;

    const handleRefresh = (): void => {
        window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
    };

    const handleLoadMock = (): void => {
        window.postMessage({ type: 'IRIS_LOAD_MOCK_INVENTORY' }, '*');
    };

    const handleClearMock = (): void => {
        window.postMessage({ type: 'IRIS_CLEAR_MOCK_INVENTORY' }, '*');
    };

    const getItemColor = (item: GroupedInventoryItem): string => {
        if (item.category === 'RESONATORS' || item.category === 'WEAPONS') {
            if (item.type === 'ADA' || item.type === 'JARVIS') {
                return theme.ITEM_TYPES.VIRUS || theme[normalizeTeam(item.type) as 'E' | 'R'] || theme.AQUA;
            }
            return theme.LEVELS[item.level || 0] || UI_COLORS.TEXT_BASE;
        }
        if (item.category === 'MODS' && item.rarity) {
            return getItemRarityColor(theme, item.rarity);
        }
        if (item.category === 'CAPSULES') {
            if (item.type.toUpperCase().includes('KINETIC')) return theme.ITEM_TYPES.KINETIC_CAPSULE || UI_COLORS.TEXT_BASE;
            return theme.ITEM_TYPES.CAPSULE || UI_COLORS.TEXT_BASE;
        }
        if (item.category === 'KEYS') {
            return theme.ITEM_TYPES.PORTAL_LINK_KEY || theme.AQUA;
        }
        if (item.category === 'POWERUPS') {
            return theme.ITEM_TYPES.POWERUP || UI_COLORS.TEXT_BASE;
        }
        return getItemRarityColor(theme, item.rarity);
    };

    return (
        <Popup 
            title="INVENTORY" 
            onClose={onClose}
            noScroll={false}
            contentClassName="iris-popup-content-no-padding"
            headerExtras={
                <div className="iris-flex iris-gap-2">
                    {showMockTools && (
                        <>
                            <button
                                className="iris-button iris-comm-refresh-btn"
                                onClick={handleLoadMock}
                            >
                                LOAD MOCK
                            </button>
                            <button
                                className="iris-button iris-comm-refresh-btn"
                                onClick={handleClearMock}
                            >
                                CLEAR MOCK
                            </button>
                        </>
                    )}
                    <button 
                        className="iris-button iris-comm-refresh-btn"
                        onClick={handleRefresh}
                    >
                        REFRESH
                    </button>
                </div>
            }
            className="iris-popup-top-center iris-popup-medium"
             style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
            } as Record<string, string>}
        >
            {!hasSubscription && inventoryStatus === 'in_flight' ? (
                <div className="iris-inventory-subscription-warning">
                    <div className="iris-inventory-subscription-warning-title">
                        CHECKING C.O.R.E. ACCESS...
                    </div>
                    <p className="iris-inventory-subscription-warning-text">Waiting for Intel inventory access confirmation.</p>
                </div>
            ) : !hasSubscription ? (
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
                        {inventoryStatus === 'in_flight' && totalCount === 0 ? (
                            <div className="iris-inventory-empty">
                                Loading inventory from Intel...
                            </div>
                        ) : !inventoryHasLoaded && totalCount === 0 ? (
                            <div className="iris-inventory-empty">
                                Inventory not loaded yet. Use REFRESH after Intel inventory access succeeds.
                            </div>
                        ) : filteredItems.length === 0 && totalCount === 0 ? (
                            <div className="iris-inventory-empty">
                                Intel returned no inventory items yet. Try REFRESH to re-check.
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="iris-inventory-empty">
                                No items found in this category
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
                                                        style={{ '--iris-item-color': getItemColor(item) } as Record<string, string>}
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
