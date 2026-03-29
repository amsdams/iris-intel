import { useStore } from '@iris/core';
import { PlayerStatsMessage } from './types';

export function handlePlayerStats(stats: PlayerStatsMessage): void {
  useStore.getState().setPlayerStats({
    nickname: stats.nickname,
    level: stats.level,
    ap: stats.ap,
    team: stats.team,
    energy: stats.energy,
    xm_capacity: stats.xm_capacity,
    available_invites: stats.available_invites,
    min_ap_for_current_level: stats.min_ap_for_current_level,
    min_ap_for_next_level: stats.min_ap_for_next_level,
  });

  if (stats.hasActiveSubscription) {
    useStore.getState().setHasSubscription(true);
  }
}
