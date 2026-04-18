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

console.log("POC (TS): Guaranteed Non-Crossing Multilayered Fields Loaded");

function initMap() {
    const spatialIndex = new RBush<MapEntityIndexItem>();
    const features: any[] = [];

    const COLORS = {
        ENL: '#00ff00',
        RES: '#0000ff',
        NEU: '#ffffff'
    };

    function generateSpineNetwork(faction: Faction, centerLng: number) {
        // 1. Create 2 Base Anchors (The "Onion" Base)
        const b1 = { id: `${faction}-B1`, lng: centerLng - 0.02, lat: -0.02 };
        const b2 = { id: `${faction}-B2`, lng: centerLng + 0.02, lat: -0.02 };
        const bases = [b1, b2];

        bases.forEach(a => {
            spatialIndex.insert({ minX: a.lng, minY: a.lat, maxX: a.lng, maxY: a.lat, id: a.id, type: 'portal', faction, data: { lng: a.lng, lat: a.lat } });
            features.push({
                type: 'Feature', id: `p-${a.id}`,
                geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
                properties: { id: a.id, type: 'portal', faction }
            });
        });

        // Link the two bases
        const baseLid = `${faction}-L-BASE`;
        spatialIndex.insert({
            minX: Math.min(b1.lng, b2.lng), minY: Math.min(b1.lat, b2.lat),
            maxX: Math.max(b1.lng, b2.lng), maxY: Math.max(b1.lat, b2.lat),
            id: baseLid, type: 'link', faction, data: { coords: [[b1.lng, b1.lat], [b2.lng, b2.lat]] }
        });
        features.push({
            type: 'Feature', id: `l-${baseLid}`,
            geometry: { type: 'LineString', coordinates: [[b1.lng, b1.lat], [b2.lng, b2.lat]] },
            properties: { id: baseLid, type: 'link', faction }
        });

        // 2. Create a sequence of Spine Portals moving North
        // Because they all connect to the same base and move progressively away, links NEVER cross.
        const spine = [];
        for (let i = 0; i < 8; i++) {
            const lng = centerLng + (Math.random() - 0.5) * 0.005; 
            const lat = -0.01 + (i * 0.01); // Each portal is strictly "above" the previous one
            const p = { id: `${faction}-S-${i}`, lng, lat };
            spine.push(p);

            spatialIndex.insert({ minX: lng, minY: lat, maxX: lng, maxY: lat, id: p.id, type: 'portal', faction, data: { lng, lat } });
            features.push({
                type: 'Feature', id: `p-${p.id}`,
                geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                properties: { id: p.id, type: 'portal', faction }
            });

            // Connect to Base 1 and Base 2
            [b1, b2].forEach(b => {
                const lid = `${faction}-L-${p.id}-${b.id}`;
                spatialIndex.insert({
                    minX: Math.min(p.lng, b.lng), minY: Math.min(p.lat, b.lat),
                    maxX: Math.max(p.lng, b.lng), maxY: Math.max(p.lat, b.lat),
                    id: lid, type: 'link', faction, data: { coords: [[p.lng, p.lat], [b.lng, b.lat]] }
                });
                features.push({
                    type: 'Feature', id: `l-${lid}`,
                    geometry: { type: 'LineString', coordinates: [[p.lng, p.lat], [b.lng, b.lat]] },
                    properties: { id: lid, type: 'link', faction }
                });
            });

            // Create Field (Current Spine + Base 1 + Base 2)
            const fid = `${faction}-F-LAYER-${i}`;
            const polyCoords = [[p.lng, p.lat], [b1.lng, b1.lat], [b2.lng, b2.lat], [p.lng, p.lat]];
            
            spatialIndex.insert({
                minX: Math.min(p.lng, b1.lng, b2.lng), minY: Math.min(p.lat, b1.lat, b2.lat),
                maxX: Math.max(p.lng, b1.lng, b2.lng), maxY: Math.max(p.lat, b1.lat, b2.lat),
                id: fid, type: 'field', faction, data: { coords: polyCoords }
            });
            features.push({
                type: 'Feature', id: `f-${fid}`,
                geometry: { type: 'Polygon', coordinates: [polyCoords] },
                properties: { id: fid, type: 'field', faction }
            });

            // OPTIONAL: Connect to the previous spine portal to create "nested" sub-fields
            if (i > 0) {
                const prev = spine[i-1];
                const lid = `${faction}-L-INTERNAL-${i}`;
                spatialIndex.insert({
                    minX: Math.min(p.lng, prev.lng), minY: Math.min(p.lat, prev.lat),
                    maxX: Math.max(p.lng, prev.lng), maxY: Math.max(p.lat, prev.lat),
                    id: lid, type: 'link', faction, data: { coords: [[p.lng, p.lat], [prev.lng, prev.lat]] }
                });
                features.push({
                    type: 'Feature', id: `l-${lid}`,
                    geometry: { type: 'LineString', coordinates: [[p.lng, p.lat], [prev.lng, prev.lat]] },
                    properties: { id: lid, type: 'link', faction }
                });
            }
        }
    }

    generateSpineNetwork('ENL', -0.04);
    generateSpineNetwork('RES', 0.04);

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
                { id: 'fields-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'ENL']], paint: { 'fill-color': COLORS.ENL, 'fill-opacity': 0.1 } },
                { id: 'fields-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'RES']], paint: { 'fill-color': COLORS.RES, 'fill-opacity': 0.1 } },
                { id: 'links-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'ENL']], paint: { 'line-color': COLORS.ENL, 'line-width': 1 } },
                { id: 'links-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'RES']], paint: { 'line-color': COLORS.RES, 'line-width': 1 } },
                { id: 'portals-enl', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'faction', 'ENL']], paint: { 'circle-radius': 5, 'circle-color': COLORS.ENL, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } },
                { id: 'portals-res', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'faction', 'RES']], paint: { 'circle-radius': 5, 'circle-color': COLORS.RES, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } }
            ]
        },
        center: [0, 0], zoom: 12, dragPan: true, touchZoomRotate: true
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
        let hits: { id: string, type: string, faction: Faction, method: string }[] = [];

        try {
            const box: [maplibregl.PointLike, maplibregl.PointLike] = [[point.x - 10, point.y - 10], [point.x + 10, point.y + 10]];
            const features = map.queryRenderedFeatures(box, { layers: ['portals-enl', 'portals-res', 'links-enl', 'links-res', 'fields-enl', 'fields-res'] });
            hits = features.map(f => ({ id: f.properties?.id, type: f.properties?.type, faction: f.properties?.faction, method: 'NATIVE' }));
        } catch (e: any) { logEvent(`NATIVE BLOCKED: ${e.message}`, '#ff0000'); }

        if (hits.length === 0) {
            const p1 = map.unproject([point.x - 30, point.y - 30]);
            const p2 = map.unproject([point.x + 30, point.y + 30]);
            const candidates = spatialIndex.search({ minX: Math.min(p1.lng, p2.lng), minY: Math.min(p1.lat, p2.lat), maxX: Math.max(p1.lng, p2.lng), maxY: Math.max(p1.lat, p2.lat) });
            const tapLngLat: [number, number] = [map.unproject([point.x, point.y]).lng, map.unproject([point.x, point.y]).lat];
            const tapPoint = new maplibregl.Point(point.x, point.y);

            for (const c of candidates.filter(c => c.type === 'portal')) {
                const pos = map.project([c.data.lng, c.data.lat]);
                if (Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2)) < 25) { hits.push({ id: c.id, type: 'portal', faction: c.faction, method: 'RBUSH' }); }
            }
            for (const c of candidates.filter(c => c.type === 'link')) {
                const v = map.project(c.data.coords[0]), w = map.project(c.data.coords[1]);
                if (distToSegment(tapPoint, v, w) < 15) { hits.push({ id: c.id, type: 'link', faction: c.faction, method: 'RBUSH' }); }
            }
            for (const c of candidates.filter(c => c.type === 'field')) {
                if (isPointInPolygon(tapLngLat, c.data.coords)) { hits.push({ id: c.id, type: 'field', faction: c.faction, method: 'RBUSH' }); }
            }
        }

        const duration = performance.now() - startTime;
        if (hits.length > 0) {
            const unique = Array.from(new Set(hits.map(h => `${h.faction}|${h.type}|${h.id}`)));
            logEvent(`TAP: Found ${unique.length} entities (${duration.toFixed(2)}ms)`, '#fff');
            hits.forEach(h => {
                logEvent(`  > ${h.method} ${h.faction} ${h.type} ${h.id}`, COLORS[h.faction]);
            });
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
