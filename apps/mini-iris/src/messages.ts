export type IrisMessageType =
    | 'IRIS_DATA'
    | 'IRIS_PLAYER_STATS'
    | 'IRIS_PLAYER_STATS_REQUEST'
    | 'IRIS_ENDPOINT_STATE'
    | 'IRIS_ENTITIES_REQUEST'
    | 'IRIS_PORTAL_DETAILS_REQUEST'
    | 'IRIS_GAME_SCORE_REQUEST'
    | 'IRIS_REGION_SCORE_REQUEST'
    | 'IRIS_SUBSCRIPTION_REQUEST'
    | 'IRIS_INVENTORY_REQUEST'
    | 'IRIS_ARTIFACTS_REQUEST'
    | 'IRIS_PLEXTS_REQUEST'
    | 'IRIS_SYNC_INTEL_MAP';

export type UnknownRecord = Record<string, unknown>;

export interface IrisDataMessage {
    type: 'IRIS_DATA';
    url: string;
    data: unknown;
    params?: unknown;
}

export interface IrisEndpointStateMessage {
    type: 'IRIS_ENDPOINT_STATE';
    endpoint?: unknown;
    status?: unknown;
    inFlightKey?: unknown;
    inFlightCount?: unknown;
    lastSuccessKey?: unknown;
    lastSuccessAt?: unknown;
    lastAttemptKey?: unknown;
    lastAttemptAt?: unknown;
    lastSkipReason?: unknown;
    nextRefreshAt?: unknown;
    failureCount?: unknown;
    cooldownUntil?: unknown;
}

export function isRecord(value: unknown): value is UnknownRecord {
    return typeof value === 'object' && value !== null;
}

export function getMessageType(value: unknown): IrisMessageType | null {
    if (!isRecord(value) || typeof value.type !== 'string') return null;
    return value.type as IrisMessageType;
}

export function isIrisDataMessage(value: unknown): value is IrisDataMessage {
    return isRecord(value)
        && value.type === 'IRIS_DATA'
        && typeof value.url === 'string'
        && 'data' in value;
}

export function isEndpointStateMessage(value: unknown): value is IrisEndpointStateMessage {
    return isRecord(value) && value.type === 'IRIS_ENDPOINT_STATE';
}

export function stringOrNull(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

export function numberOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
