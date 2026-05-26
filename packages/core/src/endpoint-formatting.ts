import type {EndpointDiagnostics, EndpointKey, EndpointStatus} from './store';

export type EndpointDerivedStatus = EndpointStatus | 'stale';
export type CompactEndpointStateKind = 'active' | 'error' | 'cooldown' | 'fresh' | 'idle';

export interface CompactEndpointTelemetry {
  status: 'idle' | 'in_flight' | 'error';
  inFlightCount?: number;
  lastSkipReason?: string | null;
  nextRefreshAt?: number | null;
  cooldownUntil?: number | null;
}

export function getEndpointUrlLabel(url: string): string {
  return url.split('/').pop() || url;
}

export function formatEndpointRequestActivityMessage(url: string): string {
  return `request ${getEndpointUrlLabel(url)}`;
}

export function formatEndpointSuccessActivityMessage(url: string, isActive?: boolean): string {
  return `success ${getEndpointUrlLabel(url)}${isActive ? ' active' : ' passive'}`;
}

export function formatEndpointErrorActivityMessage(status: number, statusText: string): string {
  return `error ${status} ${statusText}`;
}

export function formatFutureDelay(time: number | null | undefined, now = Date.now()): string | null {
  if (typeof time !== 'number' || !Number.isFinite(time)) return null;

  const diff = Math.max(0, time - now);
  const seconds = Math.ceil(diff / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${rest}s`;
}

export function formatRelativeTime(time: number | null | undefined, now = Date.now()): string {
  if (!time) return 'never';
  const seconds = Math.floor((now - time) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function getDerivedEndpointStatus(
  entry: Pick<EndpointDiagnostics, 'key' | 'status' | 'lastSuccessAt'>,
  staleAfterMs: Partial<Record<EndpointKey, number>>,
  now = Date.now(),
): EndpointDerivedStatus {
  if (entry.status === 'success' && entry.lastSuccessAt) {
    const staleAfter = staleAfterMs[entry.key];
    if (staleAfter && now - entry.lastSuccessAt > staleAfter) {
      return 'stale';
    }
  }
  return entry.status;
}

export function formatEndpointCountdown(
  entry: Pick<EndpointDiagnostics, 'key' | 'status' | 'inFlightCount' | 'nextAutoRefreshAt'>,
  polledEndpointLabels: Partial<Record<EndpointKey, string>>,
  now = Date.now(),
): string | null {
  if (!entry.nextAutoRefreshAt || !polledEndpointLabels[entry.key]) return null;
  if (entry.status === 'in_flight' || entry.inFlightCount > 0) return 'refreshing now';

  const remaining = formatFutureDelay(entry.nextAutoRefreshAt, now);
  if (!remaining) return null;
  return entry.nextAutoRefreshAt <= now ? 'due' : remaining;
}

export function sortEndpointDiagnostics(
  entries: EndpointDiagnostics[],
  refreshModeLabels: Partial<Record<EndpointKey, string>>,
  fallbackOrder: EndpointKey[],
): EndpointDiagnostics[] {
  const getSortBucket = (entry: EndpointDiagnostics): number => {
    if (entry.status === 'in_flight' || entry.inFlightCount > 0) return 0;
    if (entry.nextAutoRefreshAt) return 1;
    if (refreshModeLabels[entry.key]) return 2;
    return 3;
  };

  return [...entries].sort((a, b) => {
    const bucketDiff = getSortBucket(a) - getSortBucket(b);
    if (bucketDiff !== 0) return bucketDiff;

    if (a.nextAutoRefreshAt && b.nextAutoRefreshAt) {
      const refreshDiff = a.nextAutoRefreshAt - b.nextAutoRefreshAt;
      if (refreshDiff !== 0) return refreshDiff;
    }

    return fallbackOrder.indexOf(a.key) - fallbackOrder.indexOf(b.key);
  });
}

export function getCompactEndpointStateKind(entry: CompactEndpointTelemetry, now = Date.now()): CompactEndpointStateKind {
  if (entry.status === 'in_flight' || (entry.inFlightCount ?? 0) > 0) return 'active';
  if (entry.status === 'error') return 'error';
  if (entry.cooldownUntil !== null && entry.cooldownUntil !== undefined && entry.cooldownUntil > now) return 'cooldown';
  if (entry.lastSkipReason === 'fresh') return 'fresh';
  return 'idle';
}

export function formatCompactEndpointStateLabel(entry: CompactEndpointTelemetry, now = Date.now()): string {
  const kind = getCompactEndpointStateKind(entry, now);
  const delay = (time: number | null | undefined): string => {
    const value = formatFutureDelay(time, now);
    return value ? ` ${value}` : '';
  };

  switch (kind) {
    case 'active':
      return `A${(entry.inFlightCount ?? 0) > 1 ? `x${entry.inFlightCount}` : ''}`;
    case 'error':
      return `E${delay(entry.cooldownUntil)}`;
    case 'cooldown':
      return `C${delay(entry.cooldownUntil)}`;
    case 'fresh':
      return `F${delay(entry.nextRefreshAt)}`;
    case 'idle':
      return 'I';
  }
}

export function formatCompactEndpointActivityMessage(
  endpoint: string,
  entry: CompactEndpointTelemetry,
  now = Date.now(),
): string | null {
  if (entry.status === 'in_flight' || (entry.inFlightCount ?? 0) > 0) {
    return `NET ${endpoint}: in-flight${(entry.inFlightCount ?? 0) > 1 ? ` x${entry.inFlightCount}` : ''}`;
  }

  if (entry.status === 'error') {
    const cooldown = formatFutureDelay(entry.cooldownUntil, now);
    return `NET ${endpoint}: error${entry.lastSkipReason ? ` (${entry.lastSkipReason})` : ''}${cooldown ? `; backoff ${cooldown}` : ''}`;
  }

  if (entry.lastSkipReason) {
    const nextRefresh = formatFutureDelay(entry.nextRefreshAt, now);
    return `NET ${endpoint}: skipped ${entry.lastSkipReason}${nextRefresh ? `; next ${nextRefresh}` : ''}`;
  }

  return null;
}
