export interface RegionScoreResult {
  regionName: string;
  gameScore: [string | number, string | number];
  topAgents: { team: string; nick: string }[];
  scoreHistory: [string, string, string][];
}

export interface RegionScoreData {
  result?: RegionScoreResult;
}
