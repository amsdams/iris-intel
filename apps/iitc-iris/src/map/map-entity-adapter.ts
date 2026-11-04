import {
  decodeIitcGameEntities, decodeIitcGetEntitiesResponse, getIitcPortalArtifacts,
  type IitcGetEntitiesResponse, type IitcPortalArtifact, type IitcRawGameEntity,
} from '@iris/iitc-core';
import type {IitcIrisRenderArtifact, IitcIrisRenderEntities, IitcIrisRenderPortal} from '../messages';

type PortalHistory = NonNullable<IitcIrisRenderPortal['history']>;
interface MapEntityAdaptation {
  entities: IitcIrisRenderEntities;
  historyUpdates: Map<string, PortalHistory>;
}

function toRenderArtifacts(artifacts: IitcPortalArtifact[]): IitcIrisRenderArtifact[] | undefined {
  return artifacts.length > 0 ? artifacts : undefined;
}

function isRawGameEntity(value: unknown): value is IitcRawGameEntity {
  return Array.isArray(value) &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'number' &&
    Array.isArray(value[2]);
}

function isPortalSummary(value: unknown): value is unknown[] {
  return Array.isArray(value) && value[0] === 'p';
}

/** Adapt render payloads without mutating page-owned history; the coordinator applies returned updates. */
export function adaptMapEntities(
  response: IitcGetEntitiesResponse,
  generation: number,
  portalHistoryByGuid: ReadonlyMap<string, PortalHistory>,
  artifactEntities: IitcRawGameEntity[] = [],
): MapEntityAdaptation {
  const historyUpdates = new Map<string, PortalHistory>();
  const decoded = decodeIitcGetEntitiesResponse(response);
  if (artifactEntities.length > 0) {
    const artifactDecoded = decodeIitcGameEntities(artifactEntities);
    Object.assign(decoded.portals, artifactDecoded.portals);
  }

  const entities: IitcIrisRenderEntities = {
    generation,
    portals: Object.values(decoded.portals).map((portal) => {
      const history = portal.history ?? portalHistoryByGuid.get(portal.guid);
      if (portal.history) historyUpdates.set(portal.guid, portal.history);
      return {
        guid: portal.guid,
        title: portal.title,
        image: portal.image,
        team: portal.team,
        latE6: portal.latE6,
        lngE6: portal.lngE6,
        level: portal.level,
        health: portal.health,
        resCount: portal.resCount,
        mission: portal.mission,
        mission50plus: portal.mission50plus,
        ornaments: portal.ornaments,
        artifacts: toRenderArtifacts(getIitcPortalArtifacts(portal.artifactBrief)),
        history,
        isPlaceholder: portal.isPlaceholder,
      };
    }),
    links: Object.values(decoded.links).map((link) => ({
      guid: link.guid,
      team: link.team,
      oGuid: link.oGuid,
      oLatE6: link.oLatE6,
      oLngE6: link.oLngE6,
      dGuid: link.dGuid,
      dLatE6: link.dLatE6,
      dLngE6: link.dLngE6,
    })),
    fields: Object.values(decoded.fields).map((field) => ({
      guid: field.guid,
      team: field.team,
      points: field.points.map((point) => ({guid: point.guid, latE6: point.latE6, lngE6: point.lngE6})),
    })),
  };
  return {entities, historyUpdates};
}

export function getArtifactTypes(entities: IitcRawGameEntity[]): string[] {
  const types = new Set<string>();
  for (const portal of Object.values(decodeIitcGameEntities(entities).portals)) {
    for (const artifact of getIitcPortalArtifacts(portal.artifactBrief)) types.add(artifact.type);
  }
  return [...types].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getArtifactPortalResultEntries(result: unknown): [string, unknown][] {
  if (!isRecord(result)) return [];
  const nestedPortals = result.portals;
  if (isRecord(nestedPortals)) return Object.entries(nestedPortals);
  return Object.entries(result);
}

function toArtifactRawGameEntity(guid: string, value: unknown, now: () => number): IitcRawGameEntity | null {
  if (isRawGameEntity(value)) return value;
  if (!isPortalSummary(value)) return null;
  const timestamp = typeof value[13] === 'number' && Number.isFinite(value[13]) ? value[13] : now();
  return [guid, timestamp, value];
}

/** Accept the endpoint's flat/nested portal results, using the supplied clock only for missing timestamps. */
export function adaptArtifactPortalEntities(result: unknown, now: () => number): IitcRawGameEntity[] {
  return getArtifactPortalResultEntries(result)
    .map(([guid, value]) => toArtifactRawGameEntity(guid, value, now))
    .filter((entity): entity is IitcRawGameEntity => entity !== null);
}
