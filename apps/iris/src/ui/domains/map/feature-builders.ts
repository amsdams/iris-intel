import {
  Artifact,
  Field,
  HistoryFilterState,
  Link,
  MissionDetails,
  Portal,
  buildArtifactPointFeature,
  buildFieldPolygonFeature,
  buildLinkLineFeatures,
  buildOrnamentPointFeature,
  buildPortalPointFeature,
  isPortalHealthBucketVisible,
  matchesPortalHistoryFilters,
} from '@iris/core';

type PortalFeatureProperties = {
  id: string;
  team: string;
  name?: string;
  level: number;
  health: number;
  visited: boolean;
  captured: boolean;
  scanned: boolean;
  ornaments: string[];
} & Record<string, unknown>;

type TeamFeatureProperties = {
  team: string;
} & Record<string, unknown>;

export type PortalFeature = GeoJSON.Feature<GeoJSON.Point, PortalFeatureProperties>;
export type LinkFeature = GeoJSON.Feature<GeoJSON.LineString, TeamFeatureProperties>;
export type FieldFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, TeamFeatureProperties>;
export type ArtifactFeature = GeoJSON.Feature<GeoJSON.Point, { portalId: string; type: string; ids: string[] }>;
export type OrnamentFeature = GeoJSON.Feature<GeoJSON.Point, { portalId: string; team: string; ornaments: string[] }>;
export type MissionRouteFeature = GeoJSON.Feature<GeoJSON.LineString, Record<string, unknown>>;
export type MissionWaypointFeature = GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>;

interface TeamVisibility {
  showResistance: boolean;
  showEnlightened: boolean;
  showMachina: boolean;
  showUnclaimedPortals: boolean;
}

type OrnamentFilters = PortalFilters & {
  showOrnaments: boolean;
};

interface ArtifactFilters {
  showArtifacts: boolean;
}

type LinkFilters = TeamVisibility & {
  showLinks: boolean;
};

type FieldFilters = TeamVisibility & {
  showFields: boolean;
};

type PortalFilters = TeamVisibility & {
  showLevel: Record<number, boolean>;
  showHealth: Record<number, boolean>;
  showVisited: HistoryFilterState;
  showCaptured: HistoryFilterState;
  showScanned: HistoryFilterState;
};

export const buildPortalFeatures = (
  portals: Record<string, Portal>,
  filters: PortalFilters,
  selectedPortalId?: string | null
): PortalFeature[] =>
  Object.values(portals)
    .filter((portal) => {
      if (selectedPortalId && portal.id === selectedPortalId) return true;
      if (portal.team === 'N') {
        return filters.showUnclaimedPortals;
      }
      if (portal.team === 'M' && !filters.showMachina) return false;
      if (portal.team === 'R' && !filters.showResistance) return false;
      if (portal.team === 'E' && !filters.showEnlightened) return false;
      if (portal.level !== undefined && !filters.showLevel[portal.level]) return false;

      if (!isPortalHealthBucketVisible(portal.health, filters.showHealth)) return false;

      return matchesPortalHistoryFilters(portal, {
        showVisited: filters.showVisited,
        showCaptured: filters.showCaptured,
        showScanned: filters.showScanned,
      });
    })
    .map((portal) => buildPortalPointFeature(portal, {
        name: portal.name,
        visited: !!portal.visited,
        captured: !!portal.captured,
        scanned: !!portal.scanned,
        ornaments: portal.ornaments || [],
      }) as PortalFeature);

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
    .flatMap((link) => buildLinkLineFeatures(link)
      .map((feature) => ({
        ...feature,
        properties: { team: link.team } satisfies TeamFeatureProperties,
      })));

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
      ...buildFieldPolygonFeature(field),
      properties: { team: field.team } satisfies TeamFeatureProperties,
    }));

export const buildArtifactFeatures = (
  artifacts: Record<string, Artifact>,
  portals: Record<string, Portal>,
  filters: ArtifactFilters
): ArtifactFeature[] =>
  (!filters.showArtifacts ? [] :
  Object.values(artifacts)
    .map((artifact) => {
      const portal = portals[artifact.portalId];
      if (!portal) return null;

      return buildArtifactPointFeature(artifact, portal, {
          portalId: artifact.portalId,
          type: artifact.type,
          ids: artifact.ids,
        }) as ArtifactFeature;
    })
    .filter((f): f is ArtifactFeature => f !== null));

export const buildOrnamentFeatures = (
  portals: Record<string, Portal>,
  mockOrnaments: Record<string, string[]>,
  filters: OrnamentFilters
): OrnamentFeature[] =>
  (!filters.showOrnaments ? [] :
  Object.values(portals)
    .filter((portal) => {
      const ornaments = [...(portal.ornaments || []), ...(mockOrnaments[portal.id] || [])];
      if (ornaments.length === 0) return false;
      if (portal.team === 'N') {
        return filters.showUnclaimedPortals;
      }
      if (portal.team === 'M' && !filters.showMachina) return false;
      if (portal.team === 'R' && !filters.showResistance) return false;
      if (portal.team === 'E' && !filters.showEnlightened) return false;
      if (portal.level !== undefined && !filters.showLevel[portal.level]) return false;

      if (!isPortalHealthBucketVisible(portal.health, filters.showHealth)) return false;

      return true;
    })
    .map((portal) => {
      const ornaments = [...(portal.ornaments || []), ...(mockOrnaments[portal.id] || [])];
      return buildOrnamentPointFeature(portal, ornaments, {
        portalId: portal.id,
        team: portal.team,
        ornaments,
      }) as OrnamentFeature;
    }));

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
