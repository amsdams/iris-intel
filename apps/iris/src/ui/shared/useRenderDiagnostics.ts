import { useEffect, useRef } from 'preact/hooks';
import { useStore } from '@iris/core';

const UI_RENDER_SAMPLE_INTERVAL_MS = 1000;

export function useRenderDiagnostics(name: string): void {
    const pendingCountRef = useRef(0);

    pendingCountRef.current += 1;

    useEffect(() => {
        const flush = (): void => {
            const count = pendingCountRef.current;
            pendingCountRef.current = 0;

            if (count > 0) {
                useStore.getState().recordUiRenderSample(name, count);
            }
        };

        const interval = window.setInterval(flush, UI_RENDER_SAMPLE_INTERVAL_MS);

        return (): void => {
            window.clearInterval(interval);
            flush();
        };
    }, [name]);
}
