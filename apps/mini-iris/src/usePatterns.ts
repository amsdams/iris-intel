import { useCallback } from 'preact/hooks';
import type { InventoryItem } from '@iris/core';
import { MockDataGenerator } from './MockDataGenerator';
import type { MiniMapCamera } from './pageMapProtocol';

const MOCK_EVENT_ORNAMENTS = ['pe2', 'pe2_v', 'pe2_start', 'pe2_end'];

interface UsePatternsResult {
    loadPattern1: () => void;
    loadPattern2: () => void;
    loadPattern3: () => void;
}

export function usePatterns(
    mapState: MiniMapCamera,
    generator: MockDataGenerator, 
    loadedTileKeys: Set<string>,
    logEvent: (msg: string) => void,
    onMockInventory: (inventory: InventoryItem[]) => void,
): UsePatternsResult {
    const publishMockInventory = useCallback((): number => {
        const inventory = generator.createMockInventory();
        onMockInventory(inventory);
        return inventory.length;
    }, [generator, onMockInventory]);

    const addMockSpecialOverlays = useCallback((portalIds: string[]): { artifacts: number; ornaments: number } => {
        let artifacts = 0;
        let ornaments = 0;

        portalIds.forEach((portalId, index) => {
            if (index < 3 && generator.addArtifact(portalId, index % 2 === 0 ? 'shard' : 'target', [`${index + 1}01`, `${index + 1}02`])) {
                artifacts += 1;
            }

            const ornamentId = MOCK_EVENT_ORNAMENTS[index % MOCK_EVENT_ORNAMENTS.length];
            generator.addOrnament(portalId, ornamentId);
            ornaments += 1;
        });

        return { artifacts, ornaments };
    }, [generator]);

    const loadPattern1 = useCallback((): void => {
        generator.clear(); loadedTileKeys.clear();
        const center = { lat: mapState.lat, lng: mapState.lng };
        // ENL
        generator.addPortal('A', 'E', center.lng - 0.002, center.lat, 8);
        generator.addPortal('B', 'E', center.lng + 0.002, center.lat, 7);
        generator.addPortal('C', 'E', center.lng, center.lat + 0.003, 6);
        generator.addPortal('D', 'E', center.lng, center.lat + 0.001, 5);
        generator.addLink('L-AB', 'E', 'A', 'B');
        generator.addLink('L-BC', 'E', 'B', 'C');
        generator.addLink('L-CA', 'E', 'C', 'A');
        generator.addLink('L-AD', 'E', 'A', 'D');
        generator.addLink('L-BD', 'E', 'B', 'D');
        // RES Mirror
        generator.addPortal('RA', 'R', center.lng - 0.002, center.lat - 0.005, 4);
        generator.addPortal('RB', 'R', center.lng + 0.002, center.lat - 0.005, 3);
        generator.addPortal('RC', 'R', center.lng, center.lat - 0.008, 2);
        generator.addPortal('RD', 'R', center.lng, center.lat - 0.006, 1);
        generator.addLink('RL-AB', 'R', 'RA', 'RB');
        generator.addLink('RL-BC', 'R', 'RB', 'RC');
        generator.addLink('RL-CA', 'R', 'RC', 'RA');
        generator.addLink('RL-AD', 'R', 'RA', 'RD');
        generator.addLink('RL-BD', 'R', 'RB', 'RD');
        const special = addMockSpecialOverlays(['A', 'B', 'C', 'RA', 'RB']);
        const inventoryCount = publishMockInventory();
        logEvent(`PATTERN 1: Single Nested (Mirrored). Mock inventory: ${inventoryCount} items. EVT ${special.ornaments}, SHD ${special.artifacts}.`);
    }, [addMockSpecialOverlays, mapState.lat, mapState.lng, generator, loadedTileKeys, logEvent, publishMockInventory]);

    const loadPattern2 = useCallback((): void => {
        generator.clear(); loadedTileKeys.clear();
        const center = { lat: mapState.lat, lng: mapState.lng };
        // ENL
        generator.addPortal('A', 'E', center.lng - 0.002, center.lat, 8);
        generator.addPortal('B', 'E', center.lng + 0.002, center.lat, 7);
        generator.addPortal('C', 'E', center.lng, center.lat + 0.003, 6);
        generator.addPortal('D', 'E', center.lng, center.lat + 0.001, 5);
        generator.addLink('L-AB', 'E', 'A', 'B');
        generator.addLink('L-BC', 'E', 'B', 'C');
        generator.addLink('L-CA', 'E', 'C', 'A');
        generator.addLink('L-AD', 'E', 'A', 'D');
        generator.addLink('L-BD', 'E', 'B', 'D');
        generator.addLink('L-CD', 'E', 'C', 'D');
        // RES Mirror
        generator.addPortal('RA', 'R', center.lng - 0.002, center.lat - 0.005, 4);
        generator.addPortal('RB', 'R', center.lng + 0.002, center.lat - 0.005, 3);
        generator.addPortal('RC', 'R', center.lng, center.lat - 0.008, 2);
        generator.addPortal('RD', 'R', center.lng, center.lat - 0.006, 1);
        generator.addLink('RL-AB', 'R', 'RA', 'RB');
        generator.addLink('RL-BC', 'R', 'RB', 'RC');
        generator.addLink('RL-CA', 'R', 'RC', 'RA');
        generator.addLink('RL-AD', 'R', 'RA', 'RD');
        generator.addLink('RL-BD', 'R', 'RB', 'RD');
        generator.addLink('RL-CD', 'R', 'RC', 'RD');
        const special = addMockSpecialOverlays(['A', 'B', 'C', 'D', 'RA', 'RB', 'RC']);
        const inventoryCount = publishMockInventory();
        logEvent(`PATTERN 2: Nested Diamond (Mirrored). Mock inventory: ${inventoryCount} items. EVT ${special.ornaments}, SHD ${special.artifacts}.`);
    }, [addMockSpecialOverlays, mapState.lat, mapState.lng, generator, loadedTileKeys, logEvent, publishMockInventory]);

    const loadPattern3 = useCallback((): void => {
        generator.clear(); loadedTileKeys.clear();
        const center = { lat: mapState.lat, lng: mapState.lng };
        // ENL
        generator.addPortal('A', 'E', center.lng - 0.002, center.lat, 8);
        generator.addPortal('B', 'E', center.lng + 0.002, center.lat, 7);
        generator.addPortal('C', 'E', center.lng, center.lat + 0.003, 6);
        generator.addPortal('D', 'E', center.lng, center.lat + 0.001, 5);
        generator.addPortal('E', 'E', center.lng, center.lat + 0.0005, 4);
        generator.addLink('L-AB', 'E', 'A', 'B');
        generator.addLink('L-BC', 'E', 'B', 'C');
        generator.addLink('L-CA', 'E', 'C', 'A');
        generator.addLink('L-AD', 'E', 'A', 'D');
        generator.addLink('L-BD', 'E', 'B', 'D');
        generator.addLink('L-CD', 'E', 'C', 'D');
        generator.addLink('L-AE', 'E', 'A', 'E');
        generator.addLink('L-BE', 'E', 'B', 'E');
        generator.addLink('L-DE', 'E', 'D', 'E');
        // RES Mirror
        const rOff = -0.008;
        generator.addPortal('RA', 'R', center.lng - 0.002, center.lat + rOff, 4);
        generator.addPortal('RB', 'R', center.lng + 0.002, center.lat + rOff, 3);
        generator.addPortal('RC', 'R', center.lng, center.lat + rOff + 0.003, 2);
        generator.addPortal('RD', 'R', center.lng, center.lat + rOff + 0.001, 1);
        generator.addPortal('RE', 'R', center.lng, center.lat + rOff + 0.0005, 8);
        generator.addLink('RL-AB', 'R', 'RA', 'RB');
        generator.addLink('RL-BC', 'R', 'RB', 'RC');
        generator.addLink('RL-CA', 'R', 'RC', 'RA');
        generator.addLink('RL-AD', 'R', 'RA', 'RD');
        generator.addLink('RL-BD', 'R', 'RB', 'RD');
        generator.addLink('RL-CD', 'R', 'RC', 'RD');
        generator.addLink('RL-AE', 'R', 'RA', 'RE');
        generator.addLink('RL-BE', 'R', 'RB', 'RE');
        generator.addLink('RL-DE', 'R', 'RD', 'RE');

        const mOff = 0.009;
        generator.addPortal('M1', 'M', center.lng + mOff, center.lat + 0.002, 1);
        generator.addPortal('M2', 'M', center.lng + mOff + 0.002, center.lat, 1);
        generator.addPortal('M3', 'M', center.lng + mOff - 0.002, center.lat - 0.002, 1);
        generator.addLink('ML-12', 'M', 'M1', 'M2');
        const nOff = 0.006;
        generator.addPortal('N1', 'N', center.lng - 0.002, center.lat + nOff, 0);
        generator.addPortal('N2', 'N', center.lng + 0.002, center.lat + nOff, 0);
        const special = addMockSpecialOverlays(['A', 'B', 'C', 'D', 'E', 'RA', 'RB', 'RC', 'RE', 'M1']);
        const inventoryCount = publishMockInventory();
        logEvent(`PATTERN 3: Scaled Global (Mirrored). Mock inventory: ${inventoryCount} items. EVT ${special.ornaments}, SHD ${special.artifacts}.`);
    }, [addMockSpecialOverlays, mapState.lat, mapState.lng, generator, loadedTileKeys, logEvent, publishMockInventory]);

    return { loadPattern1, loadPattern2, loadPattern3 };
}
