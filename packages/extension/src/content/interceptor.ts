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

    // ---------------------------------------------------------------------------
    // State
    // ---------------------------------------------------------------------------

    let intelMap: any = null;
    let intelVersion: string = '';

    // ---------------------------------------------------------------------------
    // Google Maps constructor hook
    // Captures the map instance when Niantic creates it so we can call
    // setCenter / setZoom to keep Intel in sync with MapLibre.
    // ---------------------------------------------------------------------------

    const hookGoogleMaps = () => {
        if ((window as any).google?.maps?.Map) {
            const OrigMap = (window as any).google.maps.Map;

            (window as any).google.maps.Map = function (...args: any[]) {
                const instance = new OrigMap(...args);
                intelMap = instance;
                return instance;
            };

            // Preserve prototype so instanceof checks pass
            (window as any).google.maps.Map.prototype = OrigMap.prototype;
        } else {
            // google.maps not ready yet — poll until it is
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if ((window as any).google?.maps?.Map) {
                    clearInterval(interval);
                    hookGoogleMaps();
                }
                if (attempts > 50) {
                    clearInterval(interval);
                    console.warn('ITTCA: Google Maps constructor not found');
                }
            }, 100);
        }
    };

    const readPlayerStats = () => {
        const nickname = document.querySelector('.player_nickname')?.textContent?.trim();
        const level = document.querySelector('#player_level')?.textContent?.trim();
        const ap = document.querySelector('.number')?.textContent?.trim()?.replace(/,/g, '');
        const teamEl = document.querySelector('#player_stats .RESISTANCE, #player_stats .ENLIGHTENED');
        const team = teamEl?.classList.contains('RESISTANCE') ? 'R' : 'E';

        if (nickname) {
            window.postMessage({
                type: 'ITTCA_PLAYER_STATS',
                nickname,
                level: level ? parseInt(level, 10) : null,
                ap: ap ? parseInt(ap, 10) : null,
                team,
            }, '*');
        }
    };

// Intel renders player stats asynchronously — poll until available
    let statsAttempts = 0;
    const statsInterval = setInterval(() => {
        statsAttempts++;
        readPlayerStats();
        if (document.querySelector('.player_nickname') || statsAttempts > 30) {
            clearInterval(statsInterval);
        }
    }, 300);

    // Read Intel's stored map position from cookies
// Intel saves lat/lng/zoom in cookies so the map reopens at the same location
    const getIntelPositionFromCookies = (): { lat: number; lng: number; zoom: number } | null => {
        const cookies = Object.fromEntries(
            document.cookie.split(';').map(c => {
                const [k, v] = c.trim().split('=');
                return [k, v];
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
            { type: 'ITTCA_INITIAL_POSITION', ...initialPosition },
            '*'
        );
    }

    hookGoogleMaps();
    getIntelPositionFromCookies();

    // ---------------------------------------------------------------------------
    // XHR prototype patching
    // Prototype patching (not subclassing) is required because Intel's internal
    // code captures a reference to XMLHttpRequest before our script runs.
    // Patching the prototype mutates the object Intel already holds a reference to.
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
        (this as any)._ittca_url = typeof url === 'string' ? url : url.toString();
        return origOpen.apply(this, arguments as any);
    };

    XMLHttpRequest.prototype.send = function (
        body?: Document | XMLHttpRequestBodyInit | null
    ) {
        const url: string = (this as any)._ittca_url || '';

        if (body && url.includes('/r/')) {
            try {
                const requestData = JSON.parse(body as string);

                // Capture version token from the first Intel API request that has one
                if (requestData.v && !intelVersion) {
                    intelVersion = requestData.v;
                }

                // Broadcast tile keys so the content script can track Intel zoom level
                if (url.includes('/r/getEntities') && requestData.tileKeys?.length > 0) {
                    window.postMessage(
                        {type: 'ITTCA_TILE_REQUEST', tileKeys: requestData.tileKeys},
                        '*'
                    );
                }
            } catch (e) {
                // body is not JSON — ignore
            }
        }

        this.addEventListener('load', function (this: XMLHttpRequest) {
            if (this.status !== 200) return;
            const url: string = (this as any)._ittca_url || '';

            if (
                url.includes('/r/getEntities') ||
                url.includes('/r/getPortalDetails')
            ) {
                try {
                    const response = JSON.parse(this.responseText);
                    window.postMessage(
                        {type: 'ITTCA_DATA', url, data: response},
                        '*'
                    );
                } catch (e) {
                    console.error('ITTCA: Failed to parse XHR response', e);
                }
            }
        });

        return origSend.apply(this, arguments as any);
    };

    // ---------------------------------------------------------------------------
    // Fetch interception
    // ---------------------------------------------------------------------------

    const originalFetch = window.fetch;

    window.fetch = async (...args): Promise<Response> => {
        const response = await originalFetch(...args);
        const url =
            typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

        if (
            response.ok &&
            (url.includes('/r/getEntities') || url.includes('/r/getPortalDetails'))
        ) {
            try {
                const data = await response.clone().json();
                window.postMessage({type: 'ITTCA_DATA', url, data}, '*');
            } catch (e) {
                console.error('ITTCA: Failed to parse fetch response', e);
            }
        }

        return response;
    };

    // ---------------------------------------------------------------------------
    // Message handler
    // Receives messages from the content script (isolated world) and acts on them
    // in the main world where Intel's map and cookies are accessible.
    // ---------------------------------------------------------------------------

    const getCsrfToken = (): string =>
        document.cookie
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith('csrftoken='))
            ?.split('=')[1] || '';

    window.addEventListener('message', (event) => {
        if (!event.data?.type) return;

        switch (event.data.type) {

            // Move Intel's map to match MapLibre position
            case 'ITTCA_MOVE_MAP_INTERNAL': {
                if (!intelMap) break;
                const {center, zoom} = event.data;
                try {
                    intelMap.setCenter({lat: center.lat, lng: center.lng});
                    intelMap.setZoom(zoom);
                } catch (e) {
                    console.error('ITTCA: Failed to move Intel map', e);
                }
                break;
            }

            // Fetch full portal details for a given guid
            case 'ITTCA_PORTAL_DETAILS_FETCH': {
                const {guid} = event.data;

                if (!intelVersion) {
                    console.warn('ITTCA: Version token not yet captured');
                    break;
                }

                const csrfToken = getCsrfToken();
                if (!csrfToken) {
                    console.warn('ITTCA: CSRF token not found in cookies');
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
                                type: 'ITTCA_DATA',
                                url: '/r/getPortalDetails',
                                data,
                                params: {guid},
                            }, '*');
                        } catch (e) {
                            console.error('ITTCA: Failed to parse getPortalDetails response', e);
                        }
                    } else {
                        console.error('ITTCA: getPortalDetails failed with status', this.status);
                    }
                });
                req.send(JSON.stringify({guid, v: intelVersion}));
                break;
            }

            default:
                break;
        }
    });

    console.log('ITTCA: Interceptor ready');
})();