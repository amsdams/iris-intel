import type {IitcTeamId} from './comm';

export type IitcMapContextTarget = 'map' | 'portal' | 'link' | 'field';
export type IitcMapObjectContextTarget = Extract<IitcMapContextTarget, 'link' | 'field'>;

export interface IitcMapContextPortal {
  guid: string;
  latE6: number;
  lngE6: number;
}

export interface IitcMapContextPortalAnchor {
  guid?: string;
  label: string;
  latE6: number;
  lngE6: number;
}

export interface IitcMapContextObject {
  guid: string;
  team: IitcTeamId;
  portalGuids: string[];
  portalAnchors: IitcMapContextPortalAnchor[];
  distanceMeters?: number;
}

export interface IitcMapContextPayloadOptions {
  lat: number;
  lng: number;
  zoom?: number;
  portal?: IitcMapContextPortal;
  portalGuid?: string;
  portalLat?: number;
  portalLng?: number;
  contextTarget?: IitcMapContextTarget;
  contextGuid?: string;
  contextTeam?: IitcTeamId;
  contextPortalGuids?: string[];
  contextPortalAnchors?: IitcMapContextPortalAnchor[];
  contextDistanceMeters?: number;
}

export interface IitcMapContextPayload {
  contextTarget: IitcMapContextTarget;
  lat: number;
  lng: number;
  zoom?: number;
  portalGuid?: string;
  portalLat?: number;
  portalLng?: number;
  contextGuid?: string;
  contextTeam?: IitcTeamId;
  contextPortalGuids?: string[];
  contextPortalAnchors?: IitcMapContextPortalAnchor[];
  contextDistanceMeters?: number;
}

export interface IitcMapContextPlan {
  payload: IitcMapContextPayload;
  selectMapObject?: {
    target: IitcMapObjectContextTarget;
    guid: string;
  };
  clearSelectedMapObject: boolean;
  selectPortal: boolean;
}

export interface IitcMapContextLink {
  guid: string;
  team: IitcTeamId;
  oGuid?: string;
  oLatE6: number;
  oLngE6: number;
  dGuid?: string;
  dLatE6: number;
  dLngE6: number;
}

export interface IitcMapContextField {
  guid: string;
  team: IitcTeamId;
  points: {guid?: string; latE6: number; lngE6: number}[];
}

export interface IitcMapContextPointOptions {
  lat: number;
  lng: number;
  zoom?: number;
  portal?: IitcMapContextPortal;
  link?: IitcMapContextObject;
  field?: IitcMapContextObject;
}

function formatAnchorFallback(latE6: number, lngE6: number): string {
  return `${(latE6 / 1_000_000).toFixed(6)}, ${(lngE6 / 1_000_000).toFixed(6)}`;
}

export function createIitcMapContextPayload(options: IitcMapContextPayloadOptions): IitcMapContextPayload {
  return {
    contextTarget: options.contextTarget ?? (options.portal || options.portalGuid ? 'portal' : 'map'),
    lat: options.lat,
    lng: options.lng,
    zoom: options.zoom,
    portalGuid: options.portal?.guid ?? options.portalGuid,
    portalLat: options.portal ? options.portal.latE6 / 1_000_000 : options.portalLat,
    portalLng: options.portal ? options.portal.lngE6 / 1_000_000 : options.portalLng,
    contextGuid: options.contextGuid,
    contextTeam: options.contextTeam,
    contextPortalGuids: options.contextPortalGuids,
    contextPortalAnchors: options.contextPortalAnchors,
    contextDistanceMeters: options.contextDistanceMeters,
  };
}

