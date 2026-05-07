import { useState, useEffect, useCallback } from 'preact/hooks';
import { useEndpointTelemetry } from './useEndpointTelemetry';
import { createPlextRequestMessage, type PlextRequestBounds } from './plextRequests';

export type CommTab = 'all' | 'faction' | 'alerts';

const COMM_POLL_MS = 120000;

interface UseCommResult {
    activeTab: CommTab;
    setActiveTab: (tab: CommTab) => void;
    refreshComm: () => void;
}

export function useComm(isVis: boolean, liveMode: boolean, plextBounds: PlextRequestBounds | null): UseCommResult {
    const [activeTab, setActiveTab] = useState<CommTab>('all');
    const telemetry = useEndpointTelemetry();

    const pollComm = useCallback((force = false): void => {
        if (!isVis || !liveMode) return;
        if (!plextBounds) return;
        const plexts = telemetry.plexts;
        const now = Date.now();
        if (plexts) {
            if (plexts.status === 'in_flight') return;
            if (plexts.cooldownUntil !== null && now < plexts.cooldownUntil) return;
            if (!force && plexts.nextRefreshAt !== null && now < plexts.nextRefreshAt) return;
        }

        const request = createPlextRequestMessage(activeTab.toLowerCase(), plextBounds, -1, -1, true, force);
        if (request) {
            window.postMessage(request, '*');
        }
    }, [activeTab, isVis, liveMode, plextBounds, telemetry.plexts]);

    const refreshComm = useCallback((): void => {
        pollComm(true);
    }, [pollComm]);

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
        return (): void => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, pollComm, telemetry.plexts]);

    return { activeTab, setActiveTab, refreshComm };
}
