import { RegionScoreData } from './intel-types';

export const RegionScoreParser = {
  parse: (data: RegionScoreData): {
    regionName: string;
    gameScore: [number, number];
    topAgents: { team: string; nick: string }[];
    scoreHistory: [string, string, string][];
  } | null => {
    const result = data.result;
    if (!result) return null;

    return {
      regionName: result.regionName,
      gameScore: [parseInt(String(result.gameScore[0]), 10), parseInt(String(result.gameScore[1]), 10)] as [number, number],
      topAgents: result.topAgents,
      scoreHistory: result.scoreHistory,
    };
  }
};
