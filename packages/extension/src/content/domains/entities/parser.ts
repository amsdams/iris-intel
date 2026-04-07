import { normalizeTeam, Field, Link, Portal } from '@iris/core';
import { IntelMapData, IntelTile } from './types';

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
            portalId: String(point[0] ?? ''),
            lat: parseFloat(point[1] as string) / 1e6,
            lng: parseFloat(point[2] as string) / 1e6,
          }))
          .filter((point) => point.portalId && !isNaN(point.lat) && !isNaN(point.lng));

        if (points.length >= 3) {
          fields.push({ id, team, points });
        }
      }
    });
  });

  return { portals, links, fields, deletedGuids };
}
