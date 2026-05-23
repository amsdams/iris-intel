type Coordinate = [number, number];

function wrapLongitudeNear(lng: number, referenceLng: number): number {
  let wrapped = lng;
  while (wrapped - referenceLng > 180) wrapped -= 360;
  while (wrapped - referenceLng < -180) wrapped += 360;
  return wrapped;
}

export function buildWrappedLineCoordinates(from: Coordinate, to: Coordinate): Coordinate[] {
  const wrappedToLng = wrapLongitudeNear(to[0], from[0]);
  return [from, [wrappedToLng, to[1]]];
}

export function buildWrappedLineSegments(from: Coordinate, to: Coordinate): Coordinate[][] {
  const wrapped = buildWrappedLineCoordinates(from, to);
  const wrappedTo = wrapped[1];
  if (wrappedTo[0] >= -180 && wrappedTo[0] <= 180) return [wrapped];

  const crossingLng = wrappedTo[0] > 180 ? 180 : -180;
  const wrappedSpan = wrappedTo[0] - from[0];
  const crossingRatio = wrappedSpan === 0 ? 0 : (crossingLng - from[0]) / wrappedSpan;
  const crossingLat = from[1] + (to[1] - from[1]) * crossingRatio;
  const oppositeCrossingLng = crossingLng === 180 ? -180 : 180;

  return [
    [from, [crossingLng, crossingLat]],
    [[oppositeCrossingLng, crossingLat], to],
  ];
}

function unwrapRing(points: Coordinate[]): Coordinate[] {
  if (points.length === 0) return [];

  const unwrapped: Coordinate[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const previous = unwrapped[index - 1];
    const point = points[index];
    unwrapped.push([wrapLongitudeNear(point[0], previous[0]), point[1]]);
  }
  return unwrapped;
}

function clipByMinLng(points: Coordinate[], minLng: number): Coordinate[] {
  const clipped: Coordinate[] = [];

  points.forEach((current, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const previousInside = previous[0] >= minLng;
    const currentInside = current[0] >= minLng;

    if (previousInside !== currentInside) {
      const ratio = (minLng - previous[0]) / (current[0] - previous[0]);
      clipped.push([minLng, previous[1] + (current[1] - previous[1]) * ratio]);
    }
    if (currentInside) clipped.push(current);
  });

  return clipped;
}

function clipByMaxLng(points: Coordinate[], maxLng: number): Coordinate[] {
  const clipped: Coordinate[] = [];

  points.forEach((current, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const previousInside = previous[0] <= maxLng;
    const currentInside = current[0] <= maxLng;

    if (previousInside !== currentInside) {
      const ratio = (maxLng - previous[0]) / (current[0] - previous[0]);
      clipped.push([maxLng, previous[1] + (current[1] - previous[1]) * ratio]);
    }
    if (currentInside) clipped.push(current);
  });

  return clipped;
}

function closeRing(points: Coordinate[]): Coordinate[] {
  if (points.length === 0) return [];
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

export function buildWrappedPolygonGeometry(points: Coordinate[]): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  const unwrapped = unwrapRing(points);
  if (unwrapped.length < 3) {
    return {type: 'Polygon', coordinates: [closeRing(points)]};
  }

  const minLng = Math.min(...unwrapped.map((point) => point[0]));
  const maxLng = Math.max(...unwrapped.map((point) => point[0]));
  if (minLng >= -180 && maxLng <= 180) {
    return {type: 'Polygon', coordinates: [closeRing(unwrapped)]};
  }

  const minWorld = Math.floor((minLng + 180) / 360);
  const maxWorld = Math.floor((maxLng + 180) / 360);
  const polygons: Coordinate[][][] = [];

  for (let world = minWorld; world <= maxWorld; world += 1) {
    const worldMinLng = world * 360 - 180;
    const worldMaxLng = world * 360 + 180;
    const clipped = clipByMaxLng(clipByMinLng(unwrapped, worldMinLng), worldMaxLng);
    if (clipped.length < 3) continue;

    const normalized = clipped.map((point): Coordinate => [point[0] - world * 360, point[1]]);
    polygons.push([closeRing(normalized)]);
  }

  if (polygons.length === 1) {
    return {type: 'Polygon', coordinates: polygons[0]};
  }

  return {type: 'MultiPolygon', coordinates: polygons};
}
