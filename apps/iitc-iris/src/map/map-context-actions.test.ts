import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Map as LeafletMap, Point} from 'leaflet';
import {createMapContextActions} from './map-context-actions';
import type {IitcIrisRenderEntities, IitcIrisMessage} from '../messages';

function point(x: number, y: number): Point {
  return {x, y, distanceTo: (other: Point): number => Math.hypot(x - other.x, y - other.y)} as Point;
}
vi.mock('leaflet', () => ({default: {point: (x: number, y: number): Point => point(x, y), DomEvent: {stop: vi.fn()}}}));
vi.mock('./leaflet-geodesic', () => ({convertIitcGeodesicLatLngs: (values: unknown): unknown => values}));
type Options = Parameters<typeof createMapContextActions>[0];

describe('map context targeting', () => {
  let options: Options;
  let entities: IitcIrisRenderEntities;
  let runtime: ReturnType<typeof createMapContextActions>;
  let post: ReturnType<typeof vi.fn<(message: IitcIrisMessage) => void>>;
  beforeEach(() => {
    post = vi.fn();
    vi.stubGlobal('window', {postMessage: post});
    entities = {generation: 1, portals: [{guid: 'portal', title: 'Portal', latE6: 0, lngE6: 0, team: 'R', isPlaceholder: false}],
      links: [{guid: 'link', team: 'R', oGuid: 'portal', dGuid: 'end', oLatE6: 0, oLngE6: 0, dLatE6: 0, dLngE6: 100000}],
      fields: [
        {guid: 'large', team: 'E', points: [{latE6: 20000, lngE6: 20000}, {latE6: 20000, lngE6: 100000}, {latE6: 100000, lngE6: 20000}]},
        {guid: 'small', team: 'R', points: [{latE6: 30000, lngE6: 30000}, {latE6: 30000, lngE6: 60000}, {latE6: 60000, lngE6: 30000}]},
      ]};
    options = {getMap: (): LeafletMap => ({getZoom: (): number => 16,
      latLngToContainerPoint: ([lat, lng]: [number, number]): Point => point(lng * 1000, lat * 1000),
      containerPointToLatLng: (value: Point): {lat: number; lng: number} => ({lat: value.y / 1000, lng: value.x / 1000}),
    }) as unknown as LeafletMap, getEntities: (): IitcIrisRenderEntities => entities, getPortalRadius: (): number => 5,
      isPortalVisible: (): boolean => true, isLinkVisible: (): boolean => true, isFieldVisible: (): boolean => true,
      selectPortal: vi.fn(), selectMapObject: vi.fn(), clearSelectedMapObject: vi.fn(),
      zoomToAndShowPortal: vi.fn(), findPortalByGuidOrLatLng: vi.fn()};
    runtime = createMapContextActions(options);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('prefers a visible portal over its link and suppresses the following portal click', () => {
    runtime.openMapContextAtPoint(point(0, 0));
    expect(options.selectPortal).toHaveBeenCalledWith(entities.portals[0]);
    expect(options.selectMapObject).not.toHaveBeenCalled();
    expect(post.mock.calls[0][0]).toMatchObject({contextTarget: 'portal', portalGuid: 'portal', portalLat: 0, portalLng: 0});
    expect(runtime.isPortalClickSuppressed()).toBe(true);
  });

  it('selects a nearby link with portal anchors and distance metadata', () => {
    runtime.openMapContextAtPoint(point(50, 2));
    expect(options.selectMapObject).toHaveBeenCalledWith('link', 'link');
    expect(post.mock.calls[0][0]).toMatchObject({contextTarget: 'link', contextGuid: 'link'});
  });

  it('chooses the smallest containing field and respects visibility predicates', () => {
    runtime.openMapContextAtPoint(point(40, 40));
    expect(options.selectMapObject).toHaveBeenCalledWith('field', 'small');
    runtime = createMapContextActions({...options, isFieldVisible: field => field.guid === 'large'});
    runtime.openMapContextAtPoint(point(40, 40));
    expect(options.selectMapObject).toHaveBeenLastCalledWith('field', 'large');
  });

  it('clears an object highlight for empty space and uses current entities', () => {
    entities = {...entities, portals: [], links: [], fields: []};
    runtime.openMapContextAtPoint(point(0, 0));
    expect(options.clearSelectedMapObject).toHaveBeenCalledOnce();
    expect(options.selectPortal).not.toHaveBeenCalled();
    expect(post.mock.calls[0][0]).toMatchObject({contextTarget: 'map', lat: 0, lng: 0});
  });

  it('opens a reference context for unloaded mission waypoints without inventing a loaded portal', () => {
    runtime.openMissionWaypointContext({index: 0, hidden: false, guid: 'waypoint', title: 'Waypoint', typeNum: 1, type: 'portal', objectiveNum: 1, objective: 'hack', portalGuid: 'unloaded', latE6: 52000000, lngE6: 4000000});
    expect(options.zoomToAndShowPortal).toHaveBeenCalledWith('unloaded', 52, 4, undefined);
    expect(post.mock.calls[0][0]).toMatchObject({portalGuid: 'unloaded', portalLat: 52, portalLng: 4});
    expect(runtime.isPortalClickSuppressed()).toBe(true);
  });
});
