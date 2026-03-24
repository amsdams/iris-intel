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
      // Start at 0,0 — jumps to Intel position on first getEntities batch
      center: [0, 0],
      zoom: 2,
      interactive: true,
    });

    // Mark style as ready so data effects can run
    map.current.on('load', () => setStyleLoaded(true));

    // Forward user pan/zoom to Intel map via content script message
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

    // Handle portal click event — runs in content script context where
    // useStore and window.postMessage are fully accessible
    const onPortalClick = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      useStore.getState().selectPortal(id);
      window.postMessage({
        type: 'IRIS_PORTAL_DETAILS_REQUEST',
        guid: id,
      }, '*');
    };

    document.addEventListener('iris:portal:click', onPortalClick);

    // Cleanup — remove map and event listener on unmount
    return () => {
      map.current?.remove();
      document.removeEventListener('iris:portal:click', onPortalClick);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Sync MapLibre camera when store mapState changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    if (lat === 0 && lng === 0) return;

    isMoving.current = true;
    map.current.jumpTo({ center: [lng, lat], zoom });
    setTimeout(() => { isMoving.current = false; }, 100);
  }, [lat, lng, zoom, styleLoaded]);

  // ---------------------------------------------------------------------------
  // Update layer colors when theme changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    map.current.setPaintProperty('fields', 'fill-color', TEAM_COLOUR_EXPR);
    map.current.setPaintProperty('links', 'line-color', TEAM_COLOUR_EXPR);
    map.current.setPaintProperty('portals', 'circle-color', TEAM_COLOUR_EXPR);
    map.current.setPaintProperty('portals', 'circle-stroke-color', TEAM_COLOUR_EXPR);
  }, [themeId, styleLoaded]);

  // ---------------------------------------------------------------------------
  // Update GeoJSON sources when portal/link/field data changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    // Filter portals
    const filteredPortals = Object.values(portals).filter(p => {
        const isUnclaimed = p.team === 'N';
        const isMachina = p.team === 'M';
        const isResistance = p.team === 'R';
        const isEnlightened = p.team === 'E';

        // Filter by team first
        if (isUnclaimed && !showUnclaimedPortals) return false;
        if (isMachina && !showMachina) return false;
        if (isResistance && !showResistance) return false;
        if (isEnlightened && !showEnlightened) return false;

        // Then filter by level. Only apply level filter if the portal has a level.
        // Unclaimed portals that explicitly have no level should not be filtered by showLevel[p.level].
        // If p.level is defined, then apply the level filter.
        if (p.level !== undefined && !showLevel[p.level]) return false;

        return true;
    }).map((p: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id, team: p.team, name: p.name, level: p.level, health: p.health ?? 100 },
    }));

    const portalSource = map.current.getSource('portals') as maplibregl.GeoJSONSource;
    portalSource?.setData({
      type: 'FeatureCollection',
      features: filteredPortals,
    } as any);

    // Filter links
    const filteredLinks = Object.values(links).filter(l => {
        if (!showLinks) return false;
        const isResistance = l.team === 'R';
        const isEnlightened = l.team === 'E';
        const isMachina = l.team === 'M';

        if (isResistance && !showResistance) return false;
        if (isEnlightened && !showEnlightened) return false;
        if (isMachina && !showMachina) return false;
        return true;
    }).map((l: any) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[l.fromLng, l.fromLat], [l.toLng, l.toLat]],
        },
        properties: { team: l.team },
    }));

    const linkSource = map.current.getSource('links') as maplibregl.GeoJSONSource;
    linkSource?.setData({
      type: 'FeatureCollection',
      features: filteredLinks,
    } as any);

    // Filter fields
    const filteredFields = Object.values(fields).filter(f => {
        if (!showFields) return false;
        const isResistance = f.team === 'R';
        const isEnlightened = f.team === 'E';
        const isMachina = f.team === 'M';

        if (isResistance && !showResistance) return false;
        if (isEnlightened && !showEnlightened) return false;
        if (isMachina && !showMachina) return false;
        return true;
    }).map((f: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            ...f.points.map((p: any) => [p.lng, p.lat]),
            [f.points[0].lng, f.points[0].lat],
          ]],
        },
        properties: { team: f.team },
    }));

    const fieldSource = map.current.getSource('fields') as maplibregl.GeoJSONSource;
    fieldSource?.setData({
      type: 'FeatureCollection',
      features: filteredFields,
    } as any);

    const pluginSource = map.current.getSource('plugin-features') as maplibregl.GeoJSONSource;
    pluginSource?.setData(pluginFeatures as any);

    // Sync HTML Markers for (new) activity
    if (map.current) {
        // Clear old markers
        pluginMarkers.current.forEach(m => m.remove());
        pluginMarkers.current = [];

        // Add new markers for all player points
        pluginFeatures.features.forEach((f: any) => {
            if (f.properties?.isPlayerMarker && f.geometry.type === 'Point' && map.current) {
                const el = document.createElement('div');
                el.style.pointerEvents = 'none';
                const color = f.properties.color || '#fff';
                const label = f.properties.label;
                
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
    }

  }, [portals, links, fields, showFields, showLinks, showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, styleLoaded, pluginFeatures]);

  // ---------------------------------------------------------------------------
  // Layer Click Handlers
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    const onPortalLayerClick = (e: any) => {
        if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            document.dispatchEvent(
                new CustomEvent('iris:portal:click', { detail: { id: feature.properties.id } })
            );
        }
    };

    const onPluginLayerClick = (e: any) => {
        if (e.features && e.features.length > 0) {
            useStore.getState().setSelectedPluginFeature(e.features[0].properties);
        }
    };

    map.current.on('click', 'portals', onPortalLayerClick);
    map.current.on('click', 'plugin-points', onPluginLayerClick);
    map.current.on('click', 'plugin-lines', onPluginLayerClick);

    // Update cursor on hover
    const setPointer = () => { if (map.current) map.current.getCanvas().style.cursor = 'pointer'; };
    const resetPointer = () => { if (map.current) map.current.getCanvas().style.cursor = ''; };

    map.current.on('mouseenter', 'portals', setPointer);
    map.current.on('mouseleave', 'portals', resetPointer);
    map.current.on('mouseenter', 'plugin-points', setPointer);
    map.current.on('mouseleave', 'plugin-points', resetPointer);
    map.current.on('mouseenter', 'plugin-lines', setPointer);
    map.current.on('mouseleave', 'plugin-lines', resetPointer);

    return () => {
        if (!map.current) return;
        map.current.off('click', 'portals', onPortalLayerClick);
        map.current.off('click', 'plugin-points', onPluginLayerClick);
        map.current.off('click', 'plugin-lines', onPluginLayerClick);
        map.current.off('mouseenter', 'portals', setPointer);
        map.current.off('mouseleave', 'portals', resetPointer);
    };
  }, [styleLoaded]);

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