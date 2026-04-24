import { useCallback, useEffect, useRef } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import { useStore, globalSpatialIndex, getMinLevelForZoom } from '@iris/core';
import { MockDataGenerator } from './MockDataGenerator';
import { createCirclePolygon } from './GeoUtils';

export function useMapRenderer(generator: MockDataGenerator, logEvent: (msg: string) => void) {
    const pendingFrameRef = useRef<number | null>(null);
    const pendingSetDataRef = useRef<{
        source: maplibregl.GeoJSONSource;
        data: GeoJSON.FeatureCollection;
    } | null>(null);

    const flushPendingSetData = useCallback((): void => {
        pendingFrameRef.current = null;
        const pending = pendingSetDataRef.current;
        if (!pending) return;

        pendingSetDataRef.current = null;
        pending.source.setData(pending.data);
    }, []);

    useEffect(() => {
        return () => {
            if (pendingFrameRef.current !== null) {
                window.cancelAnimationFrame(pendingFrameRef.current);
                pendingFrameRef.current = null;
            }
            pendingSetDataRef.current = null;
        };
    }, []);

    const scheduleSetData = useCallback((source: maplibregl.GeoJSONSource, data: GeoJSON.FeatureCollection): void => {
        pendingSetDataRef.current = { source, data };
        if (pendingFrameRef.current !== null) {
            return;
        }

        pendingFrameRef.current = window.requestAnimationFrame(() => {
            flushPendingSetData();
        });
    }, [flushPendingSetData]);

    const syncToMap = useCallback((
        currentMap: maplibregl.Map, 
        currentLiveMode: boolean, 
        currentPatternMode: number
    ): void => {
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
                
                // Links are visible if both anchors satisfy the level filter
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
            scheduleSetData(source, { type: 'FeatureCollection', features });
            logEvent(`RENDERED: ${features.length} items (Min L:${minLevel})`);
        }
    }, [generator, logEvent, scheduleSetData]);

    return { syncToMap };
}
