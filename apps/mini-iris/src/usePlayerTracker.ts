import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import {
    PLAYER_TRACKER_HISTORY_EXPIRATION_MS,
    PLAYER_TRACKER_TICK_MS,
    useStore,
    PlextParser,
    createPlextRequestMessage,
    getEndpointTelemetryNextDelay,
    processPlayerTrackerPlexts,
    prunePlayerTrackerHistories,
    shouldSkipEndpointTelemetryRequest,
} from '@iris/core';
import type { Plext, PlextData, PlextRequestBounds, PlayerTrackerHistory } from '@iris/core';
import { useEndpointTelemetry } from './useEndpointTelemetry';
import { isIrisDataMessage } from './messages';

export type PlayerAction = PlayerTrackerHistory['events'][number]['actions'][number];
export type PlayerHistory = PlayerTrackerHistory;

interface UsePlayerTrackerResult {
    playerHistories: Map<string, PlayerHistory>;
}

const PLEXT_POLL_MS = 120000;

export function usePlayerTracker(
    isVis: boolean,
    liveMode: boolean,
    logEvent: (msg: string) => void,
    plextBounds: PlextRequestBounds | null = null,
): UsePlayerTrackerResult {
    const [playerHistories, setPlayerHistories] = useState<Map<string, PlayerHistory>>(new Map());
    const [lastPlextTime, setLastPlextTime] = useState(-1);
    const telemetry = useEndpointTelemetry();
    const processedPlextFingerprintsRef = useRef<Map<string, string>>(new Map());

    const processPlexts = useCallback((plexts: Plext[]) => {
        if (!liveMode) return;
        if (plexts.length === 0) return;

        setPlayerHistories(prev => {
            const result = processPlayerTrackerPlexts({
                plexts,
                previousHistories: prev,
                processedPlextFingerprints: processedPlextFingerprintsRef.current,
                expirationMs: PLAYER_TRACKER_HISTORY_EXPIRATION_MS,
            });
            processedPlextFingerprintsRef.current = result.processedPlextFingerprints;
            if (result.maxPlextTime !== null) {
                setLastPlextTime(previous => Math.max(previous, result.maxPlextTime ?? previous));
            }
            if (result.processedCount > 0) {
                logEvent(`TRACKER: ${result.processedCount} plexts, ${result.touchedPlayerCount} players`);
            }
            return result.histories;
        });
    }, [liveMode, logEvent]);

    // Message Listener for COMM data
    useEffect(() => {
        const handler = (event: MessageEvent): void => {
            const msg: unknown = event.data;
            if (!isIrisDataMessage(msg) || !msg.url.includes('getPlexts')) return;
            
            const plexts = PlextParser.parse(msg.data as PlextData);
            if (plexts.length > 0) {
                processPlexts(plexts);
                logEvent(`COMM: ${plexts.length} messages parsed`);
            }
        };
        window.addEventListener('message', handler);
        return (): void => window.removeEventListener('message', handler);
    }, [processPlexts, logEvent]);

    const plextFeed = useStore(state => state.plexts);
    useEffect(() => {
        processPlexts(plextFeed);
    }, [plextFeed, processPlexts]);

    useEffect(() => {
        if (!liveMode) return;

        const timerId = window.setInterval(() => {
            setPlayerHistories(prev => prunePlayerTrackerHistories(prev));
        }, PLAYER_TRACKER_TICK_MS);

        return (): void => window.clearInterval(timerId);
    }, [liveMode]);

    // Polling effect
    useEffect(() => {
        if (!isVis || !liveMode) return;

        const poll = (): void => {
            const plexts = telemetry.plexts;
            if (shouldSkipEndpointTelemetryRequest(plexts)) return;

            const request = createPlextRequestMessage({
                tab: 'all',
                bounds: plextBounds,
                minTimestampMs: lastPlextTime,
                ascendingTimestampOrder: lastPlextTime >= 0,
                requireBounds: true,
            });
            if (request) {
                window.postMessage(request, '*');
            }
        };

        let timerId: number | null = null;
        const schedule = (): void => {
            poll();
            const nextDue = Math.max(
                getEndpointTelemetryNextDelay(telemetry.plexts, PLEXT_POLL_MS),
                PLEXT_POLL_MS,
            );
            timerId = window.setTimeout(schedule, nextDue);
        };

        schedule();
        return (): void => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, lastPlextTime, plextBounds, telemetry.plexts]);

    return { playerHistories };
}
