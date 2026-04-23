import { useState, useEffect, useCallback } from 'preact/hooks';

export type CommTab = 'all' | 'faction' | 'alerts';

export function useComm(isVis: boolean, liveMode: boolean) {
    const [activeTab, setActiveTab] = useState<CommTab>('all');

    const pollComm = useCallback(() => {
        if (!isVis || !liveMode) return;
        window.postMessage({ 
            type: 'IRIS_PLEXTS_REQUEST', 
            tab: activeTab, 
            minTimestampMs: -1 // Let interceptor/intel decide, or track last time
        }, '*');
    }, [isVis, liveMode, activeTab]);

    useEffect(() => {
        if (!isVis || !liveMode) return;
        pollComm();
        const interval = setInterval(pollComm, 60000); // Poll every 1 minute
        return () => clearInterval(interval);
    }, [pollComm]);

    return { activeTab, setActiveTab, refreshComm: pollComm };
}
