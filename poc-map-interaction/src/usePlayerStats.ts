import { useEffect } from 'preact/hooks';
import { useStore } from '@iris/core';

export function usePlayerStats(isVis: boolean, liveMode: boolean) {
    const hasSubscription = useStore(state => state.hasSubscription);

    // 1. Always poll subscription status
    useEffect(() => {
        if (!isVis || !liveMode) return;

        const pollSub = () => {
            window.postMessage({ type: 'IRIS_SUBSCRIPTION_REQUEST' }, '*');
        };

        pollSub();
        const interval = setInterval(pollSub, 600000); // 10 minutes
        return () => clearInterval(interval);
    }, [isVis, liveMode]);

    // 2. Only poll inventory if C.O.R.E. is active
    useEffect(() => {
        if (!isVis || !liveMode || !hasSubscription) return;

        const pollInv = () => {
            window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
        };

        pollInv();
        const interval = setInterval(pollInv, 300000); // 5 minutes
        return () => clearInterval(interval);
    }, [isVis, liveMode, hasSubscription]);
}
