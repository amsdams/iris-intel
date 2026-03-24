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
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
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
            id: 'osm',
            type: 'raster',
            source: 'osm',
          },
          {
            id: 'background-dim',
            type: 'background',
            paint: {
              'background-color': '#000',
              'background-opacity': 0.4,
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
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff',
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

    // Set pointer cursor when near a portal or plugin marker
    map.current.on('mousemove', (e) => {
      if (!map.current) return;
      const { lng, lat } = e.lngLat;
      const allPortals = Object.values(useStore.getState().portals);
      const pluginFeatures = useStore.getState().pluginFeatures.features;

      const z = map.current.getZoom();
      const threshold = 0.0005 * Math.pow(2, 15 - z);

      const isNearPortal = allPortals.some((p: any) => {
        const dx = p.lng - lng;
        const dy = p.lat - lat;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
      });

      const isNearPluginMarker = pluginFeatures.some((f: any) => {
        if (f.geometry.type !== 'Point') return false;
        const [flng, flat] = f.geometry.coordinates;
        const dx = flng - lng;
        const dy = flat - lat;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
      });

      map.current.getCanvas().style.cursor = (isNearPortal || isNearPluginMarker) ? 'pointer' : '';
    });

    // Plain map click — find nearest portal or plugin marker
    map.current.on('click', (e) => {
      if (!map.current) return;
      const { lng, lat } = e.lngLat;
      const allPortals = Object.values(useStore.getState().portals);
      const pluginFeatures = useStore.getState().pluginFeatures.features;

      const z = map.current.getZoom();
      const threshold = 0.0005 * Math.pow(2, 15 - z);

      // Check plugin markers first
      let nearestPlugin: any = null;
      let minPluginDist = Infinity;

      pluginFeatures.forEach((f: any) => {
        if (f.geometry.type !== 'Point') return;
        const [flng, flat] = f.geometry.coordinates;
        const dx = flng - lng;
        const dy = flat - lat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minPluginDist) {
            minPluginDist = dist;
            nearestPlugin = f;
        }
      });

      if (nearestPlugin && minPluginDist < threshold) {
        const props = nearestPlugin.properties;
        if (props.isLast) {
            new maplibregl.Popup({ closeButton: true, className: 'iris-plugin-popup' })
                .setLngLat(nearestPlugin.geometry.coordinates)
                .setHTML(`
                    <div style="color: #000; padding: 5px; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
                        <strong style="font-size: 14px; border-bottom: 1px solid #ccc; display: block; margin-bottom: 5px; padding-bottom: 2px;">Last Player Activity</strong>
                        <div><strong>Player:</strong> ${props.name}</div>
                        <div><strong>Time:</strong> ${new Date(props.time).toLocaleString()}</div>
                        <div><strong>Portal:</strong> ${props.portalName}</div>
                        <div style="margin-top: 5px; color: #666; font-size: 10px;">${props.lat.toFixed(6)}, ${props.lng.toFixed(6)}</div>
                    </div>
                `)
                .addTo(map.current);
            return;
        }
      }

      if (!allPortals.length) return;

      let nearest: any = null;
      let minDist = Infinity;

      allPortals.forEach((p: any) => {
        const dx = p.lng - lng;
        const dy = p.lat - lat;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = p;
        }
      });

      if (nearest && minDist < threshold) {
        document.dispatchEvent(
            new CustomEvent('iris:portal:click', { detail: { id: nearest.id } })
        );
      }
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
        properties: { id: p.id, team: p.team, name: p.name, level: p.level },
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
                const color = f.properties.color || '#fff';
                const label = f.properties.label;
                
                el.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
                        <div style="background: ${color}; width: 18px; height: 18px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>
                        ${label ? `<div style="color: white; font-weight: bold; font-size: 11px; text-shadow: 0 0 3px black; margin-top: 4px; background: rgba(0,0,0,0.4); padding: 1px 4px; border-radius: 4px;">${label}</div>` : ''}
                    </div>
                `;

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(f.geometry.coordinates)
                    .setPopup(new maplibregl.Popup({ offset: 25, closeButton: true }).setHTML(`
                        <div style="color: #000; padding: 5px; font-family: sans-serif; font-size: 12px; line-height: 1.4;">
                            <strong style="font-size: 14px; border-bottom: 1px solid #ccc; display: block; margin-bottom: 5px; padding-bottom: 2px;">Player Last Activity</strong>
                            <div><strong>Player:</strong> ${f.properties.name}</div>
                            <div><strong>Time:</strong> ${new Date(f.properties.time).toLocaleString()}</div>
                            <div><strong>Portal:</strong> ${f.properties.portalName}</div>
                            <div style="margin-top: 5px; color: #666; font-size: 10px;">${f.properties.lat.toFixed(6)}, ${f.properties.lng.toFixed(6)}</div>
                        </div>
                    `))
                    .addTo(map.current);
                
                pluginMarkers.current.push(marker);
            }
        });
    }

  }, [portals, links, fields, showFields, showLinks, showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, styleLoaded, pluginFeatures]);

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