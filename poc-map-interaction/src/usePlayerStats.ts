import { useEffect } from 'preact/hooks';

export function usePlayerStats(isVis: boolean, liveMode: boolean) {
    useEffect(() => {
        if (!isVis || !liveMode) return;

        const pollPlayer = () => {
            window.postMessage({ type: 'IRIS_SUBSCRIPTION_REQUEST' }, '*');
            window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
        };

        pollPlayer();
        const interval = setInterval(pollPlayer, 300000); // 5 minutes

        return () => clearInterval(interval);
    }, [isVis, liveMode]);
}
