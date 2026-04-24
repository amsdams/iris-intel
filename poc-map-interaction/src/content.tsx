import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { render, h, Fragment } from 'preact';
import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks';
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
import { useScores } from './useScores';
import { usePlayerStats } from './usePlayerStats';
import { useEndpointTelemetry } from './useEndpointTelemetry';
import { throttle } from './GeoUtils';

console.log("POC (TS): Tactical Overlay | v1.3.3 | Stable Orchestration");

const DEFAULT_MAP_CENTER: [number, number] = [4.8952, 52.3702];
const DEFAULT_MAP_ZOOM = 15;

function TacticalOverlay(): h.JSX.Element {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [generator] = useState(() => new MockDataGenerator());
    const [loadedKeys] = useState(() => new Set<string>());
    const [events, setEvents] = useState<{time: string, msg: string}[]>([]);
    const [selected, setSelected] = useState<{type: string, data: any} | null>(null);
    const [mapState, setMapState] = useState({ zoom: DEFAULT_MAP_ZOOM, lat: DEFAULT_MAP_CENTER[1], lng: DEFAULT_MAP_CENTER[0] });
    const [liveMode, setLiveMode] = useState(true);
    const [patternMode, setPatternMode] = useState(0);
    const [extrusionEnabled, setExtrusionEnabled] = useState(false);
    const [isVis, setIsVis] = useState(false);
    const liveModeRef = useRef(liveMode);
    const patternModeRef = useRef(patternMode);
    const moveSettleTimerRef = useRef<number | null>(null);

    const logEvent = useCallback((msg: string): void => {
        setEvents(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 30));
        console.log(`[POC] ${msg}`);
    }, []);

    useEffect(() => {
        liveModeRef.current = liveMode;
    }, [liveMode]);

    useEffect(() => {
        patternModeRef.current = patternMode;
    }, [patternMode]);

    const clearMoveSettleTimer = useCallback((): void => {
        if (moveSettleTimerRef.current !== null) {
            window.clearTimeout(moveSettleTimerRef.current);
            moveSettleTimerRef.current = null;
        }
    }, []);

    const endpointTelemetry = useEndpointTelemetry();

    useEffect(() => {
        const formatDelay = (ms: number | null | undefined): string => {
            if (typeof ms !== 'number' || !Number.isFinite(ms)) return '';
            const diff = Math.max(0, ms - Date.now());
            const seconds = Math.ceil(diff / 1000);
            if (seconds < 60) return `${seconds}s`;
            const minutes = Math.floor(seconds / 60);
            const rest = seconds % 60;
            return `${minutes}m ${rest}s`;
        };

        const handler = (event: MessageEvent): void => {
            const msg = event.data;
            if (!msg || msg.type !== 'IRIS_ENDPOINT_STATE') return;

            const endpoint = String(msg.endpoint ?? 'unknown');
            const status = String(msg.status ?? 'idle');
            const skipReason = typeof msg.lastSkipReason === 'string' ? msg.lastSkipReason : '';
            const cooldown = formatDelay(msg.cooldownUntil);
            const nextRefresh = formatDelay(msg.nextRefreshAt);
            const inFlightCount = typeof msg.inFlightCount === 'number' ? msg.inFlightCount : 0;

            if (status === 'in_flight') {
                logEvent(`NET ${endpoint}: in-flight${inFlightCount > 1 ? ` x${inFlightCount}` : ''}`);
                return;
            }

            if (status === 'error') {
                const suffix = cooldown ? `; backoff ${cooldown}` : '';
                logEvent(`NET ${endpoint}: error${skipReason ? ` (${skipReason})` : ''}${suffix}`);
                return;
            }

            if (skipReason) {
                const suffix = nextRefresh ? `; next ${nextRefresh}` : '';
                logEvent(`NET ${endpoint}: skipped ${skipReason}${suffix}`);
            }
        };

        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [logEvent]);

    const { syncToMap } = useMapRenderer(generator, logEvent);
    const { loadPattern1, loadPattern2, loadPattern3 } = usePatterns(mapRef.current, generator, loadedKeys, logEvent);
    
    useIntelMessages(mapRef.current, liveMode, patternMode, selected, setSelected, (m, l, p) => syncToMap(m, l, p), logEvent);
    useScores(isVis, liveMode);
    usePlayerStats(isVis, liveMode);

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
        let addedAny = false;
        for (let lat = startLat; lat <= endLat; lat++) {
            for (let lng = startLng; lng <= endLng; lng++) {
                const key = `${lat},${lng},${gridSize},L${minLevel}`;
                if (!loadedKeys.has(key)) {
                    loadedKeys.add(key);
                    addedAny = true;
                }
            }
        }
        syncToMap(currentMap, currentLiveMode, currentPatternMode);
        if (addedAny) logEvent(`Sim Tiles Loaded (Min L:${minLevel})`);
    }, [loadedKeys, syncToMap, logEvent]);

    const throttledSync = useMemo(() => throttle((m: maplibregl.Map) => {
        const center = m.getCenter();
        setMapState({ zoom: m.getZoom(), lat: center.lat, lng: center.lng });
    }, 100), []);

    const scheduleMoveSettleLoad = useCallback((m: maplibregl.Map): void => {
        clearMoveSettleTimer();

        const settleMs = liveModeRef.current ? 3000 : 300;
        moveSettleTimerRef.current = window.setTimeout(() => {
            moveSettleTimerRef.current = null;

            const center = m.getCenter();
            const currentZoom = m.getZoom();
            const currentLive = liveModeRef.current;
            const currentPattern = patternModeRef.current;

            setMapState({ zoom: currentZoom, lat: center.lat, lng: center.lng });
            if (currentLive) {
                window.postMessage({ type: 'IRIS_SYNC_INTEL_MAP', lat: center.lat, lng: center.lng, zoom: Math.round(currentZoom) }, '*');
            }
            checkAndLoad(m, currentPattern, currentLive);
        }, settleMs);
    }, [checkAndLoad, clearMoveSettleTimer]);

    const handlePortalClick = useCallback((lat: number, lng: number, name: string) => {
        if (!mapRef.current) return;
        logEvent(`Jumping to Portal: ${name}`);
        mapRef.current.flyTo({ center: [lng, lat], zoom: 17, duration: 2000 });
        
        const store = useStore.getState();
        const existing = Object.values(store.portals).find(p => Math.abs(p.lat - lat) < 0.0001 && Math.abs(p.lng - lng) < 0.0001);
        if (existing) {
            setSelected({ type: 'portal', data: existing });
            if (liveMode) window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: existing.id }, '*');
        } else {
            setSelected({ type: 'portal', data: { id: 'temp', lat, lng, team: 'N', name } as Portal });
        }
    }, [logEvent, liveMode]);

    useEffect(() => {
        if (mapRef.current) return; // Only init once
        
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
                    { id: 'sel-f', type: 'line', source: 'selection', filter: ['==', 'type', 'field'], paint: { 'line-color': '#fff', 'line-width': 3 } },
                    { id: 'sel-l', type: 'line', source: 'selection', filter: ['==', 'type', 'link'], paint: { 'line-color': '#fff', 'line-width': 4 } },
                    { id: 'sel-p', type: 'circle', source: 'selection', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': 12, 'circle-color': 'transparent', 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } },
                    { id: 'p', type: 'circle', source: 'entities', filter: ['==', 'type', 'portal'], paint: { 'circle-radius': 4, 'circle-color': ['match', ['get', 'team'], 'E', COLORS.E, 'R', COLORS.R, 'M', COLORS.M, COLORS.N] } }
                ]
            },
            center: DEFAULT_MAP_CENTER, zoom: DEFAULT_MAP_ZOOM
        });

        m.on('movestart', clearMoveSettleTimer);
        m.on('move', () => { throttledSync(m); });
        m.on('moveend', () => { scheduleMoveSettleLoad(m); });

        m.on('click', (e) => {
            const isLive = liveModeRef.current;
            logEvent(`Map Click @ ${e.lngLat.lng.toFixed(4)}, ${e.lngLat.lat.toFixed(4)}`);
            const pixelBuffer = 40;
            const pLow = m.unproject([e.point.x - pixelBuffer, e.point.y + pixelBuffer]);
            const pHigh = m.unproject([e.point.x + pixelBuffer, e.point.y - pixelBuffer]);
            const qG = { minLat: pLow.lat, minLng: pLow.lng, maxLat: pHigh.lat, maxLng: pHigh.lng };
            let results;
            if (isLive) {
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
            const portals = results.filter(r => r.type === 'portal').map(r => isLive ? store.portals[r.id] : generator.portals.get(r.id)).filter((p): p is Portal => !!p);
            const links = results.filter(r => r.type === 'link').map(r => isLive ? store.links[r.id] : generator.linksMap.get(r.id)).filter((l): l is Link => !!l);
            const allFields = results.filter(r => r.type === 'field').map(r => {
                const f = isLive ? store.fields[r.id] : generator.fieldsMap.get(r.id);
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
                if (isLive) window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: p.id }, '*');
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

        mapRef.current = m;
        return () => { m.remove(); mapRef.current = null; };
    }, [clearMoveSettleTimer, generator, logEvent, scheduleMoveSettleLoad, throttledSync]);

    useEffect(() => {
        return () => {
            clearMoveSettleTimer();
        };
    }, [clearMoveSettleTimer]);

    // 2. Selection highlights
    useEffect(() => {
        const m = mapRef.current;
        if (!m || !selected) return;
        const selSource = m.getSource('selection') as maplibregl.GeoJSONSource;
        if (!selSource) return;
        const selFeat: GeoJSON.Feature[] = [];
        const store = useStore.getState();

        if (selected.type === 'portal') {
            const p = selected.data as Portal;
            selFeat.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { type: 'portal' } });
        } else if (selected.type === 'link') {
            const l = selected.data as Link;
            const p1 = liveMode ? store.portals[l.fromPortalId] : generator.portals.get(l.fromPortalId);
            const p2 = liveMode ? store.portals[l.toPortalId] : generator.portals.get(l.toPortalId);
            if (p1 && p2) selFeat.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[p1.lng, p1.lat], [p2.lng, p2.lat]] }, properties: { type: 'link' } });
        } else if (selected.type === 'field') {
            const f = selected.data as Field;
            const poly = [...f.points.map((p) => [p.lng, p.lat]), [f.points[0].lng, f.points[0].lat]];
            selFeat.push({ type: 'Feature', geometry: { type: 'LineString', coordinates: poly }, properties: { type: 'field' } });
        }
        selSource.setData({ type: 'FeatureCollection', features: selFeat });
    }, [selected, liveMode, generator]);

    const handleNav = useCallback((action: string): void => {
        const m = mapRef.current;
        if (!m) return;
        if (action === '+') m.zoomIn();
        else if (action === '-') m.zoomOut();
        else if (action === '↑') m.panBy([0, -200]);
        else if (action === '↓') m.panBy([0, 200]);
        else if (action === '←') m.panBy([-200, 0]);
        else if (action === '→') m.panBy([200, 0]);
        else if (action === 'R') { m.setCenter(DEFAULT_MAP_CENTER); m.setZoom(DEFAULT_MAP_ZOOM); }
        else if (action === '🎯') {
            logEvent("Geolocating...");
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                m.flyTo({ center: [longitude, latitude], zoom: 16 });
                logEvent(`Located: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            }, (err) => {
                logEvent(`Location Failed: ${err.message}`);
            }, { enableHighAccuracy: true, timeout: 5000 });
        }
    }, [logEvent]);

    const handleStyle = (style: string): void => {
        const m = mapRef.current;
        if (!m || !m.getStyle() || !MAP_STYLES[style]) return;
        if (m.getLayer('carto')) m.removeLayer('carto');
        if (m.getSource('carto')) m.removeSource('carto');
        m.addSource('carto', { type: 'raster', tiles: MAP_STYLES[style], tileSize: 256, attribution: style === 'OSM' ? '&copy; OpenStreetMap' : '&copy; CARTO' });
        const layers = m.getStyle().layers;
        m.addLayer({ id: 'carto', type: 'raster', source: 'carto' }, layers?.[0]?.id);
        logEvent(`Style: ${style}`);
    };

    const handleMode = (mode: string): void => {
        const m = mapRef.current;
        if (!m || !m.getStyle()) return;
        if (mode === '3D') {
            const nextExtrusion = !extrusionEnabled;
            setExtrusionEnabled(nextExtrusion);
            const visibility = nextExtrusion ? 'visible' : 'none';
            const flatVisibility = nextExtrusion ? 'none' : 'visible';
            const layers3D = ['f-ext-enl', 'f-ext-res', 'f-ext-mac', 'l-ext-enl', 'l-ext-res', 'l-ext-mac', 'p-ext'];
            const layersFlat = ['f-enl', 'f-res', 'f-mac', 'l-enl', 'l-res', 'l-mac', 'p'];
            layers3D.forEach(id => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', visibility); });
            layersFlat.forEach(id => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', flatVisibility); });
            if (nextExtrusion) m.easeTo({ pitch: 60, bearing: -20, duration: 1000 });
            else m.easeTo({ pitch: 0, bearing: 0, duration: 800 });
            logEvent(`Extrusion: ${nextExtrusion ? 'ON' : 'OFF'}`);
        } else if (mode === 'Src') {
            if (liveMode) {
                liveModeRef.current = false;
                patternModeRef.current = 1;
                setLiveMode(false);
                setPatternMode(1);
                generator.clear();
                loadedKeys.clear();
            } else if (patternMode === 1) {
                patternModeRef.current = 2;
                setPatternMode(2);
            } else if (patternMode === 2) {
                patternModeRef.current = 3;
                setPatternMode(3);
            } else {
                patternModeRef.current = 0;
                liveModeRef.current = true;
                setPatternMode(0);
                setLiveMode(true);
                generator.clear();
                loadedKeys.clear();
            }
        }
    };

    // 3. Store subscription
    useEffect(() => {
        const unsub = useStore.subscribe((state, prevState) => {
            if (liveMode && mapRef.current && (state.portals !== prevState.portals || state.links !== prevState.links || state.fields !== prevState.fields)) {
                syncToMap(mapRef.current, liveMode, patternMode);
            }
        });
        return () => unsub();
    }, [liveMode, patternMode, syncToMap]);

    // 4. Pattern Sync
    useEffect(() => {
        if (!mapRef.current) return;
        if (patternMode === 1) loadPattern1();
        else if (patternMode === 2) loadPattern2();
        else if (patternMode === 3) loadPattern3();
        checkAndLoad(mapRef.current, patternMode, liveMode);
    }, [patternMode, liveMode, checkAndLoad, loadPattern1, loadPattern2, loadPattern3]);

    return (
        <div id="poc-preact-root" style={{ pointerEvents: 'none' }}>
            <MapContainer isVis={isVis} />
            {isVis && (
                <Fragment>
                    <TacticalUI 
                        zoom={mapState.zoom} lat={mapState.lat} lng={mapState.lng} 
                        events={events}
                        endpointTelemetry={endpointTelemetry}
                        onNav={handleNav} onStyle={handleStyle} onMode={handleMode}
                        onPortalClick={handlePortalClick}
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
                if (!isVis && mapRef.current && mapRef.current.getStyle()) {
                    mapRef.current.resize();
                    checkAndLoad(mapRef.current, patternMode, liveMode);
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
