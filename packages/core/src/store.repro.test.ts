import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

describe('removeEntities Repro', () => {
  beforeEach(async () => {
    localStorage.clear();
    useStore.persist.clearStorage();
    await useStore.persist.rehydrate();
    useStore.setState((state) => ({
      ...state,
      portals: {},
      links: {},
      fields: {},
      artifacts: {},
    }));
  });

  it('removes links when a portal is deleted', () => {
    useStore.getState().updatePortals([
      { id: 'portal-a', lat: 1, lng: 2, team: 'E' },
      { id: 'portal-b', lat: 3, lng: 4, team: 'E' },
    ]);

    useStore.getState().updateLinks([
      {
        id: 'link-a-b',
        team: 'E',
        fromPortalId: 'portal-a',
        fromLat: 1,
        fromLng: 2,
        toPortalId: 'portal-b',
        toLat: 3,
        toLng: 4,
      },
    ]);

    // Simulate NIA sending deleted GUID for portal-a
    useStore.getState().removeEntities(['portal-a']);

    expect(useStore.getState().portals['portal-a']).toBeUndefined();
    expect(useStore.getState().links['link-a-b']).toBeUndefined();
  });

  it('removes links when a portal becomes Neutral', () => {
    useStore.getState().updatePortals([
      { id: 'portal-a', lat: 1, lng: 2, team: 'E' },
      { id: 'portal-b', lat: 3, lng: 4, team: 'E' },
    ]);

    useStore.getState().updateLinks([
      {
        id: 'link-a-b',
        team: 'E',
        fromPortalId: 'portal-a',
        fromLat: 1,
        fromLng: 2,
        toPortalId: 'portal-b',
        toLat: 3,
        toLng: 4,
      },
    ]);

    // Simulate portal-a being destroyed (becomes Neutral)
    useStore.getState().updatePortals([
      { id: 'portal-a', team: 'N' },
    ]);

    expect(useStore.getState().portals['portal-a'].team).toBe('N');
    // If it becomes neutral, links should be gone!
    expect(useStore.getState().links['link-a-b']).toBeUndefined();
  });

  it('removes fields when a portal becomes Neutral', () => {
    useStore.getState().updatePortals([
      { id: 'portal-a', lat: 1, lng: 2, team: 'E' },
      { id: 'portal-b', lat: 3, lng: 4, team: 'E' },
      { id: 'portal-c', lat: 5, lng: 6, team: 'E' },
    ]);

    useStore.getState().updateFields([
      {
        id: 'field-a-b-c',
        team: 'E',
        points: [
          { portalId: 'portal-a', lat: 1, lng: 2 },
          { portalId: 'portal-b', lat: 3, lng: 4 },
          { portalId: 'portal-c', lat: 5, lng: 6 },
        ],
      },
    ]);

    // Simulate portal-b being destroyed
    useStore.getState().updatePortals([
      { id: 'portal-b', team: 'N' },
    ]);

    expect(useStore.getState().portals['portal-b'].team).toBe('N');
    expect(useStore.getState().fields['field-a-b-c']).toBeUndefined();
  });
});
