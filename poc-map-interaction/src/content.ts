import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MockDataGenerator, Faction } from './MockDataGenerator';
import { useStore, globalSpatialIndex, EntityParser, getMinLevelForZoom, getGridSizeForZoom } from '@iris/core';

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
    let patternMode = 0; // 0: Off, 1: Pattern 1, etc.
    let liveMode = true;

    const COLORS = { E: '#00ff00', R: '#0000ff', M: '#ff0000', N: '#ffffff' };
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
        
        const layers = map.getStyle().layers;
        const firstLayer = layers && layers.length > 0 ? layers[0].id : undefined;
        map.addLayer({ id: 'carto', type: 'raster', source: 'carto' }, firstLayer && firstLayer !== 'carto' ? firstLayer : undefined);
        logEvent(`Style: ${name}`);
    }

    function toggleExtrusion(map: maplibregl.Map) {
        extrusionEnabled = !extrusionEnabled;
        const visibility = extrusionEnabled ? 'visible' : 'none';
        const flatVisibility = extrusionEnabled ? 'none' : 'visible';

        ['f-ext-enl', 'f-ext-res', 'f-ext-mac', 'l-ext-enl', 'l-ext-res', 'l-ext-mac', 'p-ext', 'f-tether-enl', 'f-tether-res'].forEach(id => {
            if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
        });
        ['f-enl', 'f-res', 'f-mac', 'l-enl', 'l-res', 'l-mac', 'p'].forEach(id => {
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
        
        if (portalCount > 2000) portalCount = 2000;
        
        logEvent(`Cell ${latIdx},${lngIdx} | Tier: ${densityKm2}/km² | Goal: ${portalCount} portals`);

        const factionPortals: Record<Faction, string[]> = { E: [], R: [], M: [], N: [] };

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
                const f: Faction = ['N', 'E', 'R', 'M'][Math.floor(Math.random() * 4)] as Faction;
                const p = generator.addPortal(`P-${cellId}-${i}`, f, lng, lat, level);
                factionPortals[f].push(p.id);
            }
        }

        (['E', 'R'] as Faction[]).forEach(f => {
            const pIds = factionPortals[f];
            if (pIds.length < 3) return;
            const anchor1 = pIds[0];
            const anchor2 = pIds[1];
            const targets = pIds.slice(2, Math.floor(pIds.length * 0.4)); 
            
            generator.addLink(`L-${cellId}-${f}-base`, f, anchor1, anchor2);
            
            targets.forEach((tId) => {
                generator.addLink(`L-${cellId}-${f}-${tId}-1`, f, anchor1, tId);
                generator.addLink(`L-${cellId}-${f}-${tId}-2`, f, anchor2, tId);
            });
        });
    }

    function loadPattern1(map: maplibregl.Map) {
        generator.clear();
        loadedKeys.clear();
        const center = map.getCenter();
        
        generator.addPortal('A', 'E', center.lng - 0.002, center.lat, 8);
        generator.addPortal('B', 'E', center.lng + 0.002, center.lat, 8);
        generator.addPortal('C', 'E', center.lng, center.lat + 0.003, 8);
        generator.addPortal('D', 'E', center.lng, center.lat + 0.001, 8);
        generator.addLink('L-AB', 'E', 'A', 'B');
        generator.addLink('L-BC', 'E', 'B', 'C');
        generator.addLink('L-CA', 'E', 'C', 'A');
        generator.addLink('L-AD', 'E', 'A', 'D');
        generator.addLink('L-BD', 'E', 'B', 'D');

        syncToMap(map);
        logEvent("PATTERN 1: Single Nested.");
    }

    function loadPattern2(map: maplibregl.Map) {
        generator.clear();
        loadedKeys.clear();
        const center = map.getCenter();
        
        generator.addPortal('A', 'E', center.lng - 0.002, center.lat, 8);
        generator.addPortal('B', 'E', center.lng + 0.002, center.lat, 8);
        generator.addPortal('C', 'E', center.lng, center.lat + 0.003, 8);
        generator.addPortal('D', 'E', center.lng, center.lat + 0.001, 8);
        generator.addLink('L-AB', 'E', 'A', 'B');
        generator.addLink('L-BC', 'E', 'B', 'C');
        generator.addLink('L-CA', 'E', 'C', 'A');
        generator.addLink('L-AD', 'E', 'A', 'D');
        generator.addLink('L-BD', 'E', 'B', 'D');
        generator.addLink('L-CD', 'E', 'C', 'D');

        syncToMap(map);
        logEvent("PATTERN 2: Nested Diamond.");
    }

    function loadPattern3(map: maplibregl.Map) {
        generator.clear();
        loadedKeys.clear();
        const center = map.getCenter();

        generator.addPortal('A', 'E', center.lng - 0.002, center.lat, 8);
        generator.addPortal('B', 'E', center.lng + 0.002, center.lat, 8);
        generator.addPortal('C', 'E', center.lng, center.lat + 0.003, 8);
        generator.addPortal('D', 'E', center.lng, center.lat + 0.001, 8);
        generator.addPortal('E', 'E', center.lng, center.lat + 0.0005, 8);
        generator.addLink('L-AB', 'E', 'A', 'B');
        generator.addLink('L-BC', 'E', 'B', 'C');
        generator.addLink('L-CA', 'E', 'C', 'A');
        generator.addLink('L-AD', 'E', 'A', 'D');
        generator.addLink('L-BD', 'E', 'B', 'D');
        generator.addLink('L-CD', 'E', 'C', 'D');
        generator.addLink('L-AE', 'E', 'A', 'E');
        generator.addLink('L-BE', 'E', 'B', 'E');
        generator.addLink('L-DE', 'E', 'D', 'E');

        const mOff = 0.009;
        generator.addPortal('M1', 'M', center.lng + mOff, center.lat + 0.002, 1);
        generator.addPortal('M2', 'M', center.lng + mOff + 0.002, center.lat, 1);
        generator.addPortal('M3', 'M', center.lng + mOff - 0.002, center.lat - 0.002, 1);
        generator.addLink('ML-12', 'M', 'M1', 'M2');

        const nOff = 0.006;
        generator.addPortal('N1', 'N', center.lng - 0.002, center.lat + nOff, 0);
        generator.addPortal('N2', 'N', center.lng + 0.002, center.lat + nOff, 0);

        syncToMap(map);
        logEvent("PATTERN 3: Scaled Global Scenario.");
    }

    function syncToMap(map: maplibregl.Map) {
        const bounds = map.getBounds();
        const zoom = map.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
        const buffer = 0.05; 
        
        const q = {
            minLat: bounds.getSouth() - buffer,
            minLng: bounds.getWest() - buffer,
            maxLat: bounds.getNorth() + buffer,
            maxLng: bounds.getEast() + buffer
        };

        const results = liveMode ? globalSpatialIndex.query(q) : generator.query({ minX: q.minLng, minY: q.minLat, maxX: q.maxLng, maxY: q.maxLat });
        const features: any[] = [];
        const store = useStore.getState();

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
            Object.values(store.fields).forEach((f) => {
                processFieldForHeights(f.id, 0, f.points[0].portalId!, f.points[1].portalId!, f.points[2].portalId!);
            });
        } else {
            generator.fieldsMap.forEach(f => {
                processFieldForHeights(f.id, 0, f.points[0].portalId!, f.points[1].portalId!, f.points[2].portalId!);
            });
        }
        
        results.forEach((item: any) => {
            if (item.type === 'portal') {
                const p = liveMode ? store.portals[item.id] : generator.portals.get(item.id);
                if (!p) return;
                const faction = p.team;
                const level = p.level ?? 0;
                
                const isVisible = patternMode > 0 || liveMode || level >= minLevel;
                if (isVisible) {
                    const maxLayer = portalMaxLayer.get(p.id) ?? -1;
                    const towerHeight = 200 + (maxLayer * 20) + 15;
                    const props = { id: p.id, type: 'portal', team: faction, level, height: towerHeight, base_height: 0 };
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
                const p1 = liveMode ? store.portals[l.fromPortalId] : generator.portals.get(l.fromPortalId);
                const p2 = liveMode ? store.portals[l.toPortalId] : generator.portals.get(l.toPortalId);
                
                const isVisible = patternMode > 0 || liveMode || (p1 && p2 && (p1.level ?? 0) >= minLevel && (p2.level ?? 0) >= minLevel);
                if (isVisible && p1 && p2) {
                    const baseProps = { id: l.id, type: 'link', team: l.team };
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
                }
            } else if (item.type === 'field') {
                const f = liveMode ? store.fields[item.id] : generator.fieldsMap.get(item.id);
                if (!f) return;
                const faction = f.team;
                const points = f.points;

                const isVisible = patternMode > 0 || liveMode || points.every((p) => {
                    const portal = liveMode ? store.portals[p.portalId!] : generator.portals.get(p.portalId!);
                    return (portal?.level ?? 0) >= minLevel;
                });
                if (isVisible) {
                    const poly = [...points.map((p) => [p.lng, p.lat]), [points[0].lng, points[0].lat]];
                    const base_height = 200;
                    const height = base_height + 5;
                    features.push({ type: 'Feature', id: `f-${f.id}`, geometry: { type: 'Polygon', coordinates: [poly] }, properties: { id: f.id, type: 'field', team: faction, height, base_height } });
                    
                    points.forEach((p: any, i: number) => {
                        const s = 0.00005;
                        const tPoly = [[ [p.lng-s, p.lat-s], [p.lng+s, p.lat-s], [p.lng+s, p.lat+s], [p.lng-s, p.lat+s], [p.lng-s, p.lat-s] ]];
                        features.push({ 
                            type: 'Feature', 
                            id: `t-${f.id}-${i}`,
                            geometry: { type: 'Polygon', coordinates: tPoly }, 
                            properties: { type: 'field-tether', team: faction, height: base_height, base_height: 0 } 
                        });
                    });
                }
            }
        });

        const source = map.getSource('entities') as maplibregl.GeoJSONSource;
        if (source) source.setData({ type: 'FeatureCollection', features });
        logEvent(`RENDERED: ${features.length} items`);
    }

    function checkAndLoad(map: maplibregl.Map) {
        const zoom = map.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
        const gridSize = getGridSizeForZoom(zoom);
        const bounds = map.getBounds();
        
        if (patternMode > 0 || liveMode) {
            syncToMap(map);
            return;
        }

        if (zoom < 3) return;
        const startLat = Math.floor(bounds.getSouth() / gridSize);
        const endLat = Math.floor(bounds.getNorth() / gridSize);
        const startLng = Math.floor(bounds.getWest() / gridSize);
        const endLng = Math.floor(bounds.getEast() / gridSize);
        for (let lat = startLat; lat <= endLat; lat++) {
            for (let lng = startLng; lng <= endLng; lng++) {
                const key = `${lat},${lng},${gridSize},L${minLevel}`;
                if (!loadedKeys.has(key)) {
                    generateForCell(lat, lng, gridSize, minLevel);
                    loadedKeys.add(key);
                }
            }
        }
        syncToMap(map);
    }

    const bodyStyle = document.createElement('style');
    bodyStyle.textContent = `
        #map-poc-container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #222; z-index: 1000000; display: none; }
        #launch-3d-btn { position: fixed; bottom: 120px; right: 10px; width: 60px; height: 60px; background: #000; color: #00ffff; border: 2px solid #00ffff; border-radius: 50%; z-index: 1000010; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; box-shadow: 0 0 15px rgba(0,255,255,0.4); }
        .debug-btn { width: 36px; height: 36px; background: rgba(34,34,34,0.9); color: #fff; border: 1px solid #00ffff; border-radius: 4px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; -webkit-user-select: none; user-select: none; transition: background 0.2s; }
        .drawer-container { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .drawer-content { display: none; flex-direction: column; gap: 4px; padding: 4px; background: rgba(20,20,20,0.8); border-radius: 4px; border: 1px solid #00ffff; }
        #pos-log { position: fixed; top: 10px; left: 10px; background: rgba(0,0,0,0.85); color: #fff; padding: 4px 8px; font-family: monospace; font-size: 11px; border-radius: 4px; z-index: 1000006; border: 1px solid #888; pointer-events: none; display: none; }
        #event-log { position: fixed; bottom: 10px; left: 10px; right: 10px; height: 100px; background: rgba(0,0,0,0.85); color: #00ffff; overflow-y: auto; z-index: 2000000; font-family: monospace; padding: 10px; font-size: 11px; border: 1px solid #00ffff; pointer-events: none; border-radius: 4px; opacity: 0.8; display: none; }
    `;
    document.head.appendChild(bodyStyle);

    const container = document.createElement('div');
    container.id = 'map-poc-container';
    document.body.appendChild(container);

    const posLog = document.createElement('div');
    posLog.id = 'pos-log';
    document.body.appendChild(posLog);

    const eventLog = document.createElement('div');
    eventLog.id = 'event-log';
    document.body.appendChild(eventLog);

    const details = document.createElement('div');
    details.id = 'entity-details';
    details.style.cssText = `position: fixed; top: 50px; left: 10px; width: 250px; background: rgba(0,0,0,0.9); color: #fff; padding: 12px; font-family: monospace; font-size: 12px; border: 1px solid #444; border-radius: 4px; z-index: 1000007; display: none; pointer-events: auto;`;
    document.body.appendChild(details);

    function logEvent(msg: string) { 
        const entry = document.createElement('div');
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        eventLog.prepend(entry);
        if (eventLog.children.length > 30) eventLog.lastChild?.remove();
        console.log(`[POC] ${msg}`); 
    }

    function showDetails(type: string, data: any) {
        details.style.display = 'block';
        details.style.borderColor = COLORS[data.team as keyof typeof COLORS] || '#444';
        let html = `<div style="color: ${COLORS[data.team as keyof typeof COLORS]}; font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">${type.toUpperCase()} DETAILS</div>`;
        html += `<div>ID: ${data.id}</div>`;
        html += `<div>Team: ${data.team}</div>`;

        const selSource = map.getSource('selection') as maplibregl.GeoJSONSource;
        const selFeatures: any[] = [];

        if (type === 'portal') {
            selFeatures.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [data.lng, data.lat] }, properties: { type: 'portal' } });
        } else if (type === 'link') {
            const p1 = liveMode ? useStore.getState().portals[data.fromPortalId] : generator.portals.get(data.fromPortalId);
            const p2 = liveMode ? useStore.getState().portals[data.toPortalId] : generator.portals.get(data.toPortalId);
            if (p1 && p2) {
                selFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[p1.lng, p1.lat], [p2.lng, p2.lat]] }, properties: { type: 'link' } });
            }
        } else if (type === 'field') {
            const pts = data.points;
            const poly = [...pts.map((p: any) => [p.lng, p.lat]), [pts[0].lng, pts[0].lat]];
            selFeatures.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: poly }, properties: { type: 'field' } });
        }

        if (selSource) selSource.setData({ type: 'FeatureCollection', features: selFeatures });

        html += `<div style="margin-top: 10px; text-align: right;"><button id="close-details" style="background: #222; color: #eee; border: 1px solid #555; padding: 2px 8px; cursor: pointer; font-size: 10px;">CLOSE</button></div>`;
        details.innerHTML = html;
        document.getElementById('close-details')?.addEventListener('click', () => { 
            details.style.display = 'none'; 
            if (selSource) selSource.setData({ type: 'FeatureCollection', features: [] });
        });
    }

    const map = new maplibregl.Map({
        container: 'map-poc-container',
        style: {
            version: 8,
            sources: {
                'carto': { type: 'raster', tiles: MAP_STYLES['Dark'], tileSize: 256 },
                'entities': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } },
                'selection': { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }
            },
            layers: [
                { id: 'carto', type: 'raster', source: 'carto' },
                { id: 'f-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'E']], paint: { 'fill-color': COLORS.E, 'fill-opacity': 0.1 } },
                { id: 'f-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'R']], paint: { 'fill-color': COLORS.R, 'fill-opacity': 0.1 } },
                { id: 'f-mac', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'M']], paint: { 'fill-color': COLORS.M, 'fill-opacity': 0.1 } },
                { id: 'l-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'E']], paint: { 'line-color': COLORS.E, 'line-width': 1.5 } },
                { id: 'l-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'R']], paint: { 'line-color': COLORS.R, 'line-width': 1.5 } },
                { id: 'l-mac', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'M']], paint: { 'line-color': COLORS.M, 'line-width': 1.5 } },
                { id: 'f-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'E']], paint: { 'fill-extrusion-color': COLORS.E, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                { id: 'f-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'R']], paint: { 'fill-extrusion-color': COLORS.R, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                { id: 'f-ext-mac', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'M']], paint: { 'fill-extrusion-color': COLORS.M, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                { id: 'l-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'E']], paint: { 'fill-extrusion-color': COLORS.E, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                { id: 'l-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'R']], paint: { 'fill-extrusion-color': COLORS.R, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                { id: 'l-ext-mac', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'M']], paint: { 'fill-extrusion-color': COLORS.M, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                { id: 'sel-f', type: 'line', source: 'selection', filter: ['==', 'type', 'field'], paint: { 'line-color': '#fff', 'line-width': 3 } },
                { id: 'sel-l', type: 'line', source: 'selection', filter: ['==', 'type', 'link'], paint: { 'line-color': '#fff', 'line-width': 4 } },
                { id: 'sel-p', type: 'circle', source: 'selection', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': 12, 'circle-color': 'transparent', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } },
                { id: 'f-tether-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field-tether'], ['==', 'team', 'E']], paint: { 'fill-extrusion-color': COLORS.E, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.2 }, layout: { visibility: 'none' } },
                { id: 'f-tether-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field-tether'], ['==', 'team', 'R']], paint: { 'fill-extrusion-color': COLORS.R, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.2 }, layout: { visibility: 'none' } },
                { id: 'p', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': 4, 'circle-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N] } }
            ]
        },
        center: [4.8952, 52.3702], zoom: 13
    });

    const btns = document.createElement('div');
    btns.id = 'debug-btns-container';
    btns.style.cssText = 'position: fixed; top: 10px; right: 10px; display: none; flex-direction: column; align-items: flex-end; gap: 8px; z-index: 2000001; pointer-events: none;';
    document.body.appendChild(btns);

    const mkDrawer = (icon: string) => {
        const dContainer = document.createElement('div');
        dContainer.className = 'drawer-container';
        btns.appendChild(dContainer);
        const catBtn = document.createElement('div');
        catBtn.className = 'debug-btn';
        catBtn.textContent = icon;
        catBtn.style.pointerEvents = 'auto';
        dContainer.appendChild(catBtn);
        const content = document.createElement('div');
        content.className = 'drawer-content';
        dContainer.appendChild(content);

        catBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = content.style.display === 'flex';
            document.querySelectorAll('.drawer-content').forEach(d => (d as HTMLElement).style.display = 'none');
            content.style.display = isOpen ? 'none' : 'flex';
        });

        return (l: string, a: () => void) => {
            const b = document.createElement('div');
            b.className = 'debug-btn';
            b.textContent = l;
            b.style.pointerEvents = 'auto';
            b.addEventListener('click', (e) => { e.stopPropagation(); a(); });
            content.appendChild(b);
        };
    };

    const nav = mkDrawer('🧭');
    nav('+', () => map.zoomIn());
    nav('-', () => map.zoomOut());
    nav('R', () => { map.setCenter([4.8952, 52.3702]); map.setZoom(13); });

    const sty = mkDrawer('🎨');
    sty('D', () => switchStyle(map, 'Dark'));
    sty('L', () => switchStyle(map, 'Light'));
    sty('V', () => switchStyle(map, 'Voyager'));
    sty('O', () => switchStyle(map, 'OSM'));

    const mod = mkDrawer('🛠');
    mod('3D', () => toggleExtrusion(map));
    mod('Src', () => {
        if (liveMode) { liveMode = false; patternMode = 1; loadPattern1(map); }
        else if (patternMode === 1) { patternMode = 2; loadPattern2(map); }
        else if (patternMode === 2) { patternMode = 3; loadPattern3(map); }
        else { patternMode = 0; liveMode = true; generator.clear(); loadedKeys.clear(); checkAndLoad(map); }
    });

    useStore.subscribe((state, prevState) => {
        if (liveMode && (state.portals !== prevState.portals || state.links !== prevState.links || state.fields !== prevState.fields)) {
            syncToMap(map);
        }
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

    map.on('move', () => syncIntelMap());
    map.on('moveend', () => {
        syncIntelMap();
        checkAndLoad(map);
    });

    function initInterceptor() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('interceptor.js');
        script.type = 'text/javascript';
        (document.head || document.documentElement).appendChild(script);
        script.addEventListener('load', () => script.remove());
    }

    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg || msg.type !== 'IRIS_DATA') return;

        if (msg.url.includes('getEntities')) {
            const rawData = msg.data;
            const parsed = EntityParser.parse(rawData);
            const store = useStore.getState();
            
            if (parsed.portals.length > 0) store.updatePortals(parsed.portals);
            if (parsed.links.length > 0) store.updateLinks(parsed.links);
            if (parsed.fields.length > 0) store.updateFields(parsed.fields);
            
            store.syncIndex();
            
            if (rawData.result?.map) {
                store.setTileFreshness(Object.keys(rawData.result.map));
            }
        }
    });

    map.on('click', (e) => {
        const queryBuffer = 0.001; 
        const qG = { minLat: e.lngLat.lat - queryBuffer, minLng: e.lngLat.lng - queryBuffer, maxLat: e.lngLat.lat + queryBuffer, maxLng: e.lngLat.lng + queryBuffer };
        const results = liveMode ? globalSpatialIndex.query(qG) : generator.query({ minX: qG.minLng, minY: qG.minLat, maxX: qG.maxLng, maxY: qG.maxLat });
        
        if (results.length > 0) {
            // Priority: Portal > Field > Link
            const portalHit = results.find(r => r.type === 'portal');
            if (portalHit) {
                const p = liveMode ? useStore.getState().portals[portalHit.id] : generator.portals.get(portalHit.id);
                if (p) { showDetails('portal', p); return; }
            }

            const fieldHit = results.find(r => r.type === 'field');
            if (fieldHit) {
                const f = liveMode ? useStore.getState().fields[fieldHit.id] : generator.fieldsMap.get(fieldHit.id);
                if (f) { showDetails('field', f); return; }
            }

            const linkHit = results.find(r => r.type === 'link');
            if (linkHit) {
                const l = liveMode ? useStore.getState().links[linkHit.id] : generator.linksMap.get(linkHit.id);
                if (l) { showDetails('link', l); return; }
            }
        }
    });

    initInterceptor();

    const launchBtn = document.createElement('div');
    launchBtn.id = 'launch-3d-btn';
    launchBtn.textContent = '3D';
    document.body.appendChild(launchBtn);

    launchBtn.addEventListener('click', () => {
        const isVis = container.style.display === 'block';
        container.style.display = isVis ? 'none' : 'block';
        btns.style.display = isVis ? 'none' : 'flex';
        posLog.style.display = isVis ? 'none' : 'block';
        eventLog.style.display = isVis ? 'none' : 'block';
        if (!isVis) { map.resize(); checkAndLoad(map); logEvent("Tactical Map Opened"); }
    });
}
setTimeout(initMap, 500);
