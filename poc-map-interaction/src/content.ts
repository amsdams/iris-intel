import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MockDataGenerator, Faction } from './MockDataGenerator';
import { getMinLevelForZoom, getGridSizeForZoom } from './ZoomPolicy';

console.log("POC (TS): Intel Mode (Initial Zoom 13) | v1.0.1 | Default: Amsterdam");

function initMap() {
    const generator = new MockDataGenerator();
    const loadedKeys = new Set<string>();
    let extrusionEnabled = false;
    let patternMode = 0; // 0: Off, 1: Nested, 2: Single Nested

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

        ['f-ext-enl', 'f-ext-res', 'l-ext-enl', 'l-ext-res', 'p-ext', 'f-tether-enl', 'f-tether-res'].forEach(id => {
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

        const hash = Math.abs(Math.sin(latIdx * 12.9898 + lngIdx * 78.233) * 43758.5453) % 1;
        let densityKm2 = 2; // Rural
        let clusters = 2;
        if (hash > 0.90) { densityKm2 = 150; clusters = 12; } // Urban
        else if (hash > 0.60) { densityKm2 = 40; clusters = 6; } // Suburban

        const areaKm2 = (size * 111) * (size * 69);
        let portalCount = Math.floor(areaKm2 * densityKm2);
        
        // Performance Cap for large cells
        if (portalCount > 2000) portalCount = 2000;
        
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

        ['ENL', 'RES'].forEach(f => {
            const pIds = factionPortals[f as Faction];
            if (pIds.length < 3) return;
            const anchor1 = pIds[0];
            const anchor2 = pIds[1];
            const targets = pIds.slice(2, Math.floor(pIds.length * 0.4)); 
            
            // Link anchors
            generator.addLink(`L-${cellId}-${f}-base`, f as Faction, anchor1, anchor2);
            
            targets.forEach((tId) => {
                // Linking to both anchors will automatically create a field
                generator.addLink(`L-${cellId}-${f}-${tId}-1`, f as Faction, anchor1, tId);
                generator.addLink(`L-${cellId}-${f}-${tId}-2`, f as Faction, anchor2, tId);
            });
        });
    }

    function loadPattern1(map: maplibregl.Map) {
        generator.clear();
        loadedKeys.clear();
        const center = map.getCenter();
        const offset = 0.002;
        generator.addPortal('A', 'ENL', center.lng - offset, center.lat, 8);
        generator.addPortal('B', 'ENL', center.lng + offset, center.lat, 8);
        generator.addPortal('C', 'ENL', center.lng, center.lat + offset * 1.5, 8);
        generator.addPortal('D', 'ENL', center.lng, center.lat + offset * 0.5, 8);
        
        // Links for BASE field (A-B-C)
        generator.addLink('L-AB', 'ENL', 'A', 'B');
        generator.addLink('L-BC', 'ENL', 'B', 'C');
        generator.addLink('L-CA', 'ENL', 'C', 'A'); // Field A-B-C auto-created

        // Links for NEST field (A-B-D)
        generator.addLink('L-AD', 'ENL', 'A', 'D');
        generator.addLink('L-BD', 'ENL', 'B', 'D'); // Field A-B-D auto-created

        syncToMap(map);
        logEvent("PATTERN 1: Single Nested (Link-Driven).");
    }

    function loadPattern2(map: maplibregl.Map) {
        generator.clear();
        loadedKeys.clear();
        const center = map.getCenter();
        const offset = 0.002;
        generator.addPortal('A', 'ENL', center.lng - offset, center.lat, 8);
        generator.addPortal('B', 'ENL', center.lng + offset, center.lat, 8);
        generator.addPortal('C', 'ENL', center.lng, center.lat + offset * 1.5, 8);
        generator.addPortal('D', 'ENL', center.lng, center.lat + offset * 0.5, 8);
        
        // Form the diamond with links
        generator.addLink('L-AB', 'ENL', 'A', 'B');
        generator.addLink('L-BC', 'ENL', 'B', 'C');
        generator.addLink('L-CA', 'ENL', 'C', 'A'); // Field ABC created
        generator.addLink('L-AD', 'ENL', 'A', 'D');
        generator.addLink('L-BD', 'ENL', 'B', 'D'); // Field ABD created
        generator.addLink('L-CD', 'ENL', 'C', 'D'); // Fields BCD and ACD created

        syncToMap(map);
        logEvent("PATTERN 2: Nested Diamond (Link-Driven).");
    }

    function loadPattern3(map: maplibregl.Map) {
        generator.clear();
        loadedKeys.clear();
        const center = map.getCenter();
        const offset = 0.002;
        generator.addPortal('A', 'ENL', center.lng - offset, center.lat, 8);
        generator.addPortal('B', 'ENL', center.lng + offset, center.lat, 8);
        generator.addPortal('C', 'ENL', center.lng, center.lat + offset * 1.5, 8);
        generator.addPortal('D', 'ENL', center.lng, center.lat + offset * 0.5, 8);
        generator.addPortal('E', 'ENL', center.lng, center.lat + offset * 0.2, 8);
        
        // Base Diamond links
        generator.addLink('L-AB', 'ENL', 'A', 'B');
        generator.addLink('L-BC', 'ENL', 'B', 'C');
        generator.addLink('L-CA', 'ENL', 'C', 'A'); // ABC
        generator.addLink('L-AD', 'ENL', 'A', 'D');
        generator.addLink('L-BD', 'ENL', 'B', 'D'); // ABD
        generator.addLink('L-CD', 'ENL', 'C', 'D'); // BCD, ACD

        // The 3-way split of ABD using E
        generator.addLink('L-AE', 'ENL', 'A', 'E');
        generator.addLink('L-BE', 'ENL', 'B', 'E');
        generator.addLink('L-DE', 'ENL', 'D', 'E'); // ABE, ADE, BDE created

        syncToMap(map);
        logEvent("PATTERN 3: 3-Way Split (Link-Driven).");
    }



    function syncToMap(map: maplibregl.Map) {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
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
                // GRADUAL LOADING
                if (p && p.level >= minLevel) {
                    const props = { id: p.id, type: 'portal', faction: p.faction, level: p.level, height: (p.level + 1) * 50, base_height: 0 };
                    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: props });
                    
                    const s = 0.0001; // ~10m
                    const poly = [[ [p.lng-s, p.lat-s], [p.lng+s, p.lat-s], [p.lng+s, p.lat+s], [p.lng-s, p.lat+s], [p.lng-s, p.lat-s] ]];
                    features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: poly }, properties: { ...props, type: 'portal-ext' } });
                }
            } else if (item.type === 'link') {
                const l = generator.linksMap.get(item.id);
                if (l && l.p1.level >= minLevel && l.p2.level >= minLevel) {
                    const props = { id: l.id, type: 'link', faction: l.faction, height: 15, base_height: 10 };
                    features.push({ type: 'Feature', id: `l-${l.id}`, geometry: { type: 'LineString', coordinates: [[l.p1.lng, l.p1.lat], [l.p2.lng, l.p2.lat]] }, properties: props });
                    
                    const dx = l.p2.lng - l.p1.lng;
                    const dy = l.p2.lat - l.p1.lat;
                    const len = Math.sqrt(dx*dx + dy*dy);
                    const nx = -dy / (len || 1) * 0.00005;
                    const ny = dx / (len || 1) * 0.00005;
                    const poly = [[ [l.p1.lng+nx, l.p1.lat+ny], [l.p2.lng+nx, l.p2.lat+ny], [l.p2.lng-nx, l.p2.lat-ny], [l.p1.lng-nx, l.p1.lat-ny], [l.p1.lng+nx, l.p1.lat+ny] ]];
                    features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: poly }, properties: { ...props, type: 'link-ext' } });
                }
            } else if (item.type === 'field') {
                const f = generator.fieldsMap.get(item.id);
                if (f && f.p1.level >= minLevel && f.p2.level >= minLevel && f.p3.level >= minLevel) {
                    const poly = [[f.p1.lng, f.p1.lat], [f.p2.lng, f.p2.lat], [f.p3.lng, f.p3.lat], [f.p1.lng, f.p1.lat]];
                    const base_height = 200 + (f.layer * 20);
                    const height = base_height + 5;
                    features.push({ type: 'Feature', id: `f-${f.id}`, geometry: { type: 'Polygon', coordinates: [poly] }, properties: { id: f.id, type: 'field', faction: f.faction, height, base_height } });
                    
                    // Add 3 tethers at the corners
                    [f.p1, f.p2, f.p3].forEach((p, i) => {
                        const s = 0.00005; // 5m thin tether
                        const tPoly = [[ [p.lng-s, p.lat-s], [p.lng+s, p.lat-s], [p.lng+s, p.lat+s], [p.lng-s, p.lat+s], [p.lng-s, p.lat-s] ]];
                        features.push({ 
                            type: 'Feature', 
                            id: `t-${f.id}-${i}`,
                            geometry: { type: 'Polygon', coordinates: tPoly }, 
                            properties: { type: 'field-tether', faction: f.faction, height: base_height, base_height: 0 } 
                        });
                    });
                }
            }
        });

        const source = map.getSource('entities') as maplibregl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features });
        logEvent(`RENDERED: ${features.length} / ${generator.portals.size + generator.linksMap.size + generator.fieldsMap.size} items (Min L: ${minLevel})`);
    }

    function checkAndLoad(map: maplibregl.Map) {
        const zoom = map.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
        const gridSize = getGridSizeForZoom(zoom);
        const bounds = map.getBounds();
        logPos(`Z:${zoom.toFixed(1)} | Min L:${minLevel} | Grid:${gridSize.toFixed(2)}°${patternMode > 0 ? ` | PATTERN ${patternMode}` : ''}`);
        
        if (patternMode > 0) {
            syncToMap(map);
            return;
        }

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
            logEvent(`GENERATED NEW DATA. Total Store: ${generator.portals.size + generator.linksMap.size + generator.fieldsMap.size}`);
        }
    }

    document.body.innerHTML = '';
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(meta);

    const bodyStyle = document.createElement('style');
    bodyStyle.textContent = `
        html, body { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background: #000 !important; }
        #map-poc-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #222; touch-action: none; }
        .debug-btn { width: 50px; height: 50px; background: rgba(34,34,34,0.9); color: #fff; border: 2px solid #00ffff; border-radius: 8px; font-size: 20px; z-index: 1000005; cursor: pointer; display: flex; align-items: center; justify-content: center; -webkit-user-select: none; user-select: none; }
        #pos-log { position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.85); color: #fff; padding: 6px 12px; font-family: monospace; font-size: 13px; border-radius: 4px; z-index: 1000006; border: 1px solid #888; pointer-events: none; }
    `;
    document.head.appendChild(bodyStyle);

    const container = document.createElement('div');
    container.id = 'map-poc-container';
    document.body.appendChild(container);

    const posLog = document.createElement('div');
    posLog.id = 'pos-log';
    document.body.appendChild(posLog);

    const log = document.createElement('div');
    log.id = 'event-log';
    log.style.cssText = `position: fixed; bottom: 10px; left: 10px; right: 10px; height: 100px; background: rgba(0,0,0,0.85); color: #00ffff; overflow-y: auto; z-index: 2000000; font-family: monospace; padding: 10px; font-size: 11px; border: 1px solid #00ffff; pointer-events: none; border-radius: 4px; opacity: 0.7;`;
    document.body.appendChild(log);

    const details = document.createElement('div');
    details.id = 'entity-details';
    details.style.cssText = `position: fixed; top: 50px; left: 10px; width: 250px; background: rgba(0,0,0,0.9); color: #fff; padding: 12px; font-family: monospace; font-size: 12px; border: 1px solid #444; border-radius: 4px; z-index: 1000007; display: none; pointer-events: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.5);`;
    document.body.appendChild(details);

    function logPos(msg: string) { posLog.textContent = msg; }
    function logEvent(msg: string) {
        const e = document.createElement('div');
        e.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        log.prepend(e);
        if (log.children.length > 20) log.lastChild?.remove();
    }

    function showDetails(type: string, data: any) {
        details.style.display = 'block';
        details.style.borderColor = COLORS[data.faction as keyof typeof COLORS] || '#444';
        
        let html = `<div style="color: ${COLORS[data.faction as keyof typeof COLORS]}; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">${type.toUpperCase()} DETAILS</div>`;
        
        const selectionSource = map.getSource('selection') as maplibregl.GeoJSONSource;
        const selFeatures: any[] = [];

        if (type === 'portal') {
            html += `<div>ID: ${data.id}</div>`;
            html += `<div>Faction: ${data.faction}</div>`;
            html += `<div>Level: ${data.level}</div>`;
            html += `<div>Health: 100%</div>`;
            const p = generator.portals.get(data.id);
            if (p) selFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { type: 'portal' } });
        } else if (type === 'link') {
            html += `<div>ID: ${data.id}</div>`;
            html += `<div>Faction: ${data.faction}</div>`;
            html += `<div style="margin-top: 4px; color: #aaa; font-size: 10px;">From: ${data.p1}</div>`;
            html += `<div style="color: #aaa; font-size: 10px;">To: ${data.p2}</div>`;
            const l = generator.linksMap.get(data.id);
            if (l) selFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[l.p1.lng, l.p1.lat], [l.p2.lng, l.p2.lat]] }, properties: { type: 'link' } });
        } else if (type === 'field') {
            html += `<div>ID: ${data.id}</div>`;
            html += `<div>Faction: ${data.faction}</div>`;
            html += `<div style="margin-top: 4px; color: #0ff;">Layers: ${data.layerInfo}</div>`;
            html += `<div style="margin-top: 4px; color: #aaa; font-size: 10px;">Anchors:</div>`;
            data.anchors.forEach((a: string) => {
                html += `<div style="color: #888; font-size: 9px; padding-left: 8px;">• ${a}</div>`;
            });
            const f = generator.fieldsMap.get(data.id);
            if (f) {
                const poly = [[f.p1.lng, f.p1.lat], [f.p2.lng, f.p2.lat], [f.p3.lng, f.p3.lat], [f.p1.lng, f.p1.lat]];
                selFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: poly }, properties: { type: 'field' } });
            }
        }
        
        if (selectionSource) selectionSource.setData({ type: 'FeatureCollection', features: selFeatures });

        html += `<div style="margin-top: 10px; text-align: right;"><button id="close-details" style="background: #222; color: #eee; border: 1px solid #555; padding: 2px 8px; cursor: pointer; font-size: 10px;">CLOSE</button></div>`;
        details.innerHTML = html;
        
        document.getElementById('close-details')?.addEventListener('click', () => {
            details.style.display = 'none';
            if (selectionSource) selectionSource.setData({ type: 'FeatureCollection', features: [] });
        });
    }

    const map = new maplibregl.Map({
        container: 'map-poc-container',
        style: {
            version: 8,
            sources: {
                'carto': { type: 'raster', tiles: MAP_STYLES['Dark'], tileSize: 256, attribution: '&copy; CARTO' },
                'entities': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
                'selection': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
                'debug-hitbox': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
            },
            layers: [
                { id: 'carto', type: 'raster', source: 'carto' },
                { id: 'f-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'ENL']], paint: { 'fill-extrusion-color': COLORS.ENL, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                { id: 'f-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'RES']], paint: { 'fill-extrusion-color': COLORS.RES, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                { id: 'l-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'faction', 'ENL']], paint: { 'fill-extrusion-color': COLORS.ENL, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                { id: 'l-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'faction', 'RES']], paint: { 'fill-extrusion-color': COLORS.RES, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                { id: 'p-ext', type: 'fill-extrusion', source: 'entities', filter: ['==', 'type', 'portal-ext'], paint: { 'fill-extrusion-color': ['match', ['get', 'faction'], 'ENL', COLORS.ENL, 'RES', COLORS.RES, 'MAC', COLORS.MAC, COLORS.NEU], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'] }, layout: { visibility: 'none' } },
                { id: 'f-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'ENL']], paint: { 'fill-color': COLORS.ENL, 'fill-opacity': 0.1 } },
                { id: 'f-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'faction', 'RES']], paint: { 'fill-color': COLORS.RES, 'fill-opacity': 0.1 } },
                { id: 'l-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'ENL']], paint: { 'line-color': COLORS.ENL, 'line-width': 1.5 } },
                { id: 'l-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'RES']], paint: { 'line-color': COLORS.RES, 'line-width': 1.5 } },
                { id: 'l-mac', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'faction', 'MAC']], paint: { 'line-color': COLORS.MAC, 'line-width': 1.5 } },
                { id: 'p', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': ['step', ['get', 'level'], 2, 4, 3, 7, 4, 8, 6], 'circle-color': ['match', ['get', 'faction'], 'ENL', COLORS.ENL, 'RES', COLORS.RES, 'MAC', COLORS.MAC, COLORS.NEU], 'circle-stroke-width': 1, 'circle-stroke-color': '#fff' } },
                
                // Selection / Debug layers
                { id: 'sel-f', type: 'line', source: 'selection', filter: ['==', 'type', 'field'], paint: { 'line-color': '#fff', 'line-width': 3, 'line-opacity': 0.8 } },
                { id: 'sel-l', type: 'line', source: 'selection', filter: ['==', 'type', 'link'], paint: { 'line-color': '#fff', 'line-width': 4, 'line-opacity': 0.8 } },
                { id: 'sel-p', type: 'circle', source: 'selection', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': 12, 'circle-color': 'transparent', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } },
                { id: 'hitbox', type: 'fill', source: 'debug-hitbox', paint: { 'fill-color': '#f00', 'fill-opacity': 0.2, 'fill-outline-color': '#f00' } },

                // Tether layers
                { id: 'f-tether-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field-tether'], ['==', 'faction', 'ENL']], paint: { 'fill-extrusion-color': COLORS.ENL, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.2 }, layout: { visibility: 'none' } },
                { id: 'f-tether-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field-tether'], ['==', 'faction', 'RES']], paint: { 'fill-extrusion-color': COLORS.RES, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.2 }, layout: { visibility: 'none' } }
            ]

        },
        center: [4.8952, 52.3702], zoom: 13
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
    mk('R', () => { map.setCenter([4.8952, 52.3702]); map.setZoom(13); map.setPitch(0); map.setBearing(0); });
    mk('X', () => toggleExtrusion(map));
    mk('D', () => switchStyle(map, 'Dark'));
    mk('L', () => switchStyle(map, 'Light'));
    mk('V', () => switchStyle(map, 'Voyager'));
    mk('O', () => switchStyle(map, 'OSM'));
    mk('P', () => {
        patternMode = (patternMode + 1) % 4;
        if (patternMode === 1) {
            loadPattern1(map);
        } else if (patternMode === 2) {
            loadPattern2(map);
        } else if (patternMode === 3) {
            loadPattern3(map);
        } else {
            generator.clear();
            loadedKeys.clear();
            checkAndLoad(map);
        }
    });

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
        logEvent(`Map Click @ ${e.lngLat.lng.toFixed(4)}, ${e.lngLat.lat.toFixed(4)}`);
        
        // --- 1. Debug Hitbox Visualization ---
        const pixelBuffer = 20;
        const p0 = map.unproject([e.point.x - pixelBuffer, e.point.y - pixelBuffer]);
        const p1 = map.unproject([e.point.x + pixelBuffer, e.point.y - pixelBuffer]);
        const p2 = map.unproject([e.point.x + pixelBuffer, e.point.y + pixelBuffer]);
        const p3 = map.unproject([e.point.x - pixelBuffer, e.point.y + pixelBuffer]);
        const hitboxPoly = [[ [p0.lng, p0.lat], [p1.lng, p1.lat], [p2.lng, p2.lat], [p3.lng, p3.lat], [p0.lng, p0.lat] ]];
        
        const hbSource = map.getSource('debug-hitbox') as maplibregl.GeoJSONSource;
        if (hbSource) {
            hbSource.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: hitboxPoly }, properties: {} }] });
            setTimeout(() => hbSource.setData({ type: 'FeatureCollection', features: [] }), 500);
        }

        // --- 2. Query Logic ---
        const latRange = Math.abs(map.unproject([e.point.x, e.point.y + pixelBuffer]).lat - map.unproject([e.point.x, e.point.y - pixelBuffer]).lat);
        const lngRange = Math.abs(map.unproject([e.point.x + pixelBuffer, e.point.y]).lng - map.unproject([e.point.x - pixelBuffer, e.point.y]).lng);
        const queryBounds = { minX: e.lngLat.lng - lngRange, minY: e.lngLat.lat - latRange, maxX: e.lngLat.lng + lngRange, maxY: e.lngLat.lat + latRange };
        const results = generator.query(queryBounds);
        
        if (results.length === 0) { 
            logEvent("MISS: No entity nearby"); 
            details.style.display = 'none';
            (map.getSource('selection') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
            return; 
        }

        const portals = results.filter(r => r.type === 'portal').map(r => generator.portals.get(r.id)!);
        const links = results.filter(r => r.type === 'link').map(r => generator.linksMap.get(r.id)!);
        const allFields = results.filter(r => r.type === 'field').map(r => generator.fieldsMap.get(r.id)!).filter(f => generator.isPointInField(e.lngLat, f));

        // --- 3. Balanced Priority Evaluation ---
        
        // Priority A: Precise Portal Hit (10px)
        const portalHits = portals.map(p => {
            const screenP = map.project([p.lng, p.lat]);
            const dist = Math.hypot(screenP.x - e.point.x, screenP.y - e.point.y);
            return { p, dist };
        }).filter(h => h.dist < 10).sort((a, b) => a.dist - b.dist);

        if (portalHits.length > 0) {
            const p = portalHits[0].p;
            logEvent(`SNAP PORTAL: ${p.id} (${portalHits[0].dist.toFixed(1)}px)`);
            showDetails('portal', { id: p.id, faction: p.faction, level: p.level });
            return;
        }

        // Priority B: Field Hit (favors area over link edges)
        if (allFields.length > 0) {
            // Sort by layer descending to pick the "top" pane
            const sortedFields = [...allFields].sort((a, b) => b.layer - a.layer);
            const f = sortedFields[0]; 
            logEvent(`SELECT FIELD: ${f.id} (Layer ${f.layer}, ${allFields.length} total)`);
            showDetails('field', { 
                id: f.id, 
                faction: f.faction, 
                layerInfo: `${allFields.length} overlapping layers (Selected Layer ${f.layer})`,
                anchors: [f.p1.id, f.p2.id, f.p3.id] 
            });
            return;
        }

        // Priority C: Precise Link Hit (5px)
        const linkHits = links.map(l => {
            const p1 = map.project([l.p1.lng, l.p1.lat]);
            const p2 = map.project([l.p2.lng, l.p2.lat]);
            const A = e.point.x - p1.x;
            const B = e.point.y - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;
            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = -1;
            if (len_sq !== 0) param = dot / len_sq;
            let xx, yy;
            if (param < 0) { xx = p1.x; yy = p1.y; }
            else if (param > 1) { xx = p2.x; yy = p2.y; }
            else { xx = p1.x + param * C; yy = p1.y + param * D; }
            const dist = Math.hypot(e.point.x - xx, e.point.y - yy);
            return { l, dist };
        }).filter(h => h.dist < 5).sort((a, b) => a.dist - b.dist);

        if (linkHits.length > 0) {
            const l = linkHits[0].l;
            logEvent(`SNAP LINK: ${l.id} (${linkHits[0].dist.toFixed(1)}px)`);
            showDetails('link', { id: l.id, faction: l.faction, p1: l.p1.id, p2: l.p2.id });
            return;
        }

        details.style.display = 'none';
        (map.getSource('selection') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
    });
}
setTimeout(initMap, 500);