export function planIitcMapContextPoint(options: IitcMapContextPointOptions): IitcMapContextPlan {
  if (options.portal) {
    return {
      payload: createIitcMapContextPayload({
        lat: options.portal.latE6 / 1_000_000,
        lng: options.portal.lngE6 / 1_000_000,
        zoom: options.zoom,
        portal: options.portal,
      }),
      clearSelectedMapObject: false,
      selectPortal: true,
    };
  }

  if (options.link) {
    return {
      payload: createIitcMapContextPayload({
        contextTarget: 'link',
        lat: options.lat,
        lng: options.lng,
        zoom: options.zoom,
        contextGuid: options.link.guid,
        contextTeam: options.link.team,
        contextPortalGuids: options.link.portalGuids,
        contextPortalAnchors: options.link.portalAnchors,
        contextDistanceMeters: options.link.distanceMeters,
      }),
      selectMapObject: {target: 'link', guid: options.link.guid},
      clearSelectedMapObject: false,
      selectPortal: false,
    };
  }

  if (options.field) {
    return {
      payload: createIitcMapContextPayload({
        contextTarget: 'field',
        lat: options.lat,
        lng: options.lng,
        zoom: options.zoom,
        contextGuid: options.field.guid,
        contextTeam: options.field.team,
        contextPortalGuids: options.field.portalGuids,
        contextPortalAnchors: options.field.portalAnchors,
        contextDistanceMeters: options.field.distanceMeters,
      }),
      selectMapObject: {target: 'field', guid: options.field.guid},
      clearSelectedMapObject: false,
      selectPortal: false,
    };
  }

  return {
    payload: createIitcMapContextPayload({
      contextTarget: 'map',
      lat: options.lat,
      lng: options.lng,
      zoom: options.zoom,
    }),
    clearSelectedMapObject: true,
    selectPortal: false,
  };
}

export function getIitcMapContextDistanceMeters(from: {latE6: number; lngE6: number}, to: {latE6: number; lngE6: number}): number {
  const earthRadiusMeters = 6_371_000;
  const lat1 = from.latE6 / 1_000_000 * Math.PI / 180;
  const lat2 = to.latE6 / 1_000_000 * Math.PI / 180;
  const deltaLat = lat2 - lat1;
  const deltaLng = (to.lngE6 - from.lngE6) / 1_000_000 * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getIitcMapContextLinkPortalGuids(link: IitcMapContextLink): string[] {
  return [link.oGuid, link.dGuid].filter((guid): guid is string => Boolean(guid));
}

export function getIitcMapContextLinkPortalAnchors(
  link: IitcMapContextLink,
  getPortalLabel: (guid: string | undefined, fallback: string) => string,
): IitcMapContextPortalAnchor[] {
  return [
    {
      guid: link.oGuid,
      label: getPortalLabel(link.oGuid, formatAnchorFallback(link.oLatE6, link.oLngE6)),
      latE6: link.oLatE6,
      lngE6: link.oLngE6,
    },
    {
      guid: link.dGuid,
      label: getPortalLabel(link.dGuid, formatAnchorFallback(link.dLatE6, link.dLngE6)),
      latE6: link.dLatE6,
      lngE6: link.dLngE6,
    },
  ];
}

export function getIitcMapContextLinkDistanceMeters(link: IitcMapContextLink): number {
  return getIitcMapContextDistanceMeters(
    {latE6: link.oLatE6, lngE6: link.oLngE6},
    {latE6: link.dLatE6, lngE6: link.dLngE6},
  );
}

export function getIitcMapContextFieldPortalGuids(field: IitcMapContextField): string[] {
  return field.points.map((fieldPoint) => fieldPoint.guid).filter((guid): guid is string => Boolean(guid));
}

export function getIitcMapContextFieldPortalAnchors(
  field: IitcMapContextField,
  getPortalLabel: (guid: string | undefined, fallback: string) => string,
): IitcMapContextPortalAnchor[] {
  return field.points.map((fieldPoint) => ({
    guid: fieldPoint.guid,
    label: getPortalLabel(fieldPoint.guid, formatAnchorFallback(fieldPoint.latE6, fieldPoint.lngE6)),
    latE6: fieldPoint.latE6,
    lngE6: fieldPoint.lngE6,
  }));
}

export function getIitcMapContextFieldPerimeterMeters(field: IitcMapContextField): number | undefined {
  if (field.points.length < 2) return undefined;
  return field.points.reduce((total, point, index) => {
    const next = field.points[(index + 1) % field.points.length];
    return total + getIitcMapContextDistanceMeters(point, next);
  }, 0);
}
