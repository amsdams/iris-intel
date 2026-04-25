import { useCallback } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import { MockDataGenerator } from './MockDataGenerator';

export function usePatterns(
    map: maplibregl.Map | null, 
    generator: MockDataGenerator, 
    loadedKeys: Set<string>, 
    logEvent: (msg: string) => void
) {
    const loadPattern1 = useCallback((): void => {
        if (!map) return;
        generator.clear(); loadedKeys.clear();
        const center = map.getCenter();
        // ENL
        generator.addPortal('A', 'E', center.lng - 0.002, center.lat, 8);
        generator.addPortal('B', 'E', center.lng + 0.002, center.lat, 8);
        generator.addPortal('C', 'E', center.lng, center.lat + 0.003, 8);
        generator.addPortal('D', 'E', center.lng, center.lat + 0.001, 8);
        generator.addLink('L-AB', 'E', 'A', 'B');
        generator.addLink('L-BC', 'E', 'B', 'C');
        generator.addLink('L-CA', 'E', 'C', 'A');
        generator.addLink('L-AD', 'E', 'A', 'D');
        generator.addLink('L-BD', 'E', 'B', 'D');
        // RES Mirror
        generator.addPortal('RA', 'R', center.lng - 0.002, center.lat - 0.005, 8);
        generator.addPortal('RB', 'R', center.lng + 0.002, center.lat - 0.005, 8);
        generator.addPortal('RC', 'R', center.lng, center.lat - 0.008, 8);
        generator.addPortal('RD', 'R', center.lng, center.lat - 0.006, 8);
        generator.addLink('RL-AB', 'R', 'RA', 'RB');
        generator.addLink('RL-BC', 'R', 'RB', 'RC');
        generator.addLink('RL-CA', 'R', 'RC', 'RA');
        generator.addLink('RL-AD', 'R', 'RA', 'RD');
        generator.addLink('RL-BD', 'R', 'RB', 'RD');
        logEvent("PATTERN 1: Single Nested (Mirrored).");
    }, [map, generator, loadedKeys, logEvent]);

    const loadPattern2 = useCallback((): void => {
        if (!map) return;
        generator.clear(); loadedKeys.clear();
        const center = map.getCenter();
        // ENL
        generator.addPortal('A', 'E', center.lng - 0.002, center.lat, 8);
        generator.addPortal('B', 'E', center.lng + 0.002, center.lat, 8);
        generator.addPortal('C', 'E', center.lng, center.lat + 0.003, 8);
        generator.addPortal('D', 'E', center.lng, center.lat + 0.001, 8);
        generator.addLink('L-AB', 'E', 'A', 'B');
        generator.addLink('L-BC', 'E', 'B', 'C');
        generator.addLink('L-CA', 'E', 'C', 'A');
        generator.addLink('L-AD', 'E', 'A', 'D');
        generator.addLink('L-BD', 'E', 'B', 'D');
        generator.addLink('L-CD', 'E', 'C', 'D');
        // RES Mirror
        generator.addPortal('RA', 'R', center.lng - 0.002, center.lat - 0.005, 8);
        generator.addPortal('RB', 'R', center.lng + 0.002, center.lat - 0.005, 8);
        generator.addPortal('RC', 'R', center.lng, center.lat - 0.008, 8);
        generator.addPortal('RD', 'R', center.lng, center.lat - 0.006, 8);
        generator.addLink('RL-AB', 'R', 'RA', 'RB');
        generator.addLink('RL-BC', 'R', 'RB', 'RC');
        generator.addLink('RL-CA', 'R', 'RC', 'RA');
        generator.addLink('RL-AD', 'R', 'RA', 'RD');
        generator.addLink('RL-BD', 'R', 'RB', 'RD');
        generator.addLink('RL-CD', 'R', 'RC', 'RD');
        logEvent("PATTERN 2: Nested Diamond (Mirrored).");
    }, [map, generator, loadedKeys, logEvent]);

    const loadPattern3 = useCallback((): void => {
        if (!map) return;
        generator.clear(); loadedKeys.clear();
        const center = map.getCenter();
        // ENL
        generator.addPortal('A', 'E', center.lng - 0.002, center.lat, 8);
        generator.addPortal('B', 'E', center.lng + 0.002, center.lat, 8);
        generator.addPortal('C', 'E', center.lng, center.lat + 0.003, 8);
        generator.addPortal('D', 'E', center.lng, center.lat + 0.001, 8);
        generator.addPortal('E', 'E', center.lng, center.lat + 0.0005, 8);
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
        generator.addPortal('RA', 'R', center.lng - 0.002, center.lat + rOff, 8);
        generator.addPortal('RB', 'R', center.lng + 0.002, center.lat + rOff, 8);
        generator.addPortal('RC', 'R', center.lng, center.lat + rOff + 0.003, 8);
        generator.addPortal('RD', 'R', center.lng, center.lat + rOff + 0.001, 8);
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
        logEvent("PATTERN 3: Scaled Global (Mirrored).");
    }, [map, generator, loadedKeys, logEvent]);

    return { loadPattern1, loadPattern2, loadPattern3 };
}
