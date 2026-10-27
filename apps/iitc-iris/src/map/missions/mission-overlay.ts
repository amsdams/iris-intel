import L, {type Layer as LeafletLayer, type LeafletMouseEvent, type Map as LeafletMap} from 'leaflet';
import {IITC_MISSION_ORDER} from '@iris/iitc-core';
import type {IitcIrisMissionDetails, IitcIrisMissionWaypoint, IitcIrisRenderPortal} from '../../messages';

const MISSION_ROUTE_COLOR = '#404000';
const MISSION_OVERVIEW_MAX_ZOOM = 15;

interface MissionOverlayOptions {
  getMap: () => LeafletMap | undefined;
  getPortals: () => readonly IitcIrisRenderPortal[];
  getSelectedMission: () => IitcIrisMissionDetails | undefined;
  getPortalRadius: (level: number | undefined, isPlaceholder: boolean) => number;
  isPortalClickSuppressed: () => boolean;
  selectMissionWaypoint: (waypoint: IitcIrisMissionWaypoint) => void;
  openMissionWaypointContext: (waypoint: IitcIrisMissionWaypoint, event?: LeafletMouseEvent) => void;
  clearLayers: () => void;
  addLayer: (layer: LeafletLayer) => void;
  pane: string;
}

interface MissionOverlay {
  clearMissionOverlay: () => void;
  renderMissionOverlay: (mission: IitcIrisMissionDetails | undefined) => void;
  panToMissionStart: (mission: IitcIrisMissionDetails | undefined) => void;
  zoomToSelectedMission: () => void;
}

/** Render the route/waypoints; fetching, cache state and portal selection stay with their owners. */
export function createMissionOverlay({
  getMap, getPortals, getSelectedMission, getPortalRadius, isPortalClickSuppressed,
  selectMissionWaypoint, openMissionWaypointContext, clearLayers, addLayer, pane,
}: MissionOverlayOptions): MissionOverlay {
  const toLatLng = (latE6: number, lngE6: number): [number, number] => [latE6 / 1_000_000, lngE6 / 1_000_000];

  function clearMissionOverlay(): void {
    clearLayers();
  }

  function renderMissionOverlay(mission: IitcIrisMissionDetails | undefined): void {
    clearMissionOverlay();
    if (!mission) return;
    const portals = getPortals();
    const points = mission.waypoints
      .flatMap((waypoint) => waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined
        ? [{waypoint, latLng: toLatLng(waypoint.latE6, waypoint.lngE6)}]
        : []);
    if (points.length === 0) return;

    if (mission.typeNum === IITC_MISSION_ORDER.sequential && points.length > 1) {
      addLayer(L.polyline(points.map((point) => point.latLng), {
        color: MISSION_ROUTE_COLOR,
        opacity: 1,
        pane,
        weight: 2,
        interactive: false,
      }));
    }

    points.forEach(({waypoint, latLng}, index) => {
      const isStart = index === 0;
      const portal = waypoint.portalGuid
        ? portals.find((candidate) => candidate.guid === waypoint.portalGuid)
        : undefined;
      const marker = L.circleMarker(latLng, {
        radius: portal ? Math.max(5, getPortalRadius(portal.level, portal.isPlaceholder) * 1.75) : 5,
        weight: isStart ? 3 : 3,
        opacity: 1,
        color: isStart ? '#A6A600' : MISSION_ROUTE_COLOR,
        fill: false,
        dashArray: waypoint.hidden ? '2,4' : undefined,
        interactive: true,
        pane,
      });
      marker.on('click', (event) => {
        L.DomEvent.stop(event);
        if (isPortalClickSuppressed()) return;
        selectMissionWaypoint(waypoint);
      });
      marker.on('contextmenu', (event) => openMissionWaypointContext(waypoint, event));
      addLayer(marker);

      const label = L.marker(latLng, {
        icon: L.divIcon({
          className: `iitc-iris-mission-waypoint-label ${isStart ? 'is-start' : ''}`,
          html: String(index + 1),
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        }),
        interactive: false,
        keyboard: false,
        pane,
      });
      addLayer(label);
    });
  }

  function panToMissionStart(mission: IitcIrisMissionDetails | undefined): void {
    const map = getMap();
    const start = mission?.waypoints.find((waypoint) => waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined);
    if (!map || !start || start.latE6 === undefined || start.lngE6 === undefined) return;
    const latLng = toLatLng(start.latE6, start.lngE6);
    map.panTo(latLng);
  }

  function zoomToSelectedMission(): void {
    const map = getMap();
    const bounds = getSelectedMission()?.bounds;
    if (!map || !bounds) return;
    map.fitBounds(L.latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]), {maxZoom: MISSION_OVERVIEW_MAX_ZOOM});
  }

  return {clearMissionOverlay, renderMissionOverlay, panToMissionStart, zoomToSelectedMission};
}
