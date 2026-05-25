import { useState, useEffect, useCallback } from 'preact/hooks';
import { createPlextRequestMessage, getEndpointTelemetryNextDelay, shouldSkipEndpointTelemetryRequest, type PlextRequestBounds } from '@iris/core';
import { useEndpointTelemetry } from './useEndpointTelemetry';

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
        if (shouldSkipEndpointTelemetryRequest(plexts, {force})) return;

        const request = createPlextRequestMessage({
            tab: activeTab.toLowerCase(),
            bounds: plextBounds,
            ascendingTimestampOrder: true,
            force,
            requireBounds: true,
        });
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
            const nextDue = getEndpointTelemetryNextDelay(plexts, COMM_POLL_MS);
            timerId = window.setTimeout(schedule, nextDue);
        };

        schedule();
        return (): void => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, pollComm, telemetry.plexts]);

    return { activeTab, setActiveTab, refreshComm };
}
