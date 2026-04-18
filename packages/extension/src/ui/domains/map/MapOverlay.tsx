import {h, JSX} from 'preact';
import {useEffect, useMemo, useRef, useState} from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {useStore} from '@iris/core';
import {THEMES, MAP_THEMES, SEMANTIC_COLORS} from '../../theme';
import {
  buildArtifactFeatures,
  buildFieldFeatures,
  buildLinkFeatures,
  buildMissionRouteFeatures,
  buildMissionWaypointFeatures,
  buildOrnamentFeatures,
  buildPortalFeatures,
  toFeatureCollection,
} from './feature-builders';

type PluginFeatureProperties = {
  id?: string;
  color?: string;
  isPlayerMarker?: boolean;
  isHtmlMarker?: boolean;
  isLabelMarker?: boolean;
  isInteractive?: boolean;
  opacity?: number;
  label?: string;
  minZoom?: number;
  maxZoom?: number;
} & Record<string, unknown>;

interface MarkerRegistryEntry {
  marker: maplibregl.Marker;
  clickTarget: HTMLDivElement | null;
}

function isFeatureVisibleAtZoom(properties: PluginFeatureProperties, zoom: number): boolean {
  const minZoom = typeof properties.minZoom === 'number' ? properties.minZoom : null;
  const maxZoom = typeof properties.maxZoom === 'number' ? properties.maxZoom : null;

  if (minZoom !== null && zoom < minZoom) {
    return false;
  }

  if (maxZoom !== null && zoom > maxZoom) {
    return false;
  }

  return true;
}

function bindPluginMarkerClickTarget(
  clickTarget: HTMLDivElement | null,
  feature: GeoJSON.Feature,
  isInteractive: boolean
): void {
  if (!clickTarget) {
    return;
  }

  if (!isInteractive) {
    clickTarget.style.cursor = 'default';
    clickTarget.onclick = null;
    return;
  }

  clickTarget.style.cursor = 'pointer';
  clickTarget.onclick = (e: MouseEvent): void => {
    e.stopPropagation();
    useStore.getState().setSelectedPluginFeature(feature);
  };
}

function getPluginMarkerHtml(properties: PluginFeatureProperties, color: string): string {
  const isLabelMarker = properties.isLabelMarker === true;

  if (isLabelMarker) {
    const labelText = properties.label || '';
    return `
      <div style="display: flex; align-items: center; justify-content: center; pointer-events: auto; position: relative;">
        <div data-iris-plugin-label="true" style="white-space: nowrap; background: rgba(0,0,0,0.82); color: ${color}; padding: 1px 5px; border-radius: 999px; font-size: 11px; line-height: 1.2; border: 1px solid ${color}; font-weight: bold; box-shadow: 0 0 4px rgba(0,0,0,0.45);">${labelText}</div>
      </div>
    `;
  }

  const labelHtml = properties.label
    ? `<div data-iris-plugin-label="true" style="position: absolute; left: 15px; top: -5px; white-space: nowrap; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; border: 1px solid ${color}; pointer-events: none;">${properties.label}</div>`
    : '';

  return `
    <div style="display: flex; flex-direction: column; align-items: center; pointer-events: auto; position: relative;">
      ${labelHtml}
      <div style="background: ${color}; width: 12px; height: 12px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
      <div style="width: 2px; height: 10px; background: white; margin-top: -2px;"></div>
    </div>
  `;
}

type DragRotateInternals = maplibregl.Map['dragRotate'] & {
  _pitchWithRotate?: boolean;
  _mouseRotate?: {
    enable: () => void;
    disable: () => void;
  };
  _mousePitch?: {
    enable: () => void;
    disable: () => void;
  };
};

const INTERACTIVE_LAYERS = [
    'portals',
    'artifacts',
    'ornaments',
    'portal-history-visited',
    'portal-history-captured',
    'portal-history-scanned',
    'mission-waypoints',
    'plugin-points'
];

