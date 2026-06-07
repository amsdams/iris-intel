export interface IitcGeodesicLatLng {
  lat: number;
  lng: number;
}

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const EARTH_RADIUS_METERS = 6_367_000;
export const IITC_GEODESIC_DEFAULT_SEGMENTS_COEFF = 5000;

function wrapLongitude(lng: number): number {
  const wrapped = ((lng + 180) % 360 + 360) % 360 - 180;
  return wrapped === -180 && lng > 0 ? 180 : wrapped;
}

function convertIitcGeodesicLine(start: IitcGeodesicLatLng, end: IitcGeodesicLatLng, convertedPoints: IitcGeodesicLatLng[], segmentsCoeff: number): void {
  const lng1 = start.lng * D2R;
  const lng2 = end.lng * D2R;
  const dLng = lng1 - lng2;
  const segments = Math.floor(Math.abs((dLng * EARTH_RADIUS_METERS) / segmentsCoeff));
  if (segments < 2) return;

  const lat1 = start.lat * D2R;
  const lat2 = end.lat * D2R;
  const sinLat1 = Math.sin(lat1);
  const sinLat2 = Math.sin(lat2);
  const cosLat1 = Math.cos(lat1);
  const cosLat2 = Math.cos(lat2);
  const sinLat1CosLat2 = sinLat1 * cosLat2;
  const sinLat2CosLat1 = sinLat2 * cosLat1;
  const cosLat1CosLat2SinDLng = cosLat1 * cosLat2 * Math.sin(dLng);
  if (Math.abs(cosLat1CosLat2SinDLng) < Number.EPSILON) return;

  for (let index = 1; index < segments; index += 1) {
    const iLng = lng1 - dLng * (index / segments);
    const iLat = Math.atan(
      (sinLat1CosLat2 * Math.sin(iLng - lng2) - sinLat2CosLat1 * Math.sin(iLng - lng1)) /
        cosLat1CosLat2SinDLng,
    );
    convertedPoints.push({lat: iLat * R2D, lng: iLng * R2D});
  }
}

export function convertIitcGeodesicPoints(
  latLngs: IitcGeodesicLatLng[],
  options: {closed?: boolean; segmentsCoeff?: number} = {},
): IitcGeodesicLatLng[] {
  if (latLngs.length === 0) return [];

  const lngOffset = latLngs[0].lng;
  const points = latLngs.map((latLng) => ({lat: latLng.lat, lng: wrapLongitude(latLng.lng - lngOffset)}));
  if (options.closed) points.push(points[0]);

  const convertedPoints: IitcGeodesicLatLng[] = options.closed ? [] : [points[0]];
  const segmentsCoeff = options.segmentsCoeff ?? IITC_GEODESIC_DEFAULT_SEGMENTS_COEFF;

  for (let index = 0; index < points.length - 1; index += 1) {
    convertIitcGeodesicLine(points[index], points[index + 1], convertedPoints, segmentsCoeff);
    convertedPoints.push(points[index + 1]);
  }

  return convertedPoints.map((latLng) => ({lat: latLng.lat, lng: latLng.lng + lngOffset}));
}
