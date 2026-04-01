import {
    extractVersionFromDOM,
    getIntelPositionFromCookies,
    hookGoogleMaps,
    InterceptorMessage,
    IntelMapInstance,
    getMissionGuidFromLocation,
    readPlayerStats,
} from './runtime/interceptor-runtime';
import { handleActiveRequestMessage, startActivePolling } from './runtime/active-request-client';
import { installPassiveInterception } from './runtime/passive-interceptor';
import { createSessionRuntime } from './runtime/session-runtime';

/**
 * Injected into the page's main world at document_start.
 *
 * Responsibilities:
 * - bootstrap shared session/runtime state
 * - install passive XHR/fetch interception
 * - route active IRIS-owned request intents
 * - keep page-level glue for map sync and player/mission bootstrap
 */
(function (): void {
    "use strict";

    let intelMap: IntelMapInstance | null = null;
    const runtime = createSessionRuntime(window, document);

    installPassiveInterception(runtime);

    const postPlayerStats = (): void => {
        const payload = readPlayerStats(window);
        if (payload) {
            window.postMessage(payload, '*');
        }
    };

    // Try immediate version capture so active requests can succeed sooner.
    runtime.observeIntelVersion(extractVersionFromDOM(document));

    const statsObserver = new MutationObserver(() => {
        postPlayerStats();
    });
    statsObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
    });
    postPlayerStats();

    const initialPosition = getIntelPositionFromCookies(document);
    if (initialPosition) {
        window.postMessage(
            { type: 'IRIS_INITIAL_POSITION', ...initialPosition },
            '*',
        );
    }

    hookGoogleMaps(window, (mapInstance) => {
        intelMap = mapInstance;
    });

    const postMissionRequestFromLocation = (): void => {
        const missionGuid = getMissionGuidFromLocation(window.location);
        if (!missionGuid) return;

        window.postMessage({
            type: 'IRIS_MISSION_DETAILS_FETCH',
            guid: missionGuid,
        }, '*');
    };

    postMissionRequestFromLocation();
    window.addEventListener('popstate', postMissionRequestFromLocation);

    window.addEventListener('message', (event: MessageEvent) => {
        if (event.origin !== location.origin) return;
        const msg = event.data as InterceptorMessage;
        if (!msg?.type) return;

        switch (msg.type) {
            case 'IRIS_MOVE_MAP_INTERNAL': {
                if (!intelMap) break;
                const { center, zoom } = msg;
                if (center && zoom !== undefined) {
                    try {
                        intelMap.setCenter({ lat: center.lat, lng: center.lng });
                        intelMap.setZoom(zoom);
                    } catch (e) {
                        console.error('IRIS: Failed to move Intel map', e);
                    }
                }
                break;
            }

            default:
                handleActiveRequestMessage(msg, runtime);
                break;
        }
    });

    window.addEventListener('error', (event: ErrorEvent) => {
        window.postMessage({
            type: 'IRIS_JS_ERROR',
            message: event.message,
            source: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            time: Date.now(),
        }, '*');
    });

    startActivePolling(runtime);
})();
