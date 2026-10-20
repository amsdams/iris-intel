import {describe, expect, it} from 'vitest';
import {
  createIitcPortalLinkPendingSelection,
  findIitcPortalByGuidOrLatLng,
  planIitcPortalLinkNavigation,
  resolveIitcPendingPortalSelection,
  type IitcPortalLinkNavigationPortal,
} from './portal-link-navigation';

const portals: IitcPortalLinkNavigationPortal[] = [
  {guid: 'guid-a', latE6: 52_000_000, lngE6: 4_000_000},
  {guid: 'guid-b', latE6: 52_100_000, lngE6: 4_100_000},
];

describe('portal-link navigation facade', () => {
  it('finds portals by guid before falling back to coordinates', () => {
    expect(findIitcPortalByGuidOrLatLng(portals, {
      guid: 'guid-a',
      lat: 52.1,
      lng: 4.1,
    })?.guid).toBe('guid-a');
  });

  it('matches coordinates with current one-E6 tolerance', () => {
    expect(findIitcPortalByGuidOrLatLng(portals, {lat: 52.000001, lng: 4})?.guid).toBe('guid-a');
    expect(findIitcPortalByGuidOrLatLng(portals, {lat: 52.000002, lng: 4})).toBeUndefined();
  });

  it('plans portal selection and map focus when a portal is already loaded', () => {
    expect(planIitcPortalLinkNavigation(portals, {guid: 'guid-b', zoom: 17})).toEqual({
      portal: portals[1],
      focus: {lat: 52.1, lng: 4.1, zoom: 17},
    });
  });

  it('plans pending selection and coordinate focus when the portal is not loaded yet', () => {
    expect(planIitcPortalLinkNavigation(portals, {
      guid: 'missing',
      lat: 52.2,
      lng: 4.2,
      zoom: 16,
    })).toEqual({
      pendingSelection: {guid: 'missing', lat: 52.2, lng: 4.2},
      focus: {lat: 52.2, lng: 4.2, zoom: 16},
    });
  });

  it('keeps guid-only pending selections without inventing a focus point', () => {
    expect(createIitcPortalLinkPendingSelection({guid: 'missing'})).toEqual({guid: 'missing'});
    expect(planIitcPortalLinkNavigation(portals, {guid: 'missing'})).toEqual({
      pendingSelection: {guid: 'missing'},
    });
  });

  it('keeps coordinate-only pending selections free of empty guid fields', () => {
    expect(createIitcPortalLinkPendingSelection({lat: 52.2, lng: 4.2})).toEqual({lat: 52.2, lng: 4.2});
  });

  it('resolves pending selections against newly loaded portals', () => {
    expect(resolveIitcPendingPortalSelection({lat: 52.1, lng: 4.1}, portals)?.guid).toBe('guid-b');
  });
});
