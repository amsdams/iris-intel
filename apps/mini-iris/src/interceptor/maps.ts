/**
 * Hooks into Google Maps and Leaflet to synchronize map movements.
 */
export function installMapHooks(): void {
    const win = window as WindowWithIntelMaps;

    function hookMaps(): void {
        // 1. Google Maps
        if (win.google?.maps?.Map && !win._iris_intel_map_hooked) {
            const OriginalMap = win.google.maps.Map;
            const WrappedMap = function(this: GoogleMapLike, el: HTMLElement, opts?: GoogleMapOptions): GoogleMapLike {
                const map = new OriginalMap(el, opts);
                win._iris_intel_map = map;
                win._iris_map_type = 'gmaps';
                return map;
            } as unknown as GoogleMapConstructor;
            WrappedMap.prototype = OriginalMap.prototype;
            win.google.maps.Map = WrappedMap;
            win._iris_intel_map_hooked = true;
            console.log('Mini IRIS: Google Maps Hooked');
        }
        
        // 2. Leaflet (IITC)
        if (!win._iris_intel_map) {
            const mapEl = document.getElementById('map_canvas');
            if (mapEl) {
                const keys = Object.keys(mapEl);
                const k = keys.find(k => k.startsWith('__leaflet_map'));
                if (k) {
                    const maybeMap = (mapEl as HTMLElementWithLeaflet)[k];
                    if (isLeafletMap(maybeMap)) {
                        win._iris_intel_map = maybeMap;
                        win._iris_map_type = 'leaflet';
                        console.log('Mini IRIS: Leaflet Map Found');
                    }
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
        const msg: unknown = e.data;
        if (!isSyncMessage(msg) || !win._iris_intel_map) return;

        const { lat, lng, zoom } = msg;
        if (win._iris_map_type === 'gmaps') {
            if (isGoogleMap(win._iris_intel_map)) {
                win._iris_intel_map.setCenter({ lat, lng });
                win._iris_intel_map.setZoom(zoom);
            }
        } else if (win._iris_map_type === 'leaflet') {
            if (isLeafletMap(win._iris_intel_map)) {
                win._iris_intel_map.setView([lat, lng], zoom, { animate: false });
            }
        }
    });
}

type GoogleMapOptions = Record<string, unknown>;

interface GoogleMapLike {
    setCenter(center: { lat: number; lng: number }): void;
    setZoom(zoom: number): void;
}

interface GoogleMapConstructor {
    new (el: HTMLElement, opts?: GoogleMapOptions): GoogleMapLike;
    prototype: GoogleMapLike;
}

interface LeafletMapLike {
    setView(center: [number, number], zoom: number, options: { animate: boolean }): void;
}

interface WindowWithIntelMaps extends Window {
    google?: {
        maps?: {
            Map?: GoogleMapConstructor;
        };
    };
    _iris_intel_map_hooked?: boolean;
    _iris_intel_map?: GoogleMapLike | LeafletMapLike;
    _iris_map_type?: 'gmaps' | 'leaflet';
}

type HTMLElementWithLeaflet = HTMLElement & Record<string, unknown>;

interface SyncMessage {
    type: 'IRIS_SYNC_INTEL_MAP';
    lat: number;
    lng: number;
    zoom: number;
}

function isSyncMessage(value: unknown): value is SyncMessage {
    return typeof value === 'object'
        && value !== null
        && 'type' in value
        && (value as { type?: unknown }).type === 'IRIS_SYNC_INTEL_MAP'
        && typeof (value as { lat?: unknown }).lat === 'number'
        && typeof (value as { lng?: unknown }).lng === 'number'
        && typeof (value as { zoom?: unknown }).zoom === 'number';
}

function isGoogleMap(value: unknown): value is GoogleMapLike {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { setCenter?: unknown }).setCenter === 'function'
        && typeof (value as { setZoom?: unknown }).setZoom === 'function';
}

function isLeafletMap(value: unknown): value is LeafletMapLike {
    return typeof value === 'object'
        && value !== null
        && typeof (value as { setView?: unknown }).setView === 'function';
}
