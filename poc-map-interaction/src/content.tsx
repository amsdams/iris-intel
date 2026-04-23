import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { render, h, Fragment } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { MockDataGenerator, Faction } from './MockDataGenerator';
import { useStore, globalSpatialIndex, EntityParser, PortalDetailsParser, getMinLevelForZoom, getGridSizeForZoom, Portal, Link, Field } from '@iris/core';
import { Dashboard } from './Dashboard';
import { TacticalUI } from './TacticalUI';

console.log("POC (TS): Tactical Overlay | v1.1.0 | Preact Refactor Active");

function createCirclePolygon(lng: number, lat: number, radiusMeters: number, sides = 12): number[][][] {
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
    coords.push(coords[0]);
    return [coords];
}

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

function TacticalOverlay(): h.JSX.Element {
    const [map, setMap] = useState<maplibregl.Map | null>(null);
    const [generator] = useState(() => new MockDataGenerator());
    const [loadedKeys] = useState(() => new Set<string>());
    const [events, setEvents] = useState<{time: string, msg: string}[]>([]);
    const [selected, setSelected] = useState<{type: string, data: Portal | Link | Field} | null>(null);
    const [mapState, setMapState] = useState({ zoom: 13, lat: 52.3702, lng: 4.8952 });
    const [liveMode, setLiveMode] = useState(true);
    const [patternMode, setPatternMode] = useState(0);
    const [extrusionEnabled, setExtrusionEnabled] = useState(false);
    const [isVis, setIsVis] = useState(false);

    const logEvent = useCallback((msg: string): void => {
        setEvents(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 30));
        console.log(`[POC] ${msg}`);
    }, []);

    const loadPattern1 = useCallback((): void => {
        if (!map) return;
        generator.clear(); loadedKeys.clear();
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
        logEvent("PATTERN 1: Single Nested.");
    }, [map, generator, loadedKeys, logEvent]);

    const loadPattern2 = useCallback((): void => {
        if (!map) return;
        generator.clear(); loadedKeys.clear();
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
        logEvent("PATTERN 2: Nested Diamond.");
    }, [map, generator, loadedKeys, logEvent]);

    const loadPattern3 = useCallback((): void => {
        if (!map) return;
        generator.clear(); loadedKeys.clear();
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
        logEvent("PATTERN 3: Scaled Global Scenario.");
    }, [map, generator, loadedKeys, logEvent]);

    const syncToMap = useCallback((currentMap: maplibregl.Map, currentLiveMode: boolean, currentPatternMode: number): void => {
        if (!currentMap || !currentMap.getStyle()) return;
        const bounds = currentMap.getBounds();
        const zoom = currentMap.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
        const buffer = 0.05; 
        
        const q = {
            minLat: bounds.getSouth() - buffer,
            minLng: bounds.getWest() - buffer,
            maxLat: bounds.getNorth() + buffer,
            maxLng: bounds.getEast() + buffer
        };

        const results = currentLiveMode ? globalSpatialIndex.query(q) : generator.query({ minX: q.minLng, minY: q.minLat, maxX: q.maxLng, maxY: q.maxLat });
        const features: GeoJSON.Feature[] = [];
        const store = useStore.getState();

        const portalMaxLayer = new Map<string, number>();
        const linkMaxLayer = new Map<string, number>();
        
        const processFieldForHeights = (layer: number, p1Id: string, p2Id: string, p3Id: string): void => {
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

        if (currentLiveMode) {
            Object.values(store.fields).forEach((f) => {
                const p1Id = f.points[0]?.portalId;
                const p2Id = f.points[1]?.portalId;
                const p3Id = f.points[2]?.portalId;
                if (p1Id && p2Id && p3Id) processFieldForHeights(0, p1Id, p2Id, p3Id);
            });
        } else {
            generator.fieldsMap.forEach(f => {
                const p1Id = f.points[0]?.portalId;
                const p2Id = f.points[1]?.portalId;
                const p3Id = f.points[2]?.portalId;
                if (p1Id && p2Id && p3Id) processFieldForHeights(0, p1Id, p2Id, p3Id);
            });
        }
        
        results.forEach((item) => {
            if (item.type === 'portal') {
                const p = currentLiveMode ? store.portals[item.id] : generator.portals.get(item.id);
                if (!p) return;
                const faction = p.team;
                const level = p.level ?? 0;
                
                const isVisible = currentPatternMode > 0 || currentLiveMode || level >= minLevel;
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
                const l = currentLiveMode ? store.links[item.id] : generator.linksMap.get(item.id);
                if (!l) return;
                const p1 = currentLiveMode ? store.portals[l.fromPortalId] : generator.portals.get(l.fromPortalId);
                const p2 = currentLiveMode ? store.portals[l.toPortalId] : generator.portals.get(l.toPortalId);
                
                const isVisible = currentPatternMode > 0 || currentLiveMode || (p1 && p2 && (p1.level ?? 0) >= minLevel && (p2.level ?? 0) >= minLevel);
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
                const f = currentLiveMode ? store.fields[item.id] : generator.fieldsMap.get(item.id);
                if (!f) return;
                const faction = f.team;
                const points = f.points;

                const isVisible = currentPatternMode > 0 || currentLiveMode || points.every((p) => {
                    const pid = p.portalId;
                    const portal = pid ? (currentLiveMode ? store.portals[pid] : generator.portals.get(pid)) : null;
                    return (portal?.level ?? 0) >= minLevel;
                });
                if (isVisible) {
                    const poly = [...points.map((p) => [p.lng, p.lat]), [points[0].lng, points[0].lat]];
                    const base_height = 200;
                    const height = base_height + 5;
                    features.push({ type: 'Feature', id: `f-${f.id}`, geometry: { type: 'Polygon', coordinates: [poly] }, properties: { id: f.id, type: 'field', team: faction, height, base_height } });
                    
                    points.forEach((p, i: number) => {
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

        const source = currentMap.getSource('entities') as maplibregl.GeoJSONSource | undefined;
        if (source) {
            source.setData({ type: 'FeatureCollection', features });
            logEvent(`RENDERED: ${features.length} items`);
        }
    }, [generator, logEvent]);

    const checkAndLoad = useCallback((currentMap: maplibregl.Map, currentPatternMode: number, currentLiveMode: boolean): void => {
        if (!currentMap || !currentMap.getStyle()) return;

        const zoom = currentMap.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
        const gridSize = getGridSizeForZoom(zoom);
        const bounds = currentMap.getBounds();
        
        if (currentPatternMode > 0 || currentLiveMode) {
            syncToMap(currentMap, currentLiveMode, currentPatternMode);
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
                    // Manual cell generation would go here
                    loadedKeys.add(key);
                }
            }
        }
        syncToMap(currentMap, currentLiveMode, currentPatternMode);
    }, [loadedKeys, syncToMap]);

    useEffect(() => {
        const m = new maplibregl.Map({
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

        m.on('move', () => {
            const center = m.getCenter();
            setMapState({ zoom: m.getZoom(), lat: center.lat, lng: center.lng });
            if (liveMode) {
                window.postMessage({
                    type: 'IRIS_SYNC_INTEL_MAP',
                    lat: center.lat,
                    lng: center.lng,
                    zoom: Math.round(m.getZoom())
                }, '*');
            }
        });

        m.on('moveend', () => {
            const center = m.getCenter();
            setMapState({ zoom: m.getZoom(), lat: center.lat, lng: center.lng });
            checkAndLoad(m, patternMode, liveMode);
        });

        m.on('click', (e) => {
            logEvent(`Map Click @ ${e.lngLat.lng.toFixed(4)}, ${e.lngLat.lat.toFixed(4)}`);
            const pixelBuffer = 40;
            const pLow = m.unproject([e.point.x - pixelBuffer, e.point.y + pixelBuffer]);
            const pHigh = m.unproject([e.point.x + pixelBuffer, e.point.y - pixelBuffer]);
            const qG = { minLat: pLow.lat, minLng: pLow.lng, maxLat: pHigh.lat, maxLng: pHigh.lng };
            const results = liveMode ? globalSpatialIndex.query(qG) : generator.query({ minX: qG.minLng, minY: qG.minLat, maxX: qG.maxLng, maxY: qG.maxLat });
            
            if (results.length === 0) { 
                setSelected(null);
                (m.getSource('selection') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
                return; 
            }

            const store = useStore.getState();
            const portals = results.filter(r => r.type === 'portal').map(r => liveMode ? store.portals[r.id] : generator.portals.get(r.id)).filter((p): p is Portal => !!p);
            const links = results.filter(r => r.type === 'link').map(r => liveMode ? store.links[r.id] : generator.linksMap.get(r.id)).filter((l): l is Link => !!l);
            const allFields = results.filter(r => r.type === 'field').map(r => {
                const f = liveMode ? store.fields[r.id] : generator.fieldsMap.get(r.id);
                return f && generator.isPointInField(e.lngLat, f) ? f : null;
            }).filter((f): f is Field => !!f);

            const portalHits = portals.map(p => {
                const screenP = m.project([p.lng, p.lat]);
                const dist = Math.hypot(screenP.x - e.point.x, screenP.y - e.point.y);
                return { p, dist };
            }).filter(h => h.dist < 10).sort((a, b) => a.dist - b.dist);

            if (portalHits.length > 0) {
                const p = portalHits[0].p;
                setSelected({ type: 'portal', data: p });
                if (liveMode) window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: p.id }, '*');
                return;
            }

            if (allFields.length > 0) {
                setSelected({ type: 'field', data: allFields[0] });
                return;
            }

            const linkHits = links.map(l => {
                const p1 = m.project([l.fromLng, l.fromLat]);
                const p2 = m.project([l.toLng, l.toLat]);
                const A = e.point.x - p1.x; const B = e.point.y - p1.y;
                const C = p2.x - p1.x; const D = p2.y - p1.y;
                const dot = A * C + B * D; const len_sq = C * C + D * D;
                let param = -1; if (len_sq !== 0) param = dot / len_sq;
                let xx: number, yy: number;
                if (param < 0) { xx = p1.x; yy = p1.y; }
                else if (param > 1) { xx = p2.x; yy = p2.y; }
                else { xx = p1.x + param * C; yy = p1.y + param * D; }
                const dist = Math.hypot(e.point.x - xx, e.point.y - yy);
                return { l, dist };
            }).filter(h => h.dist < 5).sort((a, b) => a.dist - b.dist);

            if (linkHits.length > 0) {
                setSelected({ type: 'link', data: linkHits[0].l });
                return;
            }

            setSelected(null);
            (m.getSource('selection') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
        });

        setMap(m);
        return () => m.remove();
    }, [generator, checkAndLoad, liveMode, logEvent, patternMode]);

    // Live Data Message Listener
    useEffect(() => {
        const handler = (event: MessageEvent): void => {
            const msg = event.data;
            if (!msg || msg.type !== 'IRIS_DATA') return;
            let parsedParams: any = msg.params;
            if (typeof msg.params === 'string') { try { parsedParams = JSON.parse(msg.params); } catch { } }

            if (msg.url.includes('getEntities')) {
                const parsed = EntityParser.parse(msg.data);
                const store = useStore.getState();
                if (parsed.portals.length > 0) store.updatePortals(parsed.portals);
                if (parsed.links.length > 0) store.updateLinks(parsed.links);
                if (parsed.fields.length > 0) store.updateFields(parsed.fields);
                store.syncIndex();
                if (msg.data.result?.map) store.setTileFreshness(Object.keys(msg.data.result.map));
                logEvent(`Live Data: ${parsed.portals.length}P, ${parsed.links.length}L`);
                if (map) syncToMap(map, liveMode, patternMode);
            } else if (msg.url.includes('getPortalDetails')) {
                const store = useStore.getState();
                const guid = parsedParams?.guid || '';
                if (!guid) return;
                const linksIn = Object.values(store.links).filter((link) => link.toPortalId === guid).length;
                const linksOut = Object.values(store.links).filter((link) => link.fromPortalId === guid).length;
                const parsed = PortalDetailsParser.parse(msg.data, { guid }, linksIn + linksOut);
                if (parsed) {
                    store.updatePortals([parsed]);
                    logEvent(`Details: ${parsed.name || 'unknown'} | ${parsed.resonators?.length || 0} resos`);
                    if (selected?.type === 'portal' && selected.data.id === guid) {
                        setSelected({ type: 'portal', data: store.portals[guid] });
                    }
                }
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [map, liveMode, patternMode, logEvent, selected]);

    // Render Selection Highlights
    useEffect(() => {
        if (!map || !selected) return;
        const selSource = map.getSource('selection') as maplibregl.GeoJSONSource;
        if (!selSource) return;
        const selFeat: GeoJSON.Feature[] = [];
        if (selected.type === 'portal') {
            const p = selected.data as Portal;
            selFeat.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { type: 'portal' } });
        } else if (selected.type === 'link') {
            const l = selected.data as Link;
            const p1 = liveMode ? useStore.getState().portals[l.fromPortalId] : generator.portals.get(l.fromPortalId);
            const p2 = liveMode ? useStore.getState().portals[l.toPortalId] : generator.portals.get(l.toPortalId);
            if (p1 && p2) selFeat.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[p1.lng, p1.lat], [p2.lng, p2.lat]] }, properties: { type: 'link' } });
        } else if (selected.type === 'field') {
            const f = selected.data as Field;
            const poly = [...f.points.map((p) => [p.lng, p.lat]), [f.points[0].lng, f.points[0].lat]];
            selFeat.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: poly }, properties: { type: 'field' } });
        }
        selSource.setData({ type: 'FeatureCollection', features: selFeat });
    }, [map, selected, liveMode, generator]);

    const handleNav = (action: string): void => {
        if (!map) return;
        if (action === '+') map.zoomIn();
        else if (action === '-') map.zoomOut();
        else if (action === '↑') map.panBy([0, -200]);
        else if (action === '↓') map.panBy([0, 200]);
        else if (action === '←') map.panBy([-200, 0]);
        else if (action === '→') map.panBy([200, 0]);
        else if (action === 'R') { map.setCenter([4.8952, 52.3702]); map.setZoom(13); }
    };

    const handleStyle = (style: string): void => {
        if (!map || !map.getStyle() || !MAP_STYLES[style]) return;
        if (map.getLayer('carto')) map.removeLayer('carto');
        if (map.getSource('carto')) map.removeSource('carto');
        map.addSource('carto', { type: 'raster', tiles: MAP_STYLES[style], tileSize: 256, attribution: style === 'OSM' ? '&copy; OpenStreetMap' : '&copy; CARTO' });
        const layers = map.getStyle().layers;
        map.addLayer({ id: 'carto', type: 'raster', source: 'carto' }, layers?.[0]?.id);
        logEvent(`Style: ${style}`);
    };

    const handleMode = (mode: string): void => {
        if (!map || !map.getStyle()) return;
        if (mode === '3D') {
            const nextExtrusion = !extrusionEnabled;
            setExtrusionEnabled(nextExtrusion);
            const visibility = nextExtrusion ? 'visible' : 'none';
            const flatVisibility = nextExtrusion ? 'none' : 'visible';
            ['f-ext-enl', 'f-ext-res', 'f-ext-mac', 'l-ext-enl', 'l-ext-res', 'l-ext-mac', 'p-ext', 'f-tether-enl', 'f-tether-res'].forEach(id => {
                if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
            });
            ['f-enl', 'f-res', 'f-mac', 'l-enl', 'l-res', 'l-mac', 'p'].forEach(id => {
                if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', flatVisibility);
            });
            if (nextExtrusion) map.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
            else map.easeTo({ pitch: 0, bearing: 0, duration: 800 });
            logEvent(`Extrusion: ${nextExtrusion ? 'ON' : 'OFF'}`);
        } else if (mode === 'Src') {
            if (liveMode) { setLiveMode(false); setPatternMode(1); generator.clear(); loadedKeys.clear(); }
            else if (patternMode === 1) setPatternMode(2);
            else if (patternMode === 2) setPatternMode(3);
            else { setPatternMode(0); setLiveMode(true); generator.clear(); loadedKeys.clear(); }
        }
    };

    // Store subscription
    useEffect(() => {
        const unsub = useStore.subscribe((state, prevState) => {
            if (liveMode && map && (state.portals !== prevState.portals || state.links !== prevState.links || state.fields !== prevState.fields)) {
                syncToMap(map, liveMode, patternMode);
            }
        });
        return () => unsub();
    }, [map, liveMode, patternMode, syncToMap]);

    // Effect to trigger load/sync on mode changes
    useEffect(() => {
        if (!map) return;
        if (patternMode === 1) loadPattern1();
        else if (patternMode === 2) loadPattern2();
        else if (patternMode === 3) loadPattern3();
        
        checkAndLoad(map, patternMode, liveMode);
    }, [map, patternMode, liveMode, checkAndLoad, loadPattern1, loadPattern2, loadPattern3]);

    return (
        <div id="poc-preact-root" style={{ pointerEvents: 'none' }}>
            {isVis && (
                <Fragment>
                    <TacticalUI 
                        zoom={mapState.zoom} lat={mapState.lat} lng={mapState.lng} 
                        events={events}
                        onNav={handleNav} onStyle={handleStyle} onMode={handleMode}
                    />
                    {selected && (
                        <Dashboard 
                            type={selected.type} data={selected.data} colors={COLORS} 
                            onClose={() => setSelected(null)}
                        />
                    )}
                </Fragment>
            )}
            <div id="launch-3d-btn" onClick={() => {
                setIsVis(!isVis);
                if (!isVis && map && map.getStyle()) {
                    map.resize();
                    checkAndLoad(map, patternMode, liveMode);
                    logEvent("Tactical Map Opened");
                }
            }} style={{ position: 'fixed', bottom: '120px', right: '10px', width: '60px', height: '60px', background: '#000', color: '#00ffff', border: '2px solid #00ffff', borderRadius: '50%', zIndex: 1000010, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 0 15px rgba(0,255,255,0.4)', pointerEvents: 'auto' }}>3D</div>            <style>{`
                #map-poc-container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #222; z-index: 1000000; display: ${isVis ? 'block' : 'none'}; pointer-events: auto; }
            `}</style>
        </div>
    );
}

function initApp(): void {
const script = document.createElement('script');
    script.src = chrome.runtime.getURL('interceptor.js');
    script.type = 'text/javascript';
    document.head.appendChild(script);
    script.addEventListener('load', () => script.remove());

    const container = document.createElement('div');
    container.id = 'map-poc-container';
    document.body.appendChild(container);

    const uiRoot = document.createElement('div');
    document.body.appendChild(uiRoot);
    render(h(TacticalOverlay, {}), uiRoot);
}

setTimeout(initApp, 500);
