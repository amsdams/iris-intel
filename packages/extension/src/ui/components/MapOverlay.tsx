import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore } from '@ittca/core';

export function MapOverlay() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const isMoving = useRef(false);

  const portals = useStore((state) => state.portals);
  const links = useStore((state) => state.links);
  const fields = useStore((state) => state.fields);
  const { lat, lng, zoom } = useStore((state) => state.mapState);

  // Initialise MapLibre once — no center/zoom yet, wait for Intel position
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
              'fill-color': [
                'match', ['get', 'team'],
                'E', '#00ff00',
                'R', '#0000ff',
                'M', '#ff0000',
                '#ffffff',
              ],
              'fill-opacity': 0.3,
            },
          },
          {
            id: 'links',
            type: 'line',
            source: 'links',
            paint: {
              'line-width': 2,
              'line-color': [
                'match', ['get', 'team'],
                'E', '#00ff00',
                'R', '#0000ff',
                'M', '#ff0000',
                '#ffffff',
              ],
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
              'circle-color': [
                'match', ['get', 'team'],
                'E', '#00ff00',
                'R', '#0000ff',
                'M', '#ff0000',
                '#ffffff',
              ],
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff',
            },
          },
        ],
      },
      // Start at 0,0 — will jump to Intel position on first ITTCA_TILE_REQUEST
      center: [0, 0],
      zoom: 2,
      interactive: true,
    });

    map.current.on('load', () => {
      setStyleLoaded(true);
    });

    map.current.on('moveend', () => {
      if (!map.current || isMoving.current) return;
      const center = map.current.getCenter();
      const z = map.current.getZoom();
      console.log(`ITTCA: MapLibre moveend - Lat: ${center.lat}, Lng: ${center.lng}, Zoom: ${z}`);
      window.postMessage({
        type: 'ITTCA_MOVE_MAP',
        center: { lat: center.lat, lng: center.lng },
        zoom: Math.round(z),
      }, '*');
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Sync MapLibre position when store mapState changes
  // This fires when ITTCA_TILE_REQUEST updates the store
  useEffect(() => {
    console.log('ITTCA: data effect fired, styleLoaded:', styleLoaded, 'portals:', Object.keys(portals).length);

    if (!map.current || !styleLoaded) return;
    if (lat === 0 && lng === 0) return; // ignore default state

    isMoving.current = true;
    map.current.jumpTo({ center: [lng, lat], zoom });
    // Reset flag after MapLibre has processed the jump
    setTimeout(() => {
      isMoving.current = false;
    }, 100);
  }, [lat, lng, zoom, styleLoaded]);

  // Update portal/link/field data whenever store or style changes
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    const portalSource = map.current.getSource('portals') as maplibregl.GeoJSONSource;
    if (portalSource) {
      portalSource.setData({
        type: 'FeatureCollection',
        features: Object.values(portals).map((p: any) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: { team: p.team },
        })),
      } as any);
    }

    const linkSource = map.current.getSource('links') as maplibregl.GeoJSONSource;
    if (linkSource) {
      linkSource.setData({
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
    }

    const fieldSource = map.current.getSource('fields') as maplibregl.GeoJSONSource;
    if (fieldSource) {
      fieldSource.setData({
        type: 'FeatureCollection',
        features: Object.values(fields).map((f: any) => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [...f.points.map((p: any) => [p.lng, p.lat]),
                [f.points[0].lng, f.points[0].lat]],
            ],
          },
          properties: { team: f.team },
        })),
      } as any);
    }
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