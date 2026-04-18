import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import RBush from 'rbush';
import { MockDataGenerator, Faction } from './MockDataGenerator';

type EntityType = 'portal' | 'link' | 'field';

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

console.log("POC (TS): Hybrid Interaction with MAC (Machine) Faction Loaded");

function initMap() {
    const generator = new MockDataGenerator();
    const spatialIndex = new RBush<MapEntityIndexItem>();

    const COLORS = {
        ENL: '#00ff00',
        RES: '#0000ff',
        MAC: '#ff0000',
        NEU: '#ffffff'
    };

    // --- 1. GENERATE MOCK DATA ---

    // NORTH: Portals (including MAC)
    for (let i = 0; i < 24; i++) {
        const factions: Faction[] = ['NEU', 'ENL', 'RES', 'MAC'];
        const faction = factions[i % 4];
        generator.addPortal(`TOP-P-${i}`, faction, (Math.random() - 0.5) * 0.1, 0.04 + Math.random() * 0.02);
    }

    // CENTER: Portals + Links (including MAC)
    const midPortals = [];
    for (let i = 0; i < 21; i++) {
        const factions: Faction[] = ['ENL', 'RES', 'MAC'];
        const faction = factions[Math.floor(i / 7)]; // Blocks of 7 per faction
        const p = generator.addPortal(`MID-P-${i}`, faction, (Math.random() - 0.5) * 0.1, 0.01 + Math.random() * 0.02);
        midPortals.push(p);
    }
    for (let i = 0; i < midPortals.length - 1; i++) {
        if (midPortals[i].faction === midPortals[i+1].faction) {
            generator.addLink(`MID-L-${i}`, midPortals[i].faction, midPortals[i].id, midPortals[i+1].id);
        }
    }

    // SOUTH: Full Network
    // ENL Spine
    const b1 = generator.addPortal('ENL-B1', 'ENL', -0.04, -0.05);
    const b2 = generator.addPortal('ENL-B2', 'ENL', -0.01, -0.05);
    generator.addLink('ENL-L-BASE', 'ENL', 'ENL-B1', 'ENL-B2');
    for (let i = 0; i < 4; i++) {
        const id = `ENL-S-${i}`;
        generator.addPortal(id, 'ENL', -0.025 + (Math.random() - 0.5) * 0.005, -0.04 + (i * 0.01));
        generator.addField(`${id}-F`, 'ENL', id, 'ENL-B1', 'ENL-B2');
    }

    // RES Fan
    const anchor = generator.addPortal('RES-ANCHOR', 'RES', 0.01, -0.05);
    const fanPoints = [];
    for (let i = 0; i < 4; i++) {
        const p = generator.addPortal(`RES-F-${i}`, 'RES', 0.02 + (i * 0.01), -0.04 + (Math.random() * 0.02));
        fanPoints.push(p);
        generator.addLink(`${p.id}-L-A`, 'RES', p.id, anchor.id);
        if (i > 0) {
            generator.addField(`${p.id}-F`, 'RES', p.id, fanPoints[i-1].id, anchor.id);
        }
    }

    // MAC (Machine) Random Links - Red cannot have fields
    const macPortals = [];
    for (let i = 0; i < 6; i++) {
        const p = generator.addPortal(`MAC-S-${i}`, 'MAC', 0.04 + (Math.random() - 0.5) * 0.01, -0.04 + (i * 0.01));
        macPortals.push(p);
    }
    for (let i = 0; i < macPortals.length - 1; i++) {
        generator.addLink(`MAC-L-${i}`, 'MAC', macPortals[i].id, macPortals[i+1].id);
    }

    // --- 2. POPULATE SPATIAL INDEX & GEOJSON FEATURES ---
    const features: any[] = [];

    generator.portals.forEach(p => {
        spatialIndex.insert({ minX: p.lng, minY: p.lat, maxX: p.lng, maxY: p.lat, id: p.id, type: 'portal', faction: p.faction, data: p });
        features.push({
            type: 'Feature', id: `p-${p.id}`,
            geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
            properties: { id: p.id, type: 'portal', faction: p.faction }
        });
    });

    generator.links.forEach(l => {
        spatialIndex.insert({
            minX: Math.min(l.p1.lng, l.p2.lng), minY: Math.min(l.p1.lat, l.p2.lat),
            maxX: Math.max(l.p1.lng, l.p2.lng), maxY: Math.max(l.p1.lat, l.p2.lat),
            id: l.id, type: 'link', faction: l.faction, data: { coords: [[l.p1.lng, l.p1.lat], [l.p2.lng, l.p2.lat]] }
        });
        features.push({
            type: 'Feature', id: `l-${l.id}`,
            geometry: { type: 'LineString', coordinates: [[l.p1.lng, l.p1.lat], [l.p2.lng, l.p2.lat]] },
            properties: { id: l.id, type: 'link', faction: l.faction }
        });
    });

    generator.fields.forEach(f => {
        const polyCoords = [[f.p1.lng, f.p1.lat], [f.p2.lng, f.p2.lat], [f.p3.lng, f.p3.lat], [f.p1.lng, f.p1.lat]];
        spatialIndex.insert({
            minX: Math.min(f.p1.lng, f.p2.lng, f.p3.lng), minY: Math.min(f.p1.lat, f.p2.lat, f.p3.lat),
            maxX: Math.max(f.p1.lng, f.p2.lng, f.p3.lng), maxY: Math.max(f.p1.lat, f.p2.lat, f.p3.lat),
            id: f.id, type: 'field', faction: f.faction, data: { coords: polyCoords }
        });
        features.push({
            type: 'Feature', id: `f-${f.id}`,
            geometry: { type: 'Polygon', coordinates: [polyCoords] },
            properties: { id: f.id, type: 'field', faction: f.faction }
        });
    });

    // --- 3. MAPBOX-GL INITIALIZATION ---

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
                { id: 'links-mac', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'MAC']], paint: { 'line-color': COLORS.MAC, 'line-width': 1 } },
                { id: 'portals-enl', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'faction', 'ENL']], paint: { 'circle-radius': 5, 'circle-color': COLORS.ENL, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } },
                { id: 'portals-res', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'faction', 'RES']], paint: { 'circle-radius': 5, 'circle-color': COLORS.RES, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } },
                { id: 'portals-mac', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'faction', 'MAC']], paint: { 'circle-radius': 5, 'circle-color': COLORS.MAC, 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } },
                { id: 'portals-neu', type: 'circle', source: 'entities', filter: ['all', ['==', 'type', 'portal'], ['==', 'faction', 'NEU']], paint: { 'circle-radius': 5, 'circle-color': COLORS.NEU, 'circle-stroke-width': 1, 'circle-stroke-color': '#888' } }
            ]
        },
        center: [0, 0], zoom: 12, dragPan: true, touchZoomRotate: true
    });

    // --- 4. INTERACTION LOGIC (HYBRID) ---

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

    function handleInteraction(point: { x: number, y: number }) {
        const startTime = performance.now();
        let hits: { id: string, type: string, faction: Faction, method: string }[] = [];

        try {
            const box: [maplibregl.PointLike, maplibregl.PointLike] = [[point.x - 10, point.y - 10], [point.x + 10, point.y + 10]];
            const features = map.queryRenderedFeatures(box, { layers: ['portals-enl', 'portals-res', 'portals-mac', 'portals-neu', 'links-enl', 'links-res', 'links-mac', 'fields-enl', 'fields-res'] });
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
