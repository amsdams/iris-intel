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

    let intelMap: { setCenter: (c: { lat: number; lng: number }) => void; setZoom: (z: number) => void } | null = null;
    let intelVersion = '';
    
    // Try to extract version from DOM if available
    const extractVersionFromDOM = (): void => {
        const scripts = document.querySelectorAll('script[src*="gen_dashboard_"]');
        for (const s of scripts) {
            const src = (s as HTMLScriptElement).src;
            const match = src.match(/gen_dashboard_([a-f0-9]+)\.js/);
            if (match) {
                intelVersion = match[1];
                break;
            }
        }
    };
    extractVersionFromDOM();
    // Also watch for script tag insertion if not found yet
    if (!intelVersion) {
        const observer = new MutationObserver(() => {
            if (!intelVersion) extractVersionFromDOM();
            if (intelVersion) observer.disconnect();
        });
        observer.observe(document.head || document.documentElement, { childList: true, subtree: true });
    }

    const getCsrfToken = (): string => {
        const cookies = document.cookie.split(';').map(c => c.trim());
        const csrfCookie = cookies.find(c => c.startsWith('csrftoken='));
        if (!csrfCookie) return '';
        const idx = csrfCookie.indexOf('=');
        return csrfCookie.slice(idx + 1);
    };

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
                if (!intelVersion) extractVersionFromDOM();
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

    const isIrisUrl = (url: string): boolean =>
        url.includes('getEntities') ||
        url.includes('getPortalDetails') ||
        url.includes('getPlexts') ||
        url.includes('getGameScore') ||
        url.includes('getRegionScoreDetails') ||
        url.includes('getInventory') ||
        url.includes('getHasActiveSubscription');

    // ---------------------------------------------------------------------------
    // Google Maps constructor hook
    // Captures the map instance when Niantic creates it so we can call
    // setCenter / setZoom to keep Intel in sync with MapLibre.
    // ---------------------------------------------------------------------------

    interface GoogleMap {
        _iris_patched?: boolean;
        prototype: unknown;
        new (...args: unknown[]): { setCenter: (c: { lat: number; lng: number }) => void; setZoom: (z: number) => void };
    }

    const hookGoogleMaps = (): void => {
        const win = window as unknown as { google?: { maps?: { Map: GoogleMap } } };
        if (win.google?.maps?.Map) {
            if (win.google.maps.Map._iris_patched) return;
            const OrigMap = win.google.maps.Map;

            win.google.maps.Map = function (this: unknown, ...args: unknown[]) {
                const instance = new (OrigMap as unknown as new (...args: unknown[]) => { setCenter: (c: { lat: number; lng: number }) => void; setZoom: (z: number) => void })(...args);
                intelMap = instance;
                return instance;
            } as unknown as GoogleMap;

            // Preserve prototype so instanceof checks pass
            win.google.maps.Map.prototype = OrigMap.prototype;
            win.google.maps.Map._iris_patched = true;
        } else {
            // google.maps not ready yet — poll until it is
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                const winPoll = window as unknown as { google?: { maps?: { Map: GoogleMap } } };
                if (winPoll.google?.maps?.Map) {
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

    interface IntelPlayer {
        nickname: string;
        level: number;
        verified_level?: number;
        ap: number;
        team: string;
        energy: number;
        xm_capacity: number;
        available_invites: number;
        min_ap_for_current_level: number;
        min_ap_for_next_level: number;
        hasActiveSubscription: boolean;
    }

    const readPlayerStats = (): void => {
        const P = (window as unknown as { PLAYER?: IntelPlayer }).PLAYER;
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
        const hasActiveSubscription = !!P.hasActiveSubscription;

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
                min_ap_for_next_level,
                hasActiveSubscription
            }, '*');
        }
    };

    // Use MutationObserver to track player stats availability and updates (REL-1)
    const statsObserver = new MutationObserver(() => {
        if ((window as unknown as { PLAYER?: IntelPlayer }).PLAYER?.nickname) {
            readPlayerStats();
        }
    });
    statsObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
    });
    // Also try initial read
    readPlayerStats();

    // Read Intel's stored map position from cookies
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

    const originalOpen = XMLHttpRequest.prototype.open;
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
            originalOpen.apply(this, [method, url]);
        } else {
            originalOpen.apply(this, [method, url, async, user, password]);
        }
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequestAugmented, body: Document | XMLHttpRequestBodyInit | null | undefined): void {
        const url = this._iris_url || '';

        // Proactively sniff version from outgoing request body
        if (body && typeof body === 'string' && !intelVersion) {
            try {
                const parsed = JSON.parse(body) as { v?: string };
                if (parsed.v) intelVersion = parsed.v;
            } catch { /* silent */ }
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
        if (init?.body && typeof init.body === 'string' && !intelVersion) {
            try {
                const parsed = JSON.parse(init.body) as { v?: string };
                if (parsed.v) intelVersion = parsed.v;
            } catch { /* silent */ }
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
        const msg = event.data as { 
            type: string; 
            center?: { lat: number; lng: number }; 
            zoom?: number; 
            tab?: string; 
            minTimestampMs?: number; 
            maxTimestampMs?: number; 
            ascendingTimestampOrder?: boolean; 
            latE6?: number; 
            lngE6?: number; 
            guid?: string;
            minLatE6?: number;
            maxLatE6?: number;
            minLngE6?: number;
            maxLngE6?: number;
        };
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
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
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
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                    body: JSON.stringify({ latE6, lngE6 })
                }).catch(e => console.error('IRIS: Region score fetch failed', e));
                break;
            }

            case 'IRIS_PORTAL_DETAILS_FETCH': {
                const { guid } = msg;
                safeIrisFetch('/r/getPortalDetails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
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
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({})
        }).catch((e: Error) => console.debug('IRIS: subscription check failed (expected if not logged in)', e));

        // Check inventory if subscribed
        safeIrisFetch('/r/getInventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({ lastQueryTimestamp: -1 })
        }).catch((e: Error) => console.debug('IRIS: inventory check failed (expected if not C.O.R.E)', e));
        
    }, 60000); // Once a minute

})();
