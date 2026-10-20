import {describe, expect, it} from 'vitest';
import {
  createIitcMapContextPayload,
  getIitcMapContextFieldPerimeterMeters,
  getIitcMapContextFieldPortalAnchors,
  getIitcMapContextFieldPortalGuids,
  getIitcMapContextLinkDistanceMeters,
  getIitcMapContextLinkPortalAnchors,
  getIitcMapContextLinkPortalGuids,
  planIitcMapContextPoint,
  type IitcMapContextField,
  type IitcMapContextLink,
} from './context-action';

const link: IitcMapContextLink = {
  guid: 'link-guid',
  team: 'R',
  oGuid: 'origin',
  oLatE6: 52_000_000,
  oLngE6: 4_000_000,
  dGuid: 'destination',
  dLatE6: 52_100_000,
  dLngE6: 4_100_000,
};

const field: IitcMapContextField = {
  guid: 'field-guid',
  team: 'E',
  points: [
    {guid: 'a', latE6: 52_000_000, lngE6: 4_000_000},
    {guid: 'b', latE6: 52_100_000, lngE6: 4_000_000},
    {guid: 'c', latE6: 52_000_000, lngE6: 4_100_000},
  ],
};

describe('IITC map context action facade', () => {
  it('creates map and portal context payloads without app message types', () => {
    expect(createIitcMapContextPayload({lat: 52, lng: 4, zoom: 15})).toMatchObject({
      contextTarget: 'map',
      lat: 52,
      lng: 4,
      zoom: 15,
    });

    expect(createIitcMapContextPayload({
      lat: 52,
      lng: 4,
      portal: {guid: 'portal-guid', latE6: 52_000_000, lngE6: 4_000_000},
    })).toMatchObject({
      contextTarget: 'portal',
      portalGuid: 'portal-guid',
      portalLat: 52,
      portalLng: 4,
    });
  });

  it('plans target priority as portal, link, field, then plain map', () => {
    const planned = planIitcMapContextPoint({
      lat: 52.2,
      lng: 4.2,
      zoom: 16,
      portal: {guid: 'portal-guid', latE6: 52_000_000, lngE6: 4_000_000},
      link: {guid: 'link-guid', team: 'R', portalGuids: [], portalAnchors: []},
    });

    expect(planned.payload.contextTarget).toBe('portal');
    expect(planned.selectPortal).toBe(true);
    expect(planned.selectMapObject).toBeUndefined();
    expect(planIitcMapContextPoint({lat: 52.2, lng: 4.2}).clearSelectedMapObject).toBe(true);
  });

  it('plans link and field map-object selections with copied context details', () => {
    const linkObject = {
      guid: 'link-guid',
      team: 'R' as const,
      portalGuids: ['origin', 'destination'],
      portalAnchors: getIitcMapContextLinkPortalAnchors(link, (guid, fallback) => guid ?? fallback),
      distanceMeters: getIitcMapContextLinkDistanceMeters(link),
    };

    expect(planIitcMapContextPoint({lat: 52.05, lng: 4.05, link: linkObject})).toMatchObject({
      selectMapObject: {target: 'link', guid: 'link-guid'},
      payload: {
        contextTarget: 'link',
        contextGuid: 'link-guid',
        contextTeam: 'R',
        contextPortalGuids: ['origin', 'destination'],
      },
    });

    expect(planIitcMapContextPoint({
      lat: 52.05,
      lng: 4.05,
      field: {...linkObject, guid: 'field-guid', team: 'E' as const},
    })).toMatchObject({
      selectMapObject: {target: 'field', guid: 'field-guid'},
      payload: {contextTarget: 'field', contextTeam: 'E'},
    });
  });

  it('derives link and field anchors, guids, and distances', () => {
    expect(getIitcMapContextLinkPortalGuids(link)).toEqual(['origin', 'destination']);
    expect(getIitcMapContextLinkPortalAnchors(link, (guid, fallback) => guid === 'origin' ? 'Origin Portal' : fallback)).toEqual([
      {guid: 'origin', label: 'Origin Portal', latE6: 52_000_000, lngE6: 4_000_000},
      {guid: 'destination', label: '52.100000, 4.100000', latE6: 52_100_000, lngE6: 4_100_000},
    ]);
    expect(getIitcMapContextLinkDistanceMeters(link)).toBeGreaterThan(13_000);

    expect(getIitcMapContextFieldPortalGuids(field)).toEqual(['a', 'b', 'c']);
    expect(getIitcMapContextFieldPortalAnchors(field, (guid, fallback) => guid ?? fallback)).toHaveLength(3);
    expect(getIitcMapContextFieldPerimeterMeters(field)).toBeGreaterThan(30_000);
    expect(getIitcMapContextFieldPerimeterMeters({...field, points: [field.points[0]]})).toBeUndefined();
  });
});
