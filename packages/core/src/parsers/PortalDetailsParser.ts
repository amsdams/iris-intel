import { normalizeTeam } from '../index';
import { Portal } from '../store';
import { PortalDetailsData } from './intel-types';

export const PortalDetailsParser = {
  parse: (data: PortalDetailsData, params: { guid?: string }, linkCount = 0): Partial<Portal> | null => {
    if (!data.result || !Array.isArray(data.result)) return null;
    const details = data.result;

    try {
      const history = (details[18] as number) || 0;

      const mods = (details[14] as unknown[][] | undefined)
        ?.filter(Boolean)
        .map((mod: unknown[]) => {
          const stats: Record<string, string | number> = {};
          const rawStats = mod[3] as Record<string, string>;
          if (rawStats) {
            Object.keys(rawStats).forEach((key) => {
              const val = rawStats[key];
              const num = parseInt(val, 10);
              stats[key] = isNaN(num) ? val : num;
            });
          }

          return {
            owner: mod[0] as string,
            name: mod[1] as string,
            rarity: mod[2] as string,
            stats,
          };
        }) || [];

      const resonators = (details[15] as unknown[][] | undefined)
        ?.filter(Boolean)
        .map((resonator: unknown[]) => ({
          owner: resonator[0] as string,
          level: resonator[1] as number,
          energy: resonator[2] as number,
        })) || [];

      // Calculate Mitigation
      let shieldMitigation = 0;
      let linkDefenseBoost = 1;
      mods.forEach((mod) => {
        if (mod.stats.MITIGATION) shieldMitigation += Number(mod.stats.MITIGATION);
        if (mod.stats.LINK_DEFENSE_BOOST) {
            linkDefenseBoost *= (Number(mod.stats.LINK_DEFENSE_BOOST) / 1000);
        }
      });
      linkDefenseBoost = Math.round(10 * linkDefenseBoost) / 10;
      const linksMitigation = Math.round((400 / 9) * Math.atan(linkCount / Math.E));
      const totalMitigation = Math.min(95, shieldMitigation + linksMitigation * linkDefenseBoost);

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
        history,
        visited: !!(history & 1),
        captured: !!(history & 2),
        scoutControlled: !!(history & 4),
        scanned: !!(history & 4), // IRIS uses scanned for scoutControlled bit
        mitigation: {
          total: totalMitigation,
          shields: shieldMitigation,
          links: linksMitigation,
          linkDefenseBoost,
          excess: Math.round(10 * (shieldMitigation + linksMitigation * linkDefenseBoost - totalMitigation)) / 10,
        },
        hasMissionsStartingHere: Boolean(details[10]),
      };
    } catch (error) {
      console.error('IRIS: Failed to parse portal details', error, data);
      return null;
    }
  }
};
