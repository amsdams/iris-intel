import { describe, it, expect } from 'vitest';
import { MockDataGenerator } from './MockDataGenerator';

describe('MockDataGenerator - Rules Enforcement', () => {
    it('should identify crossing segments', () => {
        const gen = new MockDataGenerator();
        gen.addPortal('p1', 'ENL', 0, 0);
        gen.addPortal('q1', 'ENL', 1, 1);
        gen.addPortal('p2', 'ENL', 0, 1);
        gen.addPortal('q2', 'ENL', 1, 0);

        gen.addLink('L1', 'ENL', 'p1', 'q1');
        const L2 = gen.addLink('L2', 'ENL', 'p2', 'q2');

        expect(L2).toBeNull(); // Should be rejected because it crosses L1
    });

    it('should reject links between portals of different factions', () => {
        const gen = new MockDataGenerator();
        gen.addPortal('p1', 'ENL', 0, 0);
        gen.addPortal('p2', 'RES', 1, 1);

        const link = gen.addLink('L1', 'ENL', 'p1', 'p2');
        expect(link).toBeNull();
    });

    it('should reject links if the link faction does not match portal faction', () => {
        const gen = new MockDataGenerator();
        gen.addPortal('p1', 'ENL', 0, 0);
        gen.addPortal('p2', 'ENL', 1, 1);

        const link = gen.addLink('L1', 'RES', 'p1', 'p2');
        expect(link).toBeNull();
    });

    it('should NOT identify segments with shared endpoints as crossing', () => {
        const gen = new MockDataGenerator();
        gen.addPortal('p1', 'ENL', 0, 0);
        gen.addPortal('p2', 'ENL', 1, 1);
        gen.addPortal('p3', 'ENL', 2, 0);

        gen.addLink('L1', 'ENL', 'p1', 'p2');
        const L2 = gen.addLink('L2', 'ENL', 'p2', 'p3');

        expect(L2).not.toBeNull();
    });

    it('should reject a field if any edge would cross existing links', () => {
        const gen = new MockDataGenerator();
        // A single link blocking a potential field
        gen.addPortal('x1', 'RES', -1, 0.5);
        gen.addPortal('x2', 'RES', 2, 0.5);
        gen.addLink('BLOCKER', 'RES', 'x1', 'x2');

        // A potential ENL triangle that would be split by the blocker
        gen.addPortal('a', 'ENL', 1, 0);
        gen.addPortal('b', 'ENL', 0, 2);
        gen.addPortal('c', 'ENL', 2, 2);
        
        gen.addLink('L-AB', 'ENL', 'a', 'b');
        gen.addLink('L-BC', 'ENL', 'b', 'c'); // This crosses BLOCKER!
        gen.addLink('L-CA', 'ENL', 'c', 'a');

        expect(gen.fields.length).toBe(0); // Field should not have been created
    });

    it('should automatically create a field when a triangle is closed', () => {
        const gen = new MockDataGenerator();
        gen.addPortal('a', 'ENL', 0, 0);
        gen.addPortal('b', 'ENL', 1, 0);
        gen.addPortal('c', 'ENL', 0, 1);

        gen.addLink('L1', 'ENL', 'a', 'b');
        gen.addLink('L2', 'ENL', 'b', 'c');
        expect(gen.fields.length).toBe(0);

        gen.addLink('L3', 'ENL', 'c', 'a');
        expect(gen.fields.length).toBe(1);
        expect(gen.fields[0].layer).toBe(0);
    });

    it('should automatically calculate nesting layers', () => {
        const gen = new MockDataGenerator();
        // Base Triangle
        gen.addPortal('a', 'ENL', 0, 0);
        gen.addPortal('b', 'ENL', 10, 0);
        gen.addPortal('c', 'ENL', 0, 10);
        gen.addLink('L1', 'ENL', 'a', 'b');
        gen.addLink('L2', 'ENL', 'b', 'c');
        gen.addLink('L3', 'ENL', 'c', 'a');
        expect(gen.fields[0].layer).toBe(0);

        // Nested Triangle inside (a,b,c)
        gen.addPortal('d', 'ENL', 1, 1);
        gen.addLink('L4', 'ENL', 'a', 'd');
        gen.addLink('L5', 'ENL', 'b', 'd');
        
        expect(gen.fields.length).toBe(2);
        const nested = gen.fields.find(f => f.id.includes('d'));
        expect(nested?.layer).toBe(1);
    });
});
