import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createMapSelectionRuntime} from './map-selection-runtime';
import type {Map as LeafletMap} from 'leaflet';
import type {IitcIrisRenderEntities, IitcIrisRenderPortal} from '../messages';
import type {IitcIrisMapLayers} from './map-layers';
import type {IitcPortalDetails} from '@iris/iitc-core';

const markers = vi.hoisted(() => ({circleMarker: vi.fn(), line: vi.fn(), polygon: vi.fn()}));
vi.mock('leaflet', () => ({default: {circleMarker: markers.circleMarker}}));
vi.mock('./leaflet-geodesic', () => ({createIitcGeodesicPolyline: markers.line, createIitcGeodesicPolygon: markers.polygon}));
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
    expect(runtime.getSelectedPortal()).toBeNull();
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
});
