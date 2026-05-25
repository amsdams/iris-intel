import { useEffect } from 'preact/hooks';
import { createGameScoreRequestMessage, createRegionScoreRequestMessage, getEndpointTelemetryNextDelay, shouldSkipEndpointTelemetryRequest } from '@iris/core';
import { useEndpointTelemetry } from './useEndpointTelemetry';

const SCORE_POLL_MS = 300000;

export function useScores(isVis: boolean, liveMode: boolean, lat: number, lng: number): void {
    const telemetry = useEndpointTelemetry();

    useEffect(() => {
        if (!isVis || !liveMode) return;

        const pollScores = (): void => {
            const gameScore = telemetry.gameScore;
            const regionScore = telemetry.regionScore;

            if (shouldSkipEndpointTelemetryRequest(gameScore)) return;
            if (shouldSkipEndpointTelemetryRequest(regionScore)) return;
            window.postMessage(createGameScoreRequestMessage(), '*');
            const regionScoreRequest = createRegionScoreRequestMessage(lat, lng);
            if (regionScoreRequest) window.postMessage(regionScoreRequest, '*');
        };

        let timerId: number | null = null;

        const schedule = (): void => {
            pollScores();
            const nextDue = Math.max(
                getEndpointTelemetryNextDelay(telemetry.gameScore, SCORE_POLL_MS),
                getEndpointTelemetryNextDelay(telemetry.regionScore, SCORE_POLL_MS),
                SCORE_POLL_MS,
            );
            timerId = window.setTimeout(schedule, nextDue);
        };

        schedule();

        return (): void => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, lat, lng, telemetry.gameScore, telemetry.regionScore]);
}
