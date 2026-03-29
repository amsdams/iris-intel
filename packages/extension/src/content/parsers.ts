import { normalizeTeam, Field, InventoryItem, Link, Plext, Portal } from '@iris/core';
import {
  IntelMapData,
  IntelTile,
  InventoryData,
  PlextData,
  PortalDetailsData,
} from './intel-types';

export function parseEntities(data: IntelMapData): {
  portals: Partial<Portal>[];
  links: Partial<Link>[];
  fields: Partial<Field>[];
  deletedGuids: string[];
} {
  const portals: Partial<Portal>[] = [];
  const links: Partial<Link>[] = [];
  const fields: Partial<Field>[] = [];
  const deletedGuids: string[] = [];

  if (!data.result?.map) return { portals, links, fields, deletedGuids };

  Object.values(data.result.map).forEach((tile: IntelTile) => {
    if (tile.deletedGameEntityGuids) {
      deletedGuids.push(...tile.deletedGameEntityGuids);
    }

    if (!tile.gameEntities) return;

    tile.gameEntities.forEach((entity) => {
      const [id, , entData] = entity;
      const entType = entData[0] as string;
      const team = normalizeTeam(entData[1] as string);

      if (entType === 'p') {
        const lat = parseFloat(entData[2] as string) / 1e6;
        const lng = parseFloat(entData[3] as string) / 1e6;
        if (isNaN(lat) || isNaN(lng)) return;

        const history = (entData[18] as number) || 0;
        portals.push({
          id,
          lat,
          lng,
          team,
          level: parseInt(String(entData[4]), 10) || 0,
          health: parseInt(String(entData[5]), 10) || 0,
          visited: !!(history & 1),
          captured: !!(history & 2),
          scanned: !!(history & 4),
        });
      } else if (entType === 'e') {
        const fromLat = parseFloat(entData[3] as string) / 1e6;
        const fromLng = parseFloat(entData[4] as string) / 1e6;
        const toLat = parseFloat(entData[6] as string) / 1e6;
        const toLng = parseFloat(entData[7] as string) / 1e6;
        if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) return;

        links.push({
          id,
          team,
          fromPortalId: entData[2] as string,
          fromLat,
          fromLng,
          toPortalId: entData[5] as string,
          toLat,
          toLng,
        });
      } else if (entType === 'r') {
        const points = (entData[2] as unknown[][])
          .map((point: unknown[]) => ({
            lat: parseFloat(point[1] as string) / 1e6,
            lng: parseFloat(point[2] as string) / 1e6,
          }))
          .filter((point) => !isNaN(point.lat) && !isNaN(point.lng));

        if (points.length >= 3) {
          fields.push({ id, team, points });
        }
      }
    });
  });

  return { portals, links, fields, deletedGuids };
}

export function parsePortalDetails(data: PortalDetailsData, params: { guid?: string }): Partial<Portal> | null {
  if (!data.result || !Array.isArray(data.result)) return null;
  const details = data.result;

  try {
    const history = (details[18] as number) || 0;

    const mods = (details[14] as unknown[][] | undefined)
      ?.filter(Boolean)
      .map((mod: unknown[]) => ({
        owner: mod[0] as string,
        name: mod[1] as string,
        rarity: mod[2] as string,
        stats: mod[3] as Record<string, string>,
      })) || [];

    const resonators = (details[15] as unknown[][] | undefined)
      ?.filter(Boolean)
      .map((resonator: unknown[]) => ({
        owner: resonator[0] as string,
        level: resonator[1] as number,
        energy: resonator[2] as number,
      })) || [];

    return {
      id: params.guid || '',
      lat: typeof details[2] === 'number' ? details[2] / 1e6 : parseFloat(details[2] as string) / 1e6,
      lng: typeof details[3] === 'number' ? details[3] / 1e6 : parseFloat(details[3] as string) / 1e6,
      team: normalizeTeam(details[1] as string),
      level: parseInt(String(details[4]), 10),
      health: parseInt(String(details[5]), 10),
      resCount: details[6] as number,
      image: details[7] as string,
      name: details[8] as string,
      owner: details[16] as string,
      mods,
      resonators,
      visited: !!(history & 1),
      captured: !!(history & 2),
      scanned: !!(history & 4),
    };
  } catch (error) {
    console.error('IRIS: Failed to parse portal details', error, data);
    return null;
  }
}

export function parsePlexts(data: PlextData): Plext[] {
  if (!data.result) return [];

  try {
    return data.result.map((plext) => {
      const [id, time, plextData] = plext;
      const { text, markup, categories, team, plextType } = plextData.plext;

      return {
        id,
        time,
        text,
        markup: markup as Plext['markup'],
        categories: categories as number,
        team: normalizeTeam(team as string),
        type: plextType,
      };
    });
  } catch (error) {
    console.error('IRIS: Error parsing plexts', error, data);
    return [];
  }
}

export function parseInventory(data: InventoryData): InventoryItem[] {
  if (!data.result) return [];

  try {
    return data.result.map((item) => {
      const [guid, timestamp, itemData] = item;
      return {
        guid,
        timestamp,
        ...(itemData as object),
      } as InventoryItem;
    });
  } catch (error) {
    console.error('IRIS: Error parsing inventory', error, data);
    return [];
  }
}
