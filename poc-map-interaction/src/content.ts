import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import RBush from 'rbush';

type EntityType = 'portal' | 'link' | 'field';
type Faction = 'ENL' | 'RES' | 'NEU';

interface MapEntityIndexItem {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    id: string;
    type: EntityType;
    faction: Faction;
    data: any;
}

console.log("POC (TS): Guaranteed Non-Crossing Faction Fans Loaded");

function initMap() {
    const spatialIndex = new RBush<MapEntityIndexItem>();
    const features: any[] = [];

    const COLORS = {
        ENL: '#00ff00',
        RES: '#0000ff',
        NEU: '#ffffff'
    };

    function generateFactionNetwork(faction: Faction, centerLng: number, count: number) {
        const factionPortals: {id: string, lng: number, lat: number}[] = [];
        
        // 1. Generate Portals
        for (let i = 0; i < count; i++) {
            const lng = centerLng + (Math.random() - 0.5) * 0.03;
            const lat = (Math.random() - 0.5) * 0.03;
            const id = `${faction}-P-${i}`;
            factionPortals.push({id, lng, lat});
            
            spatialIndex.insert({ minX: lng, minY: lat, maxX: lng, maxY: lat, id, type: 'portal', faction, data: { lng, lat } });
            features.push({
                type: 'Feature', id: `p-${id}`,
                geometry: { type: 'Point', coordinates: [lng, lat] },
                properties: { id, type: 'portal', faction }
            });
        }

        if (factionPortals.length < 3) return;

        // 2. NON-CROSSING STRATEGY: TRIANGLE FAN
        // Pick the leftmost portal as the anchor
        factionPortals.sort((a, b) => a.lng - b.lng);
        const anchor = factionPortals[0];
        const others = factionPortals.slice(1);

        // Sort others by angle relative to anchor
        others.sort((a, b) => {
            const angleA = Math.atan2(a.lat - anchor.lat, a.lng - anchor.lng);
            const angleB = Math.atan2(b.lat - anchor.lat, b.lng - anchor.lng);
            return angleA - angleB;
        });

        // 3. Create Links and Fields (The Fan)
        for (let i = 0; i < others.length; i++) {
            const pCurrent = others[i];
            
            // Link from Anchor to Current
            const lAnchorId = `${faction}-L-ANCHOR-${pCurrent.id}`;
            spatialIndex.insert({
                minX: Math.min(anchor.lng, pCurrent.lng), minY: Math.min(anchor.lat, pCurrent.lat),
                maxX: Math.max(anchor.lng, pCurrent.lng), maxY: Math.max(anchor.lat, pCurrent.lat),
                id: lAnchorId, type: 'link', faction, data: { coords: [[anchor.lng, anchor.lat], [pCurrent.lng, pCurrent.lat]] }
            });
            features.push({
                type: 'Feature', id: `l-${lAnchorId}`,
                geometry: { type: 'LineString', coordinates: [[anchor.lng, anchor.lat], [pCurrent.lng, pCurrent.lat]] },
                properties: { id: lAnchorId, type: 'link', faction }
            });

            // If we have a next point, create a link between them and a field
            if (i < others.length - 1) {
                const pNext = others[i + 1];
                
                // Link between neighbors
                const lEdgeId = `${faction}-L-EDGE-${pCurrent.id}-${pNext.id}`;
                spatialIndex.insert({
                    minX: Math.min(pCurrent.lng, pNext.lng), minY: Math.min(pCurrent.lat, pNext.lat),
                    maxX: Math.max(pCurrent.lng, pNext.lng), maxY: Math.max(pCurrent.lat, pNext.lat),
                    id: lEdgeId, type: 'link', faction, data: { coords: [[pCurrent.lng, pCurrent.lat], [pNext.lng, pNext.lat]] }
                });
                features.push({
                    type: 'Feature', id: `l-${lEdgeId}`,
                    geometry: { type: 'LineString', coordinates: [[pCurrent.lng, pCurrent.lat], [pNext.lng, pNext.lat]] },
                    properties: { id: lEdgeId, type: 'link', faction }
                });

                // Field (Triangle: Anchor -> Current -> Next)
                const fid = `${faction}-F-${i}`;
                const polyCoords = [[anchor.lng, anchor.lat], [pCurrent.lng, pCurrent.lat], [pNext.lng, pNext.lat], [anchor.lng, anchor.lat]];
                
                spatialIndex.insert({
                    minX: Math.min(anchor.lng, pCurrent.lng, pNext.lng), minY: Math.min(anchor.lat, pCurrent.lat, pNext.lat),
                    maxX: Math.max(anchor.lng, pCurrent.lng, pNext.lng), maxY: Math.max(anchor.lat, pCurrent.lat, pNext.lat),
                    id: fid, type: 'field', faction, data: { coords: polyCoords }
                });
                features.push({
                    type: 'Feature', id: `f-${fid}`,
                    geometry: { type: 'Polygon', coordinates: [polyCoords] },
                    properties: { id: fid, type: 'field', faction }
                });
            }
        }
    }

    // Generate ENL (West) and RES (East)
    generateFactionNetwork('ENL', -0.02, 12);
    generateFactionNetwork('RES', 0.02, 12);

    const container = document.createElement('div');
    container.id = 'map-poc-container';
    container.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999999; background: black; touch-action: none;`;
    document.body.appendChild(container);

    const log = document.createElement('div');
    log.style.cssText = `position: fixed; bottom: 20px; left: 20px; right: 20px; height: 180px; background: rgba(0, 0, 0, 0.85); color: #00ff00; overflow-y: auto; z-index: 2000000; font-family: monospace; padding: 10px; pointer-events: none; font-size: 11px; border: 2px solid #00ff00; border-radius: 4px;`;
    document.body.appendChild(log);

    function logEvent(msg: string, color: string = '#00ff00') {
        const entry = document.createElement('div');
        entry.style.marginBottom = '4px';
        entry.style.borderBottom = '1px solid #222';
        entry.style.color = color;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        log.prepend(entry);
    }

    const map = new maplibregl.Map({
        container: container,
        style: {
            version: 8,
            sources: {
                'osm': { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'], tileSize: 256 },
                'entities': { type: 'geojson', data: { type: 'FeatureCollection', features: features } }
            },
            layers: [
                { id: 'osm', type: 'raster', source: 'osm' },
                { id: 'fields-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'ENL']], paint: { 'fill-color': COLORS.ENL, 'fill-opacity': 0.15 } },
                { id: 'fields-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'RES']], paint: { 'fill-color': COLORS.RES, 'fill-opacity': 0.15 } },
                { id: 'links-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'ENL']], paint: { 'line-color': COLORS.ENL, 'line-width': 1.5 } },
                { id: 'links-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'RES']], paint: { 'line-color': COLORS.RES, 'line-width': 1.5 } },
                { id: 'portals-enl', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'faction', 'ENL']], paint: { 'circle-radius': 6, 'circle-color': COLORS.ENL, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } },
                { id: 'portals-res', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'faction', 'RES']], paint: { 'circle-radius': 6, 'circle-color': COLORS.RES, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } }
            ]
        },
        center: [0, 0], zoom: 14, dragPan: true, touchZoomRotate: true
    });

    // --- HELPER MATH ---
    function isPointInPolygon(point: [number, number], vs: number[][]) {
        const x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i][0], yi = vs[i][1];
            const xj = vs[j][0], yj = vs[j][1];
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    function distToSegment(p: maplibregl.Point, v: maplibregl.Point, w: maplibregl.Point) {
        const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
        if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
    }

    // --- INTERACTION ---
    function handleInteraction(point: { x: number, y: number }) {
        const startTime = performance.now();
        let hit: { id: string, type: string, faction: Faction, method: string } | null = null;

        try {
            const box: [maplibregl.PointLike, maplibregl.PointLike] = [[point.x - 10, point.y - 10], [point.x + 10, point.y + 10]];
            const features = map.queryRenderedFeatures(box, { layers: ['portals-enl', 'portals-res', 'links-enl', 'links-res', 'fields-enl', 'fields-res'] });
            if (features.length > 0) {
                hit = { id: features[0].properties?.id, type: features[0].properties?.type, faction: features[0].properties?.faction, method: 'NATIVE' };
            }
        } catch (e: any) { logEvent(`NATIVE BLOCKED: ${e.message}`, '#ff0000'); }

        if (!hit) {
            const p1 = map.unproject([point.x - 30, point.y - 30]);
            const p2 = map.unproject([point.x + 30, point.y + 30]);
            const candidates = spatialIndex.search({ minX: Math.min(p1.lng, p2.lng), minY: Math.min(p1.lat, p2.lat), maxX: Math.max(p1.lng, p2.lng), maxY: Math.max(p1.lat, p2.lat) });
            const tapLngLat: [number, number] = [map.unproject([point.x, point.y]).lng, map.unproject([point.x, point.y]).lat];
            const tapPoint = new maplibregl.Point(point.x, point.y);

            for (const c of candidates.filter(c => c.type === 'portal')) {
                const pos = map.project([c.data.lng, c.data.lat]);
                if (Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)) < 25) { hit = { id: c.id, type: 'portal', faction: c.faction, method: 'RBUSH' }; break; }
            }
            if (!hit) {
                for (const c of candidates.filter(c => c.type === 'link')) {
                    const v = map.project(c.data.coords[0]), w = map.project(c.data.coords[1]);
                    if (distToSegment(tapPoint, v, w) < 15) { hit = { id: c.id, type: 'link', faction: c.faction, method: 'RBUSH' }; break; }
                }
            }
            if (!hit) {
                for (const c of candidates.filter(c => c.type === 'field')) {
                    if (isPointInPolygon(tapLngLat, c.data.coords)) { hit = { id: c.id, type: 'field', faction: c.faction, method: 'RBUSH' }; break; }
                }
            }
        }

        const duration = performance.now() - startTime;
        if (hit) {
            logEvent(`${hit.method} HIT: ${hit.faction} ${hit.type} ${hit.id} (${duration.toFixed(2)}ms)`, COLORS[hit.faction]);
        } else {
            logEvent(`MISS (${duration.toFixed(2)}ms)`, '#888');
        }
    }

    map.on('click', (e) => handleInteraction(e.point));
    let startPoint = { x: 0, y: 0 }, hasMoved = false;
    map.on('touchstart', (e) => { if (e.points?.length === 1) { startPoint = e.points[0]; hasMoved = false; } });
    map.on('touchmove', (e) => { if (e.points?.length === 1) { const dx = e.points[0].x - startPoint.x, dy = e.points[0].y - startPoint.y; if (Math.sqrt(dx*dx + dy*dy) > 10) hasMoved = true; } });
    map.on('touchend', () => { if (!hasMoved) handleInteraction(startPoint); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initMap);
else initMap();
