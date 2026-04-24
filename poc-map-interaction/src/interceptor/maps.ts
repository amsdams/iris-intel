/**
 * Hooks into Google Maps and Leaflet to synchronize map movements.
 */
export function installMapHooks(): void {
    const win = window as any;

    function hookMaps() {
        // 1. Google Maps
        if (win.google && win.google.maps && win.google.maps.Map && !win._iris_intel_map_hooked) {
            const OriginalMap = win.google.maps.Map;
            win.google.maps.Map = function(this: any, el: HTMLElement, opts: any) {
                const map = new OriginalMap(el, opts);
                win._iris_intel_map = map;
                win._iris_map_type = 'gmaps';
                return map;
            } as any;
            win.google.maps.Map.prototype = OriginalMap.prototype;
            win._iris_intel_map_hooked = true;
            console.log('IRIS POC: Google Maps Hooked');
        }
        
        // 2. Leaflet (IITC)
        if (!win._iris_intel_map) {
            const mapEl = document.getElementById('map_canvas');
            if (mapEl) {
                const keys = Object.keys(mapEl);
                const k = keys.find(k => k.startsWith('__leaflet_map'));
                if (k) {
                    win._iris_intel_map = (mapEl as any)[k];
                    win._iris_map_type = 'leaflet';
                    console.log('IRIS POC: Leaflet Map Found');
                }
            }
        }

        // Keep trying until we find a map
        if (!win._iris_intel_map) {
            setTimeout(hookMaps, 1000);
        }
    }

    hookMaps();

    // Handle sync messages from the 3D Map
    window.addEventListener('message', (e) => {
        const msg = e.data;
        if (!msg || msg.type !== 'IRIS_SYNC_INTEL_MAP' || !win._iris_intel_map) return;

        const { lat, lng, zoom } = msg;
        if (win._iris_map_type === 'gmaps') {
            win._iris_intel_map.setCenter({ lat, lng });
            win._iris_intel_map.setZoom(zoom);
        } else if (win._iris_map_type === 'leaflet') {
            win._iris_intel_map.setView([lat, lng], zoom, { animate: false });
        }
    });
}
