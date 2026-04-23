import { useEffect } from 'preact/hooks';

export function useScores(isVis: boolean, liveMode: boolean) {
    useEffect(() => {
        if (!isVis || !liveMode) return;

        const pollScores = () => {
            window.postMessage({ type: 'IRIS_GAME_SCORE_REQUEST' }, '*');
            window.postMessage({ type: 'IRIS_REGION_SCORE_REQUEST' }, '*');
        };

        pollScores();
        const interval = setInterval(pollScores, 300000); // 5 minutes

        return () => clearInterval(interval);
    }, [isVis, liveMode]);
}
