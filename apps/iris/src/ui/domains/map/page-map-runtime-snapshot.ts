import {
    Artifact,
    Field,
    HistoryFilterState,
    Link,
    MissionDetails,
    PlannedLink,
    PlannedMarker,
    PlanningTool,
    Portal,
    buildFieldPolygonFeature,
    buildLinkLineFeatures,
    buildPortalPointFeature,
    toFeatureCollection,
    buildWrappedLineSegments,
    getPortalHistoryOverlayFlags,
    isFieldVisibleForDisplay,
    isLinkVisibleForDisplay,
    isPortalVisibleForDisplay,
    type PortalHistoryLayerState,
} from '@iris/core';
import {INGRESS_NEUTRAL_PORTAL_COLORS} from '@iris/core/ingress-map-style';
import {PageMapRuntimeCommandMessage} from '../../../shared/page-map-runtime-protocol';
import {MAP_THEMES, THEMES} from '../../theme';
import {
    buildArtifactFeatures,
    buildMissionRouteFeatures,
    buildMissionWaypointFeatures,
    buildOrnamentFeatures,
} from './feature-builders';

interface MapStateSnapshot {
    lat: number;
    lng: number;
    zoom: number;
}

export interface BuildPageMapRuntimeSnapshotOptions {
    type: string;
    diagnostic?: boolean;
    portals: Record<string, Portal>;
    links: Record<string, Link>;
    fields: Record<string, Field>;
    artifacts: Record<string, Artifact>;
    mockOrnaments: Record<string, string[]>;
    missionDetails: MissionDetails | null;
    pluginFeatures: GeoJSON.FeatureCollection;
    plannedLinks: PlannedLink[];
    plannedMarkers: PlannedMarker[];
    planningMode: boolean;
    planningTool: PlanningTool;
    planningAnchorPortalId: string | null;
    planningPortalPath: string[];
    mapState: MapStateSnapshot;
    themeId: string;
    mapThemeId: string;
    layerShowLinks: boolean;
    layerShowFields: boolean;
    layerShowOrnaments: boolean;
    layerShowArtifacts: boolean;
    filterShowResistance: boolean;
    filterShowEnlightened: boolean;
    filterShowMachina: boolean;
    filterShowUnclaimedPortals: boolean;
    filterShowLevel: Record<number, boolean>;
    filterShowHealth: Record<number, boolean>;
    portalHistoryLayers: PortalHistoryLayerState;
    filterShowVisited: HistoryFilterState;
    filterShowCaptured: HistoryFilterState;
    filterShowScanned: HistoryFilterState;
    selectedPortalId: string | null;
    selectedLinkId: string | null;
    selectedFieldId: string | null;
    selectedPlannedItemId: string | null;
    plannedLinksEnabled: boolean;
    plannedShowLinks: boolean;
    plannedShowMarkers: boolean;
}

export function buildPageMapRuntimeSnapshotMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        center: {lat: options.mapState.lat, lng: options.mapState.lng},
        zoom: options.mapState.zoom,
        camera: {
            lat: options.mapState.lat,
            lng: options.mapState.lng,
            zoom: options.mapState.zoom,
        },
        tiles: getMapThemeTiles(options.mapThemeId),
        planning: {
            enabled: options.planningMode,
            tool: options.planningTool,
        },
        layers: {
            portals: true,
            links: options.layerShowLinks,
            fields: options.layerShowFields,
        },
        data: {
            portals: buildPortalFeatureCollection(options),
            links: buildLinkFeatureCollection(options),
            fields: buildFieldFeatureCollection(options),
            selectedPortal: buildSelectedPortalFeatureCollection(options.portals, options.selectedPortalId, options),
            selectedLink: buildSelectedLinkFeatureCollection(options.links, options.selectedLinkId, options),
            selectedField: buildSelectedFieldFeatureCollection(options.fields, options.selectedFieldId, options),
            artifacts: toFeatureCollection(buildArtifactFeatures(options.artifacts, options.portals, {
                showArtifacts: options.layerShowArtifacts,
            })),
            ornaments: toFeatureCollection(buildOrnamentFeatures(options.portals, options.mockOrnaments, {
                showOrnaments: options.layerShowOrnaments,
                showResistance: options.filterShowResistance,
                showEnlightened: options.filterShowEnlightened,
                showMachina: options.filterShowMachina,
                showUnclaimedPortals: options.filterShowUnclaimedPortals,
                showLevel: options.filterShowLevel,
                showHealth: options.filterShowHealth,
                showVisited: options.filterShowVisited,
                showCaptured: options.filterShowCaptured,
                showScanned: options.filterShowScanned,
            })),
            missionRoute: toFeatureCollection(buildMissionRouteFeatures(options.missionDetails)),
            missionWaypoints: toFeatureCollection(buildMissionWaypointFeatures(options.missionDetails)),
            pluginFeatures: buildPluginFeatureCollection(options),
            plannedFeatures: toFeatureCollection(buildPlannedFeatures(options)),
        },
    };
}

export function buildPageMapRuntimeSelectionMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        data: {
            selectedPortal: buildSelectedPortalFeatureCollection(options.portals, options.selectedPortalId, options),
            selectedLink: buildSelectedLinkFeatureCollection(options.links, options.selectedLinkId, options),
            selectedField: buildSelectedFieldFeatureCollection(options.fields, options.selectedFieldId, options),
        },
    };
}

export function buildPageMapRuntimePortalsMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        data: {
            portals: buildPortalFeatureCollection(options),
            selectedPortal: buildSelectedPortalFeatureCollection(options.portals, options.selectedPortalId, options),
        },
    };
}

export function buildPageMapRuntimeLinksMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        data: {
            links: buildLinkFeatureCollection(options),
            selectedLink: buildSelectedLinkFeatureCollection(options.links, options.selectedLinkId, options),
        },
    };
}

export function buildPageMapRuntimeFieldsMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        data: {
            fields: buildFieldFeatureCollection(options),
            selectedField: buildSelectedFieldFeatureCollection(options.fields, options.selectedFieldId, options),
        },
    };
}

export function buildPageMapRuntimeVisualFilterMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        data: {
            portals: buildPortalFeatureCollection(options),
            links: buildLinkFeatureCollection(options),
            fields: buildFieldFeatureCollection(options),
            selectedPortal: buildSelectedPortalFeatureCollection(options.portals, options.selectedPortalId, options),
            selectedLink: buildSelectedLinkFeatureCollection(options.links, options.selectedLinkId, options),
            selectedField: buildSelectedFieldFeatureCollection(options.fields, options.selectedFieldId, options),
            ornaments: toFeatureCollection(buildOrnamentFeatures(options.portals, options.mockOrnaments, {
                showOrnaments: options.layerShowOrnaments,
                showResistance: options.filterShowResistance,
                showEnlightened: options.filterShowEnlightened,
                showMachina: options.filterShowMachina,
                showUnclaimedPortals: options.filterShowUnclaimedPortals,
                showLevel: options.filterShowLevel,
                showHealth: options.filterShowHealth,
                showVisited: options.filterShowVisited,
                showCaptured: options.filterShowCaptured,
                showScanned: options.filterShowScanned,
            })),
            pluginFeatures: buildPluginFeatureCollection(options),
        },
    };
}

export function buildPageMapRuntimePlannedFeaturesMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        planning: {
            enabled: options.planningMode,
            tool: options.planningTool,
        },
        data: {
            plannedFeatures: toFeatureCollection(buildPlannedFeatures(options)),
        },
    };
}

export function buildPageMapRuntimePluginFeaturesMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        data: {
            pluginFeatures: buildPluginFeatureCollection(options),
        },
    };
}

export function buildPageMapRuntimeArtifactsMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        data: {
            artifacts: toFeatureCollection(buildArtifactFeatures(options.artifacts, options.portals, {
                showArtifacts: options.layerShowArtifacts,
            })),
        },
    };
}

export function buildPageMapRuntimeOrnamentsMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        data: {
            ornaments: toFeatureCollection(buildOrnamentFeatures(options.portals, options.mockOrnaments, {
                showOrnaments: options.layerShowOrnaments,
                showResistance: options.filterShowResistance,
                showEnlightened: options.filterShowEnlightened,
                showMachina: options.filterShowMachina,
                showUnclaimedPortals: options.filterShowUnclaimedPortals,
                showLevel: options.filterShowLevel,
                showHealth: options.filterShowHealth,
                showVisited: options.filterShowVisited,
                showCaptured: options.filterShowCaptured,
                showScanned: options.filterShowScanned,
            })),
        },
    };
}

export function buildPageMapRuntimeMissionMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        diagnostic: options.diagnostic,
        data: {
            missionRoute: toFeatureCollection(buildMissionRouteFeatures(options.missionDetails)),
            missionWaypoints: toFeatureCollection(buildMissionWaypointFeatures(options.missionDetails)),
        },
    };
}

