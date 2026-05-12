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
      planningTool: 'links',
      planningAnchorPortalId: null,
      planningPortalPath: [],
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
        color: 'blue' as const,
        portalId: 'portal-a',
        createdAt: 2,
      },
    ];

    useStore.setState((state) => ({
      ...state,
      planningMode: true,
      planningTool: 'markers',
      planningAnchorPortalId: 'portal-a',
      planningPortalPath: ['portal-a', 'portal-b'],
      plannedLinks,
      plannedMarkers,
    }));

    const stored = JSON.parse(localStorage.getItem('iris-settings') ?? '{}') as {
      state?: {
        plannedLinks?: typeof plannedLinks;
        plannedMarkers?: typeof plannedMarkers;
        planningMode?: boolean;
        planningTool?: string;
        planningAnchorPortalId?: string | null;
        planningPortalPath?: string[];
      };
    };

    expect(stored.state?.plannedLinks).toEqual(plannedLinks);
    expect(stored.state?.plannedMarkers).toEqual(plannedMarkers);
    expect(stored.state?.planningMode).toBeUndefined();
    expect(stored.state?.planningTool).toBeUndefined();
    expect(stored.state?.planningAnchorPortalId).toBeUndefined();
    expect(stored.state?.planningPortalPath).toBeUndefined();
  });

  it('requires explicit confirmation before creating planned link paths', () => {
    useStore.setState((state) => ({
      ...state,
      planningMode: true,
      planningTool: 'links',
      planningAnchorPortalId: null,
      planningPortalPath: [],
      plannedLinks: [],
    }));

    useStore.getState().selectPlanningPortal('portal-a');
    useStore.getState().selectPlanningPortal('portal-b');
    useStore.getState().selectPlanningPortal('portal-c');

    expect(useStore.getState().planningAnchorPortalId).toBe('portal-c');
    expect(useStore.getState().planningPortalPath).toEqual(['portal-a', 'portal-b', 'portal-c']);
    expect(useStore.getState().plannedLinks).toHaveLength(0);

    useStore.getState().createPlannedLink();

    expect(useStore.getState().plannedLinks).toHaveLength(2);
    expect(useStore.getState().plannedLinks[0]).toMatchObject({
      fromPortalId: 'portal-a',
      toPortalId: 'portal-b',
    });
    expect(useStore.getState().plannedLinks[1]).toMatchObject({
      fromPortalId: 'portal-b',
      toPortalId: 'portal-c',
    });
    expect(useStore.getState().planningAnchorPortalId).toBe('portal-c');
    expect(useStore.getState().planningPortalPath).toEqual(['portal-c']);
  });

  it('does not create links while marker tool is active', () => {
    useStore.setState((state) => ({
      ...state,
      planningMode: true,
      planningTool: 'markers',
      planningAnchorPortalId: null,
      planningPortalPath: [],
      plannedLinks: [],
    }));

    useStore.getState().selectPlanningPortal('portal-a');
    useStore.getState().selectPlanningPortal('portal-b');

    expect(useStore.getState().planningAnchorPortalId).toBe('portal-b');
    expect(useStore.getState().planningPortalPath).toEqual([]);
    expect(useStore.getState().plannedLinks).toHaveLength(0);
  });
});
