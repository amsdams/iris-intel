import {h, JSX} from 'preact';
import {useEffect, useMemo, useRef, useState, useCallback} from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {useStore, globalSpatialIndex, Portal, Link, Field, Artifact, getMinLevelForZoom} from '@iris/core';
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

export function MapOverlay(): JSX.Element {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Prevents moveend from echoing back to Intel when we programmatically jump
  const isMoving = useRef(false);
  const isFirstSync = useRef(true);

  // Core entities are NOT subscribed here anymore. We use the globalSpatialIndex for viewport sync.
  const artifacts = useStore((state) => state.artifacts);
  const mockOrnaments = useStore((state) => state.mockOrnaments);
  const missionDetails = useStore((state) => state.missionDetails);
  const pluginFeatures = useStore((state) => state.pluginFeatures);
  const showMapControls = useStore((state) => state.showMapControls);
  const pluginMarkers = useRef<Map<string, MarkerRegistryEntry>>(new Map());
  const { lat, lng, zoom } = useStore((state) => state.mapState);
  const themeId = useStore((state) => state.themeId);
  const mapThemeId = useStore((state) => state.mapThemeId);
    const theme = THEMES[themeId] || THEMES.INGRESS;
    const touchState = useRef({
      maxFingers: 0,
      hasMoved: false,
      startPoint: { x: 0, y: 0 }
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

  const syncViewport = useCallback((): void => {
    if (!map.current || !styleLoaded) return;

    const bounds = map.current.getBounds();
    const zoom = map.current.getZoom();
    const minLevel = getMinLevelForZoom(zoom);
    
    // ~5km buffer in degrees approx
    const buffer = 0.05;
    const queryBounds = {
        minLat: bounds.getSouth() - buffer,
        minLng: bounds.getWest() - buffer,
        maxLat: bounds.getNorth() + buffer,
        maxLng: bounds.getEast() + buffer
    };

    const results = globalSpatialIndex.query(queryBounds);
    const store = useStore.getState();

    // 1. Filter and Build Portals
    const viewportPortals: Record<string, Portal> = {};
    results.filter(r => r.type === 'portal').forEach(r => {
        const p = store.portals[r.id];
        // Note: p.level can be undefined for placeholder portals (extracted from links/fields).
        // We always show placeholders, as they are part of the active data set for this zoom.
        if (p && (p.level === undefined || p.level >= minLevel)) {
            viewportPortals[p.id] = p;
        }
    });
    const portalFeatures = buildPortalFeatures(viewportPortals, {
        showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, showHealth
    });
    getGeoJsonSource('portals')?.setData(toFeatureCollection(portalFeatures));

    // 2. Filter and Build Links
    const viewportLinks: Record<string, Link> = {};
    results.filter(r => r.type === 'link').forEach(r => {
        const l = store.links[r.id];
        if (l) {
            const p1 = store.portals[l.fromPortalId];
            const p2 = store.portals[l.toPortalId];
            // Only show link if BOTH endpoints satisfy the minLevel filter (or are placeholders)
            const p1Visible = p1 && (p1.level === undefined || p1.level >= minLevel);
            const p2Visible = p2 && (p2.level === undefined || p2.level >= minLevel);
            
            if (p1Visible && p2Visible) {
                viewportLinks[l.id] = l;
            }
        }
    });
    const linkFeatures = buildLinkFeatures(viewportLinks, {
        showLinks, showResistance, showEnlightened, showMachina, showUnclaimedPortals
    });
    getGeoJsonSource('links')?.setData(toFeatureCollection(linkFeatures));

    // 3. Filter and Build Fields
    const viewportFields: Record<string, Field> = {};
    results.filter(r => r.type === 'field').forEach(r => {
        const f = store.fields[r.id];
        if (f) {
            const allVisible = f.points.every(pt => {
                if (!pt.portalId) return true;
                const p = store.portals[pt.portalId];
                return p && (p.level === undefined || p.level >= minLevel);
            });
            if (allVisible) viewportFields[f.id] = f;
        }
    });
    const fieldFeatures = buildFieldFeatures(viewportFields, {
        showFields, showResistance, showEnlightened, showMachina, showUnclaimedPortals
    });
    getGeoJsonSource('fields')?.setData(toFeatureCollection(fieldFeatures));

    // 4. Other overlays (keep full records for now if small)
    getGeoJsonSource('artifacts')?.setData(toFeatureCollection(buildArtifactFeatures(artifacts, store.portals, { showArtifacts })));
    getGeoJsonSource('ornaments')?.setData(toFeatureCollection(buildOrnamentFeatures(store.portals, mockOrnaments, {
      showOrnaments, showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, showHealth
    })));
    getGeoJsonSource('mission-route')?.setData(toFeatureCollection(buildMissionRouteFeatures(missionDetails)));
    getGeoJsonSource('mission-waypoints')?.setData(toFeatureCollection(buildMissionWaypointFeatures(missionDetails)));
    getGeoJsonSource('plugin-features')?.setData(pluginFeatures);

  }, [styleLoaded, showFields, showLinks, showOrnaments, showArtifacts, showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, showHealth, artifacts, mockOrnaments, missionDetails, pluginFeatures]);

  // ---------------------------------------------------------------------------
  // Initialise MapLibre map once on mount
  // ---------------------------------------------------------------------------
  useEffect((): undefined | (() => void) => {
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
                'interpolate', ['linear'], ['coalesce', ['get', 'health'], 100],
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
      cooperativeGestures: false,
    });

    map.current.on('load', () => {
        setStyleLoaded(true);
        if (map.current) {
            map.current.resize();
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

    const handleInteraction = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent): void => {
        if (!map.current) return;
        const {lng, lat} = e.lngLat;
        const point = e.point;

        const allPortals: Portal[] = Object.values(useStore.getState().portals);
        let nearestPortal: Portal | null = null;
        let minPortalDist = 20;

        for (const p of allPortals) {
            if (Math.abs(p.lng - lng) > 0.01 || Math.abs(p.lat - lat) > 0.01) continue;
            const pos = map.current.project([p.lng, p.lat]);
            const dist = Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2));
            if (dist < minPortalDist) {
                minPortalDist = dist;
                nearestPortal = p;
            }
        }

        if (nearestPortal) {
            document.dispatchEvent(
                new CustomEvent('iris:portal:click', {detail: {id: nearestPortal.id}})
            );
            return;
        }

        const artifacts: Record<string, Artifact> = useStore.getState().artifacts;
        const portals: Record<string, Portal> = useStore.getState().portals;
        let nearestArtifactPortalId: string | null = null;
        let minArtifactDist = 20;

        Object.values(artifacts).forEach((artifact) => {
            const p = portals[artifact.portalId];
            if (!p) return;
            if (Math.abs(p.lng - lng) > 0.01 || Math.abs(p.lat - lat) > 0.01) return;
            const mapInstance = map.current;
            if (!mapInstance) return;
            const pos = mapInstance.project([p.lng, p.lat]);
            const dist = Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2));
            if (dist < minArtifactDist) {
                minArtifactDist = dist;
                nearestArtifactPortalId = artifact.portalId;
            }
        });

        if (nearestArtifactPortalId) {
            document.dispatchEvent(
                new CustomEvent('iris:portal:click', {detail: {id: nearestArtifactPortalId}})
            );
        }
    };

    map.current.on('click', handleInteraction);

    map.current.on('touchstart', (e: maplibregl.MapTouchEvent) => {
        touchState.current.maxFingers = Math.max(touchState.current.maxFingers, e.points.length);
        if (e.points.length === 1) {
            touchState.current.startPoint = {x: e.point.x, y: e.point.y};
            touchState.current.hasMoved = false;
        }
    });

    map.current.on('touchmove', (e: maplibregl.MapTouchEvent) => {
        if (e.points.length === 1) {
            const dx = e.point.x - touchState.current.startPoint.x;
            const dy = e.point.y - touchState.current.startPoint.y;
            if (Math.sqrt(dx * dx + dy * dy) > 10) {
                touchState.current.hasMoved = true;
            }
        } else {
            touchState.current.hasMoved = true;
        }
    });

    map.current.on('touchend', (e: maplibregl.MapTouchEvent) => {
        if (touchState.current.maxFingers === 1 && !touchState.current.hasMoved) {
            handleInteraction(e);
        }

        if (e.originalEvent.touches.length === 0) {
            touchState.current.maxFingers = 0;
            touchState.current.hasMoved = false;
        }
    });

    let lastMove = 0;
    map.current.on('mousemove', (e: maplibregl.MapMouseEvent) => {
        const now = Date.now();
        if (now - lastMove < 100) return;
        lastMove = now;

        if (!map.current) return;
        const {lng, lat} = e.lngLat;
        const point = e.point;
        const allPortals: Portal[] = Object.values(useStore.getState().portals);
        let found = false;
        for (const p of allPortals) {
            if (Math.abs(p.lng - lng) > 0.005 || Math.abs(p.lat - lat) > 0.005) continue;
            const pos = map.current.project([p.lng, p.lat]);
            const dist = Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2));
            if (dist < 12) {
                found = true;
                break;
            }
        }
        map.current.getCanvas().style.cursor = found ? 'pointer' : '';
    });

    const onPortalClick = (e: Event): void => {
      const {id} = (e as CustomEvent<{id: string}>).detail;
      useStore.getState().selectPortal(id);
      window.postMessage({type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: id}, '*');
    };

    document.addEventListener('iris:portal:click', onPortalClick);

    return (): void => {
      markerRegistry.forEach(({ marker }) => marker.remove());
      markerRegistry.clear();
      map.current?.remove();
      document.removeEventListener('iris:portal:click', onPortalClick);
    };
  }, []);

  // Sync Camera
  useEffect((): void => {
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
  useEffect((): undefined | (() => void) => {
    if (!map.current || !styleLoaded) return;
    map.current.setPaintProperty('fields', 'fill-color', teamColourExpr);
    map.current.setPaintProperty('links', 'line-color', teamColourExpr);
    map.current.setPaintProperty('portals', 'circle-color', teamColourExpr);
    map.current.setPaintProperty('portals', 'circle-stroke-color', teamColourExpr);
  }, [styleLoaded, teamColourExpr]);

  // Sync Map Theme
  useEffect((): undefined | (() => void) => {
    if (!map.current || !styleLoaded) return;
    const source = getRasterTileSource('osm');
    if (source) {
        source.setTiles(getMapThemeTiles(mapThemeId));
    }
  }, [mapThemeId, styleLoaded]);

  useEffect((): undefined | (() => void) => {
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
  useEffect((): undefined | (() => void) => {
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

  // Sync Viewport on Map Movement
  useEffect((): undefined | (() => void) => {
    if (!map.current || !styleLoaded) return;
    
    const onMove = (): void => syncViewport();
    map.current.on('moveend', onMove);
    map.current.on('zoomend', onMove);
    
    // Initial sync
    syncViewport();

    return () => {
      map.current?.off('moveend', onMove);
      map.current?.off('zoomend', onMove);
    };
  }, [styleLoaded, syncViewport]);

  // Sync Viewport on Store Entity Changes (Decoupled from render cycle)
  useEffect((): undefined | (() => void) => {
    if (!map.current || !styleLoaded) return;

    // Subscribe to portal changes to trigger re-sync if they happen while in view
    const unsubPortals = useStore.subscribe(
        state => state.portals,
        () => syncViewport()
    );
    const unsubLinks = useStore.subscribe(
        state => state.links,
        () => syncViewport()
    );
    const unsubFields = useStore.subscribe(
        state => state.fields,
        () => syncViewport()
    );

    return () => {
        unsubPortals();
        unsubLinks();
        unsubFields();
    };
  }, [styleLoaded, syncViewport]);

  // Sync HTML Markers (Independent effect for performance)
  useEffect((): undefined | (() => void) => {
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

  const panBy = (x: number, y: number): void => {
    map.current?.panBy([x, y], { duration: 200 });
  };

  const zoomIn = (): void => {
    map.current?.zoomIn({ duration: 200 });
  };

  const zoomOut = (): void => {
    map.current?.zoomOut({ duration: 200 });
  };

  return (
      <div className="iris-map-wrapper">
          <div
              ref={mapContainer}
              className="iris-map-container"
          />
          {showMapControls && (
              <div className="iris-map-controls">
                  <button className="iris-map-control-btn" onPointerDown={(e) => { e.stopPropagation(); zoomIn(); }} title="Zoom In">+</button>
                  <button className="iris-map-control-btn" onPointerDown={(e) => { e.stopPropagation(); zoomOut(); }} title="Zoom Out">−</button>
                  <div className="iris-map-control-spacer" />
                  <button className="iris-map-control-btn" onPointerDown={(e) => { e.stopPropagation(); panBy(0, -250); }} title="Pan Up">↑</button>
                  <button className="iris-map-control-btn" onPointerDown={(e) => { e.stopPropagation(); panBy(0, 250); }} title="Pan Down">↓</button>
                  <button className="iris-map-control-btn" onPointerDown={(e) => { e.stopPropagation(); panBy(-250, 0); }} title="Pan Left">←</button>
                  <button className="iris-map-control-btn" onPointerDown={(e) => { e.stopPropagation(); panBy(250, 0); }} title="Pan Right">→</button>
              </div>
          )}
      </div>
  );
}
