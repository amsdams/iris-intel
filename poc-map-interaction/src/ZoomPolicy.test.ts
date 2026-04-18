import { describe, it, expect } from 'vitest';
import { getMinLevelForZoom } from './ZoomPolicy';

describe('ZoomPolicy', () => {
    it('should return L0 (all) for Zoom 17+', () => {
        expect(getMinLevelForZoom(17)).toBe(0);
        expect(getMinLevelForZoom(20)).toBe(0);
    });

    it('should return L4 for Zoom 13', () => {
        expect(getMinLevelForZoom(13)).toBe(4);
        expect(getMinLevelForZoom(13.9)).toBe(4);
    });

    it('should return L8 for low zoom (3-8)', () => {
        expect(getMinLevelForZoom(8)).toBe(8);
        expect(getMinLevelForZoom(3)).toBe(8);
    });

    it('should correctly handle intermediate steps', () => {
        expect(getMinLevelForZoom(16)).toBe(1);
        expect(getMinLevelForZoom(11)).toBe(6);
        expect(getMinLevelForZoom(9)).toBe(7);
    });
});
