import { getCsrfToken, InterceptorMessage } from './interceptor-runtime';
import type { SessionRuntime } from './session-runtime';

function reportActiveRequestError(domain: string, error: unknown, detail?: string): void {
    const message = error instanceof Error ? error.message : String(error);
    window.postMessage({
        type: 'IRIS_DOMAIN_ERROR',
        domain,
        message,
        detail,
        time: Date.now(),
    }, '*');
}

export function handleActiveRequestMessage(
    msg: InterceptorMessage,
    runtime: SessionRuntime,
): void {
    switch (msg.type) {
        case 'IRIS_ENTITY_REFRESH_GENERATION': {
            if (typeof msg.entityGeneration === 'number') {
                runtime.setLatestEntityGeneration(msg.entityGeneration);
            }
            break;
        }

        case 'IRIS_PLEXTS_FETCH': {
            const { tab, minTimestampMs, maxTimestampMs, ascendingTimestampOrder, minLatE6, maxLatE6, minLngE6, maxLngE6 } = msg;
            runtime.safeIrisFetch('/r/getPlexts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({
                    tab,
                    minTimestampMs,
                    maxTimestampMs,
                    ascendingTimestampOrder,
                    minLatE6,
                    maxLatE6,
                    minLngE6,
                    maxLngE6,
                }),
            }).catch((e) => {
                reportActiveRequestError('request:plexts', e, String(tab ?? 'unknown'));
                console.error('IRIS: Comm fetch failed', e);
            });
            break;
        }

        case 'IRIS_REGION_SCORE_FETCH': {
            const { latE6, lngE6 } = msg;
            runtime.safeIrisFetch('/r/getRegionScoreDetails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ latE6, lngE6 }),
            }).catch((e) => {
                reportActiveRequestError('request:regionScore', e);
                console.error('IRIS: Region score fetch failed', e);
            });
            break;
        }

        case 'IRIS_ENTITIES_FETCH': {
            const tileKeys = Array.isArray(msg.tileKeys) ? msg.tileKeys : [];
            const entityGeneration = typeof msg.entityGeneration === 'number' ? msg.entityGeneration : undefined;
            if (tileKeys.length === 0) {
                break;
            }

            runtime.safeIrisFetch('/r/getEntities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ tileKeys }),
                _iris_active: true,
                _iris_entityGeneration: entityGeneration,
            }).catch((e) => {
                if (e instanceof Error && e.message.startsWith('IRIS: dropped stale entity request generation')) {
                    return;
                }
                reportActiveRequestError('request:entities', e, `tiles: ${tileKeys.length}`);
                console.error('IRIS: Entities fetch failed', e);
            });
            break;
        }

        case 'IRIS_PORTAL_DETAILS_FETCH': {
            const { guid } = msg;
            runtime.safeIrisFetch('/r/getPortalDetails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ guid }),
            }).catch((e) => {
                reportActiveRequestError('request:portalDetails', e, String(guid ?? 'unknown'));
                console.error('IRIS: Portal details fetch failed', e);
            });
            break;
        }

        case 'IRIS_MISSION_DETAILS_FETCH': {
            const { guid } = msg;
            runtime.safeIrisFetch('/r/getMissionDetails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ guid }),
            }).catch((e) => {
                reportActiveRequestError('request:missionDetails', e, String(guid ?? 'unknown'));
                console.error('IRIS: Mission details fetch failed', e);
            });
            break;
        }

        case 'IRIS_TOP_MISSIONS_IN_BOUNDS_FETCH': {
            const { minLatE6, maxLatE6, minLngE6, maxLngE6 } = msg;
            runtime.safeIrisFetch('/r/getTopMissionsInBounds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({
                    northE6: maxLatE6,
                    eastE6: maxLngE6,
                    southE6: minLatE6,
                    westE6: minLngE6,
                }),
            }).catch((e) => {
                reportActiveRequestError('request:topMissionsInBounds', e);
                console.error('IRIS: Top missions in bounds fetch failed', e);
            });
            break;
        }

        case 'IRIS_TOP_MISSIONS_FOR_PORTAL_FETCH': {
            const { guid } = msg;
            runtime.safeIrisFetch('/r/getTopMissionsForPortal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ guid }),
            }).catch((e) => {
                reportActiveRequestError('request:topMissionsForPortal', e, String(guid ?? 'unknown'));
                console.error('IRIS: Top missions for portal fetch failed', e);
            });
            break;
        }

        case 'IRIS_ARTIFACTS_FETCH': {
            runtime.safeIrisFetch('/r/getArtifactPortals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({}),
            }).catch((e: Error) => {
                reportActiveRequestError('request:artifacts', e);
                console.debug('IRIS: artifact fetch failed', e);
            });
            break;
        }

        case 'IRIS_SUBSCRIPTION_FETCH': {
            runtime.safeIrisFetch('/r/getHasActiveSubscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({}),
            }).catch((e: Error) => {
                reportActiveRequestError('request:subscription', e);
                console.debug('IRIS: subscription check failed (expected if not logged in)', e);
            });
            break;
        }

        case 'IRIS_GAME_SCORE_FETCH': {
            runtime.safeIrisFetch('/r/getGameScore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({}),
            }).catch((e: Error) => {
                reportActiveRequestError('request:gameScore', e);
                console.debug('IRIS: game score fetch failed', e);
            });
            break;
        }

        case 'IRIS_INVENTORY_FETCH': {
            const lastQueryTimestamp = typeof msg.lastQueryTimestamp === 'number' ? msg.lastQueryTimestamp : -1;
            runtime.safeIrisFetch('/r/getInventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ lastQueryTimestamp }),
            }).catch((e: Error) => {
                reportActiveRequestError('request:inventory', e);
                console.debug('IRIS: inventory check failed (expected if not C.O.R.E)', e);
            });
            break;
        }

        case 'IRIS_COMM_SEND_FETCH': {
            const { text, tab, latE6, lngE6 } = msg;
            runtime.safeIrisFetch('/r/sendPlext', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({
                    message: text,
                    tab,
                    latE6,
                    lngE6,
                }),
            }).then(async (response) => {
                const bodyText = await response.clone().text();
                if (!response.ok) {
                    window.postMessage({
                        type: 'IRIS_COMM_SEND_FAILED',
                        statusText: response.statusText || 'COMM send failed',
                        status: response.status,
                        tab,
                    }, '*');
                    return;
                }
                if (runtime.isLoginHtmlResponse(bodyText)) {
                    runtime.reportHtmlLoginResponse('/r/sendPlext');
                    window.postMessage({
                        type: 'IRIS_COMM_SEND_FAILED',
                        statusText: 'Intel sign-in required before COMM send can continue.',
                        status: 200,
                        tab,
                    }, '*');
                    return;
                }
                window.postMessage({
                    type: 'IRIS_COMM_SEND_SUCCESS',
                    tab,
                    time: Date.now(),
                }, '*');
            }).catch((e: Error) => {
                reportActiveRequestError('request:sendPlext', e, String(tab ?? 'unknown'));
                window.postMessage({
                    type: 'IRIS_COMM_SEND_FAILED',
                    statusText: e.message || 'COMM send failed',
                    tab,
                    time: Date.now(),
                }, '*');
                console.error('IRIS: COMM send failed', e);
            });
            break;
        }

        case 'IRIS_PASSCODE_REDEEM_FETCH': {
            const { passcode } = msg;
            runtime.safeIrisFetch('/r/redeemReward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ passcode }),
            }).then(async (response) => {
                const bodyText = await response.clone().text();
                if (!response.ok) {
                    window.postMessage({
                        type: 'IRIS_PASSCODE_REDEEM_FAILED',
                        statusText: response.statusText || 'Passcode redemption failed',
                        status: response.status,
                        time: Date.now(),
                    }, '*');
                    return;
                }
                if (runtime.isLoginHtmlResponse(bodyText)) {
                    runtime.reportHtmlLoginResponse('/r/redeemReward');
                    window.postMessage({
                        type: 'IRIS_PASSCODE_REDEEM_FAILED',
                        statusText: 'Intel sign-in required before passcode redemption can continue.',
                        status: 200,
                        time: Date.now(),
                    }, '*');
                }
            }).catch((e: Error) => {
                reportActiveRequestError('request:redeemReward', e);
                window.postMessage({
                    type: 'IRIS_PASSCODE_REDEEM_FAILED',
                    statusText: e.message || 'Passcode redemption failed',
                    time: Date.now(),
                }, '*');
                console.error('IRIS: passcode redemption failed', e);
            });
            break;
        }

        case 'IRIS_GEOLOCATE': {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    window.postMessage({
                        type: 'IRIS_INITIAL_POSITION',
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        zoom: 15,
                    }, '*');
                },
                (err) => {
                    reportActiveRequestError('request:geolocate', err.message || String(err.code));
                    console.warn('IRIS: Geolocation failed', err);
                },
            );
            break;
        }
    }
}
