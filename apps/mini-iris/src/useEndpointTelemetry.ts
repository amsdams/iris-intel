import { useEffect, useState } from 'preact/hooks';
import {
    parseEndpointStateTelemetry,
    type EndpointTelemetry,
    type EndpointTelemetryMap,
    type EndpointTelemetryName,
} from '@iris/core';

export type EndpointName = EndpointTelemetryName;
export type { EndpointTelemetry };

const EMPTY_TELEMETRY: EndpointTelemetryMap = {};

export function useEndpointTelemetry(): EndpointTelemetryMap {
    const [telemetry, setTelemetry] = useState<EndpointTelemetryMap>(EMPTY_TELEMETRY);

    useEffect(() => {
        const handler = (event: MessageEvent): void => {
            const parsed = parseEndpointStateTelemetry(event.data);
            if (!parsed) return;

            setTelemetry((prev): EndpointTelemetryMap => ({
                ...prev,
                [parsed.endpoint]: parsed.telemetry,
            }));
        };

        window.addEventListener('message', handler);
        return (): void => window.removeEventListener('message', handler);
    }, []);

    return telemetry;
}
