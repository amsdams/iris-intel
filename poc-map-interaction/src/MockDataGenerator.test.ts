import { describe, it, expect } from 'vitest';
import { MockDataGenerator } from './MockDataGenerator';

describe('MockDataGenerator - Intersection Detection', () => {
    it('should identify crossing segments', () => {
        const gen = new MockDataGenerator();
        gen.addPortal('p1', 'NEU', 0, 0);
        gen.addPortal('q1', 'NEU', 1, 1);
        gen.addPortal('p2', 'NEU', 0, 1);
        gen.addPortal('q2', 'NEU', 1, 0);

        gen.addLink('L1', 'NEU', 'p1', 'q1');
        const L2 = gen.addLink('L2', 'NEU', 'p2', 'q2');

        expect(L2).toBeNull(); // Should be rejected because it crosses L1
    });

    it('should NOT identify segments with shared endpoints as crossing', () => {
        const gen = new MockDataGenerator();
        gen.addPortal('p1', 'NEU', 0, 0);
        gen.addPortal('p2', 'NEU', 1, 1);
        gen.addPortal('p3', 'NEU', 2, 0);

        gen.addLink('L1', 'NEU', 'p1', 'p2');
        const L2 = gen.addLink('L2', 'NEU', 'p2', 'p3');

        expect(L2).not.toBeNull(); // Shared endpoint p2 is allowed
    });

    it('should NOT identify parallel segments as crossing', () => {
        const gen = new MockDataGenerator();
        gen.addPortal('p1', 'NEU', 0, 0);
        gen.addPortal('q1', 'NEU', 1, 0);
        gen.addPortal('p2', 'NEU', 0, 1);
        gen.addPortal('q2', 'NEU', 1, 1);

        gen.addLink('L1', 'NEU', 'p1', 'q1');
        const L2 = gen.addLink('L2', 'NEU', 'p2', 'q2');

        expect(L2).not.toBeNull();
    });

    it('should handle triangle creation (no crossing)', () => {
        const gen = new MockDataGenerator();
        gen.addPortal('a', 'NEU', 0, 0);
        gen.addPortal('b', 'NEU', 1, 0);
        gen.addPortal('c', 'NEU', 0.5, 1);

        const field = gen.addField('F1', 'NEU', 'a', 'b', 'c');
        expect(field).not.toBeNull();
        expect(gen.links.length).toBe(3);
    });

    it('should reject a link that crosses a field edge', () => {
        const gen = new MockDataGenerator();
        // A triangle
        gen.addPortal('a', 'NEU', 0, 0);
        gen.addPortal('b', 'NEU', 2, 0);
        gen.addPortal('c', 'NEU', 1, 2);
        gen.addField('F1', 'NEU', 'a', 'b', 'c');

        // A link that cuts through the triangle
        gen.addPortal('x', 'NEU', 0, 1);
        gen.addPortal('y', 'NEU', 2, 1);
        const L_CROSS = gen.addLink('L_CROSS', 'NEU', 'x', 'y');

        expect(L_CROSS).toBeNull();
    });

    it('should reject a field if its edges would cross existing links', () => {
        const gen = new MockDataGenerator();
        // A single link blocking a potential field
        gen.addPortal('x1', 'NEU', 0, 0.5);
        gen.addPortal('x2', 'NEU', 2, 0.5);
        gen.addLink('BLOCKER', 'NEU', 'x1', 'x2');

        // A potential triangle that would be split by the blocker
        gen.addPortal('a', 'NEU', 1, 0);
        gen.addPortal('b', 'NEU', 0, 2);
        gen.addPortal('c', 'NEU', 2, 2);
        
        const field = gen.addField('F_CROSS', 'NEU', 'a', 'b', 'c');
        expect(field).toBeNull();
        expect(gen.fields.length).toBe(0);
    });
});
