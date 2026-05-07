import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import { useStore, globalSpatialIndex, getMinLevelForZoom, InventoryParser, type InventoryItem, type PortalKeyCounts } from '@iris/core';
import { MockDataGenerator } from './MockDataGenerator';
import { createCirclePolygon } from './GeoUtils';
import { INGRESS_COLORS } from './MapConstants';
import type { PortalHistoryLayerState } from './portalHistory';

interface UseMapRendererResult {
    syncToMap: (currentMap: maplibregl.Map, currentLiveMode: boolean, currentPatternMode: number) => void;
}

const KEY_OVERLAY_MIN_ZOOM = 14;

export function useMapRenderer(
    generator: MockDataGenerator,
    logEvent: (msg: string) => void,
    portalHistoryLayers: PortalHistoryLayerState,
    keyOverlayEnabled: boolean,
    mockInventory: InventoryItem[],
): UseMapRendererResult {
    const liveInventory = useStore((state) => state.inventory);
    const liveKeyCountsByPortal = useMemo(() => InventoryParser.aggregatePortalKeys(liveInventory), [liveInventory]);
    const mockKeyCountsByPortal = useMemo(() => InventoryParser.aggregatePortalKeys(mockInventory), [mockInventory]);
    const liveKeyCountsRef = useRef<Record<string, PortalKeyCounts>>({});
    const mockKeyCountsRef = useRef<Record<string, PortalKeyCounts>>({});
    const lastEntityDataRef = useRef<GeoJSON.FeatureCollection>({
        type: 'FeatureCollection',
        features: [],
    });

    useEffect(() => {
        liveKeyCountsRef.current = liveKeyCountsByPortal;
    }, [liveKeyCountsByPortal]);

    useEffect(() => {
        mockKeyCountsRef.current = mockKeyCountsByPortal;
    }, [mockKeyCountsByPortal]);

    const applySetData = useCallback((source: maplibregl.GeoJSONSource, data: GeoJSON.FeatureCollection): void => {
        source.setData(data);
    }, []);

    const syncToMap = useCallback((
        currentMap: maplibregl.Map, 
        currentLiveMode: boolean, 
        currentPatternMode: number
    ): void => {
        if (!currentMap || !currentMap.getStyle()) return;
        const bounds = currentMap.getBounds();
        const zoom = currentMap.getZoom();
        const minLevel = getMinLevelForZoom(zoom);
        const showKeyOverlay = keyOverlayEnabled && zoom >= KEY_OVERLAY_MIN_ZOOM;

        const buffer = 0.05;
        
        const q = {
            minLat: bounds.getSouth() - buffer,
            minLng: bounds.getWest() - buffer,
            maxLat: bounds.getNorth() + buffer,
            maxLng: bounds.getEast() + buffer
        };

        const store = useStore.getState();
        if (currentLiveMode) {
            store.syncIndex();
        }
        const hasLiveStoreData = Object.keys(store.portals).length > 0 || Object.keys(store.links).length > 0 || Object.keys(store.fields).length > 0;
        let results: ReturnType<typeof globalSpatialIndex.query> = currentLiveMode
            ? globalSpatialIndex.query(q)
            : generator.query({ minX: q.minLng, minY: q.minLat, maxX: q.maxLng, maxY: q.maxLat });

        if (currentLiveMode && hasLiveStoreData && results.length === 0) {
            const portalResults = Object.values(store.portals)
                .filter((p) => p.lat >= q.minLat && p.lat <= q.maxLat && p.lng >= q.minLng && p.lng <= q.maxLng)
                .map((p) => ({ minX: p.lng, minY: p.lat, maxX: p.lng, maxY: p.lat, id: p.id, type: 'portal' as const }));
            const linkResults = Object.values(store.links)
                .filter((l) => Math.max(l.fromLat, l.toLat) >= q.minLat && Math.min(l.fromLat, l.toLat) <= q.maxLat && Math.max(l.fromLng, l.toLng) >= q.minLng && Math.min(l.fromLng, l.toLng) <= q.maxLng)
                .map((l) => ({ minX: Math.min(l.fromLng, l.toLng), minY: Math.min(l.fromLat, l.toLat), maxX: Math.max(l.fromLng, l.toLng), maxY: Math.max(l.fromLat, l.toLat), id: l.id, type: 'link' as const }));
            const fieldResults = Object.values(store.fields)
                .map((f) => {
                    const lngs = f.points.map((p) => p.lng);
                    const lats = f.points.map((p) => p.lat);
                    return {
                        minX: Math.min(...lngs),
                        minY: Math.min(...lats),
                        maxX: Math.max(...lngs),
                        maxY: Math.max(...lats),
                        id: f.id,
                        type: 'field' as const,
                    };
                })
                .filter((f) => f.maxY >= q.minLat && f.minY <= q.maxLat && f.maxX >= q.minLng && f.minX <= q.maxLng);
            results = [...portalResults, ...linkResults, ...fieldResults];
            logEvent(`RENDERED: live spatial index fallback used (${results.length} indexed items)`);
        }

        const features: GeoJSON.Feature[] = [];
        const keyCountsByPortal = currentLiveMode ? liveKeyCountsRef.current : mockKeyCountsRef.current;

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
                    const props = {
                        id: p.id,
                        type: 'portal',
                        team: faction,
                        level,
                        height: towerHeight,
                        base_height: 0,
                        radius: Math.max(1, Math.min(6, 1 + ((zoom - 3) / 12) * 5)),
                        visited: p.visited,
                        captured: p.captured,
                        scanned: p.scanned,
                        visitedHighlight: portalHistoryLayers.visited === 'highlight' && p.visited === true,
                        capturedHighlight: portalHistoryLayers.captured === 'highlight' && p.captured === true,
                        scannedHighlight: portalHistoryLayers.scanned === 'highlight' && p.scanned === true,
                        visitedInverse: portalHistoryLayers.visited === 'inverse' && p.visited === false,
                        capturedInverse: portalHistoryLayers.captured === 'inverse' && p.captured === false,
                        scannedInverse: portalHistoryLayers.scanned === 'inverse' && p.scanned === false,
                    };
                    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: props });
                    features.push({ 
                        type: 'Feature', 
                        geometry: { type: 'Polygon', coordinates: createCirclePolygon(p.lng, p.lat, 8, 12) }, 
                        properties: { ...props, type: 'portal-ext' } 
                    });

                    if (showKeyOverlay) {
                        const keyCounts = keyCountsByPortal[p.id];
                        if (keyCounts && keyCounts.total > 0) {
                            features.push({
                                type: 'Feature',
                                id: `portal-key-count:${p.id}`,
                                geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                                properties: {
                                    id: `portal-key-count:${p.id}`,
                                    type: 'portal-key-count',
                                    team: faction,
                                    total: keyCounts.total,
                                    loose: keyCounts.loose,
                                    capsule: keyCounts.capsule,
                                    totalLabel: String(keyCounts.total),
                                    splitLabel: `${keyCounts.loose}L/${keyCounts.capsule}C`,
                                    color: INGRESS_COLORS.KEY,
                                },
                            });
                        }
                    }
                }
            } else if (item.type === 'link') {
                const l = currentLiveMode ? store.links[item.id] : generator.linksMap.get(item.id);
                if (!l) return;
                const p1 = currentLiveMode ? store.portals[l.fromPortalId] : generator.portals.get(l.fromPortalId);
                const p2 = currentLiveMode ? store.portals[l.toPortalId] : generator.portals.get(l.toPortalId);
                
                // Links are visible if both anchors satisfy the level filter
                const isVisible = currentPatternMode > 0 || currentLiveMode || (p1 && p2 && (p1.level ?? 0) >= minLevel && (p2.level ?? 0) >= minLevel);
                if (isVisible && p1 && p2) {
                    const baseProps = { id: l.id, type: 'link', team: l.team };
                    features.push({ type: 'Feature', id: `l-${l.id}`, geometry: { type: 'LineString', coordinates: [[p1.lng, p1.lat], [p2.lng, p2.lat]] }, properties: { ...baseProps, width: Math.max(2, Math.min(4, 2 + ((zoom - 3) / 12) * 2)) } });
                    
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
            const nextData: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
            if (currentLiveMode && hasLiveStoreData && nextData.features.length === 0 && lastEntityDataRef.current.features.length > 0) {
                applySetData(source, lastEntityDataRef.current);
                logEvent(`RENDERED: restored ${lastEntityDataRef.current.features.length} cached items after empty live sync`);
                return;
            }

            lastEntityDataRef.current = nextData;
            applySetData(source, nextData);
            logEvent(`RENDERED: ${features.length} items (Min L:${minLevel})`);
        }
    }, [applySetData, generator, keyOverlayEnabled, logEvent, portalHistoryLayers]);

    return { syncToMap };
}
