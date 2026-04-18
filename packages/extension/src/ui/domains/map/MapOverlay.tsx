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

    const handlePointInteraction = (feature: any, lngLat: any): void => {
        try {
            // Waive Xray vision on Firefox to safely access properties from the page context
            const f = (feature as any).wrappedJSObject || feature;
            if (!f) return;

            // Extract properties safely
            let props: any = {};
            try {
                props = f.properties || {};
            } catch (e: any) {
                logMapEvent('err-props', e.message);
            }

            const id = (props.id || props.portalId || props.guid) as string | undefined;
            
            if (id) {
                const finalId = String(id);
                useStore.getState().selectPortal(finalId);
                window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: finalId }, '*');
            }
        } catch (err: any) {
            logMapEvent('err-interaction', err.message);
        }
    };

    map.current.on('touchstart', (e) => logMapEvent('touchstart', 'map'));

    // Implementation of Proposed Solution: Layer-Scoped Listeners
    INTERACTIVE_LAYERS.forEach(layerId => {
        // 2. Desktop Interaction (Click)
        map.current?.on('click', layerId, (e) => {
            try {
                const features = (e as any).features;
                if (features && features.length > 0) {
                    logMapEvent('click', layerId, 'hit');
                    handlePointInteraction(features[0], e.lngLat);
                }
            } catch (err: any) {
                logMapEvent(`err-click-${layerId}`, err.message);
            }
        });

        // 3. Mobile Interaction (Touch)
        map.current?.on('touchend', layerId, (e) => {
            try {
                // Ignore multi-touch (e.g. pinch-zoom)
                const originalEvent = (e as any).originalEvent;
                if (originalEvent && originalEvent.touches && originalEvent.touches.length !== 0) return;
                
                const features = (e as any).features;
                if (features && features.length > 0) {
                    logMapEvent('tap', layerId, 'hit');
                    handlePointInteraction(features[0], e.lngLat);
                }
            } catch (err: any) {
                logMapEvent(`err-tap-${layerId}`, err.message);
            }
        });

        // Prevent map drag from triggering touchend on a point
        map.current?.on('touchmove', layerId, (e) => {});

        // 4. Hover State (Desktop Only)
        map.current?.on('mouseenter', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current?.on('mouseleave', layerId, () => {
            if (map.current) map.current.getCanvas().style.cursor = '';
        });
    });

    // Handle clicking empty map to deselect
    map.current.on('click', (e) => {
        if (!map.current) return;
        try {
            const bbox: [[number, number], [number, number]] = [[e.point.x - 5, e.point.y - 5], [e.point.x + 5, e.point.y + 5]];
            const hits = map.current.queryRenderedFeatures(bbox, {
                layers: INTERACTIVE_LAYERS.filter(l => {
                    try { return !!map.current?.getLayer(l); } catch { return false; }
                })
            });
            if (hits.length === 0) {
                logMapEvent('click', 'map-empty');
                useStore.getState().selectPortal(null);
            }
        } catch (err: any) {
            logMapEvent('err-deselect', err.message);
        }
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