export function MapOverlay(): JSX.Element {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Prevents moveend from echoing back to Intel when we programmatically jump
  const isMoving = useRef(false);
  const isFirstSync = useRef(true);

  const portals = useStore((state) => state.portals);
  const links = useStore((state) => state.links);
  const fields = useStore((state) => state.fields);
  const artifacts = useStore((state) => state.artifacts);
  const mockOrnaments = useStore((state) => state.mockOrnaments);
  const missionDetails = useStore((state) => state.missionDetails);
  const pluginFeatures = useStore((state) => state.pluginFeatures);
  const pluginMarkers = useRef<Map<string, MarkerRegistryEntry>>(new Map());
  const { lat, lng, zoom } = useStore((state) => state.mapState);
  const themeId = useStore((state) => state.themeId);
  const mapThemeId = useStore((state) => state.mapThemeId);
  const theme = THEMES[themeId] || THEMES.INGRESS;

  const touchState = useRef({
    startX: 0,
    startY: 0,
    hasMoved: false
  });

  const getMapThemeTiles = (id: string): string[] => {
    const mt = MAP_THEMES[id] || MAP_THEMES.DARK;
    if (mt.url.includes('{s}')) {
        return ['a', 'b', 'c', 'd'].map(s => mt.url.replace('{s}', s));
    }
    return [mt.url];
  };

  const teamColourExpr = useMemo((): string => ([
    'match', ['get', 'team'],
    'E', theme.E,
    'R', theme.R,
    'M', theme.M,
    theme.N,
  ] as unknown as string), [theme.E, theme.R, theme.M, theme.N]);
  const initialTeamColourExpr = useRef<string>(teamColourExpr);

  // Layer visibility states from store
  const showFields = useStore((state) => state.showFields);
  const showLinks = useStore((state) => state.showLinks);
  const showOrnaments = useStore((state) => state.showOrnaments);
  const showArtifacts = useStore((state) => state.showArtifacts);
  const showResistance = useStore((state) => state.showResistance);
  const showEnlightened = useStore((state) => state.showEnlightened);
  const showMachina = useStore((state) => state.showMachina);
  const showUnclaimedPortals = useStore((state) => state.showUnclaimedPortals);
  const showLevel = useStore((state) => state.showLevel);
  const showHealth = useStore((state) => state.showHealth);
  const showVisited = useStore((state) => state.showVisited);
  const showCaptured = useStore((state) => state.showCaptured);
  const showScanned = useStore((state) => state.showScanned);
  const allowRotation = useStore((state) => state.allowRotation);
  const allowPitch = useStore((state) => state.allowPitch);

  const getGeoJsonSource = (sourceId: string): maplibregl.GeoJSONSource | null => {
    const source = map.current?.getSource(sourceId);
    return source ? (source as maplibregl.GeoJSONSource) : null;
  };

  const getRasterTileSource = (sourceId: string): maplibregl.RasterTileSource | null => {
    const source = map.current?.getSource(sourceId);
    return source ? (source as maplibregl.RasterTileSource) : null;
  };

  const logMapEvent = (type: string, layerId: string, featureId?: string) => {
    useStore.getState().addInteractionLog({
        type: 'click',
        layerId: `MAP-${type}-${layerId}`,
        featureId
    });
  };

  // Direct DOM listener as a fallback/debug
  useEffect(() => {
    const el = mapContainer.current;
    if (!el) return;

    const handleTouchStart = () => {
        useStore.getState().addInteractionLog({
            type: 'click',
            layerId: 'DOM-touchstart'
        });
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => el.removeEventListener('touchstart', handleTouchStart);
  }, []);

  // ---------------------------------------------------------------------------
  // Initialise MapLibre map once on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainer.current) return;
    const markerRegistry = pluginMarkers.current;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sprite: 'https://demotiles.maplibre.org/styles/osm-bright-gl-style/sprite',
        sources: {
          osm: {
            type: 'raster',
            tiles: getMapThemeTiles(useStore.getState().mapThemeId),
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxzoom: 20,
          },
          portals: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          links: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          fields: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          artifacts: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          ornaments: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          'mission-route': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          'mission-waypoints': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          'plugin-features': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
        },
        layers: [
          {
            id: 'background-base',
            type: 'background',
            paint: {
              'background-color': '#000',
            },
          },
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            paint: {
              'raster-opacity': 0.6,
            },
          },
          {
            id: 'fields',
            type: 'fill',
            source: 'fields',
            paint: {
              'fill-color': initialTeamColourExpr.current,
              'fill-opacity': 0.3,
            },
          },
          {
            id: 'links',
            type: 'line',
            source: 'links',
            paint: {
              'line-width': 2,
              'line-color': initialTeamColourExpr.current,
            },
          },
          {
            id: 'plugin-lines',
            type: 'line',
            source: 'plugin-features',
            filter: ['==', '$type', 'LineString'],
            paint: {
              'line-width': ['coalesce', ['get', 'weight'], 3],
              'line-dasharray': [5, 8],
              'line-color': ['get', 'color'],
              'line-opacity': ['coalesce', ['get', 'opacity'], 1],
            },
          },
          {
            id: 'mission-route',
            type: 'line',
            source: 'mission-route',
            paint: {
              'line-width': 4,
              'line-color': SEMANTIC_COLORS.MISSION,
              'line-opacity': 0.7,
            },
          },
          {
            id: 'portals',
            type: 'circle',
            source: 'portals',
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                3, 1,
                10, 2,
                15, 6,
              ],
              'circle-color': initialTeamColourExpr.current,
              'circle-opacity': [
                'interpolate', ['linear'], ['get', 'health'],
                0, 0.1,
                100, 0.7
              ],
              'circle-stroke-width': 1.5,
              'circle-stroke-color': initialTeamColourExpr.current,
              'circle-stroke-opacity': 1,
            },
          },
          {
            id: 'portal-history-visited',
            type: 'circle',
            source: 'portals',
            filter: ['==', ['get', 'visited'], true],
            paint: {
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 2,
                  10, 4,
                  15, 10,
                ],
                'circle-color': 'transparent',
                'circle-stroke-width': 1,
                'circle-stroke-color': SEMANTIC_COLORS.HISTORY_VISITED,
                'circle-stroke-opacity': 0.8,
            }
          },
          {
            id: 'portal-history-captured',
            type: 'circle',
            source: 'portals',
            filter: ['==', ['get', 'captured'], true],
            paint: {
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 3,
                  10, 6,
                  15, 14,
                ],
                'circle-color': 'transparent',
                'circle-stroke-width': 1,
                'circle-stroke-color': SEMANTIC_COLORS.HISTORY_CAPTURED,
                'circle-stroke-opacity': 0.8,
            }
          },
          {
            id: 'portal-history-scanned',
            type: 'circle',
            source: 'portals',
            filter: ['==', ['get', 'scanned'], true],
            paint: {
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  3, 4,
                  10, 8,
                  15, 18,
                ],
                'circle-color': 'transparent',
                'circle-stroke-width': 1.5,
                'circle-stroke-color': SEMANTIC_COLORS.HISTORY_SCANNED,
                'circle-stroke-opacity': 0.6,
            }
          },
          {
            id: 'mission-waypoints',
            type: 'circle',
            source: 'mission-waypoints',
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                3, 3,
                10, 6,
                15, 10,
              ],
              'circle-color': SEMANTIC_COLORS.MISSION,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
            },
          },
          {
            id: 'artifacts',
            type: 'circle',
            source: 'artifacts',
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                3, 3,
                10, 6,
                15, 12,
              ],
              'circle-color': 'transparent',
              'circle-stroke-width': 2,
              'circle-stroke-color': SEMANTIC_COLORS.ARTIFACT,
              'circle-stroke-opacity': 0.9,
            },
          },
          {
            id: 'ornaments',
            type: 'circle',
            source: 'ornaments',
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                3, 2,
                10, 4,
                15, 10,
              ],
              'circle-color': 'transparent',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-opacity': 0.75,
            },
          },
          {
            id: 'plugin-points',
            type: 'circle',
            source: 'plugin-features',
            filter: [
              'all',
              ['==', '$type', 'Point'],
              ['!=', 'isPlayerMarker', true],
              ['!=', 'isHtmlMarker', true],
            ],
            paint: {
              'circle-radius': 8,
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fff',
              'circle-opacity': ['coalesce', ['get', 'opacity'], 1],
              'circle-stroke-opacity': ['coalesce', ['get', 'opacity'], 1],
            },
          },
        ],
      },
      center: [0, 0],
      zoom: 2,
      interactive: true,
      dragPan: true,
      dragRotate: useStore.getState().allowRotation,
      touchZoomRotate: true,
      touchPitch: useStore.getState().allowPitch,
    });

    map.current.on('load', () => {
        setStyleLoaded(true);
        if (map.current) {
            map.current.dragPan.enable();
            map.current.touchZoomRotate.enable();
        }
    });

    map.current.on('moveend', () => {
      if (!map.current || isMoving.current) return;
      const center = map.current.getCenter();
      const z = map.current.getZoom();
      const bounds = map.current.getBounds();
      window.postMessage({
        type: 'IRIS_MOVE_MAP',
        center: { lat: center.lat, lng: center.lng },
        zoom: z,
        bounds: {
            minLatE6: Math.round(bounds.getSouth() * 1e6),
            minLngE6: Math.round(bounds.getWest() * 1e6),
            maxLatE6: Math.round(bounds.getNorth() * 1e6),
            maxLngE6: Math.round(bounds.getEast() * 1e6),
        }
      }, '*');

      // Update address lookup
      useStore.getState().reverseGeocode(center.lat, center.lng);
    });

    const handlePointInteraction = (id: string): void => {
        try {
            useStore.getState().selectPortal(id);
            window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: id }, '*');
        } catch (err: any) {
            logMapEvent('err-interaction', err.message);
        }
    };

    const findClosestPortal = (lngLat: maplibregl.LngLat, point: { x: number, y: number }): string | null => {
        const m = map.current;
        if (!m) return null;

        const allPortals = Object.values(useStore.getState().portals);
        let bestId: string | null = null;
        let bestDist = 24; // 24 pixel radius threshold

        // Stage 1: Fast LngLat filter (approx 0.01 degree box)
        const candidates = allPortals.filter(p => 
            Math.abs(p.lng - lngLat.lng) < 0.01 && Math.abs(p.lat - lngLat.lat) < 0.01
        );

        // Stage 2: Precise pixel distance
        for (const p of candidates) {
            try {
                const pos = m.project([p.lng, p.lat]);
                const dx = pos.x - point.x;
                const dy = pos.y - point.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < bestDist) {
                    bestDist = d;
                    bestId = p.id;
                }
            } catch { continue; }
        }

        return bestId;
    };

    map.current.on('touchstart', (e) => {
        if (e.points && e.points.length > 0) {
            touchState.current = {
                startX: e.points[0].x,
                startY: e.points[0].y,
                hasMoved: false
            };
        }
        logMapEvent('touchstart', 'map');
    });

    map.current.on('touchmove', (e) => {
        if (e.points && e.points.length > 0) {
            const dx = e.points[0].x - touchState.current.startX;
            const dy = e.points[0].y - touchState.current.startY;
            if (Math.sqrt(dx * dx + dy * dy) > 10) {
                touchState.current.hasMoved = true;
            }
        }
    });

    map.current.on('click', (e) => {
        const m = map.current;
        if (!m) return;
        
        // 1. STRICT PRIMITIVE EXTRACTION
        // We do this inside a try-catch because even 'e.point' might be restricted
        let x: number, y: number, lng: number, lat: number;
        try {
            x = Number(e.point.x);
            y = Number(e.point.y);
            lng = Number(e.lngLat.lng);
            lat = Number(e.lngLat.lat);
        } catch (err: any) {
            logMapEvent('err-coords', `Point access denied: ${err.message}`);
            return;
        }

        logMapEvent('click', `at-${Math.round(x)},${Math.round(y)}`);

        // 2. DEFENSIVE QUERY
        try {
            // Reconstruct primitives locally
            const box: [[number, number], [number, number]] = [[x - 8, y - 8], [x + 8, y + 8]];
            
            // Avoid complex options if they might be causing the "constructor" check failure
            // We'll filter the results manually instead of using the 'layers' option
            const allHitsRaw = m.queryRenderedFeatures(box);

            if (allHitsRaw && allHitsRaw.length > 0) {
                // 3. SAFE RESULT PROCESSING
                // We use a simple loop with individual try-catch blocks
                for (let i = 0; i < allHitsRaw.length; i++) {
                    try {
                        const feature = allHitsRaw[i];
                        const layerId = feature.layer?.id;
                        
                        if (layerId && INTERACTIVE_LAYERS.includes(layerId)) {
                            const props = feature.properties || {};
                            const id = (props.id || props.portalId || props.guid);
                            
                            if (id) {
                                logMapEvent('hit-qrf', layerId, id);
                                handlePointInteraction(String(id));
                                return;
                            }
                        }
                    } catch (featErr: any) {
                        // Log but continue to next feature
                        logMapEvent('err-feat', `Feature ${i} restricted: ${featErr.message}`);
                    }
                }
            }
            
            logMapEvent('qrf-miss', `hits:${allHitsRaw?.length || 0}`);
        } catch (err: any) {
            // LOG FULL ERROR AND STACK
            const errorInfo = `${err.message}\nStack: ${err.stack || 'no stack'}`;
            logMapEvent('err-qrf', errorInfo);
        }

        // 4. MANUAL FALLBACK (Always here as a safety net)
        const portalId = findClosestPortal(new maplibregl.LngLat(lng, lat), { x, y });
        if (portalId) {
            logMapEvent('hit-manual', 'portals', portalId);
            handlePointInteraction(portalId);
        } else {
            logMapEvent('click', 'empty-map');
            useStore.getState().selectPortal(null);
        }
    });

    map.current.on('touchend', (e) => {
        if (touchState.current.hasMoved) return;
        logMapEvent('tap', 'detect');
        // MapLibre synthesizes a click on tap, so we don't usually need to trigger here
    });

    // Hover cursor (Desktop only)
    INTERACTIVE_LAYERS.forEach(layerId => {
        map.current?.on('mouseenter', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current?.on('mouseleave', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
        });
    });

    return (): void => {
      markerRegistry.forEach(({ marker }) => marker.remove());
      markerRegistry.clear();
      map.current?.remove();
    };
  }, []);

  // Sync Camera
  useEffect(() => {
    if (!map.current || !styleLoaded || (lat === 0 && lng === 0)) return;

    if (isFirstSync.current) {
        isFirstSync.current = false;
        map.current.jumpTo({ center: [lng, lat], zoom });
        useStore.getState().reverseGeocode(lat, lng);
    } else {
        isMoving.current = true;
        map.current.jumpTo({ center: [lng, lat], zoom });
        useStore.getState().reverseGeocode(lat, lng);
        setTimeout(() => { isMoving.current = false; }, 100);
    }
  }, [lat, lng, zoom, styleLoaded]);

  // Sync Theme
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    map.current.setPaintProperty('fields', 'fill-color', teamColourExpr);
    map.current.setPaintProperty('links', 'line-color', teamColourExpr);
    map.current.setPaintProperty('portals', 'circle-color', teamColourExpr);
    map.current.setPaintProperty('portals', 'circle-stroke-color', teamColourExpr);
  }, [styleLoaded, teamColourExpr]);

  // Sync Map Theme
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    const source = getRasterTileSource('osm');
    if (source) {
        source.setTiles(getMapThemeTiles(mapThemeId));
    }
  }, [mapThemeId, styleLoaded]);

  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    useStore.getState().addInteractionLog({
        type: 'click',
        layerId: `EFFECT-rotation: rot=${allowRotation}, pitch=${allowPitch}`
    });

    const dragRotate = map.current.dragRotate as DragRotateInternals;

    if (allowRotation) {
      dragRotate.enable();
      map.current.touchZoomRotate.enable();
      map.current.touchZoomRotate.enableRotation();
    } else {
      dragRotate.disable();
      if (allowPitch) {
        dragRotate._mousePitch?.enable();
      }
      map.current.touchZoomRotate.disableRotation();
      map.current.resetNorth();
    }

    if (allowPitch) {
      map.current.touchPitch.enable();
      // Only set this if it actually changed to avoid re-triggering internals
      if (dragRotate._pitchWithRotate !== true) {
          dragRotate._pitchWithRotate = true;
      }
    } else {
      map.current.touchPitch.disable();
      map.current.setPitch(0);
      if (dragRotate._pitchWithRotate !== false) {
          dragRotate._pitchWithRotate = false;
      }
    }
  }, [allowRotation, allowPitch, styleLoaded]);

  // Sync Portal History Highlight Filters
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    if (map.current.getLayer('portal-history-visited')) {
        map.current.setFilter('portal-history-visited', ['==', ['get', 'visited'], showVisited]);
    }
    if (map.current.getLayer('portal-history-captured')) {
        map.current.setFilter('portal-history-captured', ['==', ['get', 'captured'], showCaptured]);
    }
    if (map.current.getLayer('portal-history-scanned')) {
        map.current.setFilter('portal-history-scanned', ['==', ['get', 'scanned'], showScanned]);
    }
  }, [showVisited, showCaptured, showScanned, styleLoaded]);

  // Sync GeoJSON Data
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    const filteredPortals = buildPortalFeatures(portals, {
      showResistance,
      showEnlightened,
      showMachina,
      showUnclaimedPortals,
      showLevel,
      showHealth,
    });
    getGeoJsonSource('portals')?.setData(toFeatureCollection(filteredPortals));

    const filteredLinks = buildLinkFeatures(links, {
      showLinks,
      showResistance,
      showEnlightened,
      showMachina,
      showUnclaimedPortals,
    });
    getGeoJsonSource('links')?.setData(toFeatureCollection(filteredLinks));

    const filteredFields = buildFieldFeatures(fields, {
      showFields,
      showResistance,
      showEnlightened,
      showMachina,
      showUnclaimedPortals,
    });
    getGeoJsonSource('fields')?.setData(toFeatureCollection(filteredFields));
    getGeoJsonSource('artifacts')?.setData(toFeatureCollection(buildArtifactFeatures(artifacts, portals, { showArtifacts })));
    getGeoJsonSource('ornaments')?.setData(toFeatureCollection(buildOrnamentFeatures(portals, mockOrnaments, {
      showOrnaments,
      showResistance,
      showEnlightened,
      showMachina,
      showUnclaimedPortals,
      showLevel,
      showHealth,
    })));
    getGeoJsonSource('mission-route')?.setData(toFeatureCollection(buildMissionRouteFeatures(missionDetails)));
    getGeoJsonSource('mission-waypoints')?.setData(toFeatureCollection(buildMissionWaypointFeatures(missionDetails)));

    // Plugin Features (Lines only here, points are HTML)
    getGeoJsonSource('plugin-features')?.setData(pluginFeatures);

  }, [portals, links, fields, artifacts, mockOrnaments, missionDetails, showFields, showLinks, showOrnaments, showArtifacts, showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, showHealth, styleLoaded, pluginFeatures]);

  // Sync HTML Markers (Independent effect for performance)
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    const activeMarkerIds = new Set<string>();
    const currentZoom = map.current.getZoom();

    pluginFeatures.features.forEach((feature) => {
      const properties = (feature.properties ?? {}) as PluginFeatureProperties;
      if ((!properties.isPlayerMarker && !properties.isHtmlMarker) || feature.geometry.type !== 'Point' || !map.current) {
        return;
      }

      if (!isFeatureVisibleAtZoom(properties, currentZoom)) {
        return;
      }

      const markerId =
        (typeof feature.id === 'string' && feature.id) ||
        (typeof properties.id === 'string' && properties.id) ||
        (typeof properties.name === 'string' && properties.name ? `player:${properties.name}` : null);

      if (!markerId) return;
      activeMarkerIds.add(markerId);

      const color = properties.color || '#fff';
      const opacity = typeof properties.opacity === 'number' ? String(properties.opacity) : '1';
      const coordinates = feature.geometry.coordinates as [number, number];
      const existing = pluginMarkers.current.get(markerId);
      const isLabelMarker = properties.isLabelMarker === true;
      const isInteractive = properties.isInteractive !== false;

      if (existing) {
        existing.marker.setLngLat(coordinates);
        existing.marker.getElement().style.opacity = opacity;
        if (existing.clickTarget) {
          const textLabel = existing.clickTarget.querySelector('[data-iris-plugin-label="true"]') as HTMLDivElement | null;
          if (textLabel) {
            textLabel.textContent = properties.label || '';
            textLabel.style.border = `1px solid ${color}`;
            textLabel.style.color = color;
            textLabel.style.background = isLabelMarker ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.7)';
          }

          const pinHead = existing.clickTarget.querySelector('div[style*="border-radius: 50%"]') as HTMLDivElement | null;
          if (pinHead) {
            pinHead.style.background = color;
          }
        }
        bindPluginMarkerClickTarget(existing.clickTarget, feature, isInteractive);
        return;
      }

      const el = document.createElement('div');
      el.style.pointerEvents = 'none';
      el.style.opacity = opacity;
      el.innerHTML = getPluginMarkerHtml(properties, color);

      const clickTarget = el.firstElementChild as HTMLDivElement | null;
      bindPluginMarkerClickTarget(clickTarget, feature, isInteractive);

      const marker = new maplibregl.Marker({ element: el, anchor: isLabelMarker ? 'center' : 'bottom', offset: isLabelMarker ? [0, 0] : [0, -20] })
        .setLngLat(coordinates)
        .addTo(map.current);

      pluginMarkers.current.set(markerId, { marker, clickTarget });
    });

    pluginMarkers.current.forEach((entry, markerId) => {
      if (!activeMarkerIds.has(markerId)) {
        entry.marker.remove();
        pluginMarkers.current.delete(markerId);
      }
    });
  }, [pluginFeatures, styleLoaded, zoom]);

  return (
      <div
          ref={mapContainer}
          className="iris-map-container"
      />
  );
}
