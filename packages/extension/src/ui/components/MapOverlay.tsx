import { h, JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Field, Link, Portal, useStore } from '@iris/core';
import { THEMES, MAP_THEMES } from '../theme';

type PortalFeatureProperties = {
  id: string;
  team: string;
  name?: string;
  level: number;
  health: number;
  visited: boolean;
  captured: boolean;
  scanned: boolean;
} & Record<string, unknown>;

type TeamFeatureProperties = {
  team: string;
} & Record<string, unknown>;

type PluginFeatureProperties = {
  color?: string;
  isPlayerMarker?: boolean;
} & Record<string, unknown>;

type PortalFeature = GeoJSON.Feature<GeoJSON.Point, PortalFeatureProperties>;
type LinkFeature = GeoJSON.Feature<GeoJSON.LineString, TeamFeatureProperties>;
type FieldFeature = GeoJSON.Feature<GeoJSON.Polygon, TeamFeatureProperties>;

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
  const pluginFeatures = useStore((state) => state.pluginFeatures);
  const pluginMarkers = useRef<maplibregl.Marker[]>([]);
  const { lat, lng, zoom } = useStore((state) => state.mapState);
  const themeId = useStore((state) => state.themeId);
  const mapThemeId = useStore((state) => state.mapThemeId);
  const theme = THEMES[themeId] || THEMES.DEFAULT;

  const getMapThemeTiles = (id: string): string[] => {
    const mt = MAP_THEMES[id] || MAP_THEMES.DARK;
    if (mt.url.includes('{s}')) {
        return ['a', 'b', 'c', 'd'].map(s => mt.url.replace('{s}', s));
    }
    return [mt.url];
  };

  const teamColourExpr = useMemo((): unknown[] => [
    'match', ['get', 'team'],
    'E', theme.E,
    'R', theme.R,
    'M', theme.M,
    theme.N,
  ], [theme.E, theme.R, theme.M, theme.N]);
  const initialTeamColourExpr = useRef<unknown[] | null>(null);
  if (initialTeamColourExpr.current === null) {
    initialTeamColourExpr.current = teamColourExpr;
  }

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
              'line-width': 3,
              'line-dasharray': [2, 1],
              'line-color': ['get', 'color'],
              'line-opacity': ['coalesce', ['get', 'opacity'], 1],
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

    // Manual interaction check (Safer for Firefox)
    map.current.on('click', (e: maplibregl.MapMouseEvent) => {
        if (!map.current) return;
        const { lng, lat } = e.lngLat;
        const point = e.point;

        // 1. Check for Portals
        const allPortals: Portal[] = Object.values(useStore.getState().portals);
        let nearestPortal: Portal | null = null;
        let minPortalDist = 15; 

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
        const bounds = map.current.getBounds();
        window.postMessage({
            type: 'IRIS_MOVE_MAP',
            center: { lat, lng },
            zoom,
            bounds: {
                minLatE6: Math.round(bounds.getSouth() * 1e6),
                minLngE6: Math.round(bounds.getWest() * 1e6),
                maxLatE6: Math.round(bounds.getNorth() * 1e6),
                maxLngE6: Math.round(bounds.getEast() * 1e6),
            }
        }, '*');
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

  // Sync Portal History Layer Visibility
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    
    if (map.current.getLayer('portal-history-visited')) {
        map.current.setLayoutProperty('portal-history-visited', 'visibility', showVisited ? 'visible' : 'none');
    }
    if (map.current.getLayer('portal-history-captured')) {
        map.current.setLayoutProperty('portal-history-captured', 'visibility', showCaptured ? 'visible' : 'none');
    }
    if (map.current.getLayer('portal-history-scanned')) {
        map.current.setLayoutProperty('portal-history-scanned', 'visibility', showScanned ? 'visible' : 'none');
    }
  }, [showVisited, showCaptured, showScanned, styleLoaded]);

  // Sync GeoJSON Data
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    // Filter and update portals
    const filteredPortals: PortalFeature[] = Object.values(portals).filter((p: Portal) => {
        if (p.team === 'N') {
            return showUnclaimedPortals;
        }
        if (p.team === 'M' && !showMachina) return false;
        if (p.team === 'R' && !showResistance) return false;
        if (p.team === 'E' && !showEnlightened) return false;
        if (p.level !== undefined && !showLevel[p.level]) return false;
        
        if (p.health !== undefined) {
            const h = p.health;
            if (h <= 25 && !showHealth[25]) return false;
            if (h > 25 && h <= 50 && !showHealth[50]) return false;
            if (h > 50 && h <= 75 && !showHealth[75]) return false;
            if (h > 75 && !showHealth[100]) return false;
        }
        
        return true;
    }).map((p: Portal) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { 
            id: p.id, 
            team: p.team, 
            name: p.name, 
            level: p.level || 0, 
            health: p.health ?? 100,
            visited: !!p.visited,
            captured: !!p.captured,
            scanned: !!p.scanned
        } satisfies PortalFeatureProperties,
    }));
    getGeoJsonSource('portals')?.setData({ type: 'FeatureCollection', features: filteredPortals });

    // Links
    const filteredLinks: LinkFeature[] = Object.values(links).filter((l: Link) => {
        if (!showLinks) return false;
        if (l.team === 'R' && !showResistance) return false;
        if (l.team === 'E' && !showEnlightened) return false;
        if (l.team === 'M' && !showMachina) return false;
        return true;
    }).map((l: Link) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[l.fromLng, l.fromLat], [l.toLng, l.toLat]] },
        properties: { team: l.team } satisfies TeamFeatureProperties,
    }));
    getGeoJsonSource('links')?.setData({ type: 'FeatureCollection', features: filteredLinks });

    // Fields
    const filteredFields: FieldFeature[] = Object.values(fields).filter((f: Field) => {
        if (!showFields) return false;
        if (f.team === 'R' && !showResistance) return false;
        if (f.team === 'E' && !showEnlightened) return false;
        if (f.team === 'M' && !showMachina) return false;
        return true;
    }).map((f: Field) => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...f.points.map((point) => [point.lng, point.lat] as [number, number]), [f.points[0].lng, f.points[0].lat]]] },
        properties: { team: f.team } satisfies TeamFeatureProperties,
    }));
    getGeoJsonSource('fields')?.setData({ type: 'FeatureCollection', features: filteredFields });

    // Plugin Features (Lines only here, points are HTML)
    getGeoJsonSource('plugin-features')?.setData(pluginFeatures);

  }, [portals, links, fields, showFields, showLinks, showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, showHealth, styleLoaded, pluginFeatures]);

  // Sync HTML Markers (Independent effect for performance)
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    // Clear old markers
    pluginMarkers.current.forEach(m => m.remove());
    pluginMarkers.current = [];

    // Add new markers
    pluginFeatures.features.forEach((feature) => {
        const properties = (feature.properties ?? {}) as PluginFeatureProperties;
        if (properties.isPlayerMarker && feature.geometry.type === 'Point' && map.current) {
            const el = document.createElement('div');
            el.style.pointerEvents = 'none';
            const color = properties.color || '#fff';
            
            el.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; pointer-events: auto;">
                    <div style="background: ${color}; width: 12px; height: 12px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
                    <div style="width: 2px; height: 10px; background: white; margin-top: -2px;"></div>
                </div>
            `;

            const pinHead = el.querySelector('div');
            if (pinHead) {
                pinHead.onclick = (e: MouseEvent): void => {
                    e.stopPropagation();
                    useStore.getState().setSelectedPluginFeature(feature);
                };
            }

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -20] })
                .setLngLat(feature.geometry.coordinates as [number, number])
                .addTo(map.current);
            
            pluginMarkers.current.push(marker);
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
