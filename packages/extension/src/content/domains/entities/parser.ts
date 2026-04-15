import { normalizeTeam, Field, Link, Portal } from '@iris/core';
import { IntelMapData } from './types';

export function parseEntities(data: IntelMapData): {
  portals: Partial<Portal>[];
  links: Partial<Link>[];
  fields: Partial<Field>[];
  deletedGuids: string[];
} {
  const portalsMap: Record<string, Partial<Portal>> = {};
  const links: Partial<Link>[] = [];
  const fields: Partial<Field>[] = [];
  const deletedGuids: string[] = [];

  if (!data.result || !data.result.map) {
    return { portals: [], links: [], fields: [], deletedGuids: [] };
  }

  Object.values(data.result.map).forEach((tile) => {
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
        portalsMap[id] = {
          id,
          lat,
          lng,
          team,
          level: parseInt(String(entData[4]), 10) || 0,
          health: parseInt(String(entData[5]), 10) || 0,
          visited: !!(history & 1),
          captured: !!(history & 2),
          scanned: !!(history & 4),
          ornaments: Array.isArray(entData[9])
            ? (entData[9] as unknown[]).filter((ornament): ornament is string => typeof ornament === 'string')
            : undefined,
        };
      } else if (entType === 'e') {
        const fromLat = parseFloat(entData[3] as string) / 1e6;
        const fromLng = parseFloat(entData[4] as string) / 1e6;
        const toLat = parseFloat(entData[6] as string) / 1e6;
        const toLng = parseFloat(entData[7] as string) / 1e6;
        if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) return;

        const fromPortalId = entData[2] as string;
        const toPortalId = entData[5] as string;

        // Add placeholder portals if not already present or if we only have summary
        if (!portalsMap[fromPortalId]) {
          portalsMap[fromPortalId] = { id: fromPortalId, lat: fromLat, lng: fromLng, team };
        }
        if (!portalsMap[toPortalId]) {
          portalsMap[toPortalId] = { id: toPortalId, lat: toLat, lng: toLng, team };
        }

        links.push({
          id,
          team,
          fromPortalId,
          fromLat,
          fromLng,
          toPortalId,
          toLat,
          toLng,
        });
      } else if (entType === 'r') {
        const points = (entData[2] as unknown[][])
          .map((point: unknown[]) => {
            const portalId = String(point[0] ?? '');
            const lat = parseFloat(point[1] as string) / 1e6;
            const lng = parseFloat(point[2] as string) / 1e6;

            if (portalId && !isNaN(lat) && !isNaN(lng)) {
              if (!portalsMap[portalId]) {
                portalsMap[portalId] = { id: portalId, lat, lng, team };
              }
            }

            return { portalId, lat, lng };
          })
          .filter((point) => point.portalId && !isNaN(point.lat) && !isNaN(point.lng));

        if (points.length >= 3) {
          fields.push({ id, team, points });
        }
      }
    });
  });

  return { 
    portals: Object.values(portalsMap), 
    links, 
    fields, 
    deletedGuids 
  };
}
