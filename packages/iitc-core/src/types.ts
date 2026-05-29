export type IitcTeam = 'E' | 'R' | 'N' | 'M';

export interface IitcPortal {
  guid: string;
  team: IitcTeam;
  latE6: number;
  lngE6: number;
  level?: number;
  health?: number;
  title?: string;
  ornaments?: string[];
}

export interface IitcLink {
  guid: string;
  team: IitcTeam;
  oGuid: string;
  oLatE6: number;
  oLngE6: number;
  dGuid: string;
  dLatE6: number;
  dLngE6: number;
}

export interface IitcField {
  guid: string;
  team: IitcTeam;
  points: {guid: string; latE6: number; lngE6: number}[];
}
