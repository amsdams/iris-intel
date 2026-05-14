import {Field, Link, Portal} from '@iris/core';
import {PageMapRuntimeCommandMessage} from '../../../shared/page-map-runtime-protocol';

interface MapStateSnapshot {
    lat: number;
    lng: number;
    zoom: number;
}

interface BuildPageMapRuntimeSnapshotOptions {
    type: string;
    portals: Record<string, Portal>;
    links: Record<string, Link>;
    fields: Record<string, Field>;
    mapState: MapStateSnapshot;
    layerShowLinks: boolean;
    layerShowFields: boolean;
}

export function buildPageMapRuntimeSnapshotMessage(
    options: BuildPageMapRuntimeSnapshotOptions
): PageMapRuntimeCommandMessage {
    return {
        type: options.type,
        center: {lat: options.mapState.lat, lng: options.mapState.lng},
        zoom: options.mapState.zoom,
        camera: {
            lat: options.mapState.lat,
            lng: options.mapState.lng,
            zoom: options.mapState.zoom,
        },
        layers: {
            portals: true,
            links: options.layerShowLinks,
            fields: options.layerShowFields,
        },
        data: {
            portals: buildPortalFeatureCollection(options.portals),
            links: buildLinkFeatureCollection(options.links),
            fields: buildFieldFeatureCollection(options.fields),
        },
    };
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
