import { useEffect, useState } from 'preact/hooks';

export type EndpointName = 'portalDetails' | 'gameScore' | 'regionScore' | 'subscription' | 'inventory' | 'plexts';

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
            const msg = event.data;
            if (!msg || msg.type !== 'IRIS_ENDPOINT_STATE') return;

            const endpoint = msg.endpoint as EndpointName | undefined;
            if (!endpoint) return;

            setTelemetry((prev) => ({
                ...prev,
                [endpoint]: {
                    status: msg.status,
                    inFlightKey: msg.inFlightKey ?? null,
                    inFlightCount: typeof msg.inFlightCount === 'number' ? msg.inFlightCount : 0,
                    lastSuccessKey: msg.lastSuccessKey ?? null,
                    lastSuccessAt: typeof msg.lastSuccessAt === 'number' ? msg.lastSuccessAt : null,
                    lastAttemptKey: msg.lastAttemptKey ?? null,
                    lastAttemptAt: typeof msg.lastAttemptAt === 'number' ? msg.lastAttemptAt : null,
                    lastSkipReason: msg.lastSkipReason ?? null,
                    nextRefreshAt: typeof msg.nextRefreshAt === 'number' ? msg.nextRefreshAt : null,
                    failureCount: typeof msg.failureCount === 'number' ? msg.failureCount : 0,
                    cooldownUntil: typeof msg.cooldownUntil === 'number' ? msg.cooldownUntil : null,
                },
            }));
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);

    return telemetry;
}

