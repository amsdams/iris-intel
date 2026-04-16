import { normalizeTeam } from '../index';
import { PlayerStats } from '../store';

export interface PlayerStatsMessage {
  nickname: string;
  level: number;
  ap: number;
  team: string;
  energy: number;
  xm_capacity: number;
  available_invites: number;
  min_ap_for_current_level: number;
  min_ap_for_next_level: number;
  hasActiveSubscription: boolean;
}

export const PlayerParser = {
  parseStats: (stats: PlayerStatsMessage): { stats: PlayerStats; hasActiveSubscription: boolean } => {
    return {
      stats: {
        nickname: stats.nickname,
        level: stats.level,
        ap: stats.ap,
        team: normalizeTeam(stats.team),
        energy: stats.energy,
        xm_capacity: stats.xm_capacity,
        available_invites: stats.available_invites,
        min_ap_for_current_level: stats.min_ap_for_current_level,
        min_ap_for_next_level: stats.min_ap_for_next_level,
      },
      hasActiveSubscription: stats.hasActiveSubscription,
    };
  }
};
