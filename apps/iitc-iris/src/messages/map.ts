export type IitcIrisEntitySource = 'live' | 'cache' | 'fixture';

export type IitcIrisBaseLayerError = 'load' | 'webgl';

export interface IitcIrisMapContextPortalAnchor {
  guid?: string;
  label: string;
  latE6: number;
  lngE6: number;
}

export interface IitcIrisQueueDiagnostics {
  queuedTiles: number;
  requestedTiles: number;
  successTiles: number;
  failedTiles: number;
  partialTiles?: number;
  staleTiles: number;
  activeRequests: number;
  tileErrorCount: Record<string, number>;
}

export interface IitcIrisRequestDiagnostics {
  activeRequests: number;
  activeByEndpoint: Record<string, number>;
  active: {
    id: number;
    endpoint: string;
    group?: string;
    elapsedMs: number;
  }[];
}

export interface IitcIrisRenderQueueDiagnostics {
  queuedTiles: number;
  renderedTiles: number;
  renderedOkTiles: number;
  renderedCacheFreshTiles: number;
  renderedCacheStaleTiles: number;
  lastRenderedTileStatus: 'ok' | 'cache-fresh' | 'cache-stale' | null;
  renderedTileKeys: string[];
}

export interface IitcIrisRenderMutationLayerDiagnostics {
  added: number;
  removed: number;
  replaced: number;
  unchanged: number;
}

export interface IitcIrisRenderMutationDiagnostics {
  mode: 'full' | 'incremental';
  fields: IitcIrisRenderMutationLayerDiagnostics;
  links: IitcIrisRenderMutationLayerDiagnostics;
  portals: IitcIrisRenderMutationLayerDiagnostics;
}

export interface IitcIrisLayerUpdateTimingDiagnostics {
  changedKeys: string[];
  dispatchDelayMs?: number;
  totalMs?: number;
  firstAnimationFrameMs?: number;
  secondAnimationFrameMs?: number;
  sentToFirstAnimationFrameMs?: number;
  sentToSecondAnimationFrameMs?: number;
  renderEntitiesMs?: number;
  renderPolicyMs?: number;
  ornamentSettingsMs?: number;
  visiblePortalsMs?: number;
  visibleLabelsMs?: number;
  clearSecondaryMs?: number;
  syncFieldsMs?: number;
  syncLinksMs?: number;
  syncPortalsMs?: number;
  coreGroupToggleMs?: number;
  fullClearMs?: number;
  fullFieldsMs?: number;
  fullLinksMs?: number;
  fullPortalsMs?: number;
  secondaryMs?: number;
}

export interface IitcIrisInteractionUpdateTimingDiagnostics {
  kind: 'layer' | 'highlighter';
  at: number;
  changedKeys?: string[];
  activeHighlighter?: IitcIrisPortalHighlighterId;
  dispatchDelayMs?: number;
  totalMs?: number;
  firstAnimationFrameMs?: number;
  secondAnimationFrameMs?: number;
  sentToFirstAnimationFrameMs?: number;
  sentToSecondAnimationFrameMs?: number;
  renderEntitiesMs?: number;
  renderPath?: 'none' | 'style-refresh' | 'full-render';
  renderPolicyMs?: number;
  ornamentSettingsMs?: number;
  visiblePortalsMs?: number;
  visibleLabelsMs?: number;
  clearSecondaryMs?: number;
  syncFieldsMs?: number;
  syncLinksMs?: number;
  syncPortalsMs?: number;
  fullClearMs?: number;
  fullFieldsMs?: number;
  fullLinksMs?: number;
  fullPortalsMs?: number;
  secondaryMs?: number;
}

export interface IitcIrisMapTimingDiagnostics {
  cacheMs?: number;
  initialMs?: number;
  retryMs?: number;
  artifactWaitMs?: number;
  totalMs?: number;
  movementDelayMs?: number;
  downloadDelayMs?: number;
  layerUpdate?: IitcIrisLayerUpdateTimingDiagnostics;
  interactionUpdates?: IitcIrisInteractionUpdateTimingDiagnostics[];
}

export interface IitcIrisPlayerTrackerDiagnostics {
  enabled: boolean;
  visible: boolean;
  players: number;
  events: number;
  markers: number;
  traces: number;
  latestCommTime: number | null;
  minZoom: number;
  maxAgeMs: number;
}

export interface IitcIrisLifecycleSettings {
  iitcMovementDelay: boolean;
}

export type IitcIrisLayerRegistryGroup = 'core' | 'detail';

export type IitcIrisLayerRegistryKind = 'overlay' | 'filter';

export type IitcIrisPortalHighlighterId =
  | 'none'
  | 'level-color'
  | 'needs-recharge'
  | 'history-visited'
  | 'history-not-visited'
  | 'history-captured'
  | 'history-not-captured'
  | 'history-scout-controlled'
  | 'history-not-scout-controlled';

export interface IitcIrisHighlighterSettings {
  active: IitcIrisPortalHighlighterId;
}

export interface IitcIrisLayerRegistryEntry {
  id: keyof IitcIrisLayerSettings;
  label: string;
  title: string;
  group: IitcIrisLayerRegistryGroup;
  kind: IitcIrisLayerRegistryKind;
  setting: 'boolean';
  defaultValue: boolean;
}

export interface IitcIrisLayerSettings {
  fields: boolean;
  links: boolean;
  portals: boolean;
  unclaimedPortals: boolean;
  level1Portals: boolean;
  level2Portals: boolean;
  level3Portals: boolean;
  level4Portals: boolean;
  level5Portals: boolean;
  level6Portals: boolean;
  level7Portals: boolean;
  level8Portals: boolean;
  resistance: boolean;
  enlightened: boolean;
  machina: boolean;
  ornaments: boolean;
  artifacts: boolean;
  labels: boolean;
  tiles: boolean;
  drawnLinks: boolean;
  drawnMarkers: boolean;
  playerTracker: boolean;
  playerTrackerResistance: boolean;
  playerTrackerEnlightened: boolean;
  playerTrackerMachina: boolean;
  keyCount: boolean;
}

export type IitcIrisBaseLayerId = 'osm' | 'openfreemap-dark' | 'openfreemap-positron';

export type IitcIrisDataSourceSettings =
  | {mode: 'live'}
  | {mode: 'fixture'; id: string; label: string; url: string};

export interface IitcIrisRenderPolicy {
  /** Zero: no blanket zoom gate; individual portals must supply the required data. */
  optionalOverlayMinZoom: number;
  /** Whether the current request plan supplies full portal summaries. */
  detailedPortals: boolean;
  activeHighlighter: IitcIrisPortalHighlighterId;
  levelFill: boolean;
  healthFill: boolean;
  ornaments: boolean;
  artifacts: boolean;
  labels: boolean;
}
