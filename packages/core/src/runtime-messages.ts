export type UnknownRecord = Record<string, unknown>;

export interface IrisDataMessage {
  type: 'IRIS_DATA';
  url: string;
  data: unknown;
  params?: unknown;
}

export function isRuntimeRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

export function getMessageType(value: unknown): string | null {
  if (!isRuntimeRecord(value) || typeof value.type !== 'string') return null;
  return value.type;
}

export function isIrisDataMessage(value: unknown): value is IrisDataMessage {
  return isRuntimeRecord(value)
    && value.type === 'IRIS_DATA'
    && typeof value.url === 'string'
    && 'data' in value;
}

export function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
