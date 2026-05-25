import { useEffect, useState } from 'preact/hooks';
import { isEndpointStateMessage, numberOrNull, stringOrNull } from './messages';

export type EndpointName = 'entities' | 'portalDetails' | 'gameScore' | 'regionScore' | 'subscription' | 'inventory' | 'plexts' | 'artifacts';

export interface EndpointTelemetry {
    status: 'idle' | 'in_flight' | 'error';
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

type TelemetryMap = Partial<Record<EndpointName, EndpointTelemetry>>;

const EMPTY_TELEMETRY: TelemetryMap = {};

export function useEndpointTelemetry(): TelemetryMap {
    const [telemetry, setTelemetry] = useState<TelemetryMap>(EMPTY_TELEMETRY);

    useEffect(() => {
        const handler = (event: MessageEvent): void => {
            const msg: unknown = event.data;
            if (!isEndpointStateMessage(msg)) return;

            const endpoint = stringOrNull(msg.endpoint);
            if (!isEndpointName(endpoint)) return;
            const status = stringOrNull(msg.status);

            setTelemetry((prev): TelemetryMap => ({
                ...prev,
                [endpoint]: {
                    status: isEndpointStatus(status) ? status : 'idle',
                    inFlightKey: stringOrNull(msg.inFlightKey),
                    inFlightCount: numberOrNull(msg.inFlightCount) ?? 0,
                    lastSuccessKey: stringOrNull(msg.lastSuccessKey),
                    lastSuccessAt: numberOrNull(msg.lastSuccessAt),
                    lastAttemptKey: stringOrNull(msg.lastAttemptKey),
                    lastAttemptAt: numberOrNull(msg.lastAttemptAt),
                    lastSkipReason: stringOrNull(msg.lastSkipReason),
                    nextRefreshAt: numberOrNull(msg.nextRefreshAt),
                    failureCount: numberOrNull(msg.failureCount) ?? 0,
                    cooldownUntil: numberOrNull(msg.cooldownUntil),
                },
            }));
        };

        window.addEventListener('message', handler);
        return (): void => window.removeEventListener('message', handler);
    }, []);

    return telemetry;
}

function isEndpointName(value: string | null): value is EndpointName {
    return value === 'entities'
        || value === 'portalDetails'
        || value === 'gameScore'
        || value === 'regionScore'
        || value === 'subscription'
        || value === 'inventory'
        || value === 'plexts'
        || value === 'artifacts';
}

function isEndpointStatus(value: string | null): value is EndpointTelemetry['status'] {
    return value === 'idle' || value === 'in_flight' || value === 'error';
}
