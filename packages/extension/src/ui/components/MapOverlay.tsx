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

    // Set pointer cursor when near a portal, let MapLibre manage grab/grabbing
    // otherwise. Avoids queryRenderedFeatures which breaks Firefox sandbox.
    map.current.on('mousemove', (e) => {
      if (!map.current) return;
      const { lng, lat } = e.lngLat;
      const allPortals = Object.values(useStore.getState().portals);

      const z = map.current.getZoom();
      const threshold = 0.0005 * Math.pow(2, 15 - z);

      const isNearPortal = allPortals.some((p: any) => {
        const dx = p.lng - lng;
        const dy = p.lat - lat;
        return Math.sqrt(dx * dx + dy * dy) < threshold;
      });

      map.current.getCanvas().style.cursor = isNearPortal ? 'pointer' : '';
    });

    // Plain map click — find nearest portal from store without
    // queryRenderedFeatures which triggers Firefox sandbox errors
    map.current.on('click', (e) => {
      if (!map.current) return;
      const { lng, lat } = e.lngLat;
      const allPortals = Object.values(useStore.getState().portals);
      if (!allPortals.length) return;

      const z = map.current.getZoom();
      const threshold = 0.0005 * Math.pow(2, 15 - z);

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

        // Check team visibility
        if (isUnclaimed && !showUnclaimedPortals) return false;
        if (isMachina && !showMachina) return false;
        if (isResistance && !showResistance) return false;
        if (isEnlightened && !showEnlightened) return false;

        // Check level visibility
        if (p.level && !showLevel[p.level]) return false;

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

  }, [portals, links, fields, showFields, showLinks, showResistance, showEnlightened, showMachina, showUnclaimedPortals, showLevel, styleLoaded]);

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