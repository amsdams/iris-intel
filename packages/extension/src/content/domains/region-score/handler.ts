import { useStore } from '@iris/core';
import { RegionScoreData } from './types';
import { parseRegionScore } from './parser';

export function handleRegionScore(data: RegionScoreData): void {
  const parsed = parseRegionScore(data);
  if (!parsed) return;

  useStore.getState().setRegionScore(parsed);
}
