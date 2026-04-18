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
        
        const field = gen.addField('F_CROSS', 'ENL', 'a', 'b', 'c');
        expect(field).toBeNull();
        expect(gen.fields.length).toBe(0);
    });
});
