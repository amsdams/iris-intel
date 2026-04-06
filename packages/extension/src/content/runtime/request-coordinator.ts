import { useStore } from '@iris/core';
import { IRISMessage } from './message-types';

const PLEXT_COOLDOWN_MS = 5000;
const PLEXT_POLL_MS = 120000;
const ARTIFACTS_POLL_MS = 60000;
const SUBSCRIPTION_POLL_MS = 60000;
const INVENTORY_POLL_MS = 60000;
const ARTIFACTS_STARTUP_DEDUP_MS = 5000;
const SUBSCRIPTION_STARTUP_DEDUP_MS = 5000;
const INVENTORY_STARTUP_DEDUP_MS = 5000;
const STARTUP_GRACE_MS = 5000;
const GAME_SCORE_TTL_MS = 10 * 60 * 1000;
const REGION_SCORE_TTL_MS = 5 * 60 * 1000;

export interface RequestCoordinator {
    start: () => void;
    stop: () => void;
    handleMoveMap: (msg: IRISMessage) => void;
    handleGeolocateRequest: () => void;
    handleInventoryRequest: () => void;
    handleGameScoreRequest: () => void;
    handleRegionScoreRequest: (msg: IRISMessage) => void;
    handlePortalDetailsRequest: (msg: IRISMessage) => void;
    handleCommSendRequest: (msg: IRISMessage) => void;
    handlePasscodeRedeemRequest: (msg: IRISMessage) => void;
    handleCommSendSuccess: (msg: IRISMessage) => void;
    handleMissionDetailsRequest: (msg: IRISMessage) => void;
    handleMissionsRequest: () => void;
    handlePlextsRequest: (msg: IRISMessage) => void;
    onRequestStart: (url: string) => void;
    onPlextsDataReceived: (time?: number) => void;
}

