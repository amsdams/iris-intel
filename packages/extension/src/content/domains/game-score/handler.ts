import { useStore, GameScoreParser, GameScoreData } from '@iris/core';

export function handleGameScore(data: GameScoreData): void {
  useStore.getState().setGameScore(GameScoreParser.parse(data));
}
