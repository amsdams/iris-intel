import { h, JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {Portal, useStore} from '@iris/core';
import { THEMES, MAP_THEMES } from '../../theme';
import {
  buildArtifactFeatures,
  buildFieldFeatures,
  buildLinkFeatures,
  buildMissionRouteFeatures,
  buildMissionWaypointFeatures,
  buildPortalFeatures,
  toFeatureCollection,
} from './feature-builders';

type PluginFeatureProperties = {
  id?: string;
  color?: string;
  isPlayerMarker?: boolean;
  opacity?: number;
  label?: string;
} & Record<string, unknown>;

interface MarkerRegistryEntry {
  marker: maplibregl.Marker;
  clickTarget: HTMLDivElement | null;
}

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
  const missionDetails = useStore((state) => state.missionDetails);
  const pluginFeatures = useStore((state) => state.pluginFeatures);
  const pluginMarkers = useRef<Map<string, MarkerRegistryEntry>>(new Map());
  const { lat, lng, zoom } = useStore((state) => state.mapState);
  const themeId = useStore((state) => state.themeId);
  const mapThemeId = useStore((state) => state.mapThemeId);
  const theme = THEMES[themeId] || THEMES.INGRESS;

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
  const showResistance = useStore((state) => state.showResistance);
  const showEnlightened = useStore((state) => state.showEnlightened);
  const showMachina = useStore((state) => state.showMachina);
  const showUnclaimedPortals = useStore((state) => state.showUnclaimedPortals);
  const showLevel = useStore((state) => state.showLevel);
  const showHealth = useStore((state) => state.showHealth);
  const showVisited = useStore((state) => state.showVisited);
  const showCaptured = useStore((state) => state.showCaptured);
  const showScanned = useStore((state) => state.showScanned);

  const touchState = useRef({
    maxFingers: 0,
    hasMoved: false,
    startPoint: { x: 0, y: 0 }
  });

  const getGeoJsonSource = (sourceId: string): maplibregl.GeoJSONSource | null => {
    const source = map.current?.getSource(sourceId);
    return source ? (source as maplibregl.GeoJSONSource) : null;
  };

  const getRasterTileSource = (sourceId: string): maplibregl.RasterTileSource | null => {
    const source = map.current?.getSource(sourceId);
    return source ? (source as maplibregl.RasterTileSource) : null;
  };


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
              'line-color': '#ef8e2e',
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
                  10, 4,
                  15, 10,
                ],
                'circle-color': 'transparent',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#9B59B6', // Purple for visited
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
                  10, 6,
                  15, 14,
                ],
                'circle-color': 'transparent',
                'circle-stroke-width': 1,
                'circle-stroke-color': '#E74C3C', // Red for captured
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
                  10, 8,
                  15, 18,
                ],
                'circle-color': 'transparent',
                'circle-stroke-width': 1.5,
                'circle-stroke-color': '#F1C40F', // Yellow/Gold for scanned
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
                10, 6,
                15, 10,
              ],
              'circle-color': '#ef8e2e',
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
                10, 6,
                15, 12,
              ],
              'circle-color': 'transparent',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#f0f', // Magenta for artifacts/shards
              'circle-stroke-opacity': 0.9,
            },
          },
          {
            id: 'plugin-points',
            type: 'circle',
            source: 'plugin-features',
            filter: ['==', '$type', 'Point'],
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
    });

    map.current.on('load', () => setStyleLoaded(true));

    map.current.on('moveend', () => {
      if (!map.current || isMoving.current) return;
      const center = map.current.getCenter();
      const z = map.current.getZoom();
      const bounds = map.current.getBounds();
      window.postMessage({
        type: 'IRIS_MOVE_MAP',
        center: { lat: center.lat, lng: center.lng },
        zoom: Math.round(z),
        bounds: {
            minLatE6: Math.round(bounds.getSouth() * 1e6),
            minLngE6: Math.round(bounds.getWest() * 1e6),
            maxLatE6: Math.round(bounds.getNorth() * 1e6),
            maxLngE6: Math.round(bounds.getEast() * 1e6),
        }
      }, '*');
    });

    const onInteraction = (e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent): void => {
        if (!map.current) return;
        const { lng, lat } = e.lngLat;
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
                new CustomEvent('iris:portal:click', { detail: { id: nearestPortal.id } })
            );
            return;
        }

        const artifacts: Record<string, any> = useStore.getState().artifacts;
        const portals: Record<string, Portal> = useStore.getState().portals;
        let nearestArtifactPortalId: string | null = null;
        let minArtifactDist = 20;

        Object.values(artifacts).forEach((a) => {
            const p = portals[a.portalId];
            if (!p) return;
            if (Math.abs(p.lng - lng) > 0.01 || Math.abs(p.lat - lat) > 0.01) return;
            const pos = map.current!.project([p.lng, p.lat]);
            const dist = Math.sqrt(Math.pow(pos.x - point.x, 2) + Math.pow(pos.y - point.y, 2));
            if (dist < minArtifactDist) {
                minArtifactDist = dist;
                nearestArtifactPortalId = a.portalId;
            }
        });

        if (nearestArtifactPortalId) {
            document.dispatchEvent(
                new CustomEvent('iris:portal:click', { detail: { id: nearestArtifactPortalId } })
            );
        }
    };

    map.current.on('touchstart', (e: maplibregl.MapTouchEvent) => {
        touchState.current.maxFingers = Math.max(touchState.current.maxFingers, e.points.length);
        if (e.points.length === 1) {
            touchState.current.startPoint = { x: e.point.x, y: e.point.y };
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

    map.current.on('click', onInteraction);

    map.current.on('touchend', (e: maplibregl.MapTouchEvent) => {
        if (touchState.current.maxFingers === 1 && !touchState.current.hasMoved) {
            onInteraction(e);
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
        const { lng, lat } = e.lngLat;
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
      const { id } = (e as CustomEvent<{ id: string }>).detail;
      useStore.getState().selectPortal(id);
      window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: id }, '*');
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
  useEffect(() => {
    if (!map.current || !styleLoaded || (lat === 0 && lng === 0)) return;

    if (isFirstSync.current) {
        isFirstSync.current = false;
        map.current.jumpTo({ center: [lng, lat], zoom });
    } else {
        isMoving.current = true;
        map.current.jumpTo({ center: [lng, lat], zoom });
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
    getGeoJsonSource('artifacts')?.setData(toFeatureCollection(buildArtifactFeatures(artifacts, portals)));
    getGeoJsonSource('mission-route')?.setData(toFeatureCollection(buildMissionRouteFeatures(missionDetails)));
    getGeoJsonSource('mission-waypoints')?.setData(toFeatureCollection(buildMissionWaypointFeatures(missionDetails)));

    // Plugin Features (Lines only here, points are HTML)
    getGeoJsonSource('plugin-features')?.setData(pluginFeatures);

  }, [portals, links, fields, artifacts, missionDetails, showFields, showLinks, showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, showHealth, styleLoaded, pluginFeatures]);

  // Sync HTML Markers (Independent effect for performance)
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    const activeMarkerIds = new Set<string>();

    pluginFeatures.features.forEach((feature) => {
      const properties = (feature.properties ?? {}) as PluginFeatureProperties;
      if (!properties.isPlayerMarker || feature.geometry.type !== 'Point' || !map.current) {
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

      if (existing) {
        existing.marker.setLngLat(coordinates);
        existing.marker.getElement().style.opacity = opacity;
        if (existing.clickTarget) {
          const pinHead = existing.clickTarget.querySelector('div[style*="border-radius: 50%"]') as HTMLDivElement | null;
          if (pinHead) {
            pinHead.style.background = color;
          }
          const labelDiv = existing.clickTarget.querySelector('div[style*="position: absolute"]') as HTMLDivElement | null;
          if (labelDiv && properties.label) {
            labelDiv.textContent = properties.label;
            labelDiv.style.border = `1px solid ${color}`;
          } else if (!labelDiv && properties.label) {
            // Add label if it didn't exist
            const newLabel = document.createElement('div');
            newLabel.style.cssText = `position: absolute; left: 15px; top: -5px; white-space: nowrap; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; border: 1px solid ${color}; pointer-events: none;`;
            newLabel.textContent = properties.label;
            existing.clickTarget.prepend(newLabel);
          } else if (labelDiv && !properties.label) {
            labelDiv.remove();
          }

          existing.clickTarget.onclick = (e: MouseEvent): void => {
            e.stopPropagation();
            useStore.getState().setSelectedPluginFeature(feature);
          };
        }
        return;
      }

      const el = document.createElement('div');
      el.style.pointerEvents = 'none';
      el.style.opacity = opacity;

      const labelHtml = properties.label 
        ? `<div style="position: absolute; left: 15px; top: -5px; white-space: nowrap; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; border: 1px solid ${color}; pointer-events: none;">${properties.label}</div>`
        : '';

      el.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; pointer-events: auto; position: relative;">
              ${labelHtml}
              <div style="background: ${color}; width: 12px; height: 12px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
              <div style="width: 2px; height: 10px; background: white; margin-top: -2px;"></div>
          </div>
      `;

      const clickTarget = el.firstElementChild as HTMLDivElement | null;
      if (clickTarget) {
        clickTarget.onclick = (e: MouseEvent): void => {
          e.stopPropagation();
          useStore.getState().setSelectedPluginFeature(feature);
        };
      }

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -20] })
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
  }, [pluginFeatures, styleLoaded]);

  return (
      <div
          ref={mapContainer}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'auto',
            zIndex: 9999,
          }}
      />
  );
}
