import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {Map as LeafletMap} from 'leaflet';
import {IITC_MISSION_ORDER} from '@iris/iitc-core';
import type {IitcIrisMissionDetails, IitcIrisMissionWaypoint, IitcIrisRenderPortal} from '../../messages';
import {createMissionOverlay} from './mission-overlay';

const leaflet = vi.hoisted(() => ({polyline: vi.fn(), circleMarker: vi.fn(), marker: vi.fn(), divIcon: vi.fn(), latLngBounds: vi.fn(), DomEvent: {stop: vi.fn()}}));
vi.mock('leaflet', () => ({default: leaflet}));

const waypoint = (index: number): IitcIrisMissionWaypoint => ({index, hidden: index > 0, guid: `point-${index}`,
  title: `Point ${index}`, typeNum: 1, type: 'Portal', objectiveNum: 1, objective: 'Hack',
  latE6: 52000000 + index * 10000, lngE6: 4000000 + index * 10000, portalGuid: `portal-${index}`});
const mission: IitcIrisMissionDetails = {guid: 'mission', title: 'Mission', description: '', typeNum: IITC_MISSION_ORDER.sequential,
  waypoints: [waypoint(0), waypoint(1)], bounds: {south: 52, west: 4, north: 52.01, east: 4.01}};

describe('Mission overlay ownership', () => {
  const clearLayers = vi.fn();
  const addLayer = vi.fn();
  const selectMissionWaypoint = vi.fn();
  const openMissionWaypointContext = vi.fn();
  let portals: IitcIrisRenderPortal[];
  let suppressed: boolean;
  let map: {panTo: ReturnType<typeof vi.fn>; fitBounds: ReturnType<typeof vi.fn>};
  let overlay: ReturnType<typeof createMissionOverlay>;
  let handlers: Record<string, (event: unknown) => void>[];

  beforeEach(() => {
    vi.clearAllMocks();
    portals = [];
    suppressed = false;
    handlers = [];
    map = {panTo: vi.fn(), fitBounds: vi.fn()};
    leaflet.circleMarker.mockImplementation(() => {
      const events: Record<string, (event: unknown) => void> = {};
      handlers.push(events);
      return {on: (name: string, callback: (event: unknown) => void): void => { events[name] = callback; }};
    });
    leaflet.latLngBounds.mockImplementation((...args: unknown[]) => args);
    overlay = createMissionOverlay({getMap: () => map as unknown as LeafletMap, getPortals: () => portals,
      getSelectedMission: () => mission, getPortalRadius: () => 8, isPortalClickSuppressed: () => suppressed,
      selectMissionWaypoint, openMissionWaypointContext, clearLayers, addLayer, pane: 'iitc-iris-missions'});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the current portals, route, hidden waypoint styles and interaction guards', () => {
    portals = [{guid: 'portal-0', title: 'Portal', latE6: 52000000, lngE6: 4000000, team: 'N', isPlaceholder: false}];
    overlay.renderMissionOverlay(mission);
    expect(clearLayers).toHaveBeenCalledOnce();
    expect(leaflet.polyline).toHaveBeenCalledWith([[52, 4], [52.01, 4.01]], expect.objectContaining({pane: 'iitc-iris-missions', interactive: false}));
    expect(addLayer).toHaveBeenCalledTimes(5);
    expect(leaflet.circleMarker.mock.calls[0][1]).toMatchObject({radius: 14, color: '#A6A600'});
    expect(leaflet.circleMarker.mock.calls[1][1]).toMatchObject({radius: 5, dashArray: '2,4'});
    handlers[0].click({});
    expect(selectMissionWaypoint).toHaveBeenCalledExactlyOnceWith(mission.waypoints[0]);
    suppressed = true;
    handlers[0].click({});
    expect(selectMissionWaypoint).toHaveBeenCalledOnce();
    const context = {};
    handlers[1].contextmenu(context);
    expect(openMissionWaypointContext).toHaveBeenCalledWith(mission.waypoints[1], context);
  });

  it('clears old geometry, skips missing coordinates and routes navigation to the replacement map', () => {
    overlay.renderMissionOverlay({...mission, typeNum: IITC_MISSION_ORDER.nonSequential,
      waypoints: [mission.waypoints[0], {...mission.waypoints[1], latE6: undefined}]});
    expect(leaflet.polyline).not.toHaveBeenCalled();
    expect(addLayer).toHaveBeenCalledTimes(2);
    const original = map;
    map = {panTo: vi.fn(), fitBounds: vi.fn()};
    overlay.panToMissionStart(mission);
    overlay.zoomToSelectedMission();
    expect(original.panTo).not.toHaveBeenCalled();
    expect(original.fitBounds).not.toHaveBeenCalled();
    expect(map.panTo).toHaveBeenCalledWith([52, 4]);
    expect(map.fitBounds).toHaveBeenCalledWith([[52, 4], [52.01, 4.01]], {maxZoom: 15});
    addLayer.mockClear();
    overlay.renderMissionOverlay(undefined);
    expect(clearLayers).toHaveBeenCalledTimes(2);
    expect(addLayer).not.toHaveBeenCalled();
  });
});
