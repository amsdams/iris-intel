import { getCsrfToken, InterceptorMessage } from './interceptor-runtime';
import type { SessionRuntime } from './session-runtime';

export function handleActiveRequestMessage(
    msg: InterceptorMessage,
    runtime: SessionRuntime,
): void {
    switch (msg.type) {
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
            }).catch((e) => console.error('IRIS: Comm fetch failed', e));
            break;
        }

        case 'IRIS_REGION_SCORE_FETCH': {
            const { latE6, lngE6 } = msg;
            runtime.safeIrisFetch('/r/getRegionScoreDetails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ latE6, lngE6 }),
            }).catch((e) => console.error('IRIS: Region score fetch failed', e));
            break;
        }

        case 'IRIS_PORTAL_DETAILS_FETCH': {
            const { guid } = msg;
            runtime.safeIrisFetch('/r/getPortalDetails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ guid }),
            }).catch((e) => console.error('IRIS: Portal details fetch failed', e));
            break;
        }

        case 'IRIS_MISSION_DETAILS_FETCH': {
            const { guid } = msg;
            runtime.safeIrisFetch('/r/getMissionDetails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ guid }),
            }).catch((e) => console.error('IRIS: Mission details fetch failed', e));
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
            }).catch((e) => console.error('IRIS: Top missions in bounds fetch failed', e));
            break;
        }

        case 'IRIS_TOP_MISSIONS_FOR_PORTAL_FETCH': {
            const { guid } = msg;
            runtime.safeIrisFetch('/r/getTopMissionsForPortal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                body: JSON.stringify({ guid }),
            }).catch((e) => console.error('IRIS: Top missions for portal fetch failed', e));
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
                (err) => console.warn('IRIS: Geolocation failed', err),
            );
            break;
        }
    }
}

export function startActivePolling(runtime: SessionRuntime): number {
    return window.setInterval(() => {
        if (runtime.isSessionExpired()) return;

        runtime.safeIrisFetch('/r/getArtifactPortals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
            body: JSON.stringify({}),
        }).catch((e: Error) => console.debug('IRIS: artifact fetch failed', e));

        runtime.safeIrisFetch('/r/getHasActiveSubscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
            body: JSON.stringify({}),
        }).catch((e: Error) => console.debug('IRIS: subscription check failed (expected if not logged in)', e));

        runtime.safeIrisFetch('/r/getInventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
            body: JSON.stringify({ lastQueryTimestamp: -1 }),
        }).catch((e: Error) => console.debug('IRIS: inventory check failed (expected if not C.O.R.E)', e));
    }, 60000);
}
