import { useEffect } from 'preact/hooks';
import { createInventoryRequestMessage, createPlayerStatsRequestMessage, createSubscriptionRequestMessage, useStore } from '@iris/core';
import { useEndpointTelemetry } from './useEndpointTelemetry';

const SUBSCRIPTION_POLL_MS = 600000;
const INVENTORY_POLL_MS = 300000;
const PLAYER_STATS_RETRY_MS = 2000;

export function usePlayerStats(isVis: boolean, liveMode: boolean): void {
    const playerStats = useStore(state => state.playerStats);
    const hasSubscription = useStore(state => state.hasSubscription);
    const telemetry = useEndpointTelemetry();

    // 1. Ask the page-world interceptor for PLAYER data until profile stats arrive.
    useEffect(() => {
        if (!isVis || !liveMode || playerStats) return;

        const requestPlayerStats = (): void => {
            window.postMessage(createPlayerStatsRequestMessage(), '*');
        };

        requestPlayerStats();
        const timerId = window.setInterval(requestPlayerStats, PLAYER_STATS_RETRY_MS);
        return (): void => window.clearInterval(timerId);
    }, [isVis, liveMode, playerStats]);

    // 2. Always poll subscription status
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
            window.postMessage(createSubscriptionRequestMessage(), '*');
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
        return (): void => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, telemetry.subscription]);

    // 3. Only poll inventory if C.O.R.E. is active
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
            window.postMessage(createInventoryRequestMessage(), '*');
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
        return (): void => {
            if (timerId !== null) window.clearTimeout(timerId);
        };
    }, [isVis, liveMode, hasSubscription, telemetry.inventory]);
}
