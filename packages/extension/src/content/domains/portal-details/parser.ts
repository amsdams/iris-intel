import { normalizeTeam, Portal } from '@iris/core';
import { PortalDetailsData } from './types';

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
      hasMissionsStartingHere: Boolean(details[10]),
    };
  } catch (error) {
    console.error('IRIS: Failed to parse portal details', error, data);
    return null;
  }
}
