/**
 * Hooks into Google Maps and Leaflet to synchronize map movements.
 */
export function installMapHooks(): void {
    const win = window as WindowWithIntelMaps;
    let hookAttempts = 0;

    function hookMaps(): void {
        // 1. Google Maps
        const maps = win.google?.maps;
        const OriginalMap = maps?.Map;
        if (OriginalMap && !OriginalMap._iris_patched) {
            const WrappedMap = function(this: unknown, ...args: unknown[]): GoogleMapLike {
                const map = new OriginalMap(...args);
                win._iris_intel_map = map;
                win._iris_map_type = 'gmaps';
                return map;
            } as unknown as GoogleMapConstructor;
            WrappedMap.prototype = OriginalMap.prototype;
            WrappedMap._iris_patched = true;
            maps.Map = WrappedMap;
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
            hookAttempts += 1;
            if (hookAttempts <= 100) {
                setTimeout(hookMaps, 200);
            } else {
                console.warn('Mini IRIS: Intel map was not found after hook retries');
            }
        }
    }

    hookMaps();

    // Handle sync messages from the 3D Map
    window.addEventListener('message', (e) => {
        const msg: unknown = e.data;
        if (!isSyncMessage(msg)) return;
        if (!win._iris_intel_map) {
            console.warn('Mini IRIS: Intel map sync ignored; map not found');
            return;
        }

        const { lat, lng, zoom, refresh } = msg;
        const center = { lat, lng };
        const refreshCenter = { lat: lat + 0.00025, lng };
        console.log(`Mini IRIS: Intel map sync ${win._iris_map_type ?? 'unknown'} refresh=${refresh === true}`);
        if (win._iris_map_type === 'gmaps') {
            if (isGoogleMap(win._iris_intel_map)) {
                if (refresh) {
                    win._iris_intel_map.setCenter(refreshCenter);
                    win.setTimeout(() => {
                        if (isGoogleMap(win._iris_intel_map)) {
                            win._iris_intel_map.setCenter(center);
                            win._iris_intel_map.setZoom(zoom);
                        }
                    }, 80);
                    return;
                }
                win._iris_intel_map.setCenter(center);
                win._iris_intel_map.setZoom(zoom);
            }
        } else if (win._iris_map_type === 'leaflet') {
            if (isLeafletMap(win._iris_intel_map)) {
                if (refresh) {
                    win._iris_intel_map.setView([refreshCenter.lat, refreshCenter.lng], zoom, { animate: false });
                    win.setTimeout(() => {
                        if (isLeafletMap(win._iris_intel_map)) {
                            win._iris_intel_map.setView([lat, lng], zoom, { animate: false });
                        }
                    }, 80);
                    return;
                }
                win._iris_intel_map.setView([lat, lng], zoom, { animate: false });
            }
        }
    });
}

interface GoogleMapLike {
    setCenter(center: { lat: number; lng: number }): void;
    setZoom(zoom: number): void;
}

interface GoogleMapConstructor {
    new (...args: unknown[]): GoogleMapLike;
    prototype: GoogleMapLike;
    _iris_patched?: boolean;
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
    refresh?: boolean;
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
