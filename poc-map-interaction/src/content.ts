import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MockDataGenerator, Faction } from './MockDataGenerator';
import { getMinLevelForZoom, getGridSizeForZoom } from './ZoomPolicy';

console.log("POC (TS): Intel Mode (Initial Zoom 13)");

function initMap() {
    const generator = new MockDataGenerator();
    const loadedKeys = new Set<string>();
    let extrusionEnabled = false;

    const COLORS = { ENL: '#00ff00', RES: '#0000ff', MAC: '#ff0000', NEU: '#ffffff' };
    const MAP_STYLES: Record<string, string[]> = {
        'Dark': [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
        ],
        'Light': [
            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'
        ],
        'Voyager': [
            'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png'
        ],
        'OSM': [
            'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        ]
    };

    function switchStyle(map: maplibregl.Map, name: string) {
        if (!MAP_STYLES[name]) return;
        if (map.getLayer('carto')) map.removeLayer('carto');
        if (map.getSource('carto')) map.removeSource('carto');
        
        map.addSource('carto', { 
            type: 'raster', 
            tiles: MAP_STYLES[name], 
            tileSize: 256, 
            attribution: name === 'OSM' ? '&copy; OpenStreetMap' : '&copy; CARTO &copy; OpenStreetMap' 
        });
        
        // Insert at the bottom
        const layers = map.getStyle().layers;
        const firstLayer = layers && layers.length > 0 ? layers[0].id : undefined;
        map.addLayer({ id: 'carto', type: 'raster', source: 'carto' }, firstLayer && firstLayer !== 'carto' ? firstLayer : undefined);
        logEvent(`Style: ${name}`);
    }

    function toggleExtrusion(map: maplibregl.Map) {
        extrusionEnabled = !extrusionEnabled;
        const visibility = extrusionEnabled ? 'visible' : 'none';
        const flatVisibility = extrusionEnabled ? 'none' : 'visible';

        ['f-ext-enl', 'f-ext-res', 'l-ext-enl', 'l-ext-res', 'p-ext'].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
        });
        ['f-enl', 'f-res', 'l-enl', 'l-res', 'l-mac', 'p'].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', flatVisibility);
        });

        map.easeTo({ pitch: extrusionEnabled ? 60 : 0, bearing: extrusionEnabled ? -20 : 0, duration: 800 });
        logEvent(`Extrusion: ${extrusionEnabled ? 'ON' : 'OFF'}`);
    }

    function generateForCell(latIdx: number, lngIdx: number, size: number, minLevel: number) {
        const minLat = latIdx * size;
        const minLng = lngIdx * size;
        const cellId = `${latIdx}_${lngIdx}_S${size.toFixed(2)}`;

        // Stable pseudo-random density factor [0, 1] based on coordinates
        const hash = Math.abs(Math.sin(latIdx * 12.9898 + lngIdx * 78.233) * 43758.5453) % 1;
        
        // Define tiers: Urban (10%), Suburban (30%), Rural (60%)
        let densityKm2 = 2; // Rural
        let clusters = 2;
        if (hash > 0.90) { densityKm2 = 150; clusters = 12; } // Urban
        else if (hash > 0.60) { densityKm2 = 40; clusters = 6; } // Suburban

        // Approx area in km2 (London area: 1deg lat ~111km, 1deg lng ~69km)
        const areaKm2 = (size * 111) * (size * 69);
        const portalCount = Math.floor(areaKm2 * densityKm2);
        
        logEvent(`Cell ${latIdx},${lngIdx} | Tier: ${densityKm2}/km² | Goal: ${portalCount} portals`);

        const factionPortals: Record<Faction, string[]> = { ENL: [], RES: [], MAC: [], NEU: [] };

        if (minLevel <= 8) {
            const seeds = Array.from({ length: clusters }, () => ({
                lat: minLat + Math.random() * size,
                lng: minLng + Math.random() * size
            }));

            for (let i = 0; i < portalCount; i++) {
                const seed = seeds[Math.floor(Math.random() * seeds.length)];
                const lat = seed.lat + (Math.random() - 0.5) * (size * 0.1);
                const lng = seed.lng + (Math.random() - 0.5) * (size * 0.1);
                const level = Math.floor(Math.random() * 9);
                if (level < minLevel) continue;
                const f: Faction = ['NEU', 'ENL', 'RES', 'MAC'][Math.floor(Math.random() * 4)] as Faction;
                const p = generator.addPortal(`P-${cellId}-${i}`, f, lng, lat, level);
                factionPortals[f].push(p.id);
            }
        }

        // Realistic Links & Fields using "Fan" pattern for ENL and RES
        ['ENL', 'RES'].forEach(f => {
            const pIds = factionPortals[f as Faction];
            if (pIds.length < 3) return;

            // Pick 2 anchors and fan out to other portals
            const anchor1 = pIds[0];
            const anchor2 = pIds[1];
            const targets = pIds.slice(2, Math.floor(pIds.length * 0.4)); // ~40% of portals are part of a fan

            targets.forEach((tId, idx) => {
                // Ingress rule: Links cannot cross. addField handles this via addLink check.
                generator.addField(`F-${cellId}-${f}-${idx}`, f as Faction, anchor1, anchor2, tId);
            });
        });
    }

    function syncToMap(map: maplibregl.Map) {
        const bounds = map.getBounds();
        const buffer = 0.05; // ~5km buffer
        const queryBounds = {
            minX: bounds.getWest() - buffer,
            minY: bounds.getSouth() - buffer,
            maxX: bounds.getEast() + buffer,
            maxY: bounds.getNorth() + buffer
        };

        const results = generator.query(queryBounds);
        const features: any[] = [];
        
        results.forEach(item => {
            if (item.type === 'portal') {
                const p = generator.portals.get(item.id);
                if (p) {
                    const props = { id: p.id, type: 'portal', faction: p.faction, level: p.level, height: (p.level + 1) * 30, base_height: 0 };
                    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: props });
                    
                    // 3D Pillar geometry (small square)
                    const s = 0.0001; // ~10m
                    const poly = [[ [p.lng-s, p.lat-s], [p.lng+s, p.lat-s], [p.lng+s, p.lat+s], [p.lng-s, p.lat+s], [p.lng-s, p.lat-s] ]];
                    features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: poly }, properties: { ...props, type: 'portal-ext' } });
                }
            } else if (item.type === 'link') {
                const l = generator.linksMap.get(item.id);
                if (l) {
                    const props = { id: l.id, type: 'link', faction: l.faction, height: 10, base_height: 0 };
                    features.push({ type: 'Feature', id: `l-${l.id}`, geometry: { type: 'LineString', coordinates: [[l.p1.lng, l.p1.lat], [l.p2.lng, l.p2.lat]] }, properties: props });
                    
                    // 3D Wall geometry (thin ribbon)
                    const dx = l.p2.lng - l.p1.lng;
                    const dy = l.p2.lat - l.p1.lat;
                    const len = Math.sqrt(dx*dx + dy*dy);
                    const nx = -dy / len * 0.00005;
                    const ny = dx / len * 0.00005;
                    const poly = [[ [l.p1.lng+nx, l.p1.lat+ny], [l.p2.lng+nx, l.p2.lat+ny], [l.p2.lng-nx, l.p2.lat-ny], [l.p1.lng-nx, l.p1.lat-ny], [l.p1.lng+nx, l.p1.lat+ny] ]];
                    features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: poly }, properties: { ...props, type: 'link-ext' } });
                }
            } else if (item.type === 'field') {
                const f = generator.fields.find(f => f.id === item.id);
                if (f) {
                    const poly = [[f.p1.lng, f.p1.lat], [f.p2.lng, f.p2.lat], [f.p3.lng, f.p3.lat], [f.p1.lng, f.p1.lat]];
                    const height = 300;
                    const base_height = 290;
                    features.push({ type: 'Feature', id: `f-${f.id}`, geometry: { type: 'Polygon', coordinates: [poly] }, properties: { id: f.id, type: 'field', faction: f.faction, height, base_height } });
                }
            }
        });

        const source = map.getSource('entities') as maplibregl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features });
        logEvent(`RENDERED: ${features.length} / ${generator.portals.size + generator.linksMap.size + generator.fields.length} items`);
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
                const key = `${lat},${lng},${gridSize},L${minLevel}`;
                if (!loadedKeys.has(key)) {
                    generateForCell(lat, lng, gridSize, minLevel);
                    loadedKeys.add(key);
                    addedAny = true;
                }
            }
        }
        
        syncToMap(map);
        if (addedAny) {
            logEvent(`GENERATED NEW DATA. Total Store: ${generator.portals.size + generator.linksMap.size + generator.fields.length}`);
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
                'carto': { type: 'raster', tiles: MAP_STYLES['Dark'], tileSize: 256, attribution: '&copy; CARTO' },
                'entities': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
            },
            layers: [
                { id: 'carto', type: 'raster', source: 'carto' },
                // 3D Extrusion Layers (Hidden by default)
                { id: 'f-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'ENL']], paint: { 'fill-extrusion-color': COLORS.ENL, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                { id: 'f-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'RES']], paint: { 'fill-extrusion-color': COLORS.RES, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                { id: 'l-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'faction', 'ENL']], paint: { 'fill-extrusion-color': COLORS.ENL, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                { id: 'l-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'faction', 'RES']], paint: { 'fill-extrusion-color': COLORS.RES, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                { id: 'p-ext', type: 'fill-extrusion', source: 'entities', filter: ['==', 'type', 'portal-ext'], paint: { 'fill-extrusion-color': ['match', ['get', 'faction'], 'ENL', COLORS.ENL, 'RES', COLORS.RES, 'MAC', COLORS.MAC, COLORS.NEU], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'] }, layout: { visibility: 'none' } },
                
                // Flat Layers (Visible by default)
                { id: 'f-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'ENL']], paint: { 'fill-color': COLORS.ENL, 'fill-opacity': 0.1 } },
                { id: 'f-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'RES']], paint: { 'fill-color': COLORS.RES, 'fill-opacity': 0.1 } },
                { id: 'l-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'ENL']], paint: { 'line-color': COLORS.ENL, 'line-width': 1.5 } },
                { id: 'l-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'RES']], paint: { 'line-color': COLORS.RES, 'line-width': 1.5 } },
                { id: 'l-mac', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'MAC']], paint: { 'line-color': COLORS.MAC, 'line-width': 1.5 } },
                { id: 'p', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': ['step', ['get', 'level'], 2, 4, 3, 7, 4, 8, 6], 'circle-color': ['match', ['get', 'faction'], 'ENL', COLORS.ENL, 'RES', COLORS.RES, 'MAC', COLORS.MAC, COLORS.NEU], 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } }
            ]
        },
        center: [-0.1276, 51.5072], zoom: 13
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
    mk('R', () => { map.setCenter([-0.1276, 51.5072]); map.setZoom(13); map.setPitch(0); map.setBearing(0); });
    mk('X', () => toggleExtrusion(map));
    mk('D', () => switchStyle(map, 'Dark'));
    mk('L', () => switchStyle(map, 'Light'));
    mk('V', () => switchStyle(map, 'Voyager'));
    mk('O', () => switchStyle(map, 'OSM'));

    map.on('load', () => {
        container.style.background = 'transparent';
        map.resize();
        checkAndLoad(map);
    });
    map.on('move', () => {
        logPos(`Z:${map.getZoom().toFixed(1)} | Min L:${getMinLevelForZoom(map.getZoom())} | Grid:${getGridSizeForZoom(map.getZoom()).toFixed(2)}°`);
    });
    map.on('moveend', () => checkAndLoad(map));
    map.on('click', (e) => {
        const features = map.queryRenderedFeatures([[e.point.x-10, e.point.y-10], [e.point.x+10, e.point.y+10]]);
        if (features.length > 0) logEvent(`HIT: ${features[0].properties?.id} (L${features[0].properties?.level})`);
    });
}
setTimeout(initMap, 500);
