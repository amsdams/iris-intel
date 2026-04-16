import { normalizeTeam } from '../index';
import { Field, Link, Portal } from '../store';
import { IntelMapData } from './intel-types';

export const EntityParser = {
  parse: (data: IntelMapData): {
    portals: Partial<Portal>[];
    links: Partial<Link>[];
    fields: Partial<Field>[];
    deletedGuids: string[];
  } => {
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
          const pData = entData as [ 'p', string, number, number, number, number, number, string, string, string[], boolean, boolean, string, string, number, number, string, string, number ];
          const lat = parseFloat(pData[2] as unknown as string) / 1e6;
          const lng = parseFloat(pData[3] as unknown as string) / 1e6;
          if (isNaN(lat) || isNaN(lng)) return;

          const history = (pData[18] as number) || 0;

          portalsMap[id] = {
            id,
            lat,
            lng,
            team,
            level: parseInt(String(pData[4]), 10) || 0,
            health: parseInt(String(pData[5]), 10) || 0,
            name: typeof pData[8] === 'string' ? pData[8] : undefined,
            image: typeof pData[7] === 'string' ? pData[7] : undefined,
            history,
            visited: history ? !!(history & 1) : undefined,
            captured: history ? !!(history & 2) : undefined,
            scoutControlled: history ? !!(history & 4) : undefined,
            hasMissionsStartingHere: !!pData[10] || !!pData[11],
            ornaments: Array.isArray(pData[9])
              ? (pData[9] as unknown[]).filter((ornament): ornament is string => typeof ornament === 'string')
              : undefined,
          };
        } else if (entType === 'e') {
          const eData = entData as [ 'e', string, string, number, number, string, number, number ];
          const fromLat = parseFloat(eData[3] as unknown as string) / 1e6;
          const fromLng = parseFloat(eData[4] as unknown as string) / 1e6;
          const toLat = parseFloat(eData[6] as unknown as string) / 1e6;
          const toLng = parseFloat(eData[7] as unknown as string) / 1e6;
          if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) return;

          const fromPortalId = eData[2] as string;
          const toPortalId = eData[5] as string;

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
          const rData = entData as [ 'r', string, [string, number, number][] ];
          const points = (rData[2] as unknown[][])
            .map((point: unknown[]) => {
              const portalId = String(point[0] ?? '');
              const lat = parseFloat(point[1] as unknown as string) / 1e6;
              const lng = parseFloat(point[2] as unknown as string) / 1e6;

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
};
