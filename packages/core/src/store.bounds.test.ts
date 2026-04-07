import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

describe('updateMapState', () => {
  beforeEach(async () => {
    localStorage.clear();
    useStore.persist.clearStorage();
    await useStore.persist.rehydrate();
    useStore.setState((state) => ({
      ...state,
      mapState: {
        lat: 0,
        lng: 0,
        zoom: 2,
        bounds: undefined,
      },
    }));
  });

  it('preserves existing bounds when an update omits bounds', () => {
    const initialBounds = {
      minLatE6: 1,
      minLngE6: 2,
      maxLatE6: 3,
      maxLngE6: 4,
    };

    useStore.getState().updateMapState(10, 20, 12, initialBounds);
    expect(useStore.getState().mapState.bounds).toEqual(initialBounds);

    useStore.getState().updateMapState(11, 21, 13);

    expect(useStore.getState().mapState.lat).toBe(11);
    expect(useStore.getState().mapState.lng).toBe(21);
    expect(useStore.getState().mapState.zoom).toBe(13);
    expect(useStore.getState().mapState.bounds).toEqual(initialBounds);
  });
});

describe('removeEntities', () => {
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

  it('removes links attached to a deleted portal', () => {
    useStore.getState().updatePortals([
      { id: 'portal-a', lat: 1, lng: 2, team: 'R' },
      { id: 'portal-b', lat: 3, lng: 4, team: 'E' },
      { id: 'portal-c', lat: 5, lng: 6, team: 'E' },
    ]);

    useStore.getState().updateLinks([
      {
        id: 'link-a-b',
        team: 'R',
        fromPortalId: 'portal-a',
        fromLat: 1,
        fromLng: 2,
        toPortalId: 'portal-b',
        toLat: 3,
        toLng: 4,
      },
      {
        id: 'link-b-c',
        team: 'E',
        fromPortalId: 'portal-b',
        fromLat: 3,
        fromLng: 4,
        toPortalId: 'portal-c',
        toLat: 5,
        toLng: 6,
      },
    ]);

    useStore.getState().removeEntities(['portal-a']);

    expect(useStore.getState().portals['portal-a']).toBeUndefined();
    expect(useStore.getState().links['link-a-b']).toBeUndefined();
    expect(useStore.getState().links['link-b-c']).toBeDefined();
  });

  it('removes fields anchored to a deleted portal', () => {
    useStore.getState().updatePortals([
      { id: 'portal-a', lat: 1, lng: 2, team: 'R' },
      { id: 'portal-b', lat: 3, lng: 4, team: 'E' },
      { id: 'portal-c', lat: 5, lng: 6, team: 'E' },
      { id: 'portal-d', lat: 7, lng: 8, team: 'R' },
    ]);

    useStore.getState().updateFields([
      {
        id: 'field-a-b-c',
        team: 'R',
        points: [
          { portalId: 'portal-a', lat: 1, lng: 2 },
          { portalId: 'portal-b', lat: 3, lng: 4 },
          { portalId: 'portal-c', lat: 5, lng: 6 },
        ],
      },
      {
        id: 'field-b-c-d',
        team: 'E',
        points: [
          { portalId: 'portal-b', lat: 3, lng: 4 },
          { portalId: 'portal-c', lat: 5, lng: 6 },
          { portalId: 'portal-d', lat: 7, lng: 8 },
        ],
      },
    ]);

    useStore.getState().removeEntities(['portal-a']);

    expect(useStore.getState().fields['field-a-b-c']).toBeUndefined();
    expect(useStore.getState().fields['field-b-c-d']).toBeDefined();
  });
});
