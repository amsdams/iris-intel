import { useStore, RegionScoreParser, RegionScoreData } from '@iris/core';

export function handleRegionScore(data: RegionScoreData): void {
  const score = RegionScoreParser.parse(data);
  if (score) {
    useStore.getState().setRegionScore(score);
  }
}
