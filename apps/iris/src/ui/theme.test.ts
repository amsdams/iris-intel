import {describe, expect, it} from 'vitest';
import {THEMES, getContrastRatio, toCyberColor, toSofterColor} from './theme';

describe('theme color transforms', () => {
    it('derives softer colors from canonical hex colors', () => {
        expect(toSofterColor('#03DC03')).toBe('#55C755');
        expect(toSofterColor('#0088FF')).toBe('#689FCF');
    });

    it('derives cyber colors from canonical hex colors', () => {
        expect(toCyberColor('#03DC03')).toBe('#00F921');
        expect(toCyberColor('#0088FF')).toBe('#1C77FF');
    });

    it('keeps derived themes complete while preserving semantic overrides', () => {
        expect(THEMES.SOFTER.LEVELS[8]).toBeTruthy();
        expect(THEMES.SOFTER.HISTORY.visited).toBeTruthy();
        expect(THEMES.SOFTER.HEALTH.low).toBeTruthy();
        expect(THEMES.SOFTER.MISC.ARTIFACT).toBeTruthy();
        expect(THEMES.SOFTER.ITEM_RARITY.VERY_RARE).toBeTruthy();
        expect(THEMES.SOFTER.ITEM_TYPES.PORTAL_LINK_KEY).toBe('#4DD0E1');
        expect(THEMES.CYBER.MOD_RARITY.VERY_RARE).toBe('#FF00FF');
        expect(THEMES.CYBER.HISTORY.visited).not.toBe(THEMES.INGRESS.HISTORY.visited);
        expect(THEMES.CYBER.MISC.AEGIS_SHIELD).toBe('#00D4AA');
        expect(THEMES.DEBUG.E).toBe('#00ff00');
    });

    it('keeps DEBUG readable against the dark IRIS surface', () => {
        const background = '#000000';
        const debugColors = [
            THEMES.DEBUG.E,
            THEMES.DEBUG.R,
            THEMES.DEBUG.M,
            THEMES.DEBUG.N,
            THEMES.DEBUG.AQUA,
            THEMES.DEBUG.HISTORY.visited,
            THEMES.DEBUG.HISTORY.captured,
            THEMES.DEBUG.HISTORY.scanned,
            THEMES.DEBUG.MISC.MISSION,
            THEMES.DEBUG.MISC.ARTIFACT,
            THEMES.DEBUG.MISC.ORNAMENT,
        ];

        debugColors.forEach((color) => {
            expect(getContrastRatio(color, background)).toBeGreaterThanOrEqual(4.5);
        });
    });
});
