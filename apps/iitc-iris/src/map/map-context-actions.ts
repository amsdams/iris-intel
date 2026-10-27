import L, {type LeafletMouseEvent, type Map as LeafletMap} from 'leaflet';
import type {IitcIrisRenderEntities, IitcIrisRenderPortal, IitcIrisRenderLink, IitcIrisRenderField,
  IitcIrisMapContextPortalAnchor, IitcIrisMissionWaypoint} from '../messages';
import {createIitcIrisMapContextMessage, installIitcIrisContextGestures} from './map-context-runtime';
import {convertIitcGeodesicLatLngs} from './leaflet-geodesic';
import {
  getIitcMapContextFieldPerimeterMeters,
  getIitcMapContextFieldPortalAnchors,
  getIitcMapContextFieldPortalGuids,
  getIitcMapContextLinkDistanceMeters,
  getIitcMapContextLinkPortalAnchors,
  getIitcMapContextLinkPortalGuids,
  planIitcMapContextPoint,
} from '@iris/iitc-core';

interface MapContextOptions {
  getMap: () => LeafletMap | undefined;
  getEntities: () => IitcIrisRenderEntities | undefined;
  getPortalRadius: (level: number | undefined, placeholder: boolean) => number;
  isPortalVisible: (portal: IitcIrisRenderPortal) => boolean;
  isLinkVisible: (link: IitcIrisRenderLink) => boolean;
  isFieldVisible: (field: IitcIrisRenderField) => boolean;
  selectPortal: (portal: IitcIrisRenderPortal) => void;
  selectMapObject: (type: 'link' | 'field', guid: string) => void;
  clearSelectedMapObject: () => void;
  zoomToAndShowPortal: (guid: string | undefined, lat: number | undefined, lng: number | undefined, zoom: number | undefined) => void;
  findPortalByGuidOrLatLng: (guid: string | undefined, lat: number | undefined, lng: number | undefined) => IitcIrisRenderPortal | undefined;
}

const LONG_PRESS_MS = 600;
const LONG_PRESS_MOVE_TOLERANCE_PX = 12;
const LONG_PRESS_CLICK_SUPPRESS_MS = 700;
const PORTAL_CONTEXT_HIT_TOLERANCE_PX = 10;
const LINK_CONTEXT_HIT_TOLERANCE_PX = 7;

