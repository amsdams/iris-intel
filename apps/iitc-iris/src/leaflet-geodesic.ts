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
