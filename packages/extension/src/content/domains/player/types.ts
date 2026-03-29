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
