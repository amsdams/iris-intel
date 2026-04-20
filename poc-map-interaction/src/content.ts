import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MockDataGenerator, Faction } from './MockDataGenerator';
import { getMinLevelForZoom, getGridSizeForZoom } from './ZoomPolicy';
import { useStore, globalSpatialIndex, EntityParser } from '@iris/core';

console.log("POC (TS): Intel Mode (Initial Zoom 13) | v1.0.1 | Default: Amsterdam");

function createCirclePolygon(lng: number, lat: number, radiusMeters: number, sides: number = 12): number[][][] {
    const coords: number[][] = [];
    const km = radiusMeters / 1000;
    const latOffset = km / 111.32;
    const lngOffset = km / (111.32 * Math.cos(lat * Math.PI / 180));

    for (let i = 0; i < sides; i++) {
        const angle = (i * 360 / sides) * Math.PI / 180;
        coords.push([
            lng + lngOffset * Math.cos(angle),
            lat + latOffset * Math.sin(angle)
        ]);
    }
    coords.push(coords[0]); // Close polygon
    return [coords];
}

function initMap() {
    const generator = new MockDataGenerator();
    const loadedKeys = new Set<string>();
    let extrusionEnabled = false;
    let patternMode = 0; // 0: Off, 1: Nested, 2: Single Nested
    let liveMode = false;

    const teamToFaction = (team: string): Faction => {
        if (team === 'E') return 'ENL';
        if (team === 'R') return 'RES';
        if (team === 'M') return 'MAC';
        return 'NEU';
    };

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

        ['f-ext-enl', 'f-ext-res', 'l-ext-enl', 'l-ext-res', 'l-ext-mac', 'p-ext', 'f-tether-enl', 'f-tether-res'].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
        });
        ['f-enl', 'f-res', 'l-enl', 'l-res', 'l-mac', 'p'].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', flatVisibility);
        });

        if (extrusionEnabled) {
            map.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
        } else {
            map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
        }
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
        
        // --- ENL (East) ---
        const eOff = 0.003;
        generator.addPortal('A', 'ENL', center.lng - 0.002 + eOff, center.lat, 8);
        generator.addPortal('B', 'ENL', center.lng + 0.002 + eOff, center.lat, 8);
        generator.addPortal('C', 'ENL', center.lng + eOff, center.lat + 0.003, 8);
        generator.addPortal('D', 'ENL', center.lng + eOff, center.lat + 0.001, 8);
        generator.addLink('L-AB', 'ENL', 'A', 'B');
        generator.addLink('L-BC', 'ENL', 'B', 'C');
        generator.addLink('L-CA', 'ENL', 'C', 'A');
        generator.addLink('L-AD', 'ENL', 'A', 'D');
        generator.addLink('L-BD', 'ENL', 'B', 'D');

        // --- RES (West) ---
        const wOff = -0.003;
        generator.addPortal('RA', 'RES', center.lng - 0.002 + wOff, center.lat, 8);
        generator.addPortal('RB', 'RES', center.lng + 0.002 + wOff, center.lat, 8);
        generator.addPortal('RC', 'RES', center.lng + wOff, center.lat + 0.003, 8);
        generator.addPortal('RD', 'RES', center.lng + wOff, center.lat + 0.001, 8);
        generator.addLink('RL-AB', 'RES', 'RA', 'RB');
        generator.addLink('RL-BC', 'RES', 'RB', 'RC');
        generator.addLink('RL-CA', 'RES', 'RC', 'RA');
        generator.addLink('RL-AD', 'RES', 'RA', 'RD');
        generator.addLink('RL-BD', 'RES', 'RB', 'RD');

        syncToMap(map);
        logEvent("PATTERN 1: Mirror Single Nested.");
    }

    function loadPattern2(map: maplibregl.Map) {
        generator.clear();
        loadedKeys.clear();
        const center = map.getCenter();
        
        // --- ENL (East) ---
        const eOff = 0.003;
        generator.addPortal('A', 'ENL', center.lng - 0.002 + eOff, center.lat, 8);
        generator.addPortal('B', 'ENL', center.lng + 0.002 + eOff, center.lat, 8);
        generator.addPortal('C', 'ENL', center.lng + eOff, center.lat + 0.003, 8);
        generator.addPortal('D', 'ENL', center.lng + eOff, center.lat + 0.001, 8);
        generator.addLink('L-AB', 'ENL', 'A', 'B');
        generator.addLink('L-BC', 'ENL', 'B', 'C');
        generator.addLink('L-CA', 'ENL', 'C', 'A');
        generator.addLink('L-AD', 'ENL', 'A', 'D');
        generator.addLink('L-BD', 'ENL', 'B', 'D');
        generator.addLink('L-CD', 'ENL', 'C', 'D');

        // --- RES (West) ---
        const wOff = -0.003;
        generator.addPortal('RA', 'RES', center.lng - 0.002 + wOff, center.lat, 8);
        generator.addPortal('RB', 'RES', center.lng + 0.002 + wOff, center.lat, 8);
        generator.addPortal('RC', 'RES', center.lng + wOff, center.lat + 0.003, 8);
        generator.addPortal('RD', 'RES', center.lng + wOff, center.lat + 0.001, 8);
        generator.addLink('RL-AB', 'RES', 'RA', 'RB');
        generator.addLink('RL-BC', 'RES', 'RB', 'RC');
        generator.addLink('RL-CA', 'RES', 'RC', 'RA');
        generator.addLink('RL-AD', 'RES', 'RA', 'RD');
        generator.addLink('RL-BD', 'RES', 'RB', 'RD');
        generator.addLink('RL-CD', 'RES', 'RC', 'RD');

        syncToMap(map);
        logEvent("PATTERN 2: Mirror Nested Diamond.");
    }

    function loadPattern3(map: maplibregl.Map) {
        generator.clear();
        loadedKeys.clear();
        const center = map.getCenter();

        // --- ENL (Center-East) ---
        const eOff = 0.003;
        generator.addPortal('A', 'ENL', center.lng - 0.002 + eOff, center.lat, 8);
        generator.addPortal('B', 'ENL', center.lng + 0.002 + eOff, center.lat, 8);
        generator.addPortal('C', 'ENL', center.lng + eOff, center.lat + 0.003, 8);
        generator.addPortal('D', 'ENL', center.lng + eOff, center.lat + 0.001, 8);
        generator.addPortal('E', 'ENL', center.lng + eOff, center.lat + 0.0005, 8);
        generator.addLink('L-AB', 'ENL', 'A', 'B');
        generator.addLink('L-BC', 'ENL', 'B', 'C');
        generator.addLink('L-CA', 'ENL', 'C', 'A');
        generator.addLink('L-AD', 'ENL', 'A', 'D');
        generator.addLink('L-BD', 'ENL', 'B', 'D');
        generator.addLink('L-CD', 'ENL', 'C', 'D');
        generator.addLink('L-AE', 'ENL', 'A', 'E');
        generator.addLink('L-BE', 'ENL', 'B', 'E');
        generator.addLink('L-DE', 'ENL', 'D', 'E');

        // --- RES (Center-West) ---
        const wOff = -0.003;
        generator.addPortal('RA', 'RES', center.lng - 0.002 + wOff, center.lat, 8);
        generator.addPortal('RB', 'RES', center.lng + 0.002 + wOff, center.lat, 8);
        generator.addPortal('RC', 'RES', center.lng + wOff, center.lat + 0.003, 8);
        generator.addPortal('RD', 'RES', center.lng + wOff, center.lat + 0.001, 8);
        generator.addPortal('RE', 'RES', center.lng + wOff, center.lat + 0.0005, 8);
        generator.addLink('RL-AB', 'RES', 'RA', 'RB');
        generator.addLink('RL-BC', 'RES', 'RB', 'RC');
        generator.addLink('RL-CA', 'RES', 'RC', 'RA');
        generator.addLink('RL-AD', 'RES', 'RA', 'RD');
        generator.addLink('RL-BD', 'RES', 'RB', 'RD');
        generator.addLink('RL-CD', 'RES', 'RC', 'RD');
        generator.addLink('RL-AE', 'RES', 'RA', 'RE');
        generator.addLink('RL-BE', 'RES', 'RB', 'RE');
        generator.addLink('RL-DE', 'RES', 'RD', 'RE');

        // --- Machina Cluster (Far East) ---
        const mOff = 0.009; // Increased offset
        generator.addPortal('M1', 'MAC', center.lng + mOff, center.lat + 0.002, 1);
        generator.addPortal('M2', 'MAC', center.lng + mOff + 0.002, center.lat, 1);
        generator.addPortal('M3', 'MAC', center.lng + mOff - 0.002, center.lat - 0.002, 1);
        generator.addLink('ML-12', 'MAC', 'M1', 'M2');

        // --- Neutral Hubs (Far North) ---
        const nOff = 0.006; // Increased offset
        generator.addPortal('N1', 'NEU', center.lng - 0.002, center.lat + nOff, 0);
        generator.addPortal('N2', 'NEU', center.lng + 0.002, center.lat + nOff, 0);

        syncToMap(map);
        logEvent("PATTERN 3: Scaled Global Scenario.");
    }



    function syncToMap(map: maplibregl.Map) {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
        const buffer = 0.05; // ~5km buffer
        
        const q = {
            minLat: bounds.getSouth() - buffer,
            minLng: bounds.getWest() - buffer,
            maxLat: bounds.getNorth() + buffer,
            maxLng: bounds.getEast() + buffer
        };

        const results = liveMode ? globalSpatialIndex.query(q) : generator.query({ minX: q.minLng, minY: q.minLat, maxX: q.maxLng, maxY: q.maxLat });
        const features: any[] = [];
        const store = useStore.getState();

        // Pre-calculate heights based on highest anchored field layer
        const portalMaxLayer = new Map<string, number>();
        const linkMaxLayer = new Map<string, number>();
        
        const processFieldForHeights = (_id: string, layer: number, p1Id: string, p2Id: string, p3Id: string) => {
            [p1Id, p2Id, p3Id].forEach(pid => {
                const currentP = portalMaxLayer.get(pid) ?? -1;
                if (layer > currentP) portalMaxLayer.set(pid, layer);
            });
            const lids = [ [p1Id, p2Id].sort().join('->'), [p2Id, p3Id].sort().join('->'), [p3Id, p1Id].sort().join('->') ];
            lids.forEach(lid => {
                const currentL = linkMaxLayer.get(lid) ?? -1;
                if (layer > currentL) linkMaxLayer.set(lid, layer);
            });
        };

        if (liveMode) {
            Object.values(store.fields).forEach((f: any) => {
                const layer = 0; 
                processFieldForHeights(f.id, layer, f.points[0].id, f.points[1].id, f.points[2].id);
            });
        } else {
            generator.fieldsMap.forEach(f => processFieldForHeights(f.id, f.layer, f.p1.id, f.p2.id, f.p3.id));
        }
        
        results.forEach((item: any) => {
            if (item.type === 'portal') {
                const p = liveMode ? store.portals[item.id] : generator.portals.get(item.id);
                if (!p) return;
                const faction = liveMode ? teamToFaction((p as any).team) : (p as any).faction;
                const level = (p as any).level ?? 0;
                
                const isVisible = patternMode > 0 || liveMode || level >= minLevel;
                if (isVisible) {
                    const maxLayer = portalMaxLayer.get(p.id) ?? -1;
                    const towerHeight = 200 + (maxLayer * 20) + 15;
                    const props = { id: p.id, type: 'portal', faction, level, height: towerHeight, base_height: 0 };
                    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: props });
                    features.push({ 
                        type: 'Feature', 
                        geometry: { type: 'Polygon', coordinates: createCirclePolygon(p.lng, p.lat, 8, 12) }, 
                        properties: { ...props, type: 'portal-ext' } 
                    });
                }
            } else if (item.type === 'link') {
                const l = liveMode ? store.links[item.id] : generator.linksMap.get(item.id);
                if (!l) return;
                const faction = liveMode ? teamToFaction((l as any).team) : (l as any).faction;
                const p1 = liveMode ? store.portals[(l as any).fromGuid] : (l as any).p1;
                const p2 = liveMode ? store.portals[(l as any).toGuid] : (l as any).p2;
                
                const isVisible = patternMode > 0 || liveMode || (p1 && p2 && p1.level >= minLevel && p2.level >= minLevel);
                if (isVisible && p1 && p2) {
                    const baseProps = { id: l.id, type: 'link', faction };
                    features.push({ type: 'Feature', id: `l-${l.id}`, geometry: { type: 'LineString', coordinates: [[p1.lng, p1.lat], [p2.lng, p2.lat]] }, properties: baseProps });
                    
                    const dx = p2.lng - p1.lng;
                    const dy = p2.lat - p1.lat;
                    const len = Math.sqrt(dx*dx + dy*dy);
                    const maxLayer = linkMaxLayer.get(l.id) ?? -1;
                    const baseAlt = maxLayer >= 0 ? 200 + (maxLayer * 20) : 10;

                    const n1x = -dy / (len || 1) * 0.00006;
                    const n1y = dx / (len || 1) * 0.00006;
                    const poly = [[ [p1.lng+n1x, p1.lat+n1y], [p2.lng+n1x, p2.lat+n1y], [p2.lng-n1x, p2.lat-n1y], [p1.lng-n1x, p1.lat-n1y], [p1.lng+n1x, p1.lat+n1y] ]];
                    features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: poly }, properties: { ...baseProps, type: 'link-ext', height: baseAlt + 2, base_height: baseAlt } });
                    
                    const n2x = -dy / (len || 1) * 0.00003;
                    const n2y = dx / (len || 1) * 0.00003;
                    const poly2 = [[ [p1.lng+n2x, p1.lat+n2y], [p2.lng+n2x, p2.lat+n2y], [p2.lng-n2x, p2.lat-n2y], [p1.lng-n2x, p1.lat-n2y], [p1.lng+n2x, p1.lat+n2y] ]];
                    features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: poly2 }, properties: { ...baseProps, type: 'link-ext', height: baseAlt + 5, base_height: baseAlt + 2 } });
                }
            } else if (item.type === 'field') {
                const f = liveMode ? store.fields[item.id] : generator.fieldsMap.get(item.id);
                if (!f) return;
                const faction = liveMode ? teamToFaction((f as any).team) : (f as any).faction;
                const points = liveMode ? (f as any).points : [(f as any).p1, (f as any).p2, (f as any).p3];
                const layer = liveMode ? 0 : (f as any).layer;

                const isVisible = patternMode > 0 || liveMode || points.every((p: any) => (p.level ?? 0) >= minLevel);
                if (isVisible) {
                    const poly = [...points.map((p: any) => [p.lng, p.lat]), [points[0].lng, points[0].lat]];
                    const base_height = 200 + (layer * 20);
                    const height = base_height + 5;
                    features.push({ type: 'Feature', id: `f-${f.id}`, geometry: { type: 'Polygon', coordinates: [poly] }, properties: { id: f.id, type: 'field', faction, height, base_height } });
                    
                    points.forEach((p: any, i: number) => {
                        const s = 0.00005;
                        const tPoly = [[ [p.lng-s, p.lat-s], [p.lng+s, p.lat-s], [p.lng+s, p.lat+s], [p.lng-s, p.lat+s], [p.lng-s, p.lat-s] ]];
                        features.push({ 
                            type: 'Feature', 
                            id: `t-${f.id}-${i}`,
                            geometry: { type: 'Polygon', coordinates: tPoly }, 
                            properties: { type: 'field-tether', faction, height: base_height, base_height: 0 } 
                        });
                    });
                }
            }
        });

        const source = map.getSource('entities') as maplibregl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features });
        
        const totalItems = liveMode ? (Object.keys(store.portals).length + Object.keys(store.links).length + Object.keys(store.fields).length) : (generator.portals.size + generator.linksMap.size + generator.fieldsMap.size);
        logEvent(`RENDERED: ${features.length} / ${totalItems} items (Mode: ${liveMode ? 'LIVE' : 'SIM'})`);
    }

    function checkAndLoad(map: maplibregl.Map) {
        const zoom = map.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
        const gridSize = getGridSizeForZoom(zoom);
        const bounds = map.getBounds();
        logPos(`Z:${zoom.toFixed(1)} | Min L:${minLevel} | Grid:${gridSize.toFixed(2)}°${patternMode > 0 ? ` | PATTERN ${patternMode}` : ''}${liveMode ? ' | LIVE' : ''}`);
        
        if (patternMode > 0 || liveMode) {
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

    const bodyStyle = document.createElement('style');
    bodyStyle.textContent = `
        #map-poc-container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #222; z-index: 1000000; display: none; }
        #launch-3d-btn { position: fixed; bottom: 120px; right: 10px; width: 60px; height: 60px; background: #000; color: #00ffff; border: 2px solid #00ffff; border-radius: 50%; z-index: 1000010; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; box-shadow: 0 0 15px rgba(0,255,255,0.4); }
        .debug-btn { width: 40px; height: 40px; background: rgba(34,34,34,0.9); color: #fff; border: 1px solid #00ffff; border-radius: 4px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; -webkit-user-select: none; user-select: none; }
        #pos-log { position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.85); color: #fff; padding: 4px 8px; font-family: monospace; font-size: 11px; border-radius: 4px; z-index: 1000006; border: 1px solid #888; pointer-events: none; display: none; }
        #debug-btns-container { display: none; }
        #event-log { display: none; }
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
                { id: 'l-ext-mac', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'faction', 'MAC']], paint: { 'fill-extrusion-color': COLORS.MAC, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
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
    btns.id = 'debug-btns-container';
    btns.style.cssText = 'position: fixed; top: 10px; right: 10px; display: none; flex-direction: row; flex-wrap: wrap; justify-content: flex-end; gap: 6px; z-index: 2000001; max-width: 140px; pointer-events: none;';
    document.body.appendChild(btns);
    const mk = (l: string, a: () => void) => {
        const b = document.createElement('div'); b.className = 'debug-btn'; b.textContent = l;
        b.style.pointerEvents = 'auto';
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
        if (patternMode > 0) liveMode = false; 
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
    mk('L', () => {
        liveMode = !liveMode;
        if (liveMode) patternMode = 0;
        generator.clear();
        loadedKeys.clear();
        checkAndLoad(map);
        logEvent(`Mode: ${liveMode ? 'LIVE (Real Data)' : 'SIMULATION'}`);
    });

    // Subscribe to real IRIS store updates
    useStore.subscribe((state: any, prevState: any) => {
        if (liveMode && (state.portals !== prevState.portals || state.links !== prevState.links || state.fields !== prevState.fields)) {
            syncToMap(map);
        }
    });

    map.on('load', () => {
        container.style.background = 'transparent';
        map.resize();
        checkAndLoad(map);
    });
    function syncIntelMap() {
        if (!liveMode) return;
        const center = map.getCenter();
        window.postMessage({
            type: 'IRIS_SYNC_INTEL_MAP',
            lat: center.lat,
            lng: center.lng,
            zoom: Math.round(map.getZoom())
        }, '*');
    }

    map.on('move', () => {
        logPos(`Z:${map.getZoom().toFixed(1)} | Min L:${getMinLevelForZoom(map.getZoom())} | Grid:${getGridSizeForZoom(map.getZoom()).toFixed(2)}°`);
        syncIntelMap();
    });
    map.on('moveend', () => {
        syncIntelMap();
        checkAndLoad(map);
    });
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
        
        const qB = { minX: e.lngLat.lng - lngRange, minY: e.lngLat.lat - latRange, maxX: e.lngLat.lng + lngRange, maxY: e.lngLat.lat + latRange };
        const qG = { minLat: e.lngLat.lat - latRange, minLng: e.lngLat.lng - lngRange, maxLat: e.lngLat.lat + latRange, maxLng: e.lngLat.lng + lngRange };
        
        const results = liveMode ? globalSpatialIndex.query(qG) : generator.query(qB);
        
        if (results.length === 0) { 
            logEvent("MISS: No entity nearby"); 
            details.style.display = 'none';
            (map.getSource('selection') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
            return; 
        }

        const store = useStore.getState();
        const portals = results.filter(r => r.type === 'portal').map(r => liveMode ? store.portals[r.id] : generator.portals.get(r.id)!).filter(Boolean);
        const links = results.filter(r => r.type === 'link').map(r => liveMode ? store.links[r.id] : generator.linksMap.get(r.id)!).filter(Boolean);
        const allFields = results.filter(r => r.type === 'field').map(r => {
            const f = liveMode ? store.fields[r.id] : generator.fieldsMap.get(r.id)!;
            if (!f) return null;
            // Normalize for isPointInField
            const points = liveMode ? (f as any).points : [(f as any).p1, (f as any).p2, (f as any).p3];
            const normF = { ...f, p1: points[0], p2: points[1], p3: points[2] };
            return generator.isPointInField(e.lngLat, normF as any) ? f : null;
        }).filter(Boolean);

        // --- 3. Balanced Priority Evaluation ---
        
        // Priority A: Precise Portal Hit (10px)
        const portalHits = portals.map(p => {
            const screenP = map.project([p.lng, p.lat]);
            const dist = Math.hypot(screenP.x - e.point.x, screenP.y - e.point.y);
            return { p, dist };
        }).filter(h => h.dist < 10).sort((a, b) => a.dist - b.dist);

        if (portalHits.length > 0) {
            const p = portalHits[0].p;
            const faction = liveMode ? teamToFaction((p as any).team) : (p as any).faction;
            logEvent(`SNAP PORTAL: ${p.id} (${portalHits[0].dist.toFixed(1)}px)`);
            showDetails('portal', { id: p.id, faction, level: p.level });
            return;
        }

        // Priority B: Field Hit (favors area over link edges)
        if (allFields.length > 0) {
            // Sort by layer descending to pick the "top" pane
            const sortedFields = [...allFields].sort((a: any, b: any) => (b.layer || 0) - (a.layer || 0));
            const f = sortedFields[0] as any; 
            const faction = liveMode ? teamToFaction(f.team) : f.faction;
            const layer = liveMode ? 0 : f.layer;
            const anchors = liveMode ? f.points.map((p: any) => p.id) : [f.p1.id, f.p2.id, f.p3.id];

            logEvent(`SELECT FIELD: ${f.id} (Layer ${layer}, ${allFields.length} total)`);
            showDetails('field', { 
                id: f.id, 
                faction, 
                layerInfo: `${allFields.length} overlapping layers (Selected Layer ${layer})`,
                anchors
            });
            return;
        }

        // Priority C: Precise Link Hit (5px)
        const linkHits = links.map(l => {
            const p1 = liveMode ? store.portals[(l as any).fromGuid] : (l as any).p1;
            const p2 = liveMode ? store.portals[(l as any).toGuid] : (l as any).p2;
            if (!p1 || !p2) return { l, dist: 999 };

            const s1 = map.project([p1.lng, p1.lat]);
            const s2 = map.project([p2.lng, p2.lat]);
            const A = e.point.x - s1.x;
            const B = e.point.y - s1.y;
            const C = s2.x - s1.x;
            const D = s2.y - s1.y;
            const dot = A * C + B * D;
            const len_sq = C * C + D * D;
            let param = -1;
            if (len_sq !== 0) param = dot / len_sq;
            let xx, yy;
            if (param < 0) { xx = s1.x; yy = s1.y; }
            else if (param > 1) { xx = s2.x; yy = s2.y; }
            else { xx = s1.x + param * C; yy = s1.y + param * D; }
            const dist = Math.hypot(e.point.x - xx, e.point.y - yy);
            return { l, dist };
        }).filter(h => h.dist < 5).sort((a, b) => a.dist - b.dist);

        if (linkHits.length > 0) {
            const l = linkHits[0].l as any;
            const faction = liveMode ? teamToFaction(l.team) : l.faction;
            const p1Id = liveMode ? l.fromGuid : l.p1.id;
            const p2Id = liveMode ? l.toGuid : l.p2.id;
            logEvent(`SNAP LINK: ${l.id} (${linkHits[0].dist.toFixed(1)}px)`);
            showDetails('link', { id: l.id, faction, p1: p1Id, p2: p2Id });
            return;
        }

        details.style.display = 'none';
        (map.getSource('selection') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
    });

    function initInterceptor() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('interceptor.js');
        script.type = 'text/javascript';
        (document.head || document.documentElement).appendChild(script);
        script.addEventListener('load', () => script.remove());
        console.log('IRIS POC: Web-Accessible Interceptor Triggered');
    }

    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg || msg.type !== 'IRIS_DATA') return;

        // Handle getEntities or similar data
        if (msg.url.includes('getEntities')) {
            const rawData = msg.data;
            const parsed = EntityParser.parse(rawData);
            const store = useStore.getState();
            
            if (parsed.portals.length > 0) store.updatePortals(parsed.portals);
            if (parsed.links.length > 0) store.updateLinks(parsed.links);
            if (parsed.fields.length > 0) store.updateFields(parsed.fields);
            
            if (rawData.result?.map) {
                store.setTileFreshness(Object.keys(rawData.result.map));
            }
            
            logEvent(`Live Data: ${parsed.portals.length}P, ${parsed.links.length}L, ${parsed.fields.length}F`);
        }
    });

    initInterceptor();

    const launchBtn = document.createElement('div');
    launchBtn.id = 'launch-3d-btn';
    launchBtn.textContent = '3D';
    document.body.appendChild(launchBtn);

    let is3DVisible = false;
    launchBtn.addEventListener('click', () => {
        is3DVisible = !is3DVisible;
        container.style.display = is3DVisible ? 'block' : 'none';
        posLog.style.display = is3DVisible ? 'block' : 'none';
        btns.style.display = is3DVisible ? 'flex' : 'none';
        log.style.display = is3DVisible ? 'block' : 'none';
        launchBtn.style.background = is3DVisible ? '#00ffff' : '#000';
        launchBtn.style.color = is3DVisible ? '#000' : '#00ffff';
        
        if (is3DVisible) {
            map.resize();
            checkAndLoad(map);
        }
    });
}
setTimeout(initMap, 500);
