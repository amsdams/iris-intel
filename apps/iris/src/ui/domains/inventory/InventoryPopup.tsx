import { JSX } from 'preact';
import { useStore, normalizeTeam, InventoryParser, INVENTORY_CATEGORIES, createInventoryRequestMessage, type GroupedInventoryItem, type InventoryCategory, type InventorySortMode } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { useEffect, useState, useMemo } from 'preact/hooks';
import { THEMES, UI_COLORS, getItemRarityColor, getModRarityColor } from '../../theme';
import './inventory.css';
import { useRenderDiagnostics } from '../../shared/useRenderDiagnostics';

const CATEGORIES: { label: string; value: InventoryCategory }[] = INVENTORY_CATEGORIES.map((category) => ({
    label: category,
    value: category,
}));

export const InventoryPopup = ({ onClose }: { onClose: () => void }): JSX.Element => {
    useRenderDiagnostics('InventoryPopup');

    const inventory = useStore((state) => state.inventory);
    const hasSubscription = useStore((state) => state.hasSubscription);
    const inventoryEndpoint = useStore((state) => state.endpointDiagnostics.inventory);
    const inventoryStatus = inventoryEndpoint.status;
    const themeId = useStore((state) => state.themeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    const [activeCategory, setActiveCategory] = useState<InventoryCategory>('ALL');
    const [sortMode, setSortMode] = useState<InventorySortMode>('COUNT');
    const [searchText, setSearchText] = useState('');
    const inventoryHasLoaded = inventoryEndpoint.lastSuccessAt !== null;

    const parsedItems = useMemo(
        () => InventoryParser.deriveInventoryDisplayItems(inventory),
        [inventory],
    );

    const groupedItems = useMemo(
        (): GroupedInventoryItem[] => InventoryParser.groupInventoryDisplayItems(parsedItems, sortMode),
        [parsedItems, sortMode],
    );

    const normalizedSearch = searchText.trim().toLowerCase();

    const categoryCounts = useMemo(
        () => InventoryParser.countInventoryCategories(parsedItems),
        [parsedItems],
    );

    const visibleCategories = useMemo(
        () => CATEGORIES.filter((category) => category.value === 'ALL' || !inventoryHasLoaded || categoryCounts[category.value] > 0),
        [inventoryHasLoaded, categoryCounts],
    );

    useEffect(() => {
        if (!visibleCategories.some((category) => category.value === activeCategory)) {
            setActiveCategory('ALL');
        }
    }, [activeCategory, visibleCategories]);

    const filteredItems = useMemo(
        (): GroupedInventoryItem[] => InventoryParser.filterGroupedInventoryItems(groupedItems, activeCategory, normalizedSearch),
        [groupedItems, activeCategory, normalizedSearch],
    );

    const totalCount = parsedItems.length;
    const showSnapshotBehaviorHint = inventoryHasLoaded && totalCount > 0;

    const handleRefresh = (): void => {
        window.postMessage(createInventoryRequestMessage(), '*');
    };

    const getItemColor = (item: GroupedInventoryItem): string => {
        if (item.type === 'ADA' || item.type === 'JARVIS') {
            return theme.ITEM_TYPES.VIRUS || theme[normalizeTeam(item.type) as 'E' | 'R'] || theme.AQUA;
        }

        if (item.level) {
            return theme.LEVELS[item.level] || UI_COLORS.TEXT_BASE;
        }

        if (item.rarity) {
            if (item.category === 'MODS') {
                return getModRarityColor(theme, item.rarity, item.name, item.type);
            }
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
            noScroll={true}
            contentClassName="iris-popup-content-no-padding"
            headerExtras={
                <div className="iris-flex iris-gap-2">
                    <button 
                        type="button"
                        className="iris-inventory-refresh-btn iris-ui-compact-pill"
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

                    <div className="iris-inventory-hints">
                        <div className="iris-inventory-hint">
                            Totals and tabs include capsule contents.
                        </div>
                        {showSnapshotBehaviorHint && (
                            <div className="iris-inventory-hint">
                                If Intel returns an empty refresh, IRIS keeps the last known inventory snapshot.
                            </div>
                        )}
                    </div>

                    <div className="iris-inventory-sort iris-ui-toolbar">
                        <span className="iris-inventory-sort-label iris-ui-toolbar-label">SORT</span>
                        <button
                            type="button"
                            className={`iris-inventory-sort-chip iris-ui-compact-pill ${sortMode === 'COUNT' ? 'iris-inventory-sort-chip-active iris-ui-compact-pill-active' : ''}`}
                            onClick={() => setSortMode('COUNT')}
                        >
                            COUNT
                        </button>
                        <button
                            type="button"
                            className={`iris-inventory-sort-chip iris-ui-compact-pill ${sortMode === 'NAME' ? 'iris-inventory-sort-chip-active iris-ui-compact-pill-active' : ''}`}
                            onClick={() => setSortMode('NAME')}
                        >
                            NAME
                        </button>
                        <button
                            type="button"
                            className={`iris-inventory-sort-chip iris-ui-compact-pill ${sortMode === 'RARITY' ? 'iris-inventory-sort-chip-active iris-ui-compact-pill-active' : ''}`}
                            onClick={() => setSortMode('RARITY')}
                        >
                            RARITY
                        </button>
                    </div>

                    <div className="iris-inventory-filter">
                        <input
                            type="text"
                            value={searchText}
                            className="iris-input iris-inventory-search-input"
                            onInput={(event) => setSearchText((event.target as HTMLInputElement).value)}
                            placeholder="Filter items"
                        />
                    </div>

                    <div className="iris-inventory-tabs iris-ui-segmented">
                        {visibleCategories.map(cat => (
                            <button
                                type="button"
                                key={cat.value}
                                className={`iris-inventory-tab iris-ui-segment ${activeCategory === cat.value ? 'iris-inventory-tab-active iris-ui-segment-active' : ''}`}
                                onClick={() => setActiveCategory(cat.value)}
                            >
                                <span>{cat.label}</span>
                                <span className="iris-inventory-tab-count">{categoryCounts[cat.value]}</span>
                            </button>
                        ))}
                    </div>

                    <div className="iris-inventory-scroll-container iris-ui-table-scroll">
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
                                {normalizedSearch ? 'No items match the current filter' : 'No items found in this category'}
                            </div>
                        ) : (
                            <table className="iris-inventory-table iris-ui-table">
                                <thead>
                                    <tr>
                                        <th>ITEM</th>
                                        <th className="iris-ui-table-cell-right">COUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className="iris-inventory-item-name">
                                                    <div
                                                        className="iris-inventory-item-name-value"
                                                        style={{ '--iris-item-color': getItemColor(item) } as Record<string, string>}
                                                    >
                                                        <span className="iris-inventory-item-name-text">{item.name}</span>
                                                        <div className="iris-inventory-item-meta">
                                                            {item.level && <span className="iris-inventory-item-label">L{item.level}</span>}
                                                            {item.rarity && <span className="iris-inventory-item-label">{item.rarity.replace(/_/g, ' ')}</span>}
                                                            {item.moniker && <span className="iris-inventory-item-label">{item.moniker}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="iris-ui-table-cell-right iris-ui-table-cell-strong iris-ui-table-cell-accent">
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
