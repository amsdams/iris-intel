(function() {
    console.log('IRIS POC: Interceptor initializing...');
    const isIrisUrl = (url) => url.includes('getEntities') || url.includes('getPortalDetails') || url.includes('getPlexts') || url.includes('getGameScore') || url.includes('getRegionScoreDetails') || url.includes('getHasActiveSubscription') || url.includes('getInventory');
    
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

    function readPlayerStats() {
        const p = window.PLAYER;
        if (!p || !p.nickname) return null;
        return {
            type: 'IRIS_PLAYER_STATS',
            nickname: p.nickname,
            level: parseInt(String(p.verified_level || p.level), 10),
            ap: parseInt(String(p.ap), 10),
            team: p.team === 'RESISTANCE' ? 'R' : (p.team === 'ENLIGHTENED' ? 'E' : 'N'),
            energy: parseInt(String(p.energy), 10),
            xm_capacity: parseInt(String(p.xm_capacity), 10),
            available_invites: parseInt(String(p.available_invites), 10),
            min_ap_for_current_level: parseInt(String(p.min_ap_for_current_level), 10),
            min_ap_for_next_level: parseInt(String(p.min_ap_for_next_level), 10),
            hasActiveSubscription: p.hasActiveSubscription ?? false
        };
    }

    let lastStatsKey = '';
    function postPlayerStats() {
        const stats = readPlayerStats();
        if (!stats) return;
        const key = JSON.stringify(stats);
        if (key === lastStatsKey) return;
        lastStatsKey = key;
        window.postMessage(stats, '*');
    }

    // Monitor for player changes
    const observer = new MutationObserver(() => postPlayerStats());
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    setTimeout(postPlayerStats, 1000);

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
                try {
                    const data = JSON.parse(this.responseText);
                    window.postMessage({ type: 'IRIS_DATA', url: this._url, data: data, params: body }, '*');
                } catch (e) {
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
            try {
                const cloned = response.clone();
                const data = await cloned.json();
                window.postMessage({ type: 'IRIS_DATA', url, data: data, params: init?.body }, '*');
            } catch (e) {
            }
        }
        return response;
    };

    // 3. Hook Maps (Google and Leaflet)
    function hookMaps() {
        // Google Maps
        if (window.google && window.google.maps && window.google.maps.Map && !window._iris_intel_map_hooked) {
            const OriginalMap = window.google.maps.Map;
            window.google.maps.Map = function(el, opts) {
                const map = new OriginalMap(el, opts);
                window._iris_intel_map = map;
                window._iris_map_type = 'gmaps';
                return map;
            };
            window.google.maps.Map.prototype = OriginalMap.prototype;
            window._iris_intel_map_hooked = true;
            console.log('IRIS POC: Google Maps Hooked');
        }
        
        // Leaflet (IITC)
        if (!window._iris_intel_map) {
            const mapEl = document.getElementById('map_canvas');
            if (mapEl) {
                const keys = Object.keys(mapEl);
                const k = keys.find(k => k.startsWith('__leaflet_map'));
                if (k) {
                    window._iris_intel_map = mapEl[k];
                    window._iris_map_type = 'leaflet';
                    console.log('IRIS POC: Leaflet Map Found');
                }
            }
        }

        if (!window._iris_intel_map) {
            setTimeout(hookMaps, 1000);
        }
    }
    hookMaps();

    // 4. Handle sync messages from 3D Map
    window.addEventListener('message', (e) => {
        const msg = e.data;
        if (!msg) return;

        if (msg.type === 'IRIS_SYNC_INTEL_MAP' && window._iris_intel_map) {
            const { lat, lng, zoom } = msg;
            if (window._iris_map_type === 'gmaps') {
                window._iris_intel_map.setCenter({ lat, lng });
                window._iris_intel_map.setZoom(zoom);
            } else if (window._iris_map_type === 'leaflet') {
                window._iris_intel_map.setView([lat, lng], zoom, { animate: false });
            }
        } else if (msg.type === 'IRIS_PORTAL_DETAILS_REQUEST') {
            const guid = msg.guid;
            const url = '/r/getPortalDetails';
            const body = JSON.stringify({ guid, v: extractVersion() });
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: body
            }).then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                window.postMessage({ type: 'IRIS_DATA', url, data: data, params: body }, '*');
            }).catch(e => console.error('IRIS POC: Detail Fetch Failed', e));
        } else if (msg.type === 'IRIS_GAME_SCORE_REQUEST') {
            const url = '/r/getGameScore';
            const body = JSON.stringify({ v: extractVersion() });
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: body
            }).then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                window.postMessage({ type: 'IRIS_DATA', url, data: data, params: body }, '*');
            }).catch(e => console.error('IRIS POC: Game Score Fetch Failed', e));
        } else if (msg.type === 'IRIS_REGION_SCORE_REQUEST') {
            const url = '/r/getRegionScoreDetails';
            const body = JSON.stringify({ v: extractVersion() });
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: body
            }).then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                window.postMessage({ type: 'IRIS_DATA', url, data: data, params: body }, '*');
            }).catch(e => console.error('IRIS POC: Region Score Fetch Failed', e));
        } else if (msg.type === 'IRIS_SUBSCRIPTION_REQUEST') {
            const url = '/r/getHasActiveSubscription';
            const body = JSON.stringify({ v: extractVersion() });
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: body
            }).then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                window.postMessage({ type: 'IRIS_DATA', url, data: data, params: body }, '*');
            }).catch(e => console.error('IRIS POC: Subscription Fetch Failed', e));
        } else if (msg.type === 'IRIS_INVENTORY_REQUEST') {
            const url = '/r/getInventory';
            const body = JSON.stringify({ lastQueryTimestamp: -1, v: extractVersion() });
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: body
            }).then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                window.postMessage({ type: 'IRIS_DATA', url, data: data, params: body }, '*');
            }).catch(e => console.error('IRIS POC: Inventory Fetch Failed', e));
        } else if (msg.type === 'IRIS_PLEXTS_REQUEST') {
            const { tab, minTimestampMs } = msg;
            const url = '/r/getPlexts';
            const body = JSON.stringify({ 
                tab, 
                minTimestampMs, 
                maxTimestampMs: -1,
                ascendingTimestampMs: true,
                v: extractVersion() 
            });
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: body
            }).then(async (res) => {
                if (!res.ok) return;
                const data = await res.json();
                window.postMessage({ type: 'IRIS_DATA', url, data: data, params: body }, '*');
            }).catch(e => console.error('IRIS POC: Plext Fetch Failed', e));
        }
    });

    console.log('IRIS POC: Web-Accessible Interceptor Fully Active');
})();
