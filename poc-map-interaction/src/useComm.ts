import { useState, useEffect, useCallback } from 'preact/hooks';
import { useEndpointTelemetry } from './useEndpointTelemetry';

export type CommTab = 'all' | 'faction' | 'alerts';

const COMM_POLL_MS = 120000;

export function useComm(isVis: boolean, liveMode: boolean) {
    const [activeTab, setActiveTab] = useState<CommTab>('all');
    const telemetry = useEndpointTelemetry();

    const pollComm = useCallback((): void => {
        if (!isVis || !liveMode) return;
        const plexts = telemetry.plexts;
        const now = Date.now();
        if (plexts) {
            if (plexts.status === 'in_flight') return;
            if (plexts.cooldownUntil !== null && now < plexts.cooldownUntil) return;
            if (plexts.nextRefreshAt !== null && now < plexts.nextRefreshAt) return;
        }
        window.postMessage({ 
            type: 'IRIS_PLEXTS_REQUEST', 
            tab: activeTab, 
            minTimestampMs: -1 // Let interceptor/intel decide, or track last time
        }, '*');
    }, [activeTab, isVis, liveMode, telemetry.plexts]);

    useEffect(() => {
        if (!isVis || !liveMode) return;
        let timerId: number | null = null;

        const schedule = (): void => {
            pollComm();
            const plexts = telemetry.plexts;
            const now = Date.now();
            const nextDue = plexts?.nextRefreshAt !== null && plexts?.nextRefreshAt !== undefined
                ? Math.max(plexts.nextRefreshAt - now, COMM_POLL_MS)
                : COMM_POLL_MS;
            timerId = window.setTimeout(schedule, nextDue);
        };

        schedule();
        return () => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, pollComm, telemetry.plexts]);

    return { activeTab, setActiveTab, refreshComm: pollComm };
}
