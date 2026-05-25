export interface PortalDetailsRequestMessage {
  type: 'IRIS_PORTAL_DETAILS_REQUEST';
  guid: string;
}

export interface InventoryRequestMessage {
  type: 'IRIS_INVENTORY_REQUEST';
  force?: boolean;
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
