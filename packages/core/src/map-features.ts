import type {Artifact, Field, Link, Portal} from './store';
import {buildWrappedLineSegments, buildWrappedPolygonGeometry} from './geometry/wrapped-lines';

type FeatureProperties = Record<string, unknown>;

const featureIdFromProperties = (
  fallback: string,
  properties: FeatureProperties,
): string | number => {
  const id = properties.id;
  return typeof id === 'string' || typeof id === 'number' ? id : fallback;
};

export const toFeatureCollection = <T extends GeoJSON.Geometry, P extends GeoJSON.GeoJsonProperties>(
  features: GeoJSON.Feature<T, P>[]
): GeoJSON.FeatureCollection<T, P> => ({
  type: 'FeatureCollection',
  features,
});

export function buildPortalPointFeature(
  portal: Portal,
  properties: FeatureProperties = {},
): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    geometry: {type: 'Point', coordinates: [portal.lng, portal.lat]},
    properties: {
      id: portal.id,
      team: portal.team,
      level: portal.level ?? 0,
      health: portal.health ?? 100,
      ...properties,
    },
  };
}

export function buildLinkLineFeatures(
  link: Link,
  properties: FeatureProperties = {},
): GeoJSON.Feature<GeoJSON.LineString>[] {
  return buildWrappedLineSegments([link.fromLng, link.fromLat], [link.toLng, link.toLat])
    .map((coordinates, segmentIndex) => ({
      type: 'Feature',
      id: segmentIndex === 0 ? link.id : `${link.id}:${segmentIndex}`,
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {
        id: link.id,
        team: link.team,
        ...properties,
      },
    }));
}

export function buildFieldPolygonFeature(
  field: Field,
  properties: FeatureProperties = {},
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> {
  return {
    type: 'Feature',
    id: field.id,
    geometry: buildWrappedPolygonGeometry(field.points.map((point) => [point.lng, point.lat])),
    properties: {
      id: field.id,
      team: field.team,
      ...properties,
    },
  };
}

export function buildArtifactPointFeature(
  artifact: Artifact,
  portal: Portal,
  properties: FeatureProperties = {},
): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    id: featureIdFromProperties(`artifact:${artifact.portalId}`, properties),
    geometry: {type: 'Point', coordinates: [portal.lng, portal.lat]},
    properties: {
      portalId: artifact.portalId,
      artifactType: artifact.type,
      artifactIds: artifact.ids,
      ...properties,
    },
  };
}

export function buildOrnamentPointFeature(
  portal: Portal,
  ornaments: string[],
  properties: FeatureProperties = {},
): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    id: featureIdFromProperties(`ornament:${portal.id}`, properties),
    geometry: {type: 'Point', coordinates: [portal.lng, portal.lat]},
    properties: {
      portalId: portal.id,
      team: portal.team,
      ornaments,
      ...properties,
    },
  };
}
