import {isRuntimeRecord, numberOrNull, stringOrNull} from './runtime-messages';

export type EndpointTelemetryName =
  | 'entities'
  | 'portalDetails'
  | 'gameScore'
  | 'regionScore'
  | 'subscription'
  | 'inventory'
  | 'plexts'
  | 'artifacts';

export type EndpointTelemetryStatus = 'idle' | 'in_flight' | 'error';

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

export interface EndpointTelemetry {
  status: EndpointTelemetryStatus;
  inFlightKey: string | null;
  inFlightCount: number;
  lastSuccessKey: string | null;
  lastSuccessAt: number | null;
  lastAttemptKey: string | null;
  lastAttemptAt: number | null;
  lastSkipReason: string | null;
  nextRefreshAt: number | null;
  failureCount: number;
  cooldownUntil: number | null;
}

export type EndpointTelemetryMap = Partial<Record<EndpointTelemetryName, EndpointTelemetry>>;

export interface EndpointTelemetryRequestGateOptions {
  now?: number;
  force?: boolean;
}

export function isEndpointStateMessage(value: unknown): value is IrisEndpointStateMessage {
  return isRuntimeRecord(value) && value.type === 'IRIS_ENDPOINT_STATE';
}

export function isEndpointTelemetryName(value: string | null): value is EndpointTelemetryName {
  return value === 'entities'
    || value === 'portalDetails'
    || value === 'gameScore'
    || value === 'regionScore'
    || value === 'subscription'
    || value === 'inventory'
    || value === 'plexts'
    || value === 'artifacts';
}

export function isEndpointTelemetryStatus(value: string | null): value is EndpointTelemetryStatus {
  return value === 'idle' || value === 'in_flight' || value === 'error';
}

export function parseEndpointStateTelemetry(value: unknown): {endpoint: EndpointTelemetryName; telemetry: EndpointTelemetry} | null {
  if (!isEndpointStateMessage(value)) return null;

  const endpoint = stringOrNull(value.endpoint);
  if (!isEndpointTelemetryName(endpoint)) return null;
  const status = stringOrNull(value.status);

  return {
    endpoint,
    telemetry: {
      status: isEndpointTelemetryStatus(status) ? status : 'idle',
      inFlightKey: stringOrNull(value.inFlightKey),
      inFlightCount: numberOrNull(value.inFlightCount) ?? 0,
      lastSuccessKey: stringOrNull(value.lastSuccessKey),
      lastSuccessAt: numberOrNull(value.lastSuccessAt),
      lastAttemptKey: stringOrNull(value.lastAttemptKey),
      lastAttemptAt: numberOrNull(value.lastAttemptAt),
      lastSkipReason: stringOrNull(value.lastSkipReason),
      nextRefreshAt: numberOrNull(value.nextRefreshAt),
      failureCount: numberOrNull(value.failureCount) ?? 0,
      cooldownUntil: numberOrNull(value.cooldownUntil),
    },
  };
}

export function shouldSkipEndpointTelemetryRequest(
  telemetry: EndpointTelemetry | null | undefined,
  options: EndpointTelemetryRequestGateOptions = {},
): boolean {
  if (!telemetry) return false;
  const now = options.now ?? Date.now();

  if (telemetry.status === 'in_flight' || telemetry.inFlightCount > 0) return true;
  if (telemetry.cooldownUntil !== null && now < telemetry.cooldownUntil) return true;
  if (!options.force && telemetry.nextRefreshAt !== null && now < telemetry.nextRefreshAt) return true;
  return false;
}

export function getEndpointTelemetryNextDelay(
  telemetry: EndpointTelemetry | null | undefined,
  fallbackMs: number,
  now = Date.now(),
): number {
  if (telemetry?.nextRefreshAt !== null && telemetry?.nextRefreshAt !== undefined) {
    return Math.max(telemetry.nextRefreshAt - now, fallbackMs);
  }

  return fallbackMs;
}
