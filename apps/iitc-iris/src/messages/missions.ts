export type IitcIrisMissionSource = 'view' | 'portal';

export interface IitcIrisMissionSummary {
  guid: string;
  title: string;
  image?: string;
  ratingE6?: number;
  ratingPercent?: number;
  medianCompletionTimeMs?: number;
  durationLabel?: string;
  authorNickname?: string;
  authorTeam?: 'E' | 'R' | 'N' | 'M';
  typeNum?: number;
  type?: string;
  numUniqueCompletedPlayers?: number;
  waypointCount?: number;
  routeLengthMeters?: number;
}

export interface IitcIrisMissionWaypoint {
  index: number;
  hidden: boolean;
  guid: string;
  title: string;
  typeNum: number;
  type: string;
  objectiveNum: number;
  objective: string;
  latE6?: number;
  lngE6?: number;
  portalGuid?: string;
  portalTitle?: string;
}

export interface IitcIrisMissionDetails extends IitcIrisMissionSummary {
  description: string;
  authorNickname?: string;
  authorTeam?: 'E' | 'R' | 'N' | 'M';
  typeNum?: number;
  type?: string;
  numUniqueCompletedPlayers?: number;
  waypoints: IitcIrisMissionWaypoint[];
  routeLengthMeters?: number;
  bounds?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
}

export interface IitcIrisMissionsState {
  status: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  requestState: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  source?: IitcIrisMissionSource;
  caption?: string;
  portalGuid?: string;
  portalTitle?: string;
  missions: IitcIrisMissionSummary[];
  selectedMission?: IitcIrisMissionDetails;
  detailsStatus?: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth';
  cached?: boolean;
  detailsCached?: boolean;
  elapsedMs?: number;
  detailsElapsedMs?: number;
  error?: string;
}
