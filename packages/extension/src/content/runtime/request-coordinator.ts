import { useStore } from '@iris/core';
import { IRISMessage } from './message-types';

const PLEXT_COOLDOWN_MS = 5000;
const AUXILIARY_POLL_MS = 60000;

export interface RequestCoordinator {
    start: () => void;
    stop: () => void;
    handleMoveMap: (msg: IRISMessage) => void;
    handleGeolocateRequest: () => void;
    handleInventoryRequest: () => void;
    handleGameScoreRequest: () => void;
    handleRegionScoreRequest: (msg: IRISMessage) => void;
    handlePortalDetailsRequest: (msg: IRISMessage) => void;
    handleMissionDetailsRequest: (msg: IRISMessage) => void;
    handleMissionsRequest: () => void;
    handlePlextsRequest: (msg: IRISMessage) => void;
    onRequestStart: (url: string) => void;
    onPlextsDataReceived: (time?: number) => void;
}

export function createRequestCoordinator(): RequestCoordinator {
    let lastPlextRequestTime = 0;
    let auxiliaryPollId: number | null = null;

    const postMessage = (message: Record<string, unknown>): void => {
        window.postMessage(message, '*');
    };

    const isSessionExpired = (): boolean => useStore.getState().sessionStatus === 'expired';

    const scheduleAuxiliaryFetches = (): void => {
        if (isSessionExpired()) return;

        postMessage({ type: 'IRIS_ARTIFACTS_FETCH' });
        postMessage({ type: 'IRIS_SUBSCRIPTION_FETCH' });
        postMessage({ type: 'IRIS_INVENTORY_FETCH', lastQueryTimestamp: -1 });
    };

    return {
        start(): void {
            if (auxiliaryPollId !== null) return;
            auxiliaryPollId = window.setInterval(scheduleAuxiliaryFetches, AUXILIARY_POLL_MS);
        },

        stop(): void {
            if (auxiliaryPollId !== null) {
                window.clearInterval(auxiliaryPollId);
                auxiliaryPollId = null;
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
            this.handlePlextsRequest({ type: 'IRIS_PLEXTS_REQUEST', minTimestampMs: -1 });
        },

        handleGeolocateRequest(): void {
            postMessage({ type: 'IRIS_GEOLOCATE' });
        },

        handleInventoryRequest(): void {
            postMessage({ type: 'IRIS_INVENTORY_FETCH', lastQueryTimestamp: -1 });
        },

        handleGameScoreRequest(): void {
            postMessage({ type: 'IRIS_GAME_SCORE_FETCH' });
        },

        handleRegionScoreRequest(msg: IRISMessage): void {
            const { lat, lng } = msg as { lat: number; lng: number };
            postMessage({
                type: 'IRIS_REGION_SCORE_FETCH',
                latE6: Math.round(lat * 1e6),
                lngE6: Math.round(lng * 1e6),
            });
        },

        handlePortalDetailsRequest(msg: IRISMessage): void {
            postMessage({
                type: 'IRIS_PORTAL_DETAILS_FETCH',
                guid: msg.guid as string,
            });
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
            if (isSessionExpired()) return;

            const now = Date.now();
            if (now - lastPlextRequestTime < PLEXT_COOLDOWN_MS) {
                return;
            }
            lastPlextRequestTime = now;

            const requestedTab = msg.tab;
            const minTimestampMs = msg.minTimestampMs ?? -1;
            const maxTimestampMs = msg.maxTimestampMs ?? -1;
            const ascendingTimestampOrder = msg.ascendingTimestampOrder ?? false;
            const bounds = useStore.getState().mapState.bounds;

            if (!bounds) return;

            const basePayload = {
                minTimestampMs,
                maxTimestampMs,
                ascendingTimestampOrder,
                ...bounds,
            };

            if (requestedTab) {
                postMessage({
                    type: 'IRIS_PLEXTS_FETCH',
                    tab: requestedTab,
                    ...basePayload,
                });

                if (requestedTab === 'alerts') {
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
