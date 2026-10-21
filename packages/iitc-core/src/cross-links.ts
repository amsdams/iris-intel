import type {IitcDrawToolsLatLng} from './draw-tools';

type Vector = readonly [number, number, number];
const D2R = Math.PI / 180;

function equals(a: IitcDrawToolsLatLng, b: IitcDrawToolsLatLng): boolean {
  const longitudeDelta = Math.abs(a.lng - b.lng) % 360;
  // Leaflet LatLng.equals tolerance, extended to equivalent world copies.
  return Math.max(Math.abs(a.lat - b.lat), Math.min(longitudeDelta, 360 - longitudeDelta)) <= 1e-9;
}

function toCartesian({lat, lng}: IitcDrawToolsLatLng): Vector {
  lat *= D2R;
  lng *= D2R;
  const o = Math.cos(lat);
  return [o * Math.cos(lng), o * Math.sin(lng), Math.sin(lat)];
}

function cross(t: Vector, n: Vector): Vector {
  return [t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]];
}

function dot(t: Vector, n: Vector): number {
  return t[0] * n[0] + t[1] * n[1] + t[2] * n[2];
}

/**
 * Port of mcben's crossLinks.greatCircleArcIntersect from IITC-CE
 * reference/ingress-intel-total-conversion/plugins/cross-links.js.
 * Test original vertices, not geodesic rendering samples. Unlike upstream, omit
 * the raw-longitude rejection: a wrapped arc can cross another world copy.
 */
export function greatCircleArcIntersect(
  a0: IitcDrawToolsLatLng,
  a1: IitcDrawToolsLatLng,
  b0: IitcDrawToolsLatLng,
  b1: IitcDrawToolsLatLng,
): boolean {
  if (equals(a0, a1) || equals(b0, b1)) return false;
  if (equals(a0, b0) || equals(a0, b1) || equals(a1, b0) || equals(a1, b1)) return false;

  const ca0 = toCartesian(a0);
  const ca1 = toCartesian(a1);
  const cb0 = toCartesian(b0);
  const cb1 = toCartesian(b1);

  // Plane normals and endpoint normals bound the two great-circle arcs.
  const da = cross(ca0, ca1);
  const db = cross(cb0, cb1);
  const da0 = cross(da, ca0);
  const da1 = cross(da, ca1);
  const db0 = cross(db, cb0);
  const db1 = cross(db, cb1);
  const p = cross(da, db);
  const len2 = dot(p, p);

  // Preserve IITC's overlapping-arc behavior when both planes coincide.
  if (len2 < 1e-30) {
    const s1 = dot(cb0, da0);
    const d1 = dot(cb0, da1);
    if ((s1 < 0 && d1 > 0) || (s1 > 0 && d1 < 0)) return true;
    const s2 = dot(cb1, da0);
    const d2 = dot(cb1, da1);
    if ((s2 < 0 && d2 > 0) || (s2 > 0 && d2 < 0)) return true;
    const s3 = dot(ca0, db0);
    const d3 = dot(ca0, db1);
    return (s3 < 0 && d3 > 0) || (s3 > 0 && d3 < 0);
  }

  const n = 1 / Math.sqrt(len2);
  const intersection: Vector = [p[0] * n, p[1] * n, p[2] * n];
  const s = dot(intersection, da0);
  const d = dot(intersection, da1);
  const l = dot(intersection, db0);
  const f = dot(intersection, db1);

  // The planes intersect at two antipodal points; either can lie on both arcs.
  return (s > 0 && d < 0 && l > 0 && f < 0) || (s < 0 && d > 0 && l < 0 && f > 0);
}

/** Typed equivalent of crossLinks.testPolyLine without Leaflet layer ownership. */
export function testPolyLine(
  polyline: readonly IitcDrawToolsLatLng[],
  link: readonly [IitcDrawToolsLatLng, IitcDrawToolsLatLng],
  closed = false,
): boolean {
  for (let i = 0; i < polyline.length - 1; i += 1) {
    if (greatCircleArcIntersect(link[0], link[1], polyline[i], polyline[i + 1])) return true;
  }
  return closed && polyline.length > 1 &&
    greatCircleArcIntersect(link[0], link[1], polyline[polyline.length - 1], polyline[0]);
}
