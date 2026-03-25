/**
 * Injected into the page's main world at document_start.
 *
 * Responsibilities:
 * - Hook google.maps.Map constructor to capture Intel's map instance
 * - Patch XHR prototype to intercept getEntities / getPortalDetails responses
 * - Wrap fetch for the same endpoints
 * - Handle map movement and portal detail requests from the content script
 */
(function () {
    "use strict";

    // ---------------------------------------------------------------------------
    // State & Helpers
    // ---------------------------------------------------------------------------

    let intelMap: any = null;
    let intelVersion: string = '';

    const getCsrfToken = (): string => {
        const cookies = document.cookie.split(';').map(c => c.trim());
        const csrfCookie = cookies.find(c => c.startsWith('csrftoken='));
        if (!csrfCookie) return '';
        const idx = csrfCookie.indexOf('=');
        return csrfCookie.slice(idx + 1);
    };

    const isIrisUrl = (url: string) =>
        url.includes('getEntities') ||
        url.includes('getPortalDetails') ||
        url.includes('getPlexts') ||
        url.includes('getGameScore') ||
        url.includes('getRegionScoreDetails');

    // ---------------------------------------------------------------------------
    // Google Maps constructor hook
    // Captures the map instance when Niantic creates it so we can call
    // setCenter / setZoom to keep Intel in sync with MapLibre.
    // ---------------------------------------------------------------------------

    const hookGoogleMaps = () => {
        if ((window as any).google?.maps?.Map) {
            if ((window as any).google.maps.Map._iris_patched) return;
            const OrigMap = (window as any).google.maps.Map;

            (window as any).google.maps.Map = function (...args: any[]) {
                const instance = new OrigMap(...args);
                intelMap = instance;
                return instance;
            };

            // Preserve prototype so instanceof checks pass
            (window as any).google.maps.Map.prototype = OrigMap.prototype;
            (window as any).google.maps.Map._iris_patched = true;
        } else {
            // google.maps not ready yet — poll until it is
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if ((window as any).google?.maps?.Map) {
                    clearInterval(interval);
                    hookGoogleMaps();
                }
                if (attempts > 100) {
                    clearInterval(interval);
                    console.warn('IRIS: Google Maps constructor not found');
                }
            }, 200);
        }
    };

    const readPlayerStats = () => {
        const P = (window as any).PLAYER;
        if (!P) return;

        const nickname = P.nickname;
        const level = parseInt(String(P.verified_level || P.level), 10);
        const ap = parseInt(String(P.ap), 10);
        const team = P.team === 'RESISTANCE' ? 'R' : (P.team === 'ENLIGHTENED' ? 'E' : 'N');
        const energy = parseInt(String(P.energy), 10);
        const xm_capacity = parseInt(String(P.xm_capacity), 10);
        const available_invites = parseInt(String(P.available_invites), 10);
        const min_ap_for_current_level = parseInt(String(P.min_ap_for_current_level), 10);
        const min_ap_for_next_level = parseInt(String(P.min_ap_for_next_level), 10);

        if (nickname) {
            window.postMessage({
                type: 'IRIS_PLAYER_STATS',
                nickname,
                level,
                ap,
                team,
                energy,
                xm_capacity,
                available_invites,
                min_ap_for_current_level,
                min_ap_for_next_level
            }, '*');
        }
    };

    const checkLogin = () => {
        // If PLAYER object exists and has a nickname, we are logged in
        if ((window as any).PLAYER?.nickname) {
            return;
        }

        // Check for common login buttons or elements on Intel's landing/login page
        // Standard Intel login button often has id="google_login" or class="button_link"
        const loginBtn = document.querySelector('a[href*="/login"], a[href*="signin"], #login-container, .login-button, #google_login, .button_link');
        if (loginBtn || !(window as any).PLAYER) {
            window.postMessage({ type: 'IRIS_LOGIN_REQUIRED' }, '*');
        }
    };

    // Retry checkLogin periodically if not logged in yet
    // This helps if the UI listener isn't ready yet or the page loads slowly
    const loginCheckInterval = setInterval(() => {
        if ((window as any).PLAYER?.nickname) {
            clearInterval(loginCheckInterval);
            return;
        }
        checkLogin();
    }, 2000);

    // Use MutationObserver to track player stats availability and updates (REL-1)
    const statsObserver = new MutationObserver(() => {
        if (document.querySelector('.player_nickname')) {
            readPlayerStats();
            // Don't disconnect, as we want to capture updates if the DOM is rebuilt
        }
        checkLogin();
    });
    statsObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
    });
    // Also try initial read
    readPlayerStats();
    checkLogin();

    // Read Intel's stored map position from cookies
