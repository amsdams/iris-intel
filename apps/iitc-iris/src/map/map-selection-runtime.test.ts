import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createMapSelectionRuntime} from './map-selection-runtime';
import type {Map as LeafletMap} from 'leaflet';
import type {IitcIrisRenderEntities, IitcIrisRenderPortal} from '../messages';
import type {IitcIrisPortalDetailsState} from '../messages';
import type {IitcIrisMapLayers} from './map-layers';
import type {IitcPortalDetails} from '@iris/iitc-core';

const markers = vi.hoisted(() => ({circleMarker: vi.fn(), circle: vi.fn(), range: vi.fn(), line: vi.fn(), polygon: vi.fn()}));
vi.mock('leaflet', () => ({default: {circleMarker: markers.circleMarker, circle: markers.circle}}));
vi.mock('./leaflet-geodesic', () => ({createIitcGeodesicPolyline: markers.line, createIitcGeodesicPolygon: markers.polygon,
  createIitcGeodesicCircle: markers.range}));
type Options = Parameters<typeof createMapSelectionRuntime>[0];
const portal: IitcIrisRenderPortal = {guid: 'portal', title: 'Portal', team: 'R', latE6: 52000000, lngE6: 4000000, isPlaceholder: true};

describe('map selection ownership', () => {
  let entities: IitcIrisRenderEntities;
  let options: Options;
  let runtime: ReturnType<typeof createMapSelectionRuntime>;
  let setView: ReturnType<typeof vi.fn>;
  let layers: IitcIrisMapLayers;
  beforeEach(() => {
    vi.clearAllMocks();
    entities = {generation: 1, portals: [{...portal}], links: [
      {guid: 'out', team: 'R', oGuid: 'portal', dGuid: 'other', oLatE6: 52000000, oLngE6: 4000000, dLatE6: 52001000, dLngE6: 4001000},
    ], fields: []};
    layers = {selectedPortal: [], selectedMapObject: []} as unknown as IitcIrisMapLayers;
    setView = vi.fn();
    options = {getMap: (): LeafletMap => ({getZoom: (): number => 11, setView}) as unknown as LeafletMap,
      getEntities: (): IitcIrisRenderEntities => entities, getPortalRadius: (): number => 5,
      isPortalVisible: (): boolean => true, isLinkVisible: (): boolean => true, isFieldVisible: (): boolean => true,
      ensureLayers: (): IitcIrisMapLayers => layers, clearRenderedLayers: vi.fn(), addRenderedLayer: vi.fn(), renderEntities: vi.fn(),
      selectedPortalChanged: vi.fn(), refreshSelectedPortalDetails: vi.fn().mockResolvedValue(undefined),
      clearPortalDetails: vi.fn(), cancelActivePortalDetailsFetch: vi.fn(), repostLatestEntityStatus: vi.fn()};
    runtime = createMapSelectionRuntime(options);
  });

  it('retains selection, key notification, detail request, render and status order', () => {
    const order: string[] = [];
    runtime = createMapSelectionRuntime({...options,
      selectedPortalChanged: () => {expect(runtime.getSelectedPortalGuid()).toBe('portal'); order.push('keys');},
      refreshSelectedPortalDetails: async () => {order.push('details');},
      renderEntities: () => {order.push('render');}, repostLatestEntityStatus: (): void => {order.push('status');}});
    runtime.selectPortal(portal);
    expect(order).toEqual(['keys', 'details', 'render', 'status']);
    expect(runtime.getSelectedPortal()).toMatchObject({guid: 'portal', links: {count: 1, outgoing: 1, incoming: 0, guids: ['out']}});
  });

  it('resolves pending GUID navigation when the entity arrives without recursively rendering', () => {
    runtime.zoomToAndShowPortal('pending', 53, 5, undefined);
    expect(setView).toHaveBeenCalledWith([53, 5], 15);
    expect(runtime.hasPendingPortalSelection()).toBe(true);
    entities.portals.push({...portal, guid: 'pending', latE6: 53000000, lngE6: 5000000});
    runtime.resolvePendingPortalSelection(entities);
    expect(runtime.getSelectedPortalGuid()).toBe('pending');
    expect(runtime.hasPendingPortalSelection()).toBe(false);
    expect(options.renderEntities).not.toHaveBeenCalled();
    expect(options.refreshSelectedPortalDetails).toHaveBeenCalledWith('pending');
  });

  it('navigates loaded GUID and coordinate targets at their existing default or explicit zoom', () => {
    runtime.zoomToAndShowPortal('portal', 0, 0, 16);
    expect(setView).toHaveBeenLastCalledWith([52, 4], 16);
    runtime.zoomToAndShowPortal(undefined, 52, 4, undefined);
    expect(setView).toHaveBeenLastCalledWith([52, 4], 15);
    expect(runtime.getSelectedPortalGuid()).toBe('portal');
    runtime.selectMissionWaypoint({index: 0, hidden: false, guid: 'waypoint', title: 'Waypoint', typeNum: 1, type: 'portal', objectiveNum: 1, objective: 'hack', latE6: 52000000, lngE6: 4000000, portalGuid: 'portal'});
    expect(setView).toHaveBeenLastCalledWith([52, 4], 15);
  });

  it('promotes detail fields in the shared entity and re-renders while retaining selection', () => {
    runtime.selectPortal(portal);
    const details = {guid: 'portal', title: 'Detailed', image: 'image.jpg', team: 'E', latE6: 52000001,
      lngE6: 4000001, level: 8, health: 90, resCount: 8, hasMissionsStartingHere: true} as IitcPortalDetails;
    const state = {status: 'ready' as const, history: {visited: true, captured: false, scoutControlled: false}};
    runtime.applyPortalDetails(details, state);
    expect(entities.portals[0]).toMatchObject({title: 'Detailed', team: 'E', isPlaceholder: false, mission: true, history: state.history});
    expect(runtime.getSelectedPortal()).toMatchObject({title: 'Detailed', team: 'E'});
    expect(options.renderEntities).toHaveBeenLastCalledWith(entities);
  });

  it('reads replacement entities and layers without resetting the selected GUID', () => {
    runtime.selectPortal(portal);
    runtime.renderSelectedPortal();
    expect(markers.circleMarker).toHaveBeenCalledWith([52, 4], expect.objectContaining({radius: 10, color: '#ff9900'}));
    layers = {selectedPortal: [], selectedMapObject: []} as unknown as IitcIrisMapLayers;
    entities = {...entities, portals: [{...portal, title: 'Replacement'}]};
    runtime.renderSelectedPortal();
    expect(runtime.getSelectedPortal()?.title).toBe('Replacement');
    expect(options.clearRenderedLayers).toHaveBeenLastCalledWith(layers.selectedPortal);
    entities.portals = [];
    runtime.renderSelectedPortal();
    expect(runtime.getSelectedPortal()).toMatchObject({guid: 'portal', title: 'Replacement'});
    expect(runtime.getSelectedPortalGuid()).toBe('portal');
  });

  it('keeps visibility and clear-selection behavior for portal and link overlays', () => {
    runtime.selectPortal(portal);
    runtime.selectMapObject('link', 'out');
    expect(markers.line).toHaveBeenCalledOnce();
    runtime.clearSelectedMapObject();
    expect(options.clearRenderedLayers).toHaveBeenLastCalledWith(layers.selectedMapObject);
    runtime.clearPortalSelection();
    expect(runtime.getSelectedPortal()).toBeNull();
    expect(runtime.getSelectedPortalGuid()).toBeUndefined();
    expect(options.clearPortalDetails).toHaveBeenCalledOnce();
    expect(options.cancelActivePortalDetailsFetch).toHaveBeenCalledOnce();
    const hidden = createMapSelectionRuntime({...options, isPortalVisible: (): boolean => false});
    hidden.selectPortal(portal, false);
    vi.mocked(options.addRenderedLayer).mockClear();
    hidden.renderSelectedPortal();
    expect(options.addRenderedLayer).not.toHaveBeenCalled();
  });

  it('shows access range without details and only uses matching ready link ranges', () => {
    let details: IitcIrisPortalDetailsState = {status: 'loading', guid: 'portal'};
    runtime = createMapSelectionRuntime({...options, getPortalDetails: () => details});
    runtime.selectPortal(portal);
    runtime.renderSelectedPortal();
    expect(markers.circle).toHaveBeenLastCalledWith([52, 4], expect.objectContaining({radius: 40, interactive: false}));
    expect(markers.range).not.toHaveBeenCalled();
    const statistics = {range: {base: 100, boost: 1, range: 100, isLinkable: false}} as NonNullable<IitcIrisPortalDetailsState['statistics']>;
    details = {status: 'ready', guid: 'different', statistics};
    runtime.renderSelectedPortal();
    expect(markers.range).not.toHaveBeenCalled();
    details.guid = 'portal';
    runtime.renderSelectedPortal();
    expect(markers.range).toHaveBeenLastCalledWith([52, 4], 100, expect.objectContaining({dashArray: '10,10', interactive: false}));
    statistics.range.isLinkable = true;
    runtime.renderSelectedPortal();
    expect(markers.range).toHaveBeenLastCalledWith([52, 4], 100, expect.objectContaining({dashArray: undefined}));
  });

  it('retains known metadata through placeholders but accepts new full portal data', () => {
    const full = {...portal, isPlaceholder: false, team: 'M' as const, level: 7, resCount: 8};
    runtime.selectPortal(full);
    entities = {...entities, links: [], portals: [{...portal, team: 'N'}]};
    runtime.renderSelectedPortal();
    expect(runtime.getSelectedPortal()).toMatchObject({team: 'M', level: 7, resCount: 8, isPlaceholder: false, links: {count: 0}});
    entities.portals = [{...full, team: 'E', level: 3, resCount: 4}];
    runtime.renderSelectedPortal();
    expect(runtime.getSelectedPortal()).toMatchObject({team: 'E', level: 3, resCount: 4});
  });

  it('clears a retained selection on explicit server deletion', () => {
    runtime.selectPortal(portal);
    entities = {...entities, portals: [], deletedEntityGuids: ['portal']};
    runtime.renderSelectedPortal();
    expect(runtime.getSelectedPortal()).toBeNull();
    expect(runtime.getSelectedPortalGuid()).toBeUndefined();
    expect(options.clearPortalDetails).toHaveBeenCalledOnce();
    expect(options.cancelActivePortalDetailsFetch).toHaveBeenCalledOnce();
  });

  it('applies fresh selected details even while map responses omit the portal', () => {
    runtime.selectPortal(portal);
    entities.portals = [];
    runtime.renderSelectedPortal();
    const details = {guid: 'portal', title: 'Retained details', team: 'R', latE6: 52000000, lngE6: 4000000,
      level: 8, resCount: 8, health: 100} as IitcPortalDetails;
    runtime.applyPortalDetails(details, {status: 'ready'});
    expect(runtime.getSelectedPortal()).toMatchObject({guid: 'portal', title: 'Retained details', level: 8, isPlaceholder: false});
    expect(entities.portals).toEqual([]);
  });
});
