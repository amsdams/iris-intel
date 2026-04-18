import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import RBush from 'rbush';

// RBush expects objects with minX, minY, maxX, maxY properties
interface PortalIndexItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    id: string;
    lng: number;
    lat: number;
}

console.log("POC (TS): Hybrid Interaction (Native -> RBush Fallback) Loaded");

function initMap() {
    const spatialIndex = new RBush<PortalIndexItem>();
    const features: any[] = [];

    // Mock Data: 5000 portals
    for (let i = 0; i < 5000; i++) {
        const lng = (Math.random() - 0.5) * 0.1;
        const lat = (Math.random() - 0.5) * 0.1;
        const id = `PORTAL-${i}`;

        spatialIndex.insert({ minX: lng, minY: lat, maxX: lng, maxY: lat, id, lng, lat });
        features.push({
            type: 'Feature',
            id: i,
            geometry: { type: 'Point', coordinates: [lng, lat] },
            properties: { id, name: `Portal ${i}` }
        });
    }

    const container = document.createElement('div');
    container.id = 'map-poc-container';
    container.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        z-index: 999999; background: black; touch-action: none;
    `;
    document.body.appendChild(container);

    // FIXED: Use position: fixed for the log and higher z-index
    const log = document.createElement('div');
    log.id = 'map-poc-log';
    log.style.cssText = `
        position: fixed; 
        bottom: 20px; 
        left: 20px; 
        right: 20px; 
        height: 180px;
        background: rgba(0, 0, 0, 0.85); 
        color: #00ff00; 
        overflow-y: auto;
        z-index: 2000000; 
        font-family: monospace; 
        padding: 10px;
        pointer-events: none; 
        font-size: 11px; 
        border: 2px solid #00ff00; 
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(0,255,0,0.5);
    `;
    document.body.appendChild(log);

    function logEvent(msg: string) {
        const entry = document.createElement('div');
        entry.style.marginBottom = '4px';
        entry.style.borderBottom = '1px solid #222';
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        log.prepend(entry);
        console.log("POC-LOG:", msg);
    }

    const map = new maplibregl.Map({
        container: container,
        style: {
            version: 8,
            sources: {
                'osm': {
                    type: 'raster',
                    tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
                    tileSize: 256,
                    attribution: '&copy; CARTO'
                },
                'points': {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: features }
                }
            },
            layers: [
                { id: 'osm', type: 'raster', source: 'osm' },
                { 
                    id: 'portals', type: 'circle', source: 'points', 
                    paint: { 
                        'circle-radius': 15, 'circle-color': '#00ffff',
                        'circle-stroke-width': 1, 'circle-stroke-color': '#fff'
                    } 
                }
            ]
        },
        center: [0, 0], zoom: 14, dragPan: true, touchZoomRotate: true
    });

    map.on('load', () => {
        logEvent(`Map ready. Strategy: Native -> RBush Fallback.`);
    });

    let startPoint = { x: 0, y: 0 };
    let hasMoved = false;

    map.on('touchstart', (e) => {
        if (e.points && e.points.length === 1) {
            startPoint = { x: e.points[0].x, y: e.points[0].y };
            hasMoved = false;
        }
    });

    map.on('touchmove', (e) => {
        if (e.points && e.points.length === 1) {
            const dx = e.points[0].x - startPoint.x;
            const dy = e.points[0].y - startPoint.y;
            if (Math.sqrt(dx * dx + dy * dy) > 10) hasMoved = true;
        }
    });

    function handleInteraction(point: { x: number, y: number }) {
        const startTime = performance.now();
        let hitType = 'NONE';
        let portalId = null;

        // --- STEP 1: TRY NATIVE (Layer-Scoped Query) ---
        try {
            const box: [maplibregl.PointLike, maplibregl.PointLike] = [
                [point.x - 10, point.y - 10],
                [point.x + 10, point.y + 10]
            ];
            const features = map.queryRenderedFeatures(box, { layers: ['portals'] });
            
            if (features && features.length > 0) {
                portalId = features[0].properties?.id;
                hitType = 'NATIVE';
            }
        } catch (err: any) {
            logEvent(`NATIVE BLOCKED: ${err.message || 'Security Error'}`);
        }

        // --- STEP 2: FALLBACK TO RBUSH (If Native failed or missed) ---
        if (!portalId) {
            const p1 = map.unproject([point.x - 24, point.y - 24]);
            const p2 = map.unproject([point.x + 24, point.y + 24]);
            
            const candidates = spatialIndex.search({
                minX: Math.min(p1.lng, p2.lng),
                minY: Math.min(p1.lat, p2.lat),
                maxX: Math.max(p1.lng, p2.lng),
                maxY: Math.max(p1.lat, p2.lat)
            });

            let minPixelDist = 30;
            for (const c of candidates) {
                const pos = map.project([c.lng, c.lat]);
                const dx = pos.x - point.x;
                const dy = pos.y - point.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minPixelDist) {
                    minPixelDist = dist;
                    portalId = c.id;
                    hitType = 'RBUSH';
                }
            }
        }

        const duration = (performance.now() - startTime).toFixed(2);
        if (portalId) {
            logEvent(`${hitType} SUCCESS: ${portalId} (${duration}ms)`);
        } else {
            logEvent(`MISS (${duration}ms)`);
        }
    }

    map.on('click', (e) => handleInteraction(e.point));
    map.on('touchend', () => { if (!hasMoved) handleInteraction(startPoint); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMap);
else initMap();
