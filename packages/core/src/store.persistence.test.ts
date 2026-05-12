import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from './store';

describe('store persistence', () => {
  beforeEach(async () => {
    localStorage.clear();
    useStore.persist.clearStorage();
    await useStore.persist.rehydrate();
    useStore.setState((state) => ({
      ...state,
      planningMode: false,
      planningAnchorPortalId: null,
      plannedLinks: [],
      plannedMarkers: [],
    }));
  });

  it('persists planned items without persisting in-progress planning mode', () => {
    const plannedLinks = [
      {
        id: 'planned-link:portal-a:portal-b:1',
        fromPortalId: 'portal-a',
        toPortalId: 'portal-b',
        createdAt: 1,
      },
    ];
    const plannedMarkers = [
      {
        id: 'planned-marker:1',
        lat: 52.371094,
        lng: 4.906375,
        label: 'Marker 1',
        createdAt: 2,
      },
    ];

    useStore.setState((state) => ({
      ...state,
      planningMode: true,
      planningAnchorPortalId: 'portal-a',
      plannedLinks,
      plannedMarkers,
    }));

    const stored = JSON.parse(localStorage.getItem('iris-settings') ?? '{}') as {
      state?: {
        plannedLinks?: typeof plannedLinks;
        plannedMarkers?: typeof plannedMarkers;
        planningMode?: boolean;
        planningAnchorPortalId?: string | null;
      };
    };

    expect(stored.state?.plannedLinks).toEqual(plannedLinks);
    expect(stored.state?.plannedMarkers).toEqual(plannedMarkers);
    expect(stored.state?.planningMode).toBeUndefined();
    expect(stored.state?.planningAnchorPortalId).toBeUndefined();
  });
});
