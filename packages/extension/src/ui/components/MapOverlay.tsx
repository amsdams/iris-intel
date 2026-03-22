import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '@iris/core';

// Team colours used across portal, link and field layers
const TEAM_COLOUR_EXPR = [
  'match', ['get', 'team'],
  'E', '#00ff00',
  'R', '#0000ff',
  'M', '#ff0000',
  '#ffffff',
] as any;

export function MapOverlay() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // Prevents moveend from echoing back to Intel when we programmatically jump
  const isMoving = useRef(false);

  const portals = useStore((state) => state.portals);
  const links = useStore((state) => state.links);
  const fields = useStore((state) => state.fields);
  const { lat, lng, zoom } = useStore((state) => state.mapState);

  // ---------------------------------------------------------------------------
  // Initialise MapLibre map once on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
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

    // Show portal details popup on click
    map.current.on('click', 'portals', (e) => {
      if (!e.features?.length) return;
      const id = e.features[0].properties?.id;
      if (!id) return;
      useStore.getState().selectPortal(id);
      window.postMessage({
        type: 'IRIS_PORTAL_DETAILS_REQUEST',
        guid: id,
      }, '*');
    });

    // Pointer cursor when hovering portals
    map.current.on('mouseenter', 'portals', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'portals', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    return () => map.current?.remove();
  }, []);

  // ---------------------------------------------------------------------------
  // Sync MapLibre camera when store mapState changes
  // Triggered by initial position set from first getEntities batch
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!map.current || !styleLoaded) return;
    if (lat === 0 && lng === 0) return;

    isMoving.current = true;
    map.current.jumpTo({ center: [lng, lat], zoom });
    setTimeout(() => { isMoving.current = false; }, 100);
  }, [lat, lng, zoom, styleLoaded]);

  // ---------------------------------------------------------------------------
  // Update GeoJSON sources when portal/link/field data changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    const portalSource = map.current.getSource('portals') as maplibregl.GeoJSONSource;
    portalSource?.setData({
      type: 'FeatureCollection',
      features: Object.values(portals).map((p: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id, team: p.team, name: p.name, level: p.level },
      })),
    } as any);

    const linkSource = map.current.getSource('links') as maplibregl.GeoJSONSource;
    linkSource?.setData({
      type: 'FeatureCollection',
      features: Object.values(links).map((l: any) => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[l.fromLng, l.fromLat], [l.toLng, l.toLat]],
        },
        properties: { team: l.team },
      })),
    } as any);

    const fieldSource = map.current.getSource('fields') as maplibregl.GeoJSONSource;
    fieldSource?.setData({
      type: 'FeatureCollection',
      features: Object.values(fields).map((f: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            ...f.points.map((p: any) => [p.lng, p.lat]),
            [f.points[0].lng, f.points[0].lat],
          ]],
        },
        properties: { team: f.team },
      })),
    } as any);

  }, [portals, links, fields, styleLoaded]);

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