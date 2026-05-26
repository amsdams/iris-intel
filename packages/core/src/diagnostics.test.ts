import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

describe('Diagnostics Slice', () => {
    beforeEach(async () => {
        localStorage.clear();
        useStore.persist.clearStorage();
        await useStore.persist.rehydrate();
        useStore.getState().clearEndpointDiagnostics();
    });

    it('initializes endpoint diagnostics with default values', () => {
        const diagnostics = useStore.getState().endpointDiagnostics['entities'];
        expect(diagnostics).toBeDefined();
        expect(diagnostics.status).toBe('idle');
        expect(diagnostics.lastRefreshReason).toBe(null);
        expect(diagnostics.lastActiveSuccessAt).toBe(null);
        expect(diagnostics.lastPassiveSuccessAt).toBe(null);
        expect(diagnostics.lastCoverageKey).toBe(null);
        expect(diagnostics.lastPassId).toBe(null);
        expect(diagnostics.lastPassRequestedTiles).toBe(0);
    });

    it('updates endpoint metadata correctly', () => {
        const now = Date.now();
        useStore.getState().setEndpointMetadata('entities', {
            lastRefreshReason: 'move_settle',
            lastActiveSuccessAt: now,
            lastCoverageKey: 'test-coverage-123',
        });

        const diagnostics = useStore.getState().endpointDiagnostics['entities'];
        expect(diagnostics.lastRefreshReason).toBe('move_settle');
        expect(diagnostics.lastActiveSuccessAt).toBe(now);
        expect(diagnostics.lastCoverageKey).toBe('test-coverage-123');
        // Check that other fields are preserved
        expect(diagnostics.status).toBe('idle');
    });

    it('performs partial updates without losing existing metadata', () => {
        useStore.getState().setEndpointMetadata('entities', {
            lastRefreshReason: 'startup',
        });

        useStore.getState().setEndpointMetadata('entities', {
            lastCoverageKey: 'new-key',
        });

        const diagnostics = useStore.getState().endpointDiagnostics['entities'];
        expect(diagnostics.lastRefreshReason).toBe('startup');
        expect(diagnostics.lastCoverageKey).toBe('new-key');
    });

    it('clears diagnostics but preserves nextAutoRefreshAt', () => {
        useStore.getState().setEndpointNextAutoRefresh('plexts', 123456789);
        useStore.getState().setEndpointMetadata('plexts', {
            lastRefreshReason: 'manual',
            status: 'success',
        });

        useStore.getState().clearEndpointDiagnostics();

        const diagnostics = useStore.getState().endpointDiagnostics['plexts'];
        expect(diagnostics.status).toBe('idle');
        expect(diagnostics.lastRefreshReason).toBe(null);
        expect(diagnostics.nextAutoRefreshAt).toBe(123456789);
    });

    it('records whether successful requests landed while the map was moving', () => {
        useStore.getState().addSuccessfulRequest({
            url: '/r/getEntities',
            time: 123,
            isActive: true,
            isMoving: true,
        });

        const entry = useStore.getState().endpointActivityLog[0];
        expect(entry.endpoint).toBe('entities');
        expect(entry.message).toBe('success getEntities active');
        expect(entry.isMoving).toBe(true);
    });
});