// Intel saves lat/lng/zoom in cookies so the map reopens at the same location
    const getIntelPositionFromCookies = (): { lat: number; lng: number; zoom: number } | null => {
        const cookies = Object.fromEntries(
            document.cookie.split(';').map(c => {
                const trimmed = c.trim();
                const idx = trimmed.indexOf('=');
                if (idx === -1) return [trimmed, ''];
                return [trimmed.slice(0, idx), trimmed.slice(idx + 1)];
            })
        );
        const lat = parseFloat(cookies['ingress.intelmap.lat']);
        const lng = parseFloat(cookies['ingress.intelmap.lng']);
        const zoom = parseInt(cookies['ingress.intelmap.zoom'], 10);
        if (isNaN(lat) || isNaN(lng) || isNaN(zoom)) return null;
        return { lat, lng, zoom };
    };

// Broadcast initial position as soon as interceptor loads
    const initialPosition = getIntelPositionFromCookies();
    if (initialPosition) {
        window.postMessage(
            { type: 'IRIS_INITIAL_POSITION', ...initialPosition },
            '*'
        );
    }

    hookGoogleMaps();

    // ---------------------------------------------------------------------------
    // XHR prototype patching
    // ---------------------------------------------------------------------------

    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        async: boolean = true,
        user?: string | null,
        password?: string | null
    ) {
        (this as any)._iris_url = typeof url === 'string' ? url : url.toString();
        return origOpen.apply(this, arguments as any);
    };

    XMLHttpRequest.prototype.send = function (
        body?: Document | XMLHttpRequestBodyInit | null
    ) {
        const url: string = (this as any)._iris_url || '';

        if (isIrisUrl(url)) {
            window.postMessage({ type: 'IRIS_REQUEST_START', url }, '*');
        }

        if (body && url.includes('/r/')) {
            try {
                const requestData = JSON.parse(body as string);

                // Capture version token from the first Intel API request that has one
                if (requestData.v && !intelVersion) {
                    intelVersion = requestData.v;
                }

                // Broadcast tile keys so the content script can track Intel zoom level
                if (url.includes('/r/getEntities') && requestData?.tileKeys?.length > 0) {
                    window.postMessage(
                        {type: 'IRIS_TILE_REQUEST', tileKeys: requestData.tileKeys},
                        '*'
                    );
                }
            } catch (e) {
                // body is not JSON — ignore
            }
        }

        this.addEventListener('load', function (this: XMLHttpRequest) {
            const url: string = (this as any)._iris_url || '';
            if (isIrisUrl(url)) {
                window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
                if (this.status === 200) {
                    window.postMessage({
                        type: 'IRIS_REQUEST_SUCCESS',
                        url,
                        time: Date.now()
                    }, '*');
                } else if (this.status !== 200) {
                    window.postMessage({
                        type: 'IRIS_REQUEST_FAILED',
                        url,
                        status: this.status,
                        statusText: this.statusText,
                        time: Date.now()
                    }, '*');
                }
            }

            if (this.status !== 200) return;

            if (isIrisUrl(url)) {
                try {
                    const response = JSON.parse(this.responseText);
                    window.postMessage(
                        {type: 'IRIS_DATA', url, data: response},
                        '*'
                    );
                } catch (e) {
                    console.error('IRIS: Failed to parse XHR response', e);
                }
            }
        }, { once: true });

        this.addEventListener('error', function (this: XMLHttpRequest) {
            const url: string = (this as any)._iris_url || '';
            if (isIrisUrl(url)) {
                window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
                window.postMessage({
                    type: 'IRIS_REQUEST_FAILED',
                    url,
                    status: this.status,
                    statusText: this.statusText || 'Network Error',
                    time: Date.now()
                }, '*');
            }
        }, { once: true });

        return origSend.apply(this, arguments as any);
    };

    // ---------------------------------------------------------------------------
    // Fetch interception
    // ---------------------------------------------------------------------------

    const originalFetch = window.fetch;

    window.fetch = async (...args): Promise<Response> => {
        const url =
            typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        const isIntelApi = isIrisUrl(url);

        if (isIntelApi) {
            window.postMessage({ type: 'IRIS_REQUEST_START', url }, '*');
        }

        // Capture version token from fetch body if not already captured
        if (!intelVersion && url.includes('/r/')) {
            const options = args[1];
            if (options?.body) {
                try {
                    // Only try to parse if it's a string to avoid consuming Stream
                    if (typeof options.body === 'string') {
                        const requestData = JSON.parse(options.body);
                        if (requestData.v) {
                            intelVersion = requestData.v;
                        }
                    }
                } catch (e) {
                    // Ignore
                }
            }
        }

        try {
            const response = await originalFetch(...args);

            if (!response.ok && isIntelApi) {
                window.postMessage({
                    type: 'IRIS_REQUEST_FAILED',
                    url,
                    status: response.status,
                    statusText: response.statusText,
                    time: Date.now()
                }, '*');
            }

            if (response.ok && isIntelApi) {
                window.postMessage({
                    type: 'IRIS_REQUEST_SUCCESS',
                    url,
                    time: Date.now()
                }, '*');
                try {
                    const data = await response.clone().json();
                    window.postMessage({type: 'IRIS_DATA', url, data}, '*');
                } catch (e) {
                    console.error('IRIS: Failed to parse fetch response', e);
                }
            }

            return response;
        } catch (e: any) {
            if (isIntelApi) {
                window.postMessage({
                    type: 'IRIS_REQUEST_FAILED',
                    url,
                    status: 0,
                    statusText: e.message || 'Network Error',
                    time: Date.now()
                }, '*');
            }
            throw e;
        } finally {
            if (isIntelApi) {
                window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
            }
        }
    };

    // ---------------------------------------------------------------------------
    // Message handler
    // ---------------------------------------------------------------------------

    window.addEventListener('message', (event) => {
        if (event.origin !== location.origin) return;
        if (!event.data?.type) return;

        switch (event.data.type) {

            // Move Intel's map to match MapLibre position
            case 'IRIS_MOVE_MAP_INTERNAL': {
                if (!intelMap) break;
                const {center, zoom} = event.data;
                try {
                    intelMap.setCenter({lat: center.lat, lng: center.lng});
                    intelMap.setZoom(zoom);
                } catch (e) {
                    console.error('IRIS: Failed to move Intel map', e);
                }
                break;
            }

            // Fetch full portal details for a given guid
            case 'IRIS_PORTAL_DETAILS_FETCH': {
                const {guid} = event.data;

                if (!intelVersion) {
                    console.warn('IRIS: Version token not yet captured');
                    break;
                }

                const csrfToken = getCsrfToken();
                if (!csrfToken) {
                    console.warn('IRIS: CSRF token not found in cookies');
                    break;
                }

                const req = new XMLHttpRequest();
                req.open('POST', '/r/getPortalDetails', true);
                req.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                req.setRequestHeader('X-CSRFToken', csrfToken);
                req.addEventListener('load', function () {
                    if (this.status === 200) {
                        try {
                            const data = JSON.parse(this.responseText);
                            window.postMessage({
                                type: 'IRIS_DATA',
                                url: '/r/getPortalDetails',
                                data,
                                params: {guid},
                            }, '*');
                        } catch (e) {
                            console.error('IRIS: Failed to parse getPortalDetails response', e);
                        }
                    } else {
                        console.error('IRIS: getPortalDetails failed with status', this.status);
                    }
                }, { once: true });
                req.send(JSON.stringify({guid, v: intelVersion}));
                break;
            }

            // Fetch COMM plexts for current map bounds
            case 'IRIS_PLEXTS_FETCH': {
                if (!intelMap || !intelVersion) {
                    console.warn('IRIS: Map or version not ready for plext fetch');
                    break;
                }

                const csrfToken = getCsrfToken();
                if (!csrfToken) {
                    console.warn('IRIS: CSRF token not found');
                    break;
                }

                const bounds = intelMap.getBounds();
                const ne = bounds.getNorthEast();
                const sw = bounds.getSouthWest();

                const payload = {
                    v: intelVersion,
                    tab: event.data.tab || 'all',
                    minLatE6: Math.round(sw.lat() * 1e6),
                    maxLatE6: Math.round(ne.lat() * 1e6),
                    minLngE6: Math.round(sw.lng() * 1e6),
                    maxLngE6: Math.round(ne.lng() * 1e6),
                    minTimestampMs: event.data.minTimestampMs || -1,
                    maxTimestampMs: -1,
                    ascendingTimestampOrder: true
                };

                const req = new XMLHttpRequest();
                req.open('POST', '/r/getPlexts', true);
                req.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                req.setRequestHeader('X-CSRFToken', csrfToken);
                req.addEventListener('load', function() {
                    if (this.status === 200) {
                        try {
                            const data = JSON.parse(this.responseText);
                            window.postMessage({ type: 'IRIS_DATA', url: '/r/getPlexts', data }, '*');
                        } catch (e) {
                            console.error('IRIS: Failed to parse getPlexts response', e);
                        }
                    }
                }, { once: true });
                req.send(JSON.stringify(payload));
                break;
            }

            // Fetch Global Game Score
            case 'IRIS_GAME_SCORE_FETCH': {
                if (!intelVersion) break;

                const csrfToken = getCsrfToken();
                if (!csrfToken) break;

                const req = new XMLHttpRequest();
                req.open('POST', '/r/getGameScore', true);
                req.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                req.setRequestHeader('X-CSRFToken', csrfToken);
                req.addEventListener('load', function() {
                    if (this.status === 200) {
                        try {
                            const data = JSON.parse(this.responseText);
                            window.postMessage({ type: 'IRIS_DATA', url: '/r/getGameScore', data }, '*');
                        } catch (e) {
                            console.error('IRIS: Failed to parse getGameScore response', e);
                        }
                    }
                }, { once: true });
                req.send(JSON.stringify({v: intelVersion}));
                break;
            }

            // Fetch Region Score Details
            case 'IRIS_REGION_SCORE_FETCH': {
                if (!intelVersion) break;

                const csrfToken = getCsrfToken();
                if (!csrfToken) break;

                const { latE6, lngE6 } = event.data;
                const req = new XMLHttpRequest();
                req.open('POST', '/r/getRegionScoreDetails', true);
                req.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                req.setRequestHeader('X-CSRFToken', csrfToken);
                req.addEventListener('load', function() {
                    if (this.status === 200) {
                        try {
                            const data = JSON.parse(this.responseText);
                            window.postMessage({ type: 'IRIS_DATA', url: '/r/getRegionScoreDetails', data }, '*');
                        } catch (e) {
                            console.error('IRIS: Failed to parse getRegionScoreDetails response', e);
                        }
                    }
                }, { once: true });
                req.send(JSON.stringify({ v: intelVersion, latE6, lngE6 }));
                break;
            }

            case 'IRIS_LOGIN_REQUEST': {
                const loginBtn = document.querySelector('a[href*="/login"], #login-container a, .login-button') as HTMLElement;
                if (loginBtn) {
                    loginBtn.click();
                } else {
                    // Fallback to manual redirect if button click doesn't work
                    window.location.href = '/login';
                }
                break;
            }

            default:
                break;
        }
    });

    // ---------------------------------------------------------------------------
    // JS Error Tracking
    // ---------------------------------------------------------------------------

    window.addEventListener('error', (event) => {
        window.postMessage({
            type: 'IRIS_JS_ERROR',
            message: event.message,
            source: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            time: Date.now()
        }, '*');
    });

    window.addEventListener('unhandledrejection', (event) => {
        window.postMessage({
            type: 'IRIS_JS_ERROR',
            message: `Unhandled Promise: ${event.reason?.message || event.reason}`,
            time: Date.now()
        }, '*');
    });

    console.log('IRIS: Interceptor ready');
})();
