import { Artifact, Field, Link, MissionDetails, Portal } from '@iris/core';

type PortalFeatureProperties = {
  id: string;
  team: string;
  name?: string;
  level: number;
  health: number;
  visited: boolean;
  captured: boolean;
  scanned: boolean;
} & Record<string, unknown>;

type TeamFeatureProperties = {
  team: string;
} & Record<string, unknown>;

export type PortalFeature = GeoJSON.Feature<GeoJSON.Point, PortalFeatureProperties>;
export type LinkFeature = GeoJSON.Feature<GeoJSON.LineString, TeamFeatureProperties>;
export type FieldFeature = GeoJSON.Feature<GeoJSON.Polygon, TeamFeatureProperties>;
export type ArtifactFeature = GeoJSON.Feature<GeoJSON.Point, { portalId: string; type: string; ids: string[] }>;
export type MissionRouteFeature = GeoJSON.Feature<GeoJSON.LineString, Record<string, unknown>>;
export type MissionWaypointFeature = GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>;

interface TeamVisibility {
  showResistance: boolean;
  showEnlightened: boolean;
  showMachina: boolean;
  showUnclaimedPortals: boolean;
}

type PortalFilters = TeamVisibility & {
  showLevel: Record<number, boolean>;
  showHealth: Record<number, boolean>;
};

type LinkFilters = TeamVisibility & {
  showLinks: boolean;
};

type FieldFilters = TeamVisibility & {
  showFields: boolean;
};

export const toFeatureCollection = <T extends GeoJSON.Geometry, P extends GeoJSON.GeoJsonProperties>(
  features: GeoJSON.Feature<T, P>[]
): GeoJSON.FeatureCollection<T, P> => ({
  type: 'FeatureCollection',
  features,
});

export const buildPortalFeatures = (
  portals: Record<string, Portal>,
  filters: PortalFilters
): PortalFeature[] =>
  Object.values(portals)
    .filter((portal) => {
      if (portal.team === 'N') {
        return filters.showUnclaimedPortals;
      }
      if (portal.team === 'M' && !filters.showMachina) return false;
      if (portal.team === 'R' && !filters.showResistance) return false;
      if (portal.team === 'E' && !filters.showEnlightened) return false;
      if (portal.level !== undefined && !filters.showLevel[portal.level]) return false;

      if (portal.health !== undefined) {
        if (portal.health <= 25 && !filters.showHealth[25]) return false;
        if (portal.health > 25 && portal.health <= 50 && !filters.showHealth[50]) return false;
        if (portal.health > 50 && portal.health <= 75 && !filters.showHealth[75]) return false;
        if (portal.health > 75 && !filters.showHealth[100]) return false;
      }

      return true;
    })
    .map((portal) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [portal.lng, portal.lat] },
      properties: {
        id: portal.id,
        team: portal.team,
        name: portal.name,
        level: portal.level || 0,
        health: portal.health ?? 100,
        visited: !!portal.visited,
        captured: !!portal.captured,
        scanned: !!portal.scanned,
      } satisfies PortalFeatureProperties,
    }));

export const buildLinkFeatures = (
  links: Record<string, Link>,
  filters: LinkFilters
): LinkFeature[] =>
  Object.values(links)
    .filter((link) => {
      if (!filters.showLinks) return false;
      if (link.team === 'R' && !filters.showResistance) return false;
      if (link.team === 'E' && !filters.showEnlightened) return false;
      return !(link.team === 'M' && !filters.showMachina);
    })
    .map((link) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [link.fromLng, link.fromLat],
          [link.toLng, link.toLat],
        ],
      },
      properties: { team: link.team } satisfies TeamFeatureProperties,
    }));

export const buildFieldFeatures = (
  fields: Record<string, Field>,
  filters: FieldFilters
): FieldFeature[] =>
  Object.values(fields)
    .filter((field) => {
      if (!filters.showFields) return false;
      if (field.team === 'R' && !filters.showResistance) return false;
      if (field.team === 'E' && !filters.showEnlightened) return false;
      return !(field.team === 'M' && !filters.showMachina);
    })
    .map((field) => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          ...field.points.map((point) => [point.lng, point.lat] as [number, number]),
          [field.points[0].lng, field.points[0].lat],
        ]],
      },
      properties: { team: field.team } satisfies TeamFeatureProperties,
    }));

export const buildArtifactFeatures = (
  artifacts: Record<string, Artifact>,
  portals: Record<string, Portal>
): ArtifactFeature[] =>
  Object.values(artifacts)
    .map((artifact) => {
      const portal = portals[artifact.portalId];
      if (!portal) return null;

      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [portal.lng, portal.lat] },
        properties: {
          portalId: artifact.portalId,
          type: artifact.type,
          ids: artifact.ids,
        },
      } as ArtifactFeature;
    })
    .filter((f): f is ArtifactFeature => f !== null);

export const buildMissionRouteFeatures = (mission: MissionDetails | null): MissionRouteFeature[] => {
  if (!mission) return [];

  const coordinates = mission.waypoints
    .filter((waypoint) => !waypoint.hidden && waypoint.lat !== undefined && waypoint.lng !== undefined)
    .map((waypoint) => [waypoint.lng as number, waypoint.lat as number] as [number, number]);

  if (coordinates.length < 2) return [];

  return [{
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {
      missionId: mission.id,
    },
  }];
};

export const buildMissionWaypointFeatures = (mission: MissionDetails | null): MissionWaypointFeature[] => {
  if (!mission) return [];

  return mission.waypoints
    .filter((waypoint) => !waypoint.hidden && waypoint.lat !== undefined && waypoint.lng !== undefined)
    .map((waypoint) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [waypoint.lng as number, waypoint.lat as number],
      },
      properties: {
        missionId: mission.id,
        waypointId: waypoint.id,
        index: waypoint.index + 1,
        title: waypoint.title,
      },
    }));
};
