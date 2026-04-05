import { normalizeTeam, Plext } from '@iris/core';
import { PlextData } from './types';

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
