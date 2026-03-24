import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '@iris/core';
import { THEMES } from '../theme';

export function MapOverlay() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Prevents moveend from echoing back to Intel when we programmatically jump
  const isMoving = useRef(false);

  const portals = useStore((state) => state.portals);
  const links = useStore((state) => state.links);
  const fields = useStore((state) => state.fields);
  const pluginFeatures = useStore((state) => state.pluginFeatures);
  const pluginMarkers = useRef<maplibregl.Marker[]>([]);
  const { lat, lng, zoom } = useStore((state) => state.mapState);
  const themeId = useStore((state) => state.themeId);
  const theme = THEMES[themeId] || THEMES.DEFAULT;

  const TEAM_COLOUR_EXPR = [
    'match', ['get', 'team'],
    'E', theme.E,
    'R', theme.R,
    'M', theme.M,
    theme.N,
  ] as any;

  // Layer visibility states from store
  const showFields = useStore((state) => state.showFields);
  const showLinks = useStore((state) => state.showLinks);
  const showResistance = useStore((state) => state.showResistance);
  const showEnlightened = useStore((state) => state.showEnlightened);
  const showMachina = useStore((state) => state.showMachina);
  const showUnclaimedPortals = useStore((state) => state.showUnclaimedPortals);
  const showLevel = useStore((state) => state.showLevel);


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
            tiles: [
              'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
              'https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
            ],
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
              'fill-color': TEAM_COLOUR_EXPR,
              'fill-opacity': 0.3,
            },
          },
          {
            id: 'links',
            type: 'line',
            source: 'links',
            paint: {
              'line-width': 2,
              'line-color': TEAM_COLOUR_EXPR,
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
              'circle-color': TEAM_COLOUR_EXPR,
              'circle-opacity': [
                'interpolate', ['linear'], ['get', 'health'],
                0, 0.1,
                100, 0.7
              ],
              'circle-stroke-width': 1.5,
              'circle-stroke-color': TEAM_COLOUR_EXPR,
              'circle-stroke-opacity': 1,
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
      window.postMessage({
        type: 'IRIS_MOVE_MAP',
        center: { lat: center.lat, lng: center.lng },
        zoom: Math.round(z),
      }, '*');
    });

    // Manual interaction check (Safer for Firefox)
    map.current.on('click', (e) => {
        if (!map.current) return;
        const { lng, lat } = e.lngLat;
        const point = e.point;

        // 1. Check for Portals
        const allPortals = Object.values(useStore.getState().portals);
        let nearestPortal = null;
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
    map.current.on('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMove < 100) return;
        lastMove = now;

        if (!map.current) return;
        const { lng, lat } = e.lngLat;
        const point = e.point;
        const allPortals = Object.values(useStore.getState().portals);
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

    const onPortalClick = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      useStore.getState().selectPortal(id);
      window.postMessage({ type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: id }, '*');
    };

    document.addEventListener('iris:portal:click', onPortalClick);

    return () => {
      map.current?.remove();
      document.removeEventListener('iris:portal:click', onPortalClick);
    };
  }, []);

  // Sync Camera
  useEffect(() => {
    if (!map.current || !styleLoaded || (lat === 0 && lng === 0)) return;
    isMoving.current = true;
    map.current.jumpTo({ center: [lng, lat], zoom });
    setTimeout(() => { isMoving.current = false; }, 100);
  }, [lat, lng, zoom, styleLoaded]);

  // Sync Theme
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    map.current.setPaintProperty('fields', 'fill-color', TEAM_COLOUR_EXPR);
    map.current.setPaintProperty('links', 'line-color', TEAM_COLOUR_EXPR);
    map.current.setPaintProperty('portals', 'circle-color', TEAM_COLOUR_EXPR);
    map.current.setPaintProperty('portals', 'circle-stroke-color', TEAM_COLOUR_EXPR);
  }, [themeId, styleLoaded]);

  // Sync GeoJSON Data
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    // Filter and update portals
    const filteredPortals = Object.values(portals).filter(p => {
        if (p.team === 'N' && !showUnclaimedPortals) return false;
        if (p.team === 'M' && !showMachina) return false;
        if (p.team === 'R' && !showResistance) return false;
        if (p.team === 'E' && !showEnlightened) return false;
        if (p.level !== undefined && !showLevel[p.level]) return false;
        return true;
    }).map((p: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id, team: p.team, name: p.name, level: p.level, health: p.health ?? 100 },
    }));
    (map.current.getSource('portals') as any)?.setData({ type: 'FeatureCollection', features: filteredPortals });

    // Links
    const filteredLinks = Object.values(links).filter(l => {
        if (!showLinks) return false;
        if (l.team === 'R' && !showResistance) return false;
        if (l.team === 'E' && !showEnlightened) return false;
        if (l.team === 'M' && !showMachina) return false;
        return true;
    }).map((l: any) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[l.fromLng, l.fromLat], [l.toLng, l.toLat]] },
        properties: { team: l.team },
    }));
    (map.current.getSource('links') as any)?.setData({ type: 'FeatureCollection', features: filteredLinks });

    // Fields
    const filteredFields = Object.values(fields).filter(f => {
        if (!showFields) return false;
        if (f.team === 'R' && !showResistance) return false;
        if (f.team === 'E' && !showEnlightened) return false;
        if (f.team === 'M' && !showMachina) return false;
        return true;
    }).map((f: any) => ({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[...f.points.map((p: any) => [p.lng, p.lat]), [f.points[0].lng, f.points[0].lat]]] },
        properties: { team: f.team },
    }));
    (map.current.getSource('fields') as any)?.setData({ type: 'FeatureCollection', features: filteredFields });

    // Plugin Features (Lines only here, points are HTML)
    (map.current.getSource('plugin-features') as any)?.setData(pluginFeatures);

  }, [portals, links, fields, showFields, showLinks, showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, styleLoaded, pluginFeatures]);

  // Sync HTML Markers (Independent effect for performance)
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    // Clear old markers
    pluginMarkers.current.forEach(m => m.remove());
    pluginMarkers.current = [];

    // Add new markers
    pluginFeatures.features.forEach((f: any) => {
        if (f.properties?.isPlayerMarker && f.geometry.type === 'Point' && map.current) {
            const el = document.createElement('div');
            el.style.pointerEvents = 'none';
            const color = f.properties.color || '#fff';
            
            el.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer; pointer-events: auto;">
                    <div style="background: ${color}; width: 12px; height: 12px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
                    <div style="width: 2px; height: 10px; background: white; margin-top: -2px;"></div>
                </div>
            `;

            const pinHead = el.querySelector('div');
            if (pinHead) {
                pinHead.onclick = (e) => {
                    e.stopPropagation();
                    useStore.getState().setSelectedPluginFeature(f.properties);
                };
            }

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -20] })
                .setLngLat(f.geometry.coordinates)
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
