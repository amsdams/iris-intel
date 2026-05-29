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
  getVisiblePortalOrnaments,
  isFieldVisibleForDisplay,
  isLinkVisibleForDisplay,
  isPortalVisibleForDisplay,
  shouldRenderArtifactFeature,
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
export type ArtifactFeature = GeoJSON.Feature<GeoJSON.Point, { portalId: string; type: string; ids: string[]; color?: string }>;
export type OrnamentFeature = GeoJSON.Feature<GeoJSON.Point, { portalId: string; team: string; ornaments: string[]; ornament: string; ornamentIndex: number; ornamentCount: number; color?: string }>;
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
  color?: string;
};

interface ArtifactFilters {
  showArtifacts: boolean;
  color?: string;
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
      return isPortalVisibleForDisplay(portal, filters, {selectedPortalId});
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
      return isLinkVisibleForDisplay(link, filters);
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
      return isFieldVisibleForDisplay(field, filters);
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
  Object.values(artifacts)
    .map((artifact) => {
      const portal = portals[artifact.portalId];
      if (!shouldRenderArtifactFeature(artifact, portal, filters.showArtifacts)) return null;

      return buildArtifactPointFeature(artifact, portal, {
          portalId: artifact.portalId,
          type: artifact.type,
          ids: artifact.ids,
          color: filters.color,
        }) as ArtifactFeature;
    })
    .filter((f): f is ArtifactFeature => f !== null);

export const buildOrnamentFeatures = (
  portals: Record<string, Portal>,
  mockOrnaments: Record<string, string[]>,
  filters: OrnamentFilters
): OrnamentFeature[] =>
  Object.values(portals)
    .filter((portal) => {
      const ornaments = getVisiblePortalOrnaments(portal, mockOrnaments, filters.showOrnaments);
      return ornaments.length > 0;
    })
    .flatMap((portal) => {
      const ornaments = getVisiblePortalOrnaments(portal, mockOrnaments, filters.showOrnaments);
      return ornaments.map((ornament, index) =>
        buildOrnamentPointFeature(portal, [ornament], {
          id: `ornament:${portal.id}:${ornament}:${index}`,
          portalId: portal.id,
          team: portal.team,
          ornaments,
          ornament,
          ornamentIndex: index,
          ornamentCount: ornaments.length,
          color: filters.color,
        }) as OrnamentFeature
      );
    });

export const buildMissionRouteFeatures = (mission: MissionDetails | null, color?: string): MissionRouteFeature[] => {
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
      color,
    },
  }];
};

export const buildMissionWaypointFeatures = (mission: MissionDetails | null, color?: string): MissionWaypointFeature[] => {
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
        color,
      },
    }));
};
