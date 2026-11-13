import L, {type LatLngExpression, type PathOptions, type Polygon, type Polyline} from 'leaflet';
import {convertIitcGeodesicPoints} from './iitc-geodesic';

export interface IitcGeodesicOptions extends PathOptions {
  segmentsCoeff?: number;
}

function toLatLng(value: LatLngExpression): L.LatLng {
  return L.latLng(value);
}

export function convertIitcGeodesicLatLngs(
  latLngs: LatLngExpression[],
  options: {closed?: boolean; segmentsCoeff?: number} = {},
): L.LatLng[] {
  return convertIitcGeodesicPoints(latLngs.map(toLatLng), options).map((latLng) => new L.LatLng(latLng.lat, latLng.lng));
}

export function createIitcGeodesicPolyline(latLngs: LatLngExpression[], options: IitcGeodesicOptions = {}): Polyline {
  return L.polyline(convertIitcGeodesicLatLngs(latLngs, options), options);
}

export function createIitcGeodesicPolygon(latLngs: LatLngExpression[], options: IitcGeodesicOptions = {}): Polygon {
  return L.polygon(convertIitcGeodesicLatLngs(latLngs, {...options, closed: true}), options);
}

/** Match IITC's L.GeodesicCircle sampling and earth radius, including unwrapped world-copy coordinates. */
export function createIitcGeodesicCircle(center: LatLngExpression, radius: number, options: PathOptions = {}): Polygon {
  const origin = L.latLng(center);
  const radians = Math.PI / 180;
  const lat = origin.lat * radians;
  const lng = origin.lng * radians;
  const distance = radius / 6367000;
  const segments = Math.max(48, Math.floor(radius / 1000));
  const points: [number, number][] = [];
  for (let index = 0; index < segments; index++) {
    const angle = 2 * Math.PI * index / segments;
    const pointLat = Math.asin(Math.sin(lat) * Math.cos(distance) + Math.cos(lat) * Math.sin(distance) * Math.cos(angle));
    const pointLng = lng + Math.atan2(Math.sin(angle) * Math.sin(distance) * Math.cos(lat),
      Math.cos(distance) - Math.sin(lat) * Math.sin(pointLat));
    points.push([pointLat / radians, pointLng / radians]);
  }
  return L.polygon(points, options);
}