export function getMapThemeTiles(id: string): string[] {
    const mapTheme = MAP_THEMES[id] || MAP_THEMES.DARK;
    if (mapTheme.url.includes('{s}')) {
        return ['a', 'b', 'c', 'd'].map((subdomain) => mapTheme.url.replace('{s}', subdomain));
    }

    return [mapTheme.url];
}

function isPortalVisible(portal: Portal, options: BuildPageMapRuntimeSnapshotOptions): boolean {
    return isPortalVisibleForDisplay(portal, {
        showResistance: options.filterShowResistance,
        showEnlightened: options.filterShowEnlightened,
        showMachina: options.filterShowMachina,
        showUnclaimedPortals: options.filterShowUnclaimedPortals,
        showLevel: options.filterShowLevel,
        showHealth: options.filterShowHealth,
        showVisited: options.filterShowVisited,
        showCaptured: options.filterShowCaptured,
        showScanned: options.filterShowScanned,
    });
}

function getTeamColor(team: string, options: BuildPageMapRuntimeSnapshotOptions): string {
    const theme = THEMES[options.themeId] || THEMES.INGRESS;
    if (team === 'E') return theme.E;
    if (team === 'R') return theme.R;
    if (team === 'M') return theme.M;
    return INGRESS_NEUTRAL_PORTAL_COLORS.fill;
}

function getPortalStrokeColor(team: string, options: BuildPageMapRuntimeSnapshotOptions): string {
    if (team === 'N') return INGRESS_NEUTRAL_PORTAL_COLORS.stroke;
    return getTeamColor(team, options);
}

function buildPluginFeatureCollection(options: BuildPageMapRuntimeSnapshotOptions): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: options.pluginFeatures.features.map((feature) => {
            const properties = feature.properties as Record<string, unknown> | null;
            const team = typeof properties?.team === 'string' ? properties.team : null;
            if (!team) return feature;

            return {
                ...feature,
                properties: {
                    ...properties,
                    teamColor: getTeamColor(team, options),
                },
            };
        }),
    };
}

function buildPortalFeatureCollection(options: BuildPageMapRuntimeSnapshotOptions): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: Object.values(options.portals)
            .filter((portal) => isPortalVisible(portal, options))
            .map((portal): GeoJSON.Feature<GeoJSON.Point> => buildPortalPointFeature(portal, {
                color: getTeamColor(portal.team, options),
                strokeColor: getPortalStrokeColor(portal.team, options),
                ...getPortalHistoryOverlayFlags(portal, options.portalHistoryLayers),
            })),
    };
}

function buildSelectedPortalFeatureCollection(
    portals: Record<string, Portal>,
    selectedPortalId: string | null,
    options: BuildPageMapRuntimeSnapshotOptions
): GeoJSON.FeatureCollection {
    const portal = selectedPortalId ? portals[selectedPortalId] : null;
    if (!portal) {
        return {type: 'FeatureCollection', features: []};
    }

    return {
        type: 'FeatureCollection',
        features: [{
            ...buildPortalPointFeature(portal, {
                color: getTeamColor(portal.team, options),
                strokeColor: getPortalStrokeColor(portal.team, options),
            }),
        }],
    };
}

function buildSelectedLinkFeatureCollection(
    links: Record<string, Link>,
    selectedLinkId: string | null,
    options: BuildPageMapRuntimeSnapshotOptions
): GeoJSON.FeatureCollection {
    const link = selectedLinkId ? links[selectedLinkId] : null;
    if (!link) {
        return {type: 'FeatureCollection', features: []};
    }

    return {
        type: 'FeatureCollection',
        features: buildLinkLineFeatures(link, {
            color: getTeamColor(link.team, options),
        }),
    };
}

function buildSelectedFieldFeatureCollection(
    fields: Record<string, Field>,
    selectedFieldId: string | null,
    options: BuildPageMapRuntimeSnapshotOptions
): GeoJSON.FeatureCollection {
    const field = selectedFieldId ? fields[selectedFieldId] : null;
    if (!field || field.points.length < 3) {
        return {type: 'FeatureCollection', features: []};
    }

    return {
        type: 'FeatureCollection',
        features: [{
            ...buildFieldPolygonFeature(field, {
                color: getTeamColor(field.team, options),
            }),
        }],
    };
}

