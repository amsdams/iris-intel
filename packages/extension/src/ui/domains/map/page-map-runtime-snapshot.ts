import {Field, Link, Portal} from '@iris/core';
import {PageMapRuntimeCommandMessage} from '../../../shared/page-map-runtime-protocol';
import {MAP_THEMES} from '../../theme';

interface MapStateSnapshot {
    lat: number;
    lng: number;
    zoom: number;
}

interface BuildPageMapRuntimeSnapshotOptions {
    type: string;
    diagnostic?: boolean;
    portals: Record<string, Portal>;
    links: Record<string, Link>;
    fields: Record<string, Field>;
    mapState: MapStateSnapshot;
    mapThemeId: string;
    layerShowLinks: boolean;
    layerShowFields: boolean;
    selectedPortalId: string | null;
    selectedLinkId: string | null;
    selectedFieldId: string | null;
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
        layers: {
            portals: true,
            links: options.layerShowLinks,
            fields: options.layerShowFields,
        },
        data: {
            portals: buildPortalFeatureCollection(options.portals),
            links: buildLinkFeatureCollection(options.links),
            fields: buildFieldFeatureCollection(options.fields),
            selectedPortal: buildSelectedPortalFeatureCollection(options.portals, options.selectedPortalId),
            selectedLink: buildSelectedLinkFeatureCollection(options.links, options.selectedLinkId),
            selectedField: buildSelectedFieldFeatureCollection(options.fields, options.selectedFieldId),
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

function buildPortalFeatureCollection(portals: Record<string, Portal>): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: Object.values(portals).map((portal): GeoJSON.Feature<GeoJSON.Point> => ({
            type: 'Feature',
            geometry: {type: 'Point', coordinates: [portal.lng, portal.lat]},
            properties: {
                id: portal.id,
                team: portal.team,
                level: portal.level ?? 0,
                health: portal.health ?? 100,
            },
        })),
    };
}

function buildSelectedPortalFeatureCollection(
    portals: Record<string, Portal>,
    selectedPortalId: string | null
): GeoJSON.FeatureCollection {
    if (!selectedPortalId || !portals[selectedPortalId]) {
        return {type: 'FeatureCollection', features: []};
    }

    return buildPortalFeatureCollection({[selectedPortalId]: portals[selectedPortalId]});
}

function buildSelectedLinkFeatureCollection(
    links: Record<string, Link>,
    selectedLinkId: string | null
): GeoJSON.FeatureCollection {
    if (!selectedLinkId || !links[selectedLinkId]) {
        return {type: 'FeatureCollection', features: []};
    }

    return buildLinkFeatureCollection({[selectedLinkId]: links[selectedLinkId]});
}

function buildSelectedFieldFeatureCollection(
    fields: Record<string, Field>,
    selectedFieldId: string | null
): GeoJSON.FeatureCollection {
    if (!selectedFieldId || !fields[selectedFieldId]) {
        return {type: 'FeatureCollection', features: []};
    }

    return buildFieldFeatureCollection({[selectedFieldId]: fields[selectedFieldId]});
}

function buildLinkFeatureCollection(links: Record<string, Link>): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: Object.values(links).map((link): GeoJSON.Feature<GeoJSON.LineString> => ({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [
                    [link.fromLng, link.fromLat],
                    [link.toLng, link.toLat],
                ],
            },
            properties: {
                id: link.id,
                team: link.team,
            },
        })),
    };
}

function buildFieldFeatureCollection(fields: Record<string, Field>): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: Object.values(fields)
            .filter((field) => field.points.length >= 3)
            .map((field): GeoJSON.Feature<GeoJSON.Polygon> => ({
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        ...field.points.map((point) => [point.lng, point.lat]),
                        [field.points[0].lng, field.points[0].lat],
                    ]],
                },
                properties: {
                    id: field.id,
                    team: field.team,
                },
            })),
    };
}
