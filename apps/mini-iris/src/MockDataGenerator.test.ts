import { describe, it, expect, beforeEach } from 'vitest';
import { MockDataGenerator } from './MockDataGenerator';

describe('MockDataGenerator', () => {
    let gen: MockDataGenerator;

    beforeEach(() => {
        gen = new MockDataGenerator();
    });

    it('should detect link intersections', () => {
        gen.addPortal('p1', 'E', 0, 0);
        gen.addPortal('q1', 'E', 1, 1);
        gen.addPortal('p2', 'E', 0, 1);
        gen.addPortal('q2', 'E', 1, 0);

        gen.addLink('L1', 'E', 'p1', 'q1');
        const L2 = gen.addLink('L2', 'E', 'p2', 'q2');

        expect(gen.linksMap.size).toBe(1);
        expect(L2).toBeNull();
    });

    it('should prevent linking different factions', () => {
        gen.addPortal('p1', 'E', 0, 0);
        gen.addPortal('p2', 'R', 1, 1);

        const link = gen.addLink('L1', 'E', 'p1', 'p2');
        expect(link).toBeNull();
    });

    it('should prevent linking neutral portals', () => {
        gen.addPortal('p1', 'N', 0, 0);
        gen.addPortal('p2', 'N', 1, 1);

        const link = gen.addLink('L1', 'E', 'p1', 'p2');
        expect(link).toBeNull();
    });

    it('should not detect intersection for shared endpoints', () => {
        gen.addPortal('p1', 'E', 0, 0);
        gen.addPortal('p2', 'E', 1, 1);
        gen.addPortal('p3', 'E', 2, 0);

        gen.addLink('L1', 'E', 'p1', 'p2');
        const L2 = gen.addLink('L2', 'E', 'p2', 'p3');

        expect(gen.linksMap.size).toBe(2);
        expect(L2).not.toBeNull();
    });

    it('should allow machina links', () => {
        gen.addPortal('m1', 'M', 0, 0);
        gen.addPortal('m2', 'M', 1, 1);
        const link = gen.addLink('ML1', 'M', 'm1', 'm2');
        expect(link).not.toBeNull();
        expect(gen.linksMap.size).toBe(1);
    });

    it('should block ENL link if RES blocker exists', () => {
        gen.addPortal('x1', 'R', -1, 0.5);
        gen.addPortal('x2', 'R', 2, 0.5);
        gen.addLink('BLOCKER', 'R', 'x1', 'x2');

        gen.addPortal('a', 'E', 1, 0);
        gen.addPortal('b', 'E', 0, 2);
        gen.addPortal('c', 'E', 2, 2);

        gen.addLink('L-AB', 'E', 'a', 'b');
        gen.addLink('L-BC', 'E', 'b', 'c'); // This crosses BLOCKER!
        gen.addLink('L-CA', 'E', 'c', 'a');

        expect(gen.linksMap.has('L-BC')).toBe(false);
        expect(gen.fieldsMap.size).toBe(0);
    });

    it('should create fields automatically from closed triangles', () => {
        gen.addPortal('a', 'E', 0, 0);
        gen.addPortal('b', 'E', 1, 0);
        gen.addPortal('c', 'E', 0, 1);

        gen.addLink('L1', 'E', 'a', 'b');
        gen.addLink('L2', 'E', 'b', 'c');
        
        expect(gen.fieldsMap.size).toBe(0);
        gen.addLink('L3', 'E', 'c', 'a');
        expect(gen.fieldsMap.size).toBe(1);
    });

    it('should detect nesting for fields', () => {
        gen.addPortal('a', 'E', 0, 0);
        gen.addPortal('b', 'E', 10, 0);
        gen.addPortal('c', 'E', 0, 10);
        gen.addLink('L1', 'E', 'a', 'b');
        gen.addLink('L2', 'E', 'b', 'c');
        gen.addLink('L3', 'E', 'c', 'a');
        
        // Internal portal
        gen.addPortal('d', 'E', 1, 1);
        gen.addLink('L4', 'E', 'a', 'd');
        gen.addLink('L5', 'E', 'b', 'd');
        
        expect(gen.fieldsMap.size).toBe(2);
    });
});
