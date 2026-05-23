import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';
import { useStore, globalSpatialIndex, getMinLevelForZoom, InventoryParser, buildWrappedLineSegments, buildWrappedPolygonGeometry, type InventoryItem, type PortalKeyCounts } from '@iris/core';
import { MockDataGenerator } from './MockDataGenerator';
import { createCirclePolygon } from './GeoUtils';
import { INGRESS_COLORS } from './MapConstants';
import type { PortalHistoryLayerState } from './portalHistory';
import { postMiniPageMapCommand, type MiniMapView } from './pageMapProtocol';
import type { MiniRenderStats } from './diagnostics';

interface UseMapRendererResult {
    syncToMap: (currentView: MiniMapView, currentLiveMode: boolean, currentPatternMode: number) => void;
}

const KEY_OVERLAY_MIN_ZOOM = 14;

export function useMapRenderer(
    generator: MockDataGenerator,
    logEvent: (msg: string) => void,
    portalHistoryLayers: PortalHistoryLayerState,
    keyOverlayEnabled: boolean,
    mockInventory: InventoryItem[],
    onRenderStats?: (stats: MiniRenderStats) => void,
): UseMapRendererResult {
    const pendingFrameRef = useRef<number | null>(null);
    const liveInventory = useStore((state) => state.inventory);
    const liveKeyCountsByPortal = useMemo(() => InventoryParser.aggregatePortalKeys(liveInventory), [liveInventory]);
    const mockKeyCountsByPortal = useMemo(() => InventoryParser.aggregatePortalKeys(mockInventory), [mockInventory]);
    const liveKeyCountsRef = useRef<Record<string, PortalKeyCounts>>({});
    const mockKeyCountsRef = useRef<Record<string, PortalKeyCounts>>({});
    const pendingSetDataRef = useRef<{
        data: GeoJSON.FeatureCollection;
    } | null>(null);

    useEffect(() => {
        liveKeyCountsRef.current = liveKeyCountsByPortal;
    }, [liveKeyCountsByPortal]);

    useEffect(() => {
        mockKeyCountsRef.current = mockKeyCountsByPortal;
    }, [mockKeyCountsByPortal]);

    const flushPendingSetData = useCallback((): void => {
        pendingFrameRef.current = null;
        const pending = pendingSetDataRef.current;
        if (!pending) return;

        pendingSetDataRef.current = null;
        postMiniPageMapCommand({ action: 'sync-data', data: pending.data });
    }, []);

    useEffect(() => {
        return (): void => {
            if (pendingFrameRef.current !== null) {
                window.cancelAnimationFrame(pendingFrameRef.current);
                pendingFrameRef.current = null;
            }
            pendingSetDataRef.current = null;
        };
    }, []);

    const scheduleSetData = useCallback((data: GeoJSON.FeatureCollection): void => {
        pendingSetDataRef.current = { data };
        if (pendingFrameRef.current !== null) {
            return;
        }

        pendingFrameRef.current = window.requestAnimationFrame(() => {
            flushPendingSetData();
        });
    }, [flushPendingSetData]);

    const syncToMap = useCallback((
        currentView: MiniMapView,
        currentLiveMode: boolean, 
        currentPatternMode: number
    ): void => {
        const startedAt = performance.now();
        const bounds = currentView.bounds;
        const zoom = currentView.zoom;
        const minLevel = getMinLevelForZoom(zoom);
        const showKeyOverlay = keyOverlayEnabled && zoom >= KEY_OVERLAY_MIN_ZOOM;

        const buffer = 0.05;
        
        const q = {
            minLat: bounds.south - buffer,
            minLng: bounds.west - buffer,
            maxLat: bounds.north + buffer,
            maxLng: bounds.east + buffer
        };

        const results = currentLiveMode ? globalSpatialIndex.query(q) : generator.query({ minX: q.minLng, minY: q.minLat, maxX: q.maxLng, maxY: q.maxLat });
        const features: GeoJSON.Feature[] = [];
        let portalCount = 0;
        let linkCount = 0;
        let fieldCount = 0;
        let keyLabelCount = 0;
        const store = useStore.getState();
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
                        health: p.health ?? 100,
                        visitedHighlight: portalHistoryLayers.visited === 'highlight' && p.visited === true,
                        capturedHighlight: portalHistoryLayers.captured === 'highlight' && p.captured === true,
                        scannedHighlight: portalHistoryLayers.scanned === 'highlight' && p.scanned === true,
                        visitedInverse: portalHistoryLayers.visited === 'inverse' && p.visited === false,
                        capturedInverse: portalHistoryLayers.captured === 'inverse' && p.captured === false,
                        scannedInverse: portalHistoryLayers.scanned === 'inverse' && p.scanned === false,
                    };
                    features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: props });
                    portalCount += 1;
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
                            keyLabelCount += 1;
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
                    buildWrappedLineSegments([p1.lng, p1.lat], [p2.lng, p2.lat]).forEach((coordinates, segmentIndex) => {
                        features.push({
                            type: 'Feature',
                            id: segmentIndex === 0 ? `l-${l.id}` : `l-${l.id}:${segmentIndex}`,
                            geometry: { type: 'LineString', coordinates },
                            properties: { ...baseProps, width: Math.max(2, Math.min(4, 2 + ((zoom - 3) / 12) * 2)) },
                        });
                    });
                    linkCount += 1;
                    
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
                    const poly = buildWrappedPolygonGeometry(points.map((p) => [p.lng, p.lat]));
                    const base_height = 200;
                    const height = base_height + 5;
                    features.push({ type: 'Feature', id: `f-${f.id}`, geometry: poly, properties: { id: f.id, type: 'field', team: faction, height, base_height } });
                    fieldCount += 1;
                    
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

        scheduleSetData({ type: 'FeatureCollection', features });
        onRenderStats?.({
            totalFeatures: features.length,
            portalCount,
            linkCount,
            fieldCount,
            keyLabelCount,
            playerFeatureCount: 0,
            queryItemCount: results.length,
            renderMs: performance.now() - startedAt,
            minLevel,
            liveMode: currentLiveMode,
            patternMode: currentPatternMode,
            updatedAt: Date.now(),
        });
        logEvent(`RENDERED: ${features.length} items (Min L:${minLevel})`);
    }, [generator, keyOverlayEnabled, logEvent, onRenderStats, portalHistoryLayers, scheduleSetData]);

    return { syncToMap };
}
