import { useEffect } from 'preact/hooks';
import { useStore } from '@iris/core';
import { useEndpointTelemetry } from './useEndpointTelemetry';

const SUBSCRIPTION_POLL_MS = 600000;
const INVENTORY_POLL_MS = 300000;

export function usePlayerStats(isVis: boolean, liveMode: boolean) {
    const hasSubscription = useStore(state => state.hasSubscription);
    const telemetry = useEndpointTelemetry();

    // 1. Always poll subscription status
    useEffect(() => {
        if (!isVis || !liveMode) return;

        const pollSub = (): void => {
            const subscription = telemetry.subscription;
            const now = Date.now();
            if (subscription) {
                if (subscription.status === 'in_flight') return;
                if (subscription.cooldownUntil !== null && now < subscription.cooldownUntil) return;
                if (subscription.nextRefreshAt !== null && now < subscription.nextRefreshAt) return;
            }
            window.postMessage({ type: 'IRIS_SUBSCRIPTION_REQUEST' }, '*');
        };

        let timerId: number | null = null;
        const schedule = (): void => {
            pollSub();
            const nextDue = Math.max(
                telemetry.subscription?.nextRefreshAt !== null && telemetry.subscription?.nextRefreshAt !== undefined
                    ? telemetry.subscription.nextRefreshAt - Date.now()
                    : SUBSCRIPTION_POLL_MS,
                SUBSCRIPTION_POLL_MS,
            );
            timerId = window.setTimeout(schedule, nextDue);
        };

        schedule();
        return () => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, telemetry.subscription]);

    // 2. Only poll inventory if C.O.R.E. is active
    useEffect(() => {
        if (!isVis || !liveMode || !hasSubscription) return;

        const pollInv = (): void => {
            const inventory = telemetry.inventory;
            const now = Date.now();
            if (inventory) {
                if (inventory.status === 'in_flight') return;
                if (inventory.cooldownUntil !== null && now < inventory.cooldownUntil) return;
                if (inventory.nextRefreshAt !== null && now < inventory.nextRefreshAt) return;
            }
            window.postMessage({ type: 'IRIS_INVENTORY_REQUEST' }, '*');
        };

        let timerId: number | null = null;
        const schedule = (): void => {
            pollInv();
            const nextDue = Math.max(
                telemetry.inventory?.nextRefreshAt !== null && telemetry.inventory?.nextRefreshAt !== undefined
                    ? telemetry.inventory.nextRefreshAt - Date.now()
                    : INVENTORY_POLL_MS,
                INVENTORY_POLL_MS,
            );
            timerId = window.setTimeout(schedule, nextDue);
        };

        schedule();
        return () => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, hasSubscription, telemetry.inventory]);
}
