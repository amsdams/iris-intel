import {describe, expect, it, vi} from 'vitest';
import {
  zoomToAndShowPortalAction,
  clearPortalSelectionAction,
  focusSelectedPortalAction,
  selectPortalByLatLngAction,
  setPortalSectionOpenAction,
  type PortalSectionId,
} from './selection-actions';
import type {IitcIrisSelectedPortal} from '../messages';
import {IITC_IRIS_MESSAGES} from '../messages';

function makeSelectedPortal(overrides?: Partial<IitcIrisSelectedPortal>): IitcIrisSelectedPortal {
  return {
    guid: 'guid-xyz',
    title: 'Portal Title',
    team: 'R',
    latE6: 52367600,
    lngE6: 4904100,
    level: 8,
    health: 100,
    resCount: 8,
    isPlaceholder: false,
    ornaments: [],
    artifacts: [],
    links: {count: 0, incoming: 0, outgoing: 0, guids: []},
    fields: {count: 0, guids: []},
    ...overrides,
  };
}

describe('content-portal-selection-actions', () => {
  it('updates portal section state', () => {
    const setPortalSections = vi.fn();
    const current: Record<PortalSectionId, boolean> = {
      mods: false,
      resonators: true,
      facts: true,
    };

    setPortalSectionOpenAction(current, 'mods', true, setPortalSections);

    expect(current.mods).toBe(false);
    expect(setPortalSections).toHaveBeenCalledWith({
      ...current,
      mods: true,
    });
  });

  it('selects portal by latE6 and lngE6', () => {
    const postMessageFn = vi.fn();

    const result = selectPortalByLatLngAction(52367600, 4904100, 'guid-123', 12, postMessageFn);

    expect(result).toBe(true);
    expect(postMessageFn).toHaveBeenCalledWith({
      type: 'IITC_IRIS_ZOOM_TO_AND_SHOW_PORTAL',
      portalGuid: 'guid-123',
      portalLat: 52.3676,
      portalLng: 4.9041,
      zoom: 15,
    });
  });

  it('returns false when latE6 or lngE6 is missing', () => {
    const postMessageFn = vi.fn();
    const result = selectPortalByLatLngAction(undefined, 4904100, 'guid-123', 12, postMessageFn);
    expect(result).toBe(false);
    expect(postMessageFn).not.toHaveBeenCalled();
  });

  it('clears portal selection', () => {
    const postMessageFn = vi.fn();
    clearPortalSelectionAction(postMessageFn);
    expect(postMessageFn).toHaveBeenCalledWith({
      type: 'IITC_IRIS_CLEAR_PORTAL_SELECTION',
    });
  });

  it('focuses selected portal and handles map focus mode', () => {
    const setMapView = vi.fn();
    const closeSheets = vi.fn();
    const portal: IitcIrisSelectedPortal = {
      latE6: 52367600,
      lngE6: 4904100,
      title: 'Test Portal',
      guid: 'g1',
      team: 'R',
      level: 8,
      health: 100,
      resCount: 8,
      isPlaceholder: false,
      ornaments: [],
      artifacts: [],
      links: {count: 0, incoming: 0, outgoing: 0, guids: []},
      fields: {count: 0, guids: []},
    };

    const result = focusSelectedPortalAction(portal, 14, true, setMapView, closeSheets);

    expect(result).toBe(true);
    expect(setMapView).toHaveBeenCalledWith(52.3676, 4.9041, 17);
    expect(closeSheets).toHaveBeenCalled();
    expect(setMapView.mock.invocationCallOrder[0]).toBeLessThan(closeSheets.mock.invocationCallOrder[0]);
  });

  it('posts a zoomToAndShowPortal message with latE6/lngE6 conversion', () => {
    const postMessage = vi.fn();
    zoomToAndShowPortalAction('guid-abc', 52367600, 4904100, 15, postMessage);
    expect(postMessage).toHaveBeenCalledWith({
      type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
      portalGuid: 'guid-abc',
      portalLat: 52.3676,
      portalLng: 4.9041,
      zoom: 15,
    });
  });

  it('posts without guid and coordinates when both are undefined', () => {
    const postMessage = vi.fn();
    zoomToAndShowPortalAction(undefined, undefined, undefined, 10, postMessage);
    expect(postMessage).toHaveBeenCalledWith({
      type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
      portalGuid: undefined,
      portalLat: undefined,
      portalLng: undefined,
      zoom: 10,
    });
  });

  it('is a no-op and returns false when lngE6 is undefined', () => {
    const postMessage = vi.fn();
    const result = selectPortalByLatLngAction(52367600, undefined, 'guid-123', 12, postMessage);
    expect(result).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('calls setMapView for the selected portal', () => {
    const setMapView = vi.fn();
    const closeSheets = vi.fn();
    focusSelectedPortalAction(makeSelectedPortal(), 14, false, setMapView, closeSheets);
    expect(setMapView).toHaveBeenCalledWith(52.3676, 4.9041, 17);
    expect(closeSheets).not.toHaveBeenCalled();
  });

  it('is a no-op when selectedPortal is null', () => {
    const setMapView = vi.fn();
    focusSelectedPortalAction(null, 14, false, setMapView, vi.fn());
    expect(setMapView).not.toHaveBeenCalled();
  });
});
