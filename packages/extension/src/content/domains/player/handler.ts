import { useStore, PlayerParser, PlayerStatsMessage } from '@iris/core';

export function handlePlayerStats(stats: PlayerStatsMessage): void {
  const { stats: parsedStats, hasActiveSubscription } = PlayerParser.parseStats(stats);
  
  useStore.getState().setPlayerStats(parsedStats);
  useStore.getState().setHasSubscription(hasActiveSubscription);
}