export function createRequestCoordinator(): RequestCoordinator {
    let lastPlextRequestTime = 0;
    let startupGraceUntil = 0;
    let startupTimeoutId: number | null = null;
    let plextPollId: number | null = null;
    let artifactsPollId: number | null = null;
    let subscriptionPollId: number | null = null;
    let inventoryPollId: number | null = null;
    let lastRegionScoreRequestKey: string | null = null;

    const postMessage = (message: Record<string, unknown>): void => {
        window.postMessage(message, '*');
    };

    const isSessionBlocked = (): boolean => {
        const sessionStatus = useStore.getState().sessionStatus;
        return sessionStatus === 'expired' || sessionStatus === 'initial_login_required';
    };
    const isWithinStartupGrace = (): boolean => Date.now() < startupGraceUntil;
    const getEndpointDiagnostics = (key: 'artifacts' | 'subscription' | 'inventory' | 'plexts' | 'gameScore' | 'regionScore'): import('@iris/core').EndpointDiagnostics =>
        useStore.getState().endpointDiagnostics[key];
    const isEndpointInFlight = (key: 'artifacts' | 'subscription' | 'inventory' | 'plexts' | 'gameScore' | 'regionScore'): boolean =>
        getEndpointDiagnostics(key).status === 'in_flight';
    const isEndpointFresh = (key: 'artifacts' | 'subscription' | 'inventory' | 'plexts' | 'gameScore' | 'regionScore', ttlMs: number): boolean => {
        const lastSuccessAt = getEndpointDiagnostics(key).lastSuccessAt;
        return typeof lastSuccessAt === 'number' && Date.now() - lastSuccessAt < ttlMs;
    };

    const scheduleArtifactsFetch = (): void => {
        if (isSessionBlocked()) return;

        if (!isEndpointInFlight('artifacts') && !isEndpointFresh('artifacts', ARTIFACTS_STARTUP_DEDUP_MS)) {
            postMessage({ type: 'IRIS_ARTIFACTS_FETCH' });
        }
    };

    const scheduleSubscriptionFetch = (): void => {
        if (isSessionBlocked()) return;

        if (!isEndpointInFlight('subscription') && !isEndpointFresh('subscription', SUBSCRIPTION_STARTUP_DEDUP_MS)) {
            postMessage({ type: 'IRIS_SUBSCRIPTION_FETCH' });
        }
    };

    const scheduleInventoryFetch = (): void => {
        if (isSessionBlocked()) return;

        if (!isEndpointInFlight('inventory') && !isEndpointFresh('inventory', INVENTORY_STARTUP_DEDUP_MS)) {
            postMessage({ type: 'IRIS_INVENTORY_FETCH', lastQueryTimestamp: -1 });
        }
    };

    const schedulePlextPoll = (): void => {
        if (isSessionBlocked()) return;

        postMessage({
            type: 'IRIS_PLEXTS_REQUEST',
            minTimestampMs: -1,
            tab: useStore.getState().activeCommTab.toLowerCase(),
        });
    };

    const runStartupCatchup = (): void => {
        if (isSessionBlocked()) return;

        if (!isEndpointInFlight('plexts') && !isEndpointFresh('plexts', STARTUP_GRACE_MS)) {
            postPlextFetches({ minTimestampMs: -1 }, true);
        }

        scheduleArtifactsFetch();
        scheduleSubscriptionFetch();
        scheduleInventoryFetch();
    };

    const buildPlextPayload = (msg: Pick<IRISMessage, 'tab' | 'minTimestampMs' | 'maxTimestampMs' | 'ascendingTimestampOrder'>): Record<string, unknown> | null => {
        const bounds = useStore.getState().mapState.bounds;
        if (!bounds) return null;

        return {
            minTimestampMs: msg.minTimestampMs ?? -1,
            maxTimestampMs: msg.maxTimestampMs ?? -1,
            ascendingTimestampOrder: msg.ascendingTimestampOrder ?? false,
            ...bounds,
        };
    };

    const postPlextFetches = (
        msg: Pick<IRISMessage, 'tab' | 'minTimestampMs' | 'maxTimestampMs' | 'ascendingTimestampOrder'>,
        bypassCooldown = false,
    ): void => {
        if (isSessionBlocked()) return;

        const now = Date.now();
        if (!bypassCooldown && now - lastPlextRequestTime < PLEXT_COOLDOWN_MS) {
            return;
        }

        const basePayload = buildPlextPayload(msg);
        if (!basePayload) return;

        lastPlextRequestTime = now;

        if (msg.tab) {
            postMessage({
                type: 'IRIS_PLEXTS_FETCH',
                tab: msg.tab,
                ...basePayload,
            });

            if (msg.tab === 'alerts') {
                postMessage({
                    type: 'IRIS_PLEXTS_FETCH',
                    tab: 'all',
                    ...basePayload,
                });
            }
            return;
        }

        postMessage({
            type: 'IRIS_PLEXTS_FETCH',
            tab: 'all',
            ...basePayload,
        });

        postMessage({
            type: 'IRIS_PLEXTS_FETCH',
            tab: 'faction',
            ...basePayload,
        });
    };

    return {
        start(): void {
            startupGraceUntil = Date.now() + STARTUP_GRACE_MS;

            if (startupTimeoutId === null) {
                startupTimeoutId = window.setTimeout(() => {
                    startupTimeoutId = null;
                    runStartupCatchup();

                    if (plextPollId === null) {
                        plextPollId = window.setInterval(schedulePlextPoll, PLEXT_POLL_MS);
                    }

                    if (artifactsPollId === null) {
                        artifactsPollId = window.setInterval(scheduleArtifactsFetch, ARTIFACTS_POLL_MS);
                    }

                    if (subscriptionPollId === null) {
                        subscriptionPollId = window.setInterval(scheduleSubscriptionFetch, SUBSCRIPTION_POLL_MS);
                    }

                    if (inventoryPollId === null) {
                        inventoryPollId = window.setInterval(scheduleInventoryFetch, INVENTORY_POLL_MS);
                    }
                }, STARTUP_GRACE_MS);
            }
        },

        stop(): void {
            if (startupTimeoutId !== null) {
                window.clearTimeout(startupTimeoutId);
                startupTimeoutId = null;
            }

            if (plextPollId !== null) {
                window.clearInterval(plextPollId);
                plextPollId = null;
            }

            if (artifactsPollId !== null) {
                window.clearInterval(artifactsPollId);
                artifactsPollId = null;
            }

            if (subscriptionPollId !== null) {
                window.clearInterval(subscriptionPollId);
                subscriptionPollId = null;
            }

            if (inventoryPollId !== null) {
                window.clearInterval(inventoryPollId);
                inventoryPollId = null;
            }
        },

        handleMoveMap(msg: IRISMessage): void {
            const { center, zoom, bounds } = msg as {
                center: { lat: number; lng: number };
                zoom: number;
                bounds?: { minLatE6: number; minLngE6: number; maxLatE6: number; maxLngE6: number };
            };

            postMessage({ type: 'IRIS_MOVE_MAP_INTERNAL', center, zoom });
            useStore.getState().updateMapState(center.lat, center.lng, zoom, bounds);

            if (isWithinStartupGrace()) {
                return;
            }

            this.handlePlextsRequest({
                type: 'IRIS_PLEXTS_REQUEST',
                minTimestampMs: -1,
            });
        },

        handleGeolocateRequest(): void {
            postMessage({ type: 'IRIS_GEOLOCATE' });
        },

        handleInventoryRequest(): void {
            if (isSessionBlocked()) return;
            if (isEndpointInFlight('inventory')) return;
            postMessage({ type: 'IRIS_INVENTORY_FETCH', lastQueryTimestamp: -1 });
        },

        handleGameScoreRequest(): void {
            if (isSessionBlocked()) return;
            if (isEndpointInFlight('gameScore')) return;
            if (isEndpointFresh('gameScore', GAME_SCORE_TTL_MS)) return;
            postMessage({ type: 'IRIS_GAME_SCORE_FETCH' });
        },

        handleRegionScoreRequest(msg: IRISMessage): void {
            const { lat, lng } = msg as { lat: number; lng: number };
            if (isSessionBlocked()) return;

            const latE6 = Math.round(lat * 1e6);
            const lngE6 = Math.round(lng * 1e6);
            const requestKey = `${latE6}:${lngE6}`;

            if (isEndpointInFlight('regionScore')) return;
            if (requestKey === lastRegionScoreRequestKey && isEndpointFresh('regionScore', REGION_SCORE_TTL_MS)) {
                return;
            }

            lastRegionScoreRequestKey = requestKey;
            postMessage({
                type: 'IRIS_REGION_SCORE_FETCH',
                latE6,
                lngE6,
            });
        },

        handlePortalDetailsRequest(msg: IRISMessage): void {
            postMessage({
                type: 'IRIS_PORTAL_DETAILS_FETCH',
                guid: msg.guid as string,
            });
        },

        handleCommSendRequest(msg: IRISMessage): void {
            const text = String(msg.text ?? '').trim();
            const tab = String(msg.tab ?? '').toLowerCase();
            if (!text) return;

            if (tab === 'alerts') {
                useStore.getState().setCommSendError('Alerts is read-only. Switch to ALL or FACTION to send.');
                return;
            }
            if (isSessionBlocked()) {
                useStore.getState().setCommSendError('Intel sign-in required before COMM send can continue.');
                return;
            }
            if (useStore.getState().commSendStatus === 'sending') return;

            const { lat, lng } = useStore.getState().mapState;
            useStore.getState().setCommSendPending();
            postMessage({
                type: 'IRIS_COMM_SEND_FETCH',
                text,
                tab,
                latE6: Math.round(lat * 1e6),
                lngE6: Math.round(lng * 1e6),
            });
        },

        handlePasscodeRedeemRequest(msg: IRISMessage): void {
            const passcode = String(msg.passcode ?? '').trim();
            if (!passcode) return;

            if (isSessionBlocked()) {
                useStore.getState().setPasscodeRedeemError('Intel sign-in required before passcode redemption can continue.');
                return;
            }

            if (useStore.getState().passcodeRedeemStatus === 'sending') return;

            useStore.getState().setPasscodeRedeemPending();
            postMessage({
                type: 'IRIS_PASSCODE_REDEEM_FETCH',
                passcode,
            });
        },

        handleCommSendSuccess(msg: IRISMessage): void {
            useStore.getState().setCommSendSuccess();
            const currentTab = String(msg.tab ?? '').toUpperCase();
            const latestTimestamp = useStore.getState().plexts
                .filter((p) => {
                    if (currentTab === 'FACTION') return p.categories === 2;
                    if (currentTab === 'ALERTS') return p.categories === 4;
                    return p.categories === 1 || p.categories === 2;
                })
                .reduce((max, p) => Math.max(max, p.time), -1);
            postPlextFetches({
                tab: msg.tab,
                minTimestampMs: latestTimestamp,
                ascendingTimestampOrder: latestTimestamp >= 0,
            }, true);
        },

        handleMissionDetailsRequest(msg: IRISMessage): void {
            postMessage({
                type: 'IRIS_MISSION_DETAILS_FETCH',
                guid: msg.guid as string,
            });
        },

        handleMissionsRequest(): void {
            const store = useStore.getState();
            const missionsPortalId = store.missionsPortalId;

            if (missionsPortalId) {
                postMessage({
                    type: 'IRIS_TOP_MISSIONS_FOR_PORTAL_FETCH',
                    guid: missionsPortalId,
                });
                return;
            }

            const bounds = store.mapState.bounds;
            if (!bounds) return;

            postMessage({
                type: 'IRIS_TOP_MISSIONS_IN_BOUNDS_FETCH',
                minLatE6: bounds.minLatE6,
                minLngE6: bounds.minLngE6,
                maxLatE6: bounds.maxLatE6,
                maxLngE6: bounds.maxLngE6,
            });
        },

        handlePlextsRequest(msg: IRISMessage): void {
            postPlextFetches(msg, false);
        },

        onRequestStart(url: string): void {
            if (url.includes('getPlexts')) {
                lastPlextRequestTime = Date.now();
            }
        },

        onPlextsDataReceived(time?: number): void {
            if (typeof time === 'number') {
                lastPlextRequestTime = time;
            } else {
                lastPlextRequestTime = Date.now();
            }
        },
    };
}
