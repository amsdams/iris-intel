import { normalizeTeam } from '../index';
import { Plext } from '../store';
import { PlextData, PlextMarkup } from './intel-types';

export const PlextParser = {
  parse: (data: PlextData): Plext[] => {
    if (!data.result) return [];

    try {
      return data.result.map((plext) => {
        const [id, time, plextData] = plext;
        const { text, markup, categories, team, plextType } = plextData.plext;

        return {
          id,
          time,
          text,
          markup: markup.map((m: PlextMarkup) => [
            m[0],
            {
              plain: m[1].plain,
              team: m[1].team,
              name: m[1].name,
              address: m[1].address,
              latE6: m[1].latE6,
              lngE6: m[1].lngE6,
            }
          ]) as Plext['markup'],
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
};
