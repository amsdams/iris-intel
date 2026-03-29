import { useStore } from '@iris/core';
import { GameScoreData } from './types';
import { parseGameScore } from './parser';

export function handleGameScore(data: GameScoreData): void {
  useStore.getState().setGameScore(parseGameScore(data));
}
