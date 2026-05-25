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

export {
    getMessageType,
    isEndpointStateMessage,
    isIrisDataMessage,
    isRecord,
    numberOrNull,
    stringOrNull,
    type IrisDataMessage,
    type IrisEndpointStateMessage,
    type UnknownRecord,
} from '@iris/core';
