(function() {
    console.log('IRIS POC: Interceptor initializing...');
    const isIrisUrl = (url) => url.includes('getEntities') || url.includes('getPortalDetails') || url.includes('getPlexts');
    
    function getCsrfToken() {
        const cookies = document.cookie.split(';').map(c => c.trim());
        const csrf = cookies.find(c => c.startsWith('csrftoken='));
        return csrf ? csrf.split('=')[1] : '';
    }

    function extractVersion() {
        const scripts = document.querySelectorAll('script[src*="gen_dashboard_"]');
        for (const s of scripts) {
            const match = s.src.match(/gen_dashboard_([a-f0-9]+)\.js/);
            if (match) return match[1];
        }
        return '';
    }

    // 1. Hook XHR
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;
    XHR.open = function(method, url) {
        this._url = typeof url === 'string' ? url : url.toString();
        return open.apply(this, arguments);
    };
    XHR.send = function(body) {
        this.addEventListener('load', function() {
            if (isIrisUrl(this._url)) {
                console.log('IRIS POC: Intercepted XHR:', this._url);
                try {
                    const data = JSON.parse(this.responseText);
                    window.postMessage({ type: 'IRIS_DATA', url: this._url, data: data, params: body }, '*');
                } catch (e) {
                    console.error('IRIS POC: XHR Parse Error', e);
                }
            }
        });
        return send.apply(this, arguments);
    };

    // 2. Hook Fetch
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
        const response = await originalFetch(input, init);
        if (isIrisUrl(url)) {
            console.log('IRIS POC: Intercepted Fetch:', url);
            try {
                const cloned = response.clone();
                const data = await cloned.json();
                window.postMessage({ type: 'IRIS_DATA', url, data: data, params: init?.body }, '*');
            } catch (e) {
                console.error('IRIS POC: Fetch Parse Error', e);
            }
        }
        return response;
    };

    // 3. Hook Google Maps to allow syncing
    (function hookGMaps() {
        if (window.google && window.google.maps && window.google.maps.Map) {
            const OriginalMap = window.google.maps.Map;
            window.google.maps.Map = function(el, opts) {
                const map = new OriginalMap(el, opts);
                window._iris_intel_map = map;
                console.log('IRIS POC: Intel Map Hooked');
                return map;
            };
            window.google.maps.Map.prototype = OriginalMap.prototype;
        } else {
            setTimeout(hookGMaps, 500);
        }
    })();

    // 4. Handle sync messages from 3D Map
    window.addEventListener('message', (e) => {
        const msg = e.data;
        if (!msg) return;

        if (msg.type === 'IRIS_SYNC_INTEL_MAP' && window._iris_intel_map) {
            const { lat, lng, zoom } = msg;
            window._iris_intel_map.setCenter({ lat, lng });
            window._iris_intel_map.setZoom(zoom);
        } else if (msg.type === 'IRIS_PORTAL_DETAILS_REQUEST') {
            const guid = msg.guid;
            const url = '/r/getPortalDetails';
            const body = JSON.stringify({ guid, v: extractVersion() });
            
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: body
            }).then(async (res) => {
                const data = await res.json();
                window.postMessage({ type: 'IRIS_DATA', url, data, params: body }, '*');
            }).catch(e => console.error('IRIS POC: Detail Fetch Failed', e));
        }
    });

    console.log('IRIS POC: Web-Accessible Interceptor Fully Active');
})();