function buildLinkFeatureCollection(options: BuildPageMapRuntimeSnapshotOptions): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: Object.values(options.links)
            .filter((link) => isLinkVisibleForDisplay(link, {
                showLinks: options.layerShowLinks,
                showResistance: options.filterShowResistance,
                showEnlightened: options.filterShowEnlightened,
                showMachina: options.filterShowMachina,
                showUnclaimedPortals: options.filterShowUnclaimedPortals,
            }))
            .flatMap((link): GeoJSON.Feature<GeoJSON.LineString>[] => buildLinkLineFeatures(link, {
                color: getTeamColor(link.team, options),
            })),
    };
}

function buildFieldFeatureCollection(options: BuildPageMapRuntimeSnapshotOptions): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: Object.values(options.fields)
            .filter((field) => isFieldVisibleForDisplay(field, {
                showFields: options.layerShowFields,
                showResistance: options.filterShowResistance,
                showEnlightened: options.filterShowEnlightened,
                showMachina: options.filterShowMachina,
                showUnclaimedPortals: options.filterShowUnclaimedPortals,
            }))
            .filter((field) => field.points.length >= 3)
            .map((field): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> => buildFieldPolygonFeature(field, {
                color: getTeamColor(field.team, options),
            })),
    };
}

function buildPlannedFeatures(options: BuildPageMapRuntimeSnapshotOptions): GeoJSON.Feature[] {
    if (!options.plannedLinksEnabled) return [];

    const features: GeoJSON.Feature[] = [];
    if (options.plannedShowLinks) {
        features.push(...buildPlannedLinkFeatures(options));
    }
    if (options.plannedShowMarkers) {
        features.push(...buildPlannedMarkerFeatures(options));
    }

    return features;
}

function buildPlannedLinkFeatures(options: BuildPageMapRuntimeSnapshotOptions): GeoJSON.Feature[] {
    const features: GeoJSON.Feature[] = [];
    const loadedLinks = options.plannedLinks.length > 0
        ? Object.values(options.links).map((link) => ({
            link,
            bounds: getSegmentBounds(
                {lng: link.fromLng, lat: link.fromLat},
                {lng: link.toLng, lat: link.toLat}
            ),
        }))
        : [];

    options.plannedLinks.forEach((plannedLink) => {
        const from = options.portals[plannedLink.fromPortalId];
        const to = options.portals[plannedLink.toPortalId];
        if (!from || !to) return;
        const plannedBounds = getSegmentBounds(
            {lng: from.lng, lat: from.lat},
            {lng: to.lng, lat: to.lat}
        );

        buildWrappedLineSegments([from.lng, from.lat], [to.lng, to.lat]).forEach((coordinates, segmentIndex) => {
            features.push({
                type: 'Feature',
                id: segmentIndex === 0 ? plannedLink.id : `${plannedLink.id}:${segmentIndex}`,
                geometry: {
                    type: 'LineString',
                    coordinates,
                },
                properties: {
                    id: plannedLink.id,
                    plannedType: 'link',
                    plannedItemType: 'link',
                    selected: options.selectedPlannedItemId === plannedLink.id,
                    color: '#37e6ff',
                    opacity: 0.92,
                },
            });
        });

        loadedLinks.forEach(({link, bounds}) => {
            if (
                link.fromPortalId === plannedLink.fromPortalId ||
                link.toPortalId === plannedLink.fromPortalId ||
                link.fromPortalId === plannedLink.toPortalId ||
                link.toPortalId === plannedLink.toPortalId
            ) {
                return;
            }

            if (!segmentBoundsOverlap(plannedBounds, bounds)) return;

            if (!segmentsIntersect(
                {lng: from.lng, lat: from.lat},
                {lng: to.lng, lat: to.lat},
                {lng: link.fromLng, lat: link.fromLat},
                {lng: link.toLng, lat: link.toLat}
            )) {
                return;
            }

            buildWrappedLineSegments([link.fromLng, link.fromLat], [link.toLng, link.toLat]).forEach((coordinates, segmentIndex) => {
                features.push({
                    type: 'Feature',
                    id: segmentIndex === 0
                        ? `planned-crossing:${plannedLink.id}:${link.id}`
                        : `planned-crossing:${plannedLink.id}:${link.id}:${segmentIndex}`,
                    geometry: {
                        type: 'LineString',
                        coordinates,
                    },
                    properties: {
                        id: `planned-crossing:${plannedLink.id}:${link.id}`,
                        plannedType: 'crossing',
                        color: '#ff4d4d',
                        opacity: 0.95,
                    },
                });
            });
        });
    });

    options.planningPortalPath.forEach((portalId, index) => {
        const portal = options.portals[portalId];
        if (!portal) return;

        features.push({
            type: 'Feature',
            id: `planned-path:${index}:${portalId}`,
            geometry: {type: 'Point', coordinates: [portal.lng, portal.lat]},
            properties: {
                id: `planned-path:${index}:${portalId}`,
                plannedType: index === 0 ? 'anchor' : 'target',
                color: '#37e6ff',
                opacity: 0.95,
            },
        });
    });

    for (let index = 0; index < options.planningPortalPath.length - 1; index += 1) {
        const fromPortalId = options.planningPortalPath[index];
        const toPortalId = options.planningPortalPath[index + 1];
        const from = options.portals[fromPortalId];
        const to = options.portals[toPortalId];
        if (!from || !to) continue;

        buildWrappedLineSegments([from.lng, from.lat], [to.lng, to.lat]).forEach((coordinates, segmentIndex) => {
            features.push({
                type: 'Feature',
                id: segmentIndex === 0
                    ? `planned-preview:${index}:${fromPortalId}:${toPortalId}`
                    : `planned-preview:${index}:${fromPortalId}:${toPortalId}:${segmentIndex}`,
                geometry: {
                    type: 'LineString',
                    coordinates,
                },
                properties: {
                    id: `planned-preview:${index}:${fromPortalId}:${toPortalId}`,
                    plannedType: 'preview',
                    color: '#37e6ff',
                    opacity: 0.72,
                },
            });
        });
    }

    return features;
}

function buildPlannedMarkerFeatures(options: BuildPageMapRuntimeSnapshotOptions): GeoJSON.Feature[] {
    const markerColors: Record<PlannedMarker['color'], string> = {
        white: '#ffffff',
        red: '#ff4d4d',
        blue: '#37e6ff',
        green: '#49ff7a',
    };

    const features: GeoJSON.Feature[] = options.plannedMarkers.map((plannedMarker) => ({
        type: 'Feature',
        id: plannedMarker.id,
        geometry: {type: 'Point', coordinates: [plannedMarker.lng, plannedMarker.lat]},
        properties: {
            id: plannedMarker.id,
            label: plannedMarker.label,
            portalId: plannedMarker.portalId,
            plannedType: 'marker',
            plannedItemType: 'marker',
            selected: options.selectedPlannedItemId === plannedMarker.id,
            color: markerColors[plannedMarker.color] ?? markerColors.blue,
            opacity: 0.95,
        },
    }));

    if (options.planningTool === 'markers' && options.planningAnchorPortalId) {
        const portal = options.portals[options.planningAnchorPortalId];
        if (portal) {
            features.push({
                type: 'Feature',
                id: `planned-marker-anchor:${portal.id}`,
                geometry: {type: 'Point', coordinates: [portal.lng, portal.lat]},
                properties: {
                    id: `planned-marker-anchor:${portal.id}`,
                    plannedType: 'anchor',
                    color: '#37e6ff',
                    opacity: 0.95,
                },
            });
        }
    }

    return features;
}

function getSegmentBounds(
    a: {lng: number; lat: number},
    b: {lng: number; lat: number}
): {minLng: number; minLat: number; maxLng: number; maxLat: number} {
    return {
        minLng: Math.min(a.lng, b.lng),
        minLat: Math.min(a.lat, b.lat),
        maxLng: Math.max(a.lng, b.lng),
        maxLat: Math.max(a.lat, b.lat),
    };
}

function segmentBoundsOverlap(
    a: {minLng: number; minLat: number; maxLng: number; maxLat: number},
    b: {minLng: number; minLat: number; maxLng: number; maxLat: number}
): boolean {
    return a.minLng <= b.maxLng &&
        a.maxLng >= b.minLng &&
        a.minLat <= b.maxLat &&
        a.maxLat >= b.minLat;
}

function segmentsIntersect(
    a: {lng: number; lat: number},
    b: {lng: number; lat: number},
    c: {lng: number; lat: number},
    d: {lng: number; lat: number}
): boolean {
    const denominator = ((a.lng - b.lng) * (c.lat - d.lat)) - ((a.lat - b.lat) * (c.lng - d.lng));
    if (Math.abs(denominator) < 1e-12) return false;

    const t = (((a.lng - c.lng) * (c.lat - d.lat)) - ((a.lat - c.lat) * (c.lng - d.lng))) / denominator;
    const u = -(((a.lng - b.lng) * (a.lat - c.lat)) - ((a.lat - b.lat) * (a.lng - c.lng))) / denominator;
    return t > 0 && t < 1 && u > 0 && u < 1;
}
