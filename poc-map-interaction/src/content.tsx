import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { render, h, Fragment } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { MockDataGenerator } from './MockDataGenerator';
import { useStore, globalSpatialIndex, getMinLevelForZoom, getGridSizeForZoom, Portal, Link, Field } from '@iris/core';
import { Dashboard } from './Dashboard';
import { TacticalUI } from './TacticalUI';
import { COLORS, MAP_STYLES } from './MapConstants';
import { LaunchButton } from './LaunchButton';
import { MapContainer } from './MapContainer';
import { usePatterns } from './usePatterns';
import { useIntelMessages } from './useIntelMessages';
import { useMapRenderer } from './useMapRenderer';

console.log("POC (TS): Tactical Overlay | v1.2.3 | Modular Refactor (Features Reverted)");

function TacticalOverlay(): h.JSX.Element {
    const [map, setMap] = useState<maplibregl.Map | null>(null);
    const [generator] = useState(() => new MockDataGenerator());
    const [loadedKeys] = useState(() => new Set<string>());
    const [events, setEvents] = useState<{time: string, msg: string}[]>([]);
    const [selected, setSelected] = useState<{type: string, data: any} | null>(null);
    const [mapState, setMapState] = useState({ zoom: 13, lat: 52.3702, lng: 4.8952 });
    const [liveMode, setLiveMode] = useState(true);
    const [patternMode, setPatternMode] = useState(0);
    const [extrusionEnabled, setExtrusionEnabled] = useState(false);
    const [isVis, setIsVis] = useState(false);

    const logEvent = useCallback((msg: string): void => {
        setEvents(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 30));
        console.log(`[POC] ${msg}`);
    }, []);

    const { syncToMap } = useMapRenderer(generator, logEvent);
    const { loadPattern1, loadPattern2, loadPattern3 } = usePatterns(map, generator, loadedKeys, logEvent);
    
    useIntelMessages(map, liveMode, patternMode, selected, setSelected, (m, l, p) => syncToMap(m, l, p), logEvent);

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
                    { id: 'f-enl', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'E']], paint: { 'fill-color': COLORS.E, 'fill-opacity': 0.3 } },
                    { id: 'f-res', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'R']], paint: { 'fill-color': COLORS.R, 'fill-opacity': 0.3 } },
                    { id: 'f-mac', type: 'fill', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'M']], paint: { 'fill-color': COLORS.M, 'fill-opacity': 0.3 } },
                    { id: 'l-enl', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'E']], paint: { 'line-color': COLORS.E, 'line-width': 1.5 } },
                    { id: 'l-res', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'R']], paint: { 'line-color': COLORS.R, 'line-width': 1.5 } },
                    { id: 'l-mac', type: 'line', source: 'entities', filter: ['all', ['==', 'type', 'link'], ['==', 'team', 'M']], paint: { 'line-color': COLORS.M, 'line-width': 1.5 } },
                    { id: 'f-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'E']], paint: { 'fill-extrusion-color': COLORS.E, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                    { id: 'f-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'R']], paint: { 'fill-extrusion-color': COLORS.R, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                    { id: 'f-ext-mac', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'field'], ['==', 'team', 'M']], paint: { 'fill-extrusion-color': COLORS.M, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.5 }, layout: { visibility: 'none' } },
                    { id: 'l-ext-enl', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'E']], paint: { 'fill-extrusion-color': COLORS.E, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                    { id: 'l-ext-res', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'R']], paint: { 'fill-extrusion-color': COLORS.R, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                    { id: 'l-ext-mac', type: 'fill-extrusion', source: 'entities', filter: ['all', ['==', 'type', 'link-ext'], ['==', 'team', 'M']], paint: { 'fill-extrusion-color': COLORS.M, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': ['get', 'base_height'], 'fill-extrusion-opacity': 0.8 }, layout: { visibility: 'none' } },
                    { id: 'p-ext', type: 'fill-extrusion', source: 'entities', filter: ['==', 'type', 'portal-ext'], paint: { 'fill-extrusion-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N], 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 0.9 }, layout: { visibility: 'none' } },
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
            let results;
            if (liveMode) {
                useStore.getState().syncIndex();
                results = globalSpatialIndex.query(qG);
            } else {
                results = generator.query({ minX: qG.minLng, minY: qG.minLat, maxX: qG.maxLng, maxY: qG.maxLat });
            }
            
            if (!results || results.length === 0) { 
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

            setSelected(null);
            (m.getSource('selection') as maplibregl.GeoJSONSource)?.setData({ type: 'FeatureCollection', features: [] });
        });

        setMap(m);
        return () => m.remove();
    }, [generator, checkAndLoad, liveMode, logEvent, patternMode, syncToMap]);

    // Render Selection Highlights
    useEffect(() => {
        if (!map || !selected) return;
        const selSource = map.getSource('selection') as maplibregl.GeoJSONSource;
        if (!selSource) return;
        const selFeat: GeoJSON.Feature[] = [];
        if (selected.type === 'portal') {
            const p = selected.data as Portal;
            selFeat.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { type: 'portal' } });
        }
        selSource.setData({ type: 'FeatureCollection', features: selFeat });
    }, [map, selected]);

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
            const layers3D = [
                'f-ext-enl', 'f-ext-res', 'f-ext-mac', 
                'l-ext-enl', 'l-ext-res', 'l-ext-mac', 
                'p-ext'
            ];
            const layersFlat = [
                'f-enl', 'f-res', 'f-mac', 
                'l-enl', 'l-res', 'l-mac', 
                'p'
            ];
            layers3D.forEach(id => {
                if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibility);
            });
            layersFlat.forEach(id => {
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
            <MapContainer isVis={isVis} />
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
            <LaunchButton isVis={isVis} onClick={() => {
                setIsVis(!isVis);
                if (!isVis && map && map.getStyle()) {
                    map.resize();
                    checkAndLoad(map, patternMode, liveMode);
                    logEvent("Tactical Map Opened");
                }
            }} />
        </div>
    );
}

function initApp(): void {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('interceptor.js');
    script.type = 'text/javascript';
    document.head.appendChild(script);
    script.addEventListener('load', () => script.remove());

    const uiRoot = document.createElement('div');
    document.body.appendChild(uiRoot);
    render(h(TacticalOverlay, {}), uiRoot);
}

setTimeout(initApp, 500);
