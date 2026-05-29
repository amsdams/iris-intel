import type {IitcField, IitcLink, IitcPortal, IitcTeam} from './types';

export type IitcRawGameEntity = [string, number, unknown[]];

export interface IitcArtifactBrief {
  fragment: Record<string, unknown[]>;
  target: Record<string, unknown[]>;
}

export interface IitcDecodedPortal extends IitcPortal {
  timestamp: number;
  resCount?: number;
  image?: string;
  mission?: boolean;
  mission50plus?: boolean;
  artifactBrief?: IitcArtifactBrief | null;
  isPlaceholder: boolean;
  ent: IitcRawGameEntity;
}

export interface IitcDecodedLink extends IitcLink {
  timestamp: number;
  ent: IitcRawGameEntity;
}

export interface IitcDecodedField extends IitcField {
  timestamp: number;
  ent: IitcRawGameEntity;
}

export interface IitcDecodedEntitySet {
  portals: Record<string, IitcDecodedPortal>;
  links: Record<string, IitcDecodedLink>;
  fields: Record<string, IitcDecodedField>;
  deletedGameEntityGuids: string[];
}

export interface IitcMapTilePayload {
  gameEntities?: IitcRawGameEntity[];
  deletedGameEntityGuids?: string[];
}

export interface IitcGetEntitiesResponse {
  result?: {
    map?: Record<string, IitcMapTilePayload>;
  };
}

const FAKE_FIELD_EDGE_LINK_PATTERN = /^[0-9a-f]{32}\.b_[ab][bc]$/;