/** Browser hit-testing and context gestures; selection and entity ownership stay explicit. */
export function createMapContextActions(options: MapContextOptions): {
  openPortalContext: typeof openPortalContext;
  openMapContextAtPoint: typeof openMapContextAtPoint;
  openMissionWaypointContext: typeof openMissionWaypointContext;
  installContextLongPress: typeof installContextLongPress;
  isPortalClickSuppressed: () => boolean;
} {
  const {getMap, getEntities, getPortalRadius, isPortalVisible, isLinkVisible, isFieldVisible,
    selectPortal, selectMapObject, clearSelectedMapObject, zoomToAndShowPortal, findPortalByGuidOrLatLng} = options;
  let suppressPortalClickUntil = 0;
  let lastContextPostAt = 0;

  function toLatLng(latE6: number, lngE6: number): [number, number] {
    return [latE6 / 1e6, lngE6 / 1e6];
  }

  function postMapContext(lat: number, lng: number, portal?: IitcIrisRenderPortal): void {
    const map = getMap();
    lastContextPostAt = performance.now();
    const plan = planIitcMapContextPoint({lat, lng, zoom: map?.getZoom(), portal});
    window.postMessage(createIitcIrisMapContextMessage(plan.payload), '*');
  }

  function postPortalContextReference(guid: string | undefined, lat: number, lng: number): void {
    const map = getMap();
    lastContextPostAt = performance.now();
    window.postMessage(createIitcIrisMapContextMessage({
      lat,
      lng,
      zoom: map?.getZoom(),
      portalGuid: guid,
      portalLat: lat,
      portalLng: lng,
    }), '*');
  }

  function postMapObjectContext(
    contextTarget: 'link' | 'field',
    lat: number,
    lng: number,
    object: {guid: string; team: 'E' | 'R' | 'N' | 'M'; portalGuids: string[]; portalAnchors: IitcIrisMapContextPortalAnchor[]; distanceMeters?: number},
  ): void {
    const map = getMap();
    lastContextPostAt = performance.now();
    const plan = planIitcMapContextPoint({lat, lng, zoom: map?.getZoom(), [contextTarget]: object});
    window.postMessage(createIitcIrisMapContextMessage(plan.payload), '*');
  }

  function openPortalContext(portal: IitcIrisRenderPortal, event?: LeafletMouseEvent): void {
    if (event) L.DomEvent.stop(event);
    suppressPortalClickUntil = Date.now() + LONG_PRESS_CLICK_SUPPRESS_MS;
    selectPortal(portal);
    postMapContext(portal.latE6 / 1_000_000, portal.lngE6 / 1_000_000, portal);
  }

  function openMapContextAtPoint(point: L.Point): void {
    const map = getMap();
    if (!map) return;
    const portal = findContextPortalAtPoint(point);
    if (portal) {
      openPortalContext(portal);
      return;
    }
    const link = findContextLinkAtPoint(point);
    if (link) {
      const latLng = map.containerPointToLatLng(point);
      selectMapObject('link', link.guid);
      postMapObjectContext('link', latLng.lat, latLng.lng, {
        guid: link.guid,
        team: link.team,
        portalGuids: getLinkPortalGuids(link),
        portalAnchors: getLinkPortalAnchors(link),
        distanceMeters: getLinkDistanceMeters(link),
      });
      return;
    }
    const field = findContextFieldAtPoint(point);
    if (field) {
      const latLng = map.containerPointToLatLng(point);
      selectMapObject('field', field.guid);
      postMapObjectContext('field', latLng.lat, latLng.lng, {
        guid: field.guid,
        team: field.team,
        portalGuids: getFieldPortalGuids(field),
        portalAnchors: getFieldPortalAnchors(field),
        distanceMeters: getFieldPerimeterMeters(field),
      });
      return;
    }
    const latLng = map.containerPointToLatLng(point);
    clearSelectedMapObject();
    postMapContext(latLng.lat, latLng.lng);
  }

  function findContextPortalAtPoint(point: L.Point): IitcIrisRenderPortal | undefined {
    const latestEntities = getEntities();
    const map = getMap();
    if (!map || !latestEntities) return undefined;

    let nearest: {portal: IitcIrisRenderPortal; distance: number} | undefined;
    for (const portal of latestEntities.portals) {
      if (!isPortalVisible(portal)) continue;
      const portalPoint = map.latLngToContainerPoint(toLatLng(portal.latE6, portal.lngE6));
      const distance = point.distanceTo(portalPoint);
      const hitTolerance = getPortalRadius(portal.level, portal.isPlaceholder) + PORTAL_CONTEXT_HIT_TOLERANCE_PX;
      if (distance > hitTolerance) continue;
      if (!nearest || distance < nearest.distance) nearest = {portal, distance};
    }
    return nearest?.portal;
  }

  function getPointToSegmentDistance(point: L.Point, start: L.Point, end: L.Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (dx === 0 && dy === 0) return point.distanceTo(start);
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy)));
    return point.distanceTo(L.point(start.x + t * dx, start.y + t * dy));
  }

  function getPortalLabelByGuid(guid: string | undefined, fallback: string): string {
    const latestEntities = getEntities();
    if (!guid || !latestEntities) return fallback;
    const portal = latestEntities.portals.find((candidate) => candidate.guid === guid);
    return portal?.title || guid;
  }

  function getLinkPortalGuids(link: IitcIrisRenderLink): string[] {
    return getIitcMapContextLinkPortalGuids(link);
  }

  function getLinkPortalAnchors(link: IitcIrisRenderLink): IitcIrisMapContextPortalAnchor[] {
    return getIitcMapContextLinkPortalAnchors(link, getPortalLabelByGuid);
  }

  function getLinkDistanceMeters(link: IitcIrisRenderLink): number {
    return getIitcMapContextLinkDistanceMeters(link);
  }

  function getFieldPortalGuids(field: IitcIrisRenderField): string[] {
    return getIitcMapContextFieldPortalGuids(field);
  }

  function getFieldPortalAnchors(field: IitcIrisRenderField): IitcIrisMapContextPortalAnchor[] {
    return getIitcMapContextFieldPortalAnchors(field, getPortalLabelByGuid);
  }

  function getFieldPerimeterMeters(field: IitcIrisRenderField): number | undefined {
    return getIitcMapContextFieldPerimeterMeters(field);
  }

  function findContextLinkAtPoint(point: L.Point): IitcIrisRenderLink | undefined {
    const latestEntities = getEntities();
    const map = getMap();
    if (!map || !latestEntities) return undefined;

    let nearest: {link: IitcIrisRenderLink; distance: number} | undefined;
    for (const link of latestEntities.links) {
      if (!isLinkVisible(link)) continue;
      const linePoints = convertIitcGeodesicLatLngs([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)])
        .map((latLng) => map.latLngToContainerPoint(latLng));
      for (let index = 0; index < linePoints.length - 1; index += 1) {
        const distance = getPointToSegmentDistance(point, linePoints[index], linePoints[index + 1]);
        if (distance > LINK_CONTEXT_HIT_TOLERANCE_PX) continue;
        if (!nearest || distance < nearest.distance) nearest = {link, distance};
      }
    }
    return nearest?.link;
  }

  function isPointInPolygon(point: L.Point, polygon: L.Point[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
      const a = polygon[i];
      const b = polygon[j];
      const intersects = (a.y > point.y) !== (b.y > point.y) &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function getPolygonArea(points: L.Point[]): number {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      area += current.x * next.y - next.x * current.y;
    }
    return Math.abs(area / 2);
  }

  function findContextFieldAtPoint(point: L.Point): IitcIrisRenderField | undefined {
    const latestEntities = getEntities();
    const map = getMap();
    if (!map || !latestEntities) return undefined;

    let smallest: {field: IitcIrisRenderField; area: number} | undefined;
    for (const field of latestEntities.fields) {
      if (!isFieldVisible(field) || field.points.length < 3) continue;
      const polygon = convertIitcGeodesicLatLngs(field.points.map((fieldPoint) => toLatLng(fieldPoint.latE6, fieldPoint.lngE6)), {closed: true})
        .map((latLng) => map.latLngToContainerPoint(latLng));
      if (!isPointInPolygon(point, polygon)) continue;
      const area = getPolygonArea(polygon);
      if (!smallest || area < smallest.area) smallest = {field, area};
    }
    return smallest?.field;
  }

  function openMissionWaypointContext(waypoint: IitcIrisMissionWaypoint, event?: LeafletMouseEvent): void {
    if (event) L.DomEvent.stop(event);
    if (waypoint.latE6 === undefined || waypoint.lngE6 === undefined) return;
    const lat = waypoint.latE6 / 1_000_000;
    const lng = waypoint.lngE6 / 1_000_000;
    const portal = findPortalByGuidOrLatLng(waypoint.portalGuid, lat, lng);
    if (portal) {
      openPortalContext(portal);
      return;
    }
    suppressPortalClickUntil = Date.now() + LONG_PRESS_CLICK_SUPPRESS_MS;
    zoomToAndShowPortal(waypoint.portalGuid, lat, lng, undefined);
    postPortalContextReference(waypoint.portalGuid, lat, lng);
  }

  function installContextLongPress(map: LeafletMap): () => void {
    return installIitcIrisContextGestures(map, {
      longPressMs: LONG_PRESS_MS,
      moveTolerancePx: LONG_PRESS_MOVE_TOLERANCE_PX,
      onLongPressStarted: () => {
        suppressPortalClickUntil = Date.now() + LONG_PRESS_CLICK_SUPPRESS_MS;
      },
      onContextPoint: openMapContextAtPoint,
      getLastContextPostAt: () => lastContextPostAt,
    });
  }

  return {openPortalContext, openMapContextAtPoint, openMissionWaypointContext, installContextLongPress,
    isPortalClickSuppressed: () => Date.now() < suppressPortalClickUntil};
}
