export interface PortalDetailsRequestMessage {
  type: 'IRIS_PORTAL_DETAILS_REQUEST';
  guid: string;
}

export interface InventoryRequestMessage {
  type: 'IRIS_INVENTORY_REQUEST';
  force?: boolean;
}

export interface EntitiesRequestMessage {
  type: 'IRIS_ENTITIES_REQUEST';
  tileKeys: string[];
  force?: boolean;
}

export interface ArtifactsRequestMessage {
  type: 'IRIS_ARTIFACTS_REQUEST';
  force?: boolean;
}

export interface SubscriptionRequestMessage {
  type: 'IRIS_SUBSCRIPTION_REQUEST';
}

export interface PlayerStatsRequestMessage {
  type: 'IRIS_PLAYER_STATS_REQUEST';
}

export interface GameScoreRequestMessage {
  type: 'IRIS_GAME_SCORE_REQUEST';
}

export interface RegionScoreRequestMessage {
  type: 'IRIS_REGION_SCORE_REQUEST';
  lat: number;
  lng: number;
}

export function createPortalDetailsRequestMessage(guid: string | null | undefined): PortalDetailsRequestMessage | null {
  const trimmedGuid = guid?.trim();
  if (!trimmedGuid) return null;
  return { type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: trimmedGuid };
}

export function createInventoryRequestMessage(options: { force?: boolean } = {}): InventoryRequestMessage {
  return {
    type: 'IRIS_INVENTORY_REQUEST',
    ...(options.force ? { force: true } : {}),
  };
}

export function createEntitiesRequestMessage(tileKeys: string[], options: { force?: boolean } = {}): EntitiesRequestMessage | null {
  const cleanTileKeys = tileKeys.map((tileKey) => tileKey.trim()).filter((tileKey) => tileKey.length > 0);
  if (cleanTileKeys.length === 0) return null;
  return {
    type: 'IRIS_ENTITIES_REQUEST',
    tileKeys: cleanTileKeys,
    ...(options.force ? { force: true } : {}),
  };
}

export function createArtifactsRequestMessage(options: { force?: boolean } = {}): ArtifactsRequestMessage {
  return {
    type: 'IRIS_ARTIFACTS_REQUEST',
    ...(options.force ? { force: true } : {}),
  };
}

export function createSubscriptionRequestMessage(): SubscriptionRequestMessage {
  return { type: 'IRIS_SUBSCRIPTION_REQUEST' };
}

export function createPlayerStatsRequestMessage(): PlayerStatsRequestMessage {
  return { type: 'IRIS_PLAYER_STATS_REQUEST' };
}

export function createGameScoreRequestMessage(): GameScoreRequestMessage {
  return { type: 'IRIS_GAME_SCORE_REQUEST' };
}

export function createRegionScoreRequestMessage(
  lat: number | null | undefined,
  lng: number | null | undefined
): RegionScoreRequestMessage | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { type: 'IRIS_REGION_SCORE_REQUEST', lat: lat as number, lng: lng as number };
}
