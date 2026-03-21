import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useStore, Portal } from '@ittca/core';

export function MapOverlay() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const { lat, lng, zoom } = useStore((state) => state.mapState);
  const portals = useStore((state) => state.portals);
  const links = useStore((state) => state.links);
  const fields = useStore((state) => state.fields);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'portals': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          },
          'links': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          },
          'fields': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#111' },
          },
          {
            id: 'fields',
            type: 'fill',
            source: 'fields',
            paint: {
              'fill-color': [
                'match',
                ['get', 'team'],
                'E', '#00ff00',
                'R', '#0000ff',
                '#ffffff'
              ],
              'fill-opacity': 0.2
            }
          },
          {
            id: 'links',
            type: 'line',
            source: 'links',
            paint: {
              'line-width': 2,
              'line-color': [
                'match',
                ['get', 'team'],
                'E', '#00ff00',
                'R', '#0000ff',
                '#ffffff'
              ]
            }
          },
          {
            id: 'portals',
            type: 'circle',
            source: 'portals',
            paint: {
              'circle-radius': 5,
              'circle-color': [
                'match',
                ['get', 'team'],
                'E', '#00ff00',
                'R', '#0000ff',
                '#ffffff'
              ],
              'circle-stroke-width': 1,
              'circle-stroke-color': '#fff'
            }
          }
        ],
      },
      center: [lng, lat],
      zoom: zoom,
      interactive: false,
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Sync with store position
  useEffect(() => {
    if (map.current) {
      map.current.jumpTo({
        center: [lng, lat],
        zoom: zoom - 1,
      });
    }
  }, [lat, lng, zoom]);

  // Sync with store data
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // Update Portals
    const portalSource = map.current.getSource('portals') as maplibregl.GeoJSONSource;
    if (portalSource) {
      portalSource.setData({
        type: 'FeatureCollection',
        features: Object.values(portals).map((p) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: { team: p.team }
        })) as any
      });
    }

    // Update Links
    const linkSource = map.current.getSource('links') as maplibregl.GeoJSONSource;
    if (linkSource) {
      linkSource.setData({
        type: 'FeatureCollection',
        features: Object.values(links).map((l) => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[l.fromLng, l.fromLat], [l.toLng, l.toLat]]
          },
          properties: { team: l.team }
        })) as any
      });
    }

    // Update Fields
    const fieldSource = map.current.getSource('fields') as maplibregl.GeoJSONSource;
    if (fieldSource) {
      fieldSource.setData({
        type: 'FeatureCollection',
        features: Object.values(fields).map((f) => ({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...f.points.map(p => [p.lng, p.lat]), [f.points[0].lng, f.points[0].lat]]]
          },
          properties: { team: f.team }
        })) as any
      });
    }
  }, [portals, links, fields]);

  return (
    <div 
      ref={mapContainer} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        opacity: 0.5,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
