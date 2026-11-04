import type {IitcPortalCounts, IitcPortalsListEntry, IitcScoreboard} from '@iris/iitc-core';

export interface IitcIrisRenderArtifact {
  role: 'fragment' | 'target';
  type: string;
  ids: string[];
}

/** Identity and summary fields shared by rendered and selected portals. */
export interface IitcIrisPortalSummary {
  guid: string;
  title?: string;
  image?: string;
  team: 'E' | 'R' | 'N' | 'M';
  latE6: number;
  lngE6: number;
  level?: number;
  health?: number;
  resCount?: number;
  mission?: boolean;
  mission50plus?: boolean;
  isPlaceholder: boolean;
}

export interface IitcIrisRenderPortal extends IitcIrisPortalSummary {
  ornaments?: string[];
  artifacts?: IitcIrisRenderArtifact[];
  history?: {
    visited: boolean;
    captured: boolean;
    scoutControlled: boolean;
  };
}

export interface IitcIrisSelectedPortal extends IitcIrisPortalSummary {
  ornaments: string[];
  artifacts: IitcIrisRenderArtifact[];
  links: {
    count: number;
    incoming: number;
    outgoing: number;
    guids: string[];
  };
  fields: {
    count: number;
    guids: string[];
  };
}

export interface IitcIrisPortalMod {
  owner: string;
  name: string;
  rarity: string;
  stats: Record<string, string | number>;
}

export interface IitcIrisPortalResonator {
  owner: string;
  level: number;
  energy: number;
}

export interface IitcIrisPortalDetailsState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'auth';
  guid?: string;
  elapsedMs?: number;
  cached?: boolean;
  error?: string;
  owner?: string;
  mods?: IitcIrisPortalMod[];
  resonators?: IitcIrisPortalResonator[];
  history?: {
    visited: boolean;
    captured: boolean;
    scoutControlled: boolean;
  };
  mitigation?: {
    total: number;
    shields: number;
    links: number;
    linkDefenseBoost: number;
    excess: number;
  };
  hasMissionsStartingHere?: boolean;
}

export interface IitcIrisRenderLink {
  guid: string;
  team: 'E' | 'R' | 'N' | 'M';
  oGuid?: string;
  oLatE6: number;
  oLngE6: number;
  dGuid?: string;
  dLatE6: number;
  dLngE6: number;
}

export interface IitcIrisRenderField {
  guid: string;
  team: 'E' | 'R' | 'N' | 'M';
  points: {guid?: string; latE6: number; lngE6: number}[];
}

export interface IitcIrisRenderEntities {
  generation: number;
  portals: IitcIrisRenderPortal[];
  links: IitcIrisRenderLink[];
  fields: IitcIrisRenderField[];
}

export interface IitcIrisPortalAnalysis {
  portalcounts: IitcPortalCounts;
  portalslist: IitcPortalsListEntry[];
  scoreboard: IitcScoreboard;
}
