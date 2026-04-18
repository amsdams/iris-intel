import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import RBush from 'rbush';
import { MockDataGenerator, Faction } from './MockDataGenerator';

type EntityType = 'portal' | 'link' | 'field';

interface MapEntityIndexItem {
    minX: number; minY: number; maxX: number; maxY: number;
    id: string; type: EntityType; faction: Faction; data: any;
}

console.log("POC (TS): Tiled/Grid-Based Data Loading with Position Logging");

function initMap() {
    const generator = new MockDataGenerator();
    let spatialIndex = new RBush<MapEntityIndexItem>();
    const loadedCells = new Set<string>();
    const GRID_SIZE = 0.05;

    const COLORS = { ENL: '#00ff00', RES: '#0000ff', MAC: '#ff0000', NEU: '#ffffff' };

    function generateForCell(latIndex: number, lngIndex: number) {
        const minLat = latIndex * GRID_SIZE;
        const minLng = lngIndex * GRID_SIZE;
        const cellId = `${latIndex}_${lngIndex}`;

        for (let i = 0; i < 20; i++) {
            const f: Faction = ['NEU', 'ENL', 'RES', 'MAC'][Math.floor(Math.random() * 4)] as Faction;
            generator.addPortal(`P-${cellId}-${i}`, f, minLng + Math.random() * GRID_SIZE, minLat + Math.random() * GRID_SIZE);
        }
        const faction: Faction = Math.random() > 0.5 ? 'ENL' : 'RES';
        const b1 = generator.addPortal(`B1-${cellId}`, faction, minLng + GRID_SIZE * 0.2, minLat + GRID_SIZE * 0.2);
        const b2 = generator.addPortal(`B2-${cellId}`, faction, minLng + GRID_SIZE * 0.8, minLat + GRID_SIZE * 0.2);
        generator.addLink(`L-BASE-${cellId}`, faction, b1.id, b2.id);
        for (let i = 0; i < 2; i++) {
            const p = generator.addPortal(`S-${cellId}-${i}`, faction, minLng + GRID_SIZE * 0.5, minLat + GRID_SIZE * (0.4 + i * 0.3));
            generator.addField(`F-${cellId}-${i}`, faction, p.id, b1.id, b2.id);
        }
    }

    function syncToMap(map: maplibregl.Map) {
        const features: any[] = [];
        spatialIndex = new RBush<MapEntityIndexItem>();
        generator.portals.forEach(p => {
            spatialIndex.insert({ minX: p.lng, minY: p.lat, maxX: p.lng, maxY: p.lat, id: p.id, type: 'portal', faction: p.faction, data: p });
            features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id, type: 'portal', faction: p.faction } });
        });
        generator.links.forEach(l => {
            spatialIndex.insert({ minX: Math.min(l.p1.lng, l.p2.lng), minY: Math.min(l.p1.lat, l.p2.lat), maxX: Math.max(l.p1.lng, l.p2.lng), maxY: Math.max(l.p1.lat, l.p2.lat), id: l.id, type: 'link', faction: l.faction, data: { coords: [[l.p1.lng, l.p1.lat], [l.p2.lng, l.p2.lat]] } });
            features.push({ type: 'Feature', id: `l-${l.id}`, geometry: { type: 'LineString', coordinates: [[l.p1.lng, l.p1.lat], [l.p2.lng, l.p2.lat]] }, properties: { id: l.id, type: 'link', faction: l.faction } });
        });
        generator.fields.forEach(f => {
            const poly = [[f.p1.lng, f.p1.lat], [f.p2.lng, f.p2.lat], [f.p3.lng, f.p3.lat], [f.p1.lng, f.p1.lat]];
            spatialIndex.insert({ minX: Math.min(f.p1.lng, f.p2.lng, f.p3.lng), minY: Math.min(f.p1.lat, f.p2.lat, f.p3.lat), maxX: Math.max(f.p1.lng, f.p2.lng, f.p3.lng), maxY: Math.max(f.p1.lat, f.p2.lat, f.p3.lat), id: f.id, type: 'field', faction: f.faction, data: { coords: poly } });
            features.push({ type: 'Feature', id: `f-${f.id}`, geometry: { type: 'Polygon', coordinates: [poly] }, properties: { id: f.id, type: 'field', faction: f.faction } });
        });
        const source = map.getSource('entities') as maplibregl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features });
    }

    function checkAndLoad(map: maplibregl.Map) {
        const zoom = map.getZoom();
        const center = map.getCenter();
        logPos(`Lng:${center.lng.toFixed(4)} Lat:${center.lat.toFixed(4)} Z:${zoom.toFixed(2)}`);

        if (zoom < 13) {
            logEvent("ZOOM IN TO LOAD DATA (Z >= 13)");
            return;
        }

        const bounds = map.getBounds();
        const startLat = Math.floor(bounds.getSouth() / GRID_SIZE);
        const endLat = Math.floor(bounds.getNorth() / GRID_SIZE);
        const startLng = Math.floor(bounds.getWest() / GRID_SIZE);
        const endLng = Math.floor(bounds.getEast() / GRID_SIZE);

        const totalCells = (endLat - startLat + 1) * (endLng - startLng + 1);
        if (totalCells > 100) {
            logEvent(`AREA TOO BIG (${totalCells} cells)`);
            return;
        }

        let addedAny = false;
        for (let lat = startLat; lat <= endLat; lat++) {
            for (let lng = startLng; lng <= endLng; lng++) {
                const key = `${lat},${lng}`;
                if (!loadedCells.has(key)) {
                    generateForCell(lat, lng);
                    loadedCells.add(key);
                    addedAny = true;
                }
            }
        }

        if (addedAny) {
            syncToMap(map);
            logEvent(`LOADED: +Cell(s). Entities: ${generator.portals.size + generator.links.length + generator.fields.length}`);
        }
    }

    document.body.innerHTML = '';
    const bodyStyle = document.createElement('style');
    bodyStyle.textContent = `
        html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #000 !important; }
        #map-poc-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #222; }
        .debug-btn {
            width: 50px; height: 50px; background: rgba(34,34,34,0.9); color: #fff;
            border: 2px solid #00ffff; border-radius: 8px; font-size: 20px;
            z-index: 1000005; cursor: pointer; display: flex;
            align-items: center; justify-content: center;
            -webkit-user-select: none; user-select: none;
        }
        #pos-log {
            position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.85);
            color: #fff; padding: 6px 12px; font-family: monospace; font-size: 13px;
            border-radius: 4px; z-index: 1000006; border: 1px solid #888;
        }
    `;
    document.head.appendChild(bodyStyle);

    const container = document.createElement('div');
    container.id = 'map-poc-container';
    document.body.appendChild(container);

    const posLog = document.createElement('div');
    posLog.id = 'pos-log';
    posLog.textContent = 'Initializing...';
    document.body.appendChild(posLog);

    const log = document.createElement('div');
    log.style.cssText = `position: fixed; bottom: 10px; left: 10px; right: 10px; height: 120px; background: rgba(0,0,0,0.85); color: #00ffff; overflow-y: auto; z-index: 2000000; font-family: monospace; padding: 10px; font-size: 11px; border: 2px solid #00ffff; pointer-events: none; border-radius: 4px;`;
    document.body.appendChild(log);

    function logPos(msg: string) { posLog.textContent = msg; }
    function logEvent(msg: string) {
        const e = document.createElement('div');
        e.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        log.prepend(e);
    }

    const map = new maplibregl.Map({
        container: 'map-poc-container',
        style: {
            version: 8,
            sources: {
                'carto': { 
                    type: 'raster', 
                    tiles: [
                        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
                        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
                    ], 
                    tileSize: 256, 
                    attribution: '&copy; CARTO' 
                },
                'entities': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
            },
            layers: [
                { id: 'carto', type: 'raster', source: 'carto' },
                { id: 'f-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'ENL']], paint: { 'fill-color': COLORS.ENL, 'fill-opacity': 0.15 } },
                { id: 'f-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'RES']], paint: { 'fill-color': COLORS.RES, 'fill-opacity': 0.15 } },
                { id: 'l-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'ENL']], paint: { 'line-color': COLORS.ENL, 'line-width': 1.5 } },
                { id: 'l-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'RES']], paint: { 'line-color': COLORS.RES, 'line-width': 1.5 } },
                { id: 'l-mac', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'MAC']], paint: { 'line-color': COLORS.MAC, 'line-width': 1.5 } },
                { id: 'p', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': 5, 'circle-color': ['match', ['get', 'faction'], 'ENL', COLORS.ENL, 'RES', COLORS.RES, 'MAC', COLORS.MAC, COLORS.NEU], 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } }
            ]
        },
        center: [0, 0], zoom: 4
    });

    const btns = document.createElement('div');
    btns.style.cssText = 'position: fixed; top: 10px; right: 10px; display: flex; flex-direction: column; gap: 8px; z-index: 2000001;';
    document.body.appendChild(btns);
    const mk = (l: string, a: () => void) => {
        const b = document.createElement('div'); b.className = 'debug-btn'; b.textContent = l;
        b.addEventListener('pointerdown', (e) => { e.stopPropagation(); a(); });
        btns.appendChild(b);
    };
    mk('+', () => map.zoomIn()); mk('-', () => map.zoomOut());
    mk('↑', () => map.panBy([0, -250])); mk('↓', () => map.panBy([0, 250]));
    mk('←', () => map.panBy([-250, 0])); mk('→', () => map.panBy([150, 0]));
    mk('R', () => { map.setCenter([0,0]); map.setZoom(4); });

    map.on('load', () => {
        logEvent("MAP LOADED. World map tiles active.");
        container.style.background = 'transparent'; // Remove placeholder background
        map.resize();
        checkAndLoad(map);
    });

    map.on('move', () => {
        const center = map.getCenter();
        logPos(`Lng:${center.lng.toFixed(4)} Lat:${center.lat.toFixed(4)} Z:${map.getZoom().toFixed(2)}`);
    });

    map.on('moveend', () => checkAndLoad(map));

    map.on('click', (e) => {
        const features = map.queryRenderedFeatures([[e.point.x-5, e.point.y-5], [e.point.x+5, e.point.y+5]]);
        if (features.length > 0) logEvent(`HIT: ${features[0].properties?.id}`);
    });

    map.on('error', (e) => {
        logEvent(`MAP ERROR: ${e.error?.message || 'Unknown error'}`);
    });
}

setTimeout(initMap, 500);
