import {
  isFiniteBoundsE6,
  isRuntimeRecord,
  numberOrNull,
  parseMapCamera,
  stringOrNull,
  type BoundsE6,
  type LatLngDegrees,
  type MapCamera,
} from '@iris/core';

export interface IRISMessage {
  type: string;
  url?: string;
  data?: unknown;
  params?: unknown;
  lat?: number;
  lng?: number;
  zoom?: number;
  center?: { lat: number; lng: number };
  status?: number;
  statusText?: string;
  time?: number;
  message?: string;
  domain?: string;
  detail?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  guid?: string;
  query?: string;
  passcode?: string;
  text?: string;
  tab?: string;
  reason?: string;
  minTimestampMs?: number;
  maxTimestampMs?: number;
  ascendingTimestampOrder?: boolean;
  bounds?: {
    minLatE6: number;
    minLngE6: number;
    maxLatE6: number;
    maxLngE6: number;
  };
  minLatE6?: number;
  maxLatE6?: number;
  minLngE6?: number;
  maxLngE6?: number;
  tileKeys?: string[];
  entityGeneration?: number;
  nickname?: string;
  level?: number;
  ap?: number;
  team?: string;
  energy?: number;
  xm_capacity?: number;
  available_invites?: number;
  min_ap_for_current_level?: number;
  min_ap_for_next_level?: number;
  hasActiveSubscription?: boolean;
  sessionStatus?: 'ok' | 'initial_login_required' | 'expired' | 'recovering';
  lastQueryTimestamp?: number;
  location?: string | null;
  isActive?: boolean;
  moving?: boolean;
  dx?: number;
  dy?: number;
}

export interface IrisMoveMapPayload {
  camera: MapCamera;
  bounds?: BoundsE6;
}

export type IrisRegionScoreRequestPayload = LatLngDegrees;

function parseBoundsE6(value: unknown): BoundsE6 | null {
  if (!isRuntimeRecord(value)) return null;

  const bounds = {
    minLatE6: numberOrNull(value.minLatE6),
    minLngE6: numberOrNull(value.minLngE6),
    maxLatE6: numberOrNull(value.maxLatE6),
    maxLngE6: numberOrNull(value.maxLngE6),
  };
  if (
    bounds.minLatE6 === null ||
    bounds.minLngE6 === null ||
    bounds.maxLatE6 === null ||
    bounds.maxLngE6 === null
  ) {
    return null;
  }

  const parsed = {
    minLatE6: bounds.minLatE6,
    minLngE6: bounds.minLngE6,
    maxLatE6: bounds.maxLatE6,
    maxLngE6: bounds.maxLngE6,
  };
  return isFiniteBoundsE6(parsed) ? parsed : null;
}

export function parseIrisMoveMapMessage(msg: IRISMessage): IrisMoveMapPayload | null {
  if (msg.type !== 'IRIS_MOVE_MAP' || !isRuntimeRecord(msg.center)) return null;

  const camera = parseMapCamera({
    lat: msg.center.lat,
    lng: msg.center.lng,
    zoom: msg.zoom,
  }, { rejectNullIsland: false });
  if (!camera) return null;

  const bounds = parseBoundsE6(msg.bounds);
  return bounds ? {camera, bounds} : {camera};
}

export function parseIrisRegionScoreRequestMessage(msg: IRISMessage): IrisRegionScoreRequestPayload | null {
  if (msg.type !== 'IRIS_REGION_SCORE_REQUEST') return null;

  const lat = numberOrNull(msg.lat);
  const lng = numberOrNull(msg.lng);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return {lat, lng};
}

export function parseIrisPortalDetailsRequestMessage(msg: IRISMessage): string | null {
  if (msg.type !== 'IRIS_PORTAL_DETAILS_REQUEST') return null;
  const guid = stringOrNull(msg.guid)?.trim();
  return guid ? guid : null;
}
