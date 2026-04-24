import { useEffect } from 'preact/hooks';
import { useEndpointTelemetry } from './useEndpointTelemetry';

const SCORE_POLL_MS = 300000;

export function useScores(isVis: boolean, liveMode: boolean) {
    const telemetry = useEndpointTelemetry();

    useEffect(() => {
        if (!isVis || !liveMode) return;

        const pollScores = (): void => {
            const gameScore = telemetry.gameScore;
            const regionScore = telemetry.regionScore;
            const now = Date.now();

            if (gameScore) {
                if (gameScore.status === 'in_flight') return;
                if (gameScore.cooldownUntil !== null && now < gameScore.cooldownUntil) return;
                if (gameScore.nextRefreshAt !== null && now < gameScore.nextRefreshAt) return;
            }
            if (regionScore) {
                if (regionScore.status === 'in_flight') return;
                if (regionScore.cooldownUntil !== null && now < regionScore.cooldownUntil) return;
                if (regionScore.nextRefreshAt !== null && now < regionScore.nextRefreshAt) return;
            }
            window.postMessage({ type: 'IRIS_GAME_SCORE_REQUEST' }, '*');
            window.postMessage({ type: 'IRIS_REGION_SCORE_REQUEST' }, '*');
        };

        let timerId: number | null = null;

        const schedule = (): void => {
            pollScores();
            const nextDue = Math.max(
                telemetry.gameScore?.nextRefreshAt !== null && telemetry.gameScore?.nextRefreshAt !== undefined
                    ? telemetry.gameScore.nextRefreshAt - Date.now()
                    : SCORE_POLL_MS,
                telemetry.regionScore?.nextRefreshAt !== null && telemetry.regionScore?.nextRefreshAt !== undefined
                    ? telemetry.regionScore.nextRefreshAt - Date.now()
                    : SCORE_POLL_MS,
                SCORE_POLL_MS,
            );
            timerId = window.setTimeout(schedule, nextDue);
        };

        schedule();

        return () => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, telemetry.gameScore, telemetry.regionScore]);
}
