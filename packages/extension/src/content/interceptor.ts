import {
    extractVersionFromDOM,
    getCsrfToken,
    getIntelPositionFromCookies,
    hookGoogleMaps,
    InterceptorMessage,
    IntelMapInstance,
    isIrisUrl,
    readPlayerStats,
    sniffVersionFromBody,
} from './interceptor-helpers';

/**
 * Injected into the page's main world at document_start.
 *
 * Responsibilities:
 * - Hook google.maps.Map constructor to capture Intel's map instance
 * - Patch XHR prototype to intercept getEntities / getPortalDetails responses
 * - Wrap fetch for the same endpoints
 * - Handle map movement and portal detail requests from the content script
 */
(function (): void {
    "use strict";

    // ---------------------------------------------------------------------------
    // State & Helpers
    // ---------------------------------------------------------------------------

    let intelMap: IntelMapInstance | null = null;
    let intelVersion = '';
    
    intelVersion = extractVersionFromDOM(document) ?? '';
    if (!intelVersion) {
        const observer = new MutationObserver(() => {
            if (!intelVersion) {
                intelVersion = extractVersionFromDOM(document) ?? '';
            }
            if (intelVersion) observer.disconnect();
        });
        observer.observe(document.head || document.documentElement, { childList: true, subtree: true });
    }

    /**
     * IRIS-triggered requests need the version (v) to be accepted by Intel.
     * Since IRIS may trigger very early (document_start), we wait up to 10s for the version.
     */
    const safeIrisFetch = async (url: string, options: RequestInit): Promise<Response> => {
        // Double check niantic_params if version is still missing
        if (!intelVersion) {
            const win = window as unknown as { niantic_params?: { version: string } };
            if (win.niantic_params?.version) intelVersion = win.niantic_params.version;
        }

        if (!intelVersion) {
            console.warn(`IRIS: Waiting for version before fetching ${url}...`);
            let attempts = 0;
            while (!intelVersion && attempts < 20) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
                // Re-check DOM too
                if (!intelVersion) intelVersion = extractVersionFromDOM(document) ?? '';
            }
        }

        if (!intelVersion) {
            console.error(`IRIS: Failed to capture version after timeout. Request to ${url} may fail.`);
        }

        const body = JSON.parse(options.body as string) as Record<string, unknown>;
        body.v = intelVersion;
        options.body = JSON.stringify(body);

        return fetch(url, options);
    };
    const postPlayerStats = (): void => {
        const payload = readPlayerStats(window);
        if (payload) {
            window.postMessage(payload, '*');
        }
    };

    // Use MutationObserver to track player stats availability and updates (REL-1)
    const statsObserver = new MutationObserver(() => {
        postPlayerStats();
    });
    statsObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
    });
    // Also try initial read
    postPlayerStats();

    // Broadcast initial position as soon as interceptor loads
    const initialPosition = getIntelPositionFromCookies(document);
    if (initialPosition) {
        window.postMessage(
            { type: 'IRIS_INITIAL_POSITION', ...initialPosition },
            '*'
        );
    }

    hookGoogleMaps(window, (mapInstance) => {
        intelMap = mapInstance;
    });

    // ---------------------------------------------------------------------------
    // XHR prototype patching
    // ---------------------------------------------------------------------------

    const originalOpen = XMLHttpRequest.prototype.open as (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async?: boolean,
        user?: string | null,
        password?: string | null
    ) => void;
    const originalSend = XMLHttpRequest.prototype.send;

    interface XMLHttpRequestAugmented extends XMLHttpRequest {
        _iris_url?: string;
    }

    XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequestAugmented,
        method: string,
        url: string | URL,
        async?: boolean,
        user?: string | null,
        password?: string | null
    ): void {
        this._iris_url = typeof url === 'string' ? url : url.toString();
        if (async === undefined) {
            originalOpen.call(this, method, url);
        } else {
            originalOpen.call(this, method, url, async, user, password);
        }
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequestAugmented, body: Document | XMLHttpRequestBodyInit | null | undefined): void {
        const url = this._iris_url || '';

        // Proactively sniff version from outgoing request body
        if (!intelVersion) {
            const sniffedVersion = sniffVersionFromBody(body);
            if (sniffedVersion) intelVersion = sniffedVersion;
        }

        if (isIrisUrl(url)) {
            // Log that a request started
            window.postMessage({ type: 'IRIS_REQUEST_START', url }, '*');

            // Set up response listener
            this.addEventListener('load', function (this: XMLHttpRequestAugmented) {
                window.postMessage({ type: 'IRIS_REQUEST_SUCCESS', url, time: Date.now() }, '*');
                try {
                    const data = JSON.parse(this.responseText) as { v?: string };
                    window.postMessage({ type: 'IRIS_DATA', url, data, params: body }, '*');

                    // Capture intel version if found in results
                    if (data.v && data.v !== intelVersion) {
                        intelVersion = data.v;
                    }
                } catch (e) {
                    console.error('IRIS: Interceptor failed to parse JSON', e, url);
                } finally {
                    window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
                }
            });

            this.addEventListener('error', function (this: XMLHttpRequestAugmented) {
                window.postMessage({
                    type: 'IRIS_REQUEST_FAILED',
                    url,
                    status: this.status,
                    statusText: this.statusText,
                    time: Date.now()
                }, '*');
                window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
            });
        } else if (url.includes('/r/')) {
            // Passive version extraction for Intel's own requests
            this.addEventListener('load', function (this: XMLHttpRequestAugmented) {
                try {
                    const data = JSON.parse(this.responseText) as { v?: string };
                    if (data.v && data.v !== intelVersion) {
                        intelVersion = data.v;
                    }
                } catch { /* silent — common for non-JSON or partials */ }
            });
        }

        originalSend.apply(this, [body]);
    };

    // ---------------------------------------------------------------------------
    // Fetch wrap
    // ---------------------------------------------------------------------------

    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);

        // Proactively sniff version from outgoing request body
        if (!intelVersion) {
            const sniffedVersion = sniffVersionFromBody(init?.body);
            if (sniffedVersion) intelVersion = sniffedVersion;
        }

        if (isIrisUrl(url)) {
            window.postMessage({ type: 'IRIS_REQUEST_START', url }, '*');
            try {
                const response = await originalFetch(input, init);
                const cloned = response.clone();
                cloned.json().then((data: { v?: string }) => {
                    window.postMessage({ type: 'IRIS_REQUEST_SUCCESS', url, time: Date.now() }, '*');
                    window.postMessage({ type: 'IRIS_DATA', url, data, params: init?.body }, '*');
                    if (data.v && data.v !== intelVersion) intelVersion = data.v;
                }).catch((e: Error) => console.error('IRIS: Fetch wrap failed to parse JSON', e));
                return response;
            } catch (e) {
                window.postMessage({
                    type: 'IRIS_REQUEST_FAILED',
                    url,
                    status: 0,
                    statusText: (e as Error).message,
                    time: Date.now()
                }, '*');
                throw e;
            } finally {
                window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
            }
        } else if (url.includes('/r/')) {
            // Passive version extraction for Intel's own requests
            try {
                const response = await originalFetch(input, init);
                const cloned = response.clone();
                cloned.json().then((data: { v?: string }) => {
                    if (data.v && data.v !== intelVersion) intelVersion = data.v;
                }).catch((): undefined => undefined);
                return response;
            } catch {
                return originalFetch(input, init);
            }
        }
        return originalFetch(input, init);
    };

    // ---------------------------------------------------------------------------
    // Message handler
    // ---------------------------------------------------------------------------

    window.addEventListener('message', (event: MessageEvent) => {
        if (event.origin !== location.origin) return;
        const msg = event.data as InterceptorMessage;
        if (!msg?.type) return;

        switch (msg.type) {

            // Move Intel's map to match MapLibre position
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

            // Trigger Comm fetch
            case 'IRIS_PLEXTS_FETCH': {
                const { tab, minTimestampMs, maxTimestampMs, ascendingTimestampOrder, minLatE6, maxLatE6, minLngE6, maxLngE6 } = msg;
                safeIrisFetch('/r/getPlexts', {
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
                        maxLngE6
                    })
                }).catch(e => console.error('IRIS: Comm fetch failed', e));
                break;
            }

            case 'IRIS_REGION_SCORE_FETCH': {
                const { latE6, lngE6 } = msg;
                safeIrisFetch('/r/getRegionScoreDetails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                    body: JSON.stringify({ latE6, lngE6 })
                }).catch(e => console.error('IRIS: Region score fetch failed', e));
                break;
            }

            case 'IRIS_PORTAL_DETAILS_FETCH': {
                const { guid } = msg;
                safeIrisFetch('/r/getPortalDetails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
                    body: JSON.stringify({ guid })
                }).catch(e => console.error('IRIS: Portal details fetch failed', e));
                break;
            }

            case 'IRIS_GEOLOCATE': {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        window.postMessage({
                            type: 'IRIS_INITIAL_POSITION',
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            zoom: 15
                        }, '*');
                    },
                    (err) => console.warn('IRIS: Geolocation failed', err)
                );
                break;
            }
        }
    });

    // Handle JS errors
    window.addEventListener('error', (event: ErrorEvent) => {
        window.postMessage({
            type: 'IRIS_JS_ERROR',
            message: event.message,
            source: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            time: Date.now()
        }, '*');
    });

    // Proactive background checks for subscription and inventory
    setInterval(() => {
        // Check subscription
        safeIrisFetch('/r/getHasActiveSubscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
            body: JSON.stringify({})
        }).catch((e: Error) => console.debug('IRIS: subscription check failed (expected if not logged in)', e));

        // Check inventory if subscribed
        safeIrisFetch('/r/getInventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken(document) },
            body: JSON.stringify({ lastQueryTimestamp: -1 })
        }).catch((e: Error) => console.debug('IRIS: inventory check failed (expected if not C.O.R.E)', e));
        
    }, 60000); // Once a minute

})();
