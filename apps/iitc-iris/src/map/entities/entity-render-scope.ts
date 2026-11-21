import type {IitcIrisRenderEntities, IitcIrisRenderField, IitcIrisRenderLink, IitcIrisRenderPortal} from '../../messages';
import {getPortalLevelBucket, type IitcIrisCoreEntityRenderScope, type IitcIrisPortalLevelBucket} from './entity-visibility';

interface IitcIrisRenderEntityBuckets {
  fieldsByTeam: Map<IitcIrisRenderField['team'], IitcIrisRenderField[]>;
  linksByTeam: Map<IitcIrisRenderLink['team'], IitcIrisRenderLink[]>;
  portalsByTeam: Map<IitcIrisRenderPortal['team'], IitcIrisRenderPortal[]>;
  portalsByLevel: Map<IitcIrisPortalLevelBucket, IitcIrisRenderPortal[]>;
}

interface EntityRenderScope {
  getRenderEntityBuckets: (entities: IitcIrisRenderEntities) => IitcIrisRenderEntityBuckets;
  getScopedFields: (entities: IitcIrisRenderEntities, scope: IitcIrisCoreEntityRenderScope) => IitcIrisRenderField[];
  getScopedLinks: (entities: IitcIrisRenderEntities, scope: IitcIrisCoreEntityRenderScope) => IitcIrisRenderLink[];
  getScopedPortals: (entities: IitcIrisRenderEntities, scope: IitcIrisCoreEntityRenderScope) => IitcIrisRenderPortal[];
}

export function createEntityRenderScope(): EntityRenderScope {
  const renderEntityBuckets = new WeakMap<IitcIrisRenderEntities, IitcIrisRenderEntityBuckets>();

  function addToBucket<K, T>(buckets: Map<K, T[]>, key: K, value: T): void {
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(value);
    } else {
      buckets.set(key, [value]);
    }
  }

  function getRenderEntityBuckets(entities: IitcIrisRenderEntities): IitcIrisRenderEntityBuckets {
    const cached = renderEntityBuckets.get(entities);
    if (cached) return cached;

    const buckets: IitcIrisRenderEntityBuckets = {
      fieldsByTeam: new Map(),
      linksByTeam: new Map(),
      portalsByTeam: new Map(),
      portalsByLevel: new Map(),
    };
    for (const field of entities.fields) addToBucket(buckets.fieldsByTeam, field.team, field);
    for (const link of entities.links) addToBucket(buckets.linksByTeam, link.team, link);
    for (const portal of entities.portals) {
      addToBucket(buckets.portalsByTeam, portal.team, portal);
      addToBucket(buckets.portalsByLevel, getPortalLevelBucket(portal), portal);
    }
    renderEntityBuckets.set(entities, buckets);
    return buckets;
  }

  function appendUniqueEntities<T extends {guid: string}>(target: T[], seen: Set<string>, source: T[] | undefined): void {
    if (!source) return;
    for (const entity of source) {
      if (seen.has(entity.guid)) continue;
      seen.add(entity.guid);
      target.push(entity);
    }
  }

  function getScopedFields(entities: IitcIrisRenderEntities, scope: IitcIrisCoreEntityRenderScope): IitcIrisRenderField[] {
    if (!scope.fields) return [];
    if (scope.allFields) return entities.fields;
    const buckets = getRenderEntityBuckets(entities);
    const fields: IitcIrisRenderField[] = [];
    const seen = new Set<string>();
    for (const team of scope.fieldTeams) appendUniqueEntities(fields, seen, buckets.fieldsByTeam.get(team));
    return fields;
  }

  function getScopedLinks(entities: IitcIrisRenderEntities, scope: IitcIrisCoreEntityRenderScope): IitcIrisRenderLink[] {
    if (!scope.links) return [];
    if (scope.allLinks) return entities.links;
    const buckets = getRenderEntityBuckets(entities);
    const links: IitcIrisRenderLink[] = [];
    const seen = new Set<string>();
    for (const team of scope.linkTeams) appendUniqueEntities(links, seen, buckets.linksByTeam.get(team));
    return links;
  }

  function getScopedPortals(entities: IitcIrisRenderEntities, scope: IitcIrisCoreEntityRenderScope): IitcIrisRenderPortal[] {
    if (!scope.portals) return [];
    if (scope.allPortals) return entities.portals;
    const buckets = getRenderEntityBuckets(entities);
    const portals: IitcIrisRenderPortal[] = [];
    const seen = new Set<string>();
    for (const team of scope.portalTeams) appendUniqueEntities(portals, seen, buckets.portalsByTeam.get(team));
    for (const level of scope.portalLevels) appendUniqueEntities(portals, seen, buckets.portalsByLevel.get(level));
    return portals;
  }

  return {getRenderEntityBuckets, getScopedFields, getScopedLinks, getScopedPortals};
}
