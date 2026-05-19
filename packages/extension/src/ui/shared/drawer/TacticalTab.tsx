import { h, JSX, Fragment } from 'preact';
import { useStore } from '@iris/core';
import {DrawerButton, DrawerSection} from './DrawerControls';

export function TacticalTab(): JSX.Element {
    const filterShowResistance = useStore((state) => state.filterShowResistance);
    const toggleFilterResistance = useStore((state) => state.toggleFilterResistance);
    const filterShowEnlightened = useStore((state) => state.filterShowEnlightened);
    const toggleFilterEnlightened = useStore((state) => state.toggleFilterEnlightened);
    const filterShowMachina = useStore((state) => state.filterShowMachina);
    const toggleFilterMachina = useStore((state) => state.toggleFilterMachina);
    const filterShowUnclaimedPortals = useStore((state) => state.filterShowUnclaimedPortals);
    const toggleFilterUnclaimedPortals = useStore((state) => state.toggleFilterUnclaimedPortals);
    
    const filterShowLevel = useStore((state) => state.filterShowLevel);
    const toggleFilterLevel = useStore((state) => state.toggleFilterLevel);
    const filterShowHealth = useStore((state) => state.filterShowHealth);
    const toggleFilterHealth = useStore((state) => state.toggleFilterHealth);
    
    const filterShowVisited = useStore((state) => state.filterShowVisited);
    const toggleFilterVisited = useStore((state) => state.toggleFilterVisited);
    const filterShowCaptured = useStore((state) => state.filterShowCaptured);
    const toggleFilterCaptured = useStore((state) => state.toggleFilterCaptured);
    const filterShowScanned = useStore((state) => state.filterShowScanned);
    const toggleFilterScanned = useStore((state) => state.toggleFilterScanned);
    const resetTacticalFilters = useStore((state) => state.resetTacticalFilters);

    return (
        <Fragment>
            <DrawerSection label="Filter Actions">
                <DrawerButton icon="↺" label="Clear All" onClick={resetTacticalFilters} />
            </DrawerSection>

            <DrawerSection label="Faction Filters" scroll>
                <DrawerButton active={filterShowEnlightened} icon="💚" label="ENL" onClick={toggleFilterEnlightened} />
                <DrawerButton active={filterShowResistance} icon="💙" label="RES" onClick={toggleFilterResistance} />
                <DrawerButton active={filterShowMachina} icon="❤️" label="MAC" onClick={toggleFilterMachina} />
                <DrawerButton active={filterShowUnclaimedPortals} icon="🤍" label="NEU" onClick={toggleFilterUnclaimedPortals} />
            </DrawerSection>

            <DrawerSection label="Level Filters" scroll>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                    <DrawerButton key={l} active={filterShowLevel[l]} label={`L${l}`} onClick={() => toggleFilterLevel(l)} />
                ))}
            </DrawerSection>

            <DrawerSection label="Health Filters" scroll>
                {[25, 50, 75, 100].map(h => (
                    <DrawerButton key={h} active={filterShowHealth[h]} label={`${h}%`} onClick={() => toggleFilterHealth(h)} />
                ))}
            </DrawerSection>

            <DrawerSection label="Agent History" scroll>
                <DrawerButton
                    active={filterShowVisited !== 'ALL'}
                    label={`Visited: ${filterShowVisited === 'ALL' ? 'All' : (filterShowVisited === 'TRUE' ? 'Yes' : 'No')}`}
                    onClick={toggleFilterVisited}
                />
                <DrawerButton
                    active={filterShowCaptured !== 'ALL'}
                    label={`Captured: ${filterShowCaptured === 'ALL' ? 'All' : (filterShowCaptured === 'TRUE' ? 'Yes' : 'No')}`}
                    onClick={toggleFilterCaptured}
                />
                <DrawerButton
                    active={filterShowScanned !== 'ALL'}
                    label={`Scanned: ${filterShowScanned === 'ALL' ? 'All' : (filterShowScanned === 'TRUE' ? 'Yes' : 'No')}`}
                    onClick={toggleFilterScanned}
                />
            </DrawerSection>
        </Fragment>
    );
}