function asTeam(value: unknown): IitcTeam {
  if (value === 'E' || value === 'R' || value === 'N' || value === 'M') return value;
  return 'N';
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function parseArtifactBrief(value: unknown): IitcArtifactBrief | null {
  if (!Array.isArray(value) || !Array.isArray(value[0]) || !Array.isArray(value[1])) return null;

  return {
    fragment: decodeArtifactArray(value[0]),
    target: decodeArtifactArray(value[1]),
  };
}

function decodeArtifactArray(values: unknown[]): Record<string, unknown[]> {
  const result: Record<string, unknown[]> = {};

  for (const value of values) {
    if (!Array.isArray(value) || typeof value[0] !== 'string') continue;
    result[value[0]] = value.slice(1);
  }

  return result;
}

export function isIitcFakeFieldEdgeLink(guid: string): boolean {
  return FAKE_FIELD_EDGE_LINK_PATTERN.test(guid);
}

export function decodeIitcPortalEntity(entity: IitcRawGameEntity, isPlaceholder = false): IitcDecodedPortal | null {
  const data = entity[2];
  if (data[0] !== 'p') return null;

  return {
    guid: entity[0],
    timestamp: asNumber(data[13], entity[1]),
    team: asTeam(data[1]),
    latE6: asNumber(data[2]),
    lngE6: asNumber(data[3]),
    level: data.length >= 14 ? asNumber(data[4]) : undefined,
    health: data.length >= 14 ? asNumber(data[5]) : undefined,
    resCount: data.length >= 14 ? asNumber(data[6]) : undefined,
    image: data.length >= 14 ? asString(data[7]) : undefined,
    title: data.length >= 14 ? asString(data[8]) : undefined,
    ornaments: Array.isArray(data[9]) ? data[9].filter((value): value is string => typeof value === 'string') : undefined,
    mission: data.length >= 14 ? Boolean(data[10]) : undefined,
    mission50plus: data.length >= 14 ? Boolean(data[11]) : undefined,
    artifactBrief: data.length >= 14 ? parseArtifactBrief(data[12]) : undefined,
    isPlaceholder,
    ent: entity,
  };
}

export function decodeIitcLinkEntity(entity: IitcRawGameEntity): IitcDecodedLink | null {
  const data = entity[2];
  if (data[0] !== 'e' || isIitcFakeFieldEdgeLink(entity[0])) return null;

  return {
    guid: entity[0],
    timestamp: entity[1],
    team: asTeam(data[1]),
    oGuid: asString(data[2]),
    oLatE6: asNumber(data[3]),
    oLngE6: asNumber(data[4]),
    dGuid: asString(data[5]),
    dLatE6: asNumber(data[6]),
    dLngE6: asNumber(data[7]),
    ent: entity,
  };
}

export function decodeIitcFieldEntity(entity: IitcRawGameEntity): IitcDecodedField | null {
  const data = entity[2];
  if (data[0] !== 'r' || !Array.isArray(data[2])) return null;

  return {
    guid: entity[0],
    timestamp: entity[1],
    team: asTeam(data[1]),
    points: data[2].filter(Array.isArray).map((point) => ({
      guid: asString(point[0]),
      latE6: asNumber(point[1]),
      lngE6: asNumber(point[2]),
    })),
    ent: entity,
  };
}

function createPlaceholderPortalEntity(guid: string, latE6: number, lngE6: number, team: IitcTeam, timestamp: number): IitcRawGameEntity {
  return [guid, timestamp, ['p', team, latE6, lngE6]];
}

function upsertPortal(portals: Record<string, IitcDecodedPortal>, portal: IitcDecodedPortal): void {
  const existing = portals[portal.guid];
  if (!existing || existing.isPlaceholder || portal.timestamp >= existing.timestamp) {
    portals[portal.guid] = portal;
  }
}

function addPlaceholderPortal(portals: Record<string, IitcDecodedPortal>, guid: string, latE6: number, lngE6: number, team: IitcTeam, timestamp: number): void {
  if (portals[guid] && !portals[guid].isPlaceholder) return;
  const portal = decodeIitcPortalEntity(createPlaceholderPortalEntity(guid, latE6, lngE6, team, timestamp), true);
  if (portal) upsertPortal(portals, portal);
}

export function decodeIitcGameEntities(entities: IitcRawGameEntity[], deletedGameEntityGuids: string[] = []): IitcDecodedEntitySet {
  const portals: Record<string, IitcDecodedPortal> = {};
  const links: Record<string, IitcDecodedLink> = {};
  const fields: Record<string, IitcDecodedField> = {};
  const deleted = new Set(deletedGameEntityGuids);

  for (const entity of entities) {
    if (deleted.has(entity[0])) continue;
    const field = decodeIitcFieldEntity(entity);
    if (!field) continue;
    fields[field.guid] = field;
    for (const point of field.points) addPlaceholderPortal(portals, point.guid, point.latE6, point.lngE6, field.team, 0);
  }

  for (const entity of entities) {
    if (deleted.has(entity[0])) continue;
    const link = decodeIitcLinkEntity(entity);
    if (!link) continue;
    links[link.guid] = link;
    addPlaceholderPortal(portals, link.oGuid, link.oLatE6, link.oLngE6, link.team, link.timestamp);
    addPlaceholderPortal(portals, link.dGuid, link.dLatE6, link.dLngE6, link.team, link.timestamp);
  }

  for (const entity of entities) {
    if (deleted.has(entity[0])) continue;
    const portal = decodeIitcPortalEntity(entity);
    if (portal) upsertPortal(portals, portal);
  }

  return {portals, links, fields, deletedGameEntityGuids};
}

export function decodeIitcGetEntitiesResponse(response: IitcGetEntitiesResponse): IitcDecodedEntitySet {
  const allEntities: IitcRawGameEntity[] = [];
  const deletedGameEntityGuids: string[] = [];

  for (const tile of Object.values(response.result?.map ?? {})) {
    allEntities.push(...(tile.gameEntities ?? []));
    deletedGameEntityGuids.push(...(tile.deletedGameEntityGuids ?? []));
  }

  return decodeIitcGameEntities(allEntities, deletedGameEntityGuids);
}
