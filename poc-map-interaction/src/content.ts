import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import RBush from 'rbush';
import { MockDataGenerator, Faction } from './MockDataGenerator';
import { getMinLevelForZoom, getGridSizeForZoom } from './ZoomPolicy';

type EntityType = 'portal' | 'link' | 'field';

interface MapEntityIndexItem {
    minX: number; minY: number; maxX: number; maxY: number;
    id: string; type: EntityType; faction: Faction; data: any;
}

console.log("POC (TS): Optimized Tiling + Ingress Zoom Policy Active");

function initMap() {
    const generator = new MockDataGenerator();
    let spatialIndex = new RBush<MapEntityIndexItem>();
    const loadedKeys = new Set<string>(); // Tracks "lat,lng,gridSize,minLevel"

    const COLORS = { ENL: '#00ff00', RES: '#0000ff', MAC: '#ff0000', NEU: '#ffffff' };

    function generateForCell(latIdx: number, lngIdx: number, size: number, minLevel: number) {
        const minLat = latIdx * size;
        const minLng = lngIdx * size;
        const cellId = `${latIdx}_${lngIdx}_S${size.toFixed(2)}`;

        // 1. Portals (Only if zoom allows)
        if (minLevel <= 8) {
            for (let i = 0; i < 20; i++) {
                const level = Math.floor(Math.random() * 9);
                if (level < minLevel) continue;

                const f: Faction = ['NEU', 'ENL', 'RES', 'MAC'][Math.floor(Math.random() * 4)] as Faction;
                generator.addPortal(`P-${cellId}-${i}`, f, minLng + Math.random() * size, minLat + Math.random() * size, level);
            }
        }

        // 2. Network (Always Z3+)
        const faction: Faction = Math.random() > 0.5 ? 'ENL' : 'RES';
        const b1 = generator.addPortal(`B1-${cellId}`, faction, minLng + size * 0.2, minLat + size * 0.2, 8);
        const b2 = generator.addPortal(`B2-${cellId}`, faction, minLng + size * 0.8, minLat + size * 0.2, 8);
        generator.addLink(`L-BASE-${cellId}`, faction, b1.id, b2.id);
        
        for (let i = 0; i < 2; i++) {
            const p = generator.addPortal(`S-${cellId}-${i}`, faction, minLng + size * 0.5, minLat + size * (0.4 + i * 0.3), 8);
            generator.addField(`F-${cellId}-${i}`, faction, p.id, b1.id, b2.id);
        }
    }

    function syncToMap(map: maplibregl.Map) {
        const features: any[] = [];
        spatialIndex = new RBush<MapEntityIndexItem>();
        generator.portals.forEach(p => {
            spatialIndex.insert({ minX: p.lng, minY: p.lat, maxX: p.lng, maxY: p.lat, id: p.id, type: 'portal', faction: p.faction, data: p });
            features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id, type: 'portal', faction: p.faction, level: p.level } });
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
        const minLevel = getMinLevelForZoom(zoom);
        const gridSize = getGridSizeForZoom(zoom);
        const bounds = map.getBounds();

        logPos(`Z:${zoom.toFixed(1)} | Min L:${minLevel} | Grid:${gridSize.toFixed(2)}°`);

        if (zoom < 3) return;

        const startLat = Math.floor(bounds.getSouth() / gridSize);
        const endLat = Math.floor(bounds.getNorth() / gridSize);
        const startLng = Math.floor(bounds.getWest() / gridSize);
        const endLng = Math.floor(bounds.getEast() / gridSize);

        let addedAny = false;
        for (let lat = startLat; lat <= endLat; lat++) {
            for (let lng = startLng; lng <= endLng; lng++) {
                // The key includes gridSize and minLevel to allow progressive loading
                const key = `${lat},${lng},${gridSize},L${minLevel}`;
                if (!loadedKeys.has(key)) {
                    generateForCell(lat, lng, gridSize, minLevel);
                    loadedKeys.add(key);
                    addedAny = true;
                }
            }
        }

        if (addedAny) {
            syncToMap(map);
            logEvent(`UPDATED. Total Entities: ${generator.portals.size + generator.links.length + generator.fields.length}`);
        }
    }

    document.body.innerHTML = '';
    const bodyStyle = document.createElement('style');
    bodyStyle.textContent = `
        html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #000 !important; }
        #map-poc-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #222; }
        .debug-btn { width: 50px; height: 50px; background: rgba(34,34,34,0.9); color: #fff; border: 2px solid #00ffff; border-radius: 8px; font-size: 20px; z-index: 1000005; cursor: pointer; display: flex; align-items: center; justify-content: center; -webkit-user-select: none; user-select: none; }
        #pos-log { position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.85); color: #fff; padding: 6px 12px; font-family: monospace; font-size: 13px; border-radius: 4px; z-index: 1000006; border: 1px solid #888; }
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
                'carto': { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png','https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png','https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; CARTO' },
                'entities': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
            },
            layers: [
                { id: 'carto', type: 'raster', source: 'carto' },
                { id: 'f-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'ENL']], paint: { 'fill-color': COLORS.ENL, 'fill-opacity': 0.1 } },
                { id: 'f-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'RES']], paint: { 'fill-color': COLORS.RES, 'fill-opacity': 0.1 } },
                { id: 'l-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'ENL']], paint: { 'line-color': COLORS.ENL, 'line-width': 1.5 } },
                { id: 'l-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'RES']], paint: { 'line-color': COLORS.RES, 'line-width': 1.5 } },
                { id: 'l-mac', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'MAC']], paint: { 'line-color': COLORS.MAC, 'line-width': 1.5 } },
                { id: 'p', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': ['step', ['get', 'level'], 2, 4, 3, 7, 4, 8, 6], 'circle-color': ['match', ['get', 'faction'], 'ENL', COLORS.ENL, 'RES', COLORS.RES, 'MAC', COLORS.MAC, COLORS.NEU], 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } }
            ]
        },
        center: [0, 0], zoom: 3
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
    mk('R', () => { map.setCenter([0,0]); map.setZoom(3); });

    map.on('load', () => {
        logEvent("INTEL MODE READY (Z3+). Dynamic tiling enabled.");
        container.style.background = 'transparent';
        map.resize();
        checkAndLoad(map);
    });

    map.on('move', () => {
        const center = map.getCenter();
        logPos(`Z:${map.getZoom().toFixed(1)} | Min L:${getMinLevelForZoom(map.getZoom())} | Grid:${getGridSizeForZoom(map.getZoom()).toFixed(2)}°`);
    });

    map.on('moveend', () => checkAndLoad(map));

    map.on('click', (e) => {
        const features = map.queryRenderedFeatures([[e.point.x-10, e.point.y-10], [e.point.x+10, e.point.y+10]]);
        if (features.length > 0) {
            const f = features[0].properties;
            logEvent(`HIT: ${f.id} (Level ${f.level})`);
        }
    });
}

setTimeout(initMap, 500);
