import {h, JSX} from 'preact';
import {useEffect, useMemo, useRef, useState, useCallback} from 'preact/hooks';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {useStore, globalSpatialIndex, Portal, Link, Field, PlannedLink, PlannedMarker, getMinLevelForZoom, MapPerfSnapshot} from '@iris/core';
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
import {emitPortalClick, installPortalSelectionBridge} from './map-events';
import {resolveMapSelection} from './map-selection';

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

const SETTLE_DELAY_MS = 350;
const FIELD_FILL_OPACITY = 0.3;
const LINK_LINE_WIDTH = 2;
const MOVING_LINK_LINE_WIDTH = 1;
const LINK_LINE_OPACITY = 1;
const MOVING_LINK_LINE_OPACITY = 0.72;
const SLOW_FRAME_MS = 34;
const PAN_BENCHMARK_STEP_PX = 220;
const PAN_BENCHMARK_RUN_COUNT = 3;
const PAN_BENCHMARK_RUN_DURATION_MS = 3000;
const PAN_BENCHMARK_START = { lat: 52.371094, lng: 4.906375, zoom: 14.36 };
const PAN_BENCHMARK_SETTLE_MS = 600;
const PLANNED_LINK_COLOR = '#37e6ff';
const PLANNED_CROSSLINK_COLOR = '#ff4d4d';
const TOUCH_TAP_MOVE_THRESHOLD_PX = 18;
const TOUCH_PORTAL_THRESHOLD_PX = 32;
const PLANNED_MARKER_COLORS: Record<PlannedMarker['color'], string> = {
  white: '#ffffff',
  red: '#ff4d4d',
  blue: '#37e6ff',
  green: '#49ff7a',
};

interface MarkerRegistryEntry {
  marker: maplibregl.Marker;
  clickTarget: HTMLDivElement | null;
}

interface MovingFrameSample {
  active: boolean;
  startedAt: number;
  lastFrameAt: number | null;
  frameCount: number;
  totalFrameMs: number;
  maxFrameMs: number;
  slowFrameCount: number;
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
    clickTarget.style.pointerEvents = 'none';
    clickTarget.style.cursor = 'default';
    clickTarget.onclick = null;
    return;
  }

  clickTarget.style.pointerEvents = 'auto';
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

function isCurrentMapView(mapInstance: maplibregl.Map, lat: number, lng: number, zoom: number): boolean {
  const center = mapInstance.getCenter();
  return (
    Math.abs(center.lat - lat) < 0.000001 &&
    Math.abs(center.lng - lng) < 0.000001 &&
    Math.abs(mapInstance.getZoom() - zoom) < 0.001
  );
}

function isMobileMapViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
}

function getViewportQueryBufferDegrees(bounds: maplibregl.LngLatBounds): number {
  if (!isMobileMapViewport()) {
    return 0.05;
  }

  const latSpan = Math.abs(bounds.getNorth() - bounds.getSouth());
  const lngSpan = Math.abs(bounds.getEast() - bounds.getWest());
  const viewportRelativeBuffer = Math.max(latSpan, lngSpan) * 0.2;

  return Math.min(Math.max(viewportRelativeBuffer, 0.002), 0.015);
}

function setPaintIfLayerExists(
  mapInstance: maplibregl.Map,
  layerId: string,
  name: string,
  value: unknown
): void {
  if (mapInstance.getLayer(layerId)) {
    mapInstance.setPaintProperty(layerId, name, value);
  }
}

function setLayerVisibilityIfExists(
  mapInstance: maplibregl.Map,
  layerId: string,
  visibility: 'visible' | 'none'
): void {
  if (mapInstance.getLayer(layerId)) {
    mapInstance.setLayoutProperty(layerId, 'visibility', visibility);
  }
}

function buildPlannedLinkFeatures(
  plannedLinks: PlannedLink[],
  plannedMarkers: PlannedMarker[],
  portals: Record<string, Portal>,
  links: Record<string, Link>,
  planningPortalPath: string[],
  selectedPlannedItemId: string | null
): GeoJSON.Feature[] {
  const features: GeoJSON.Feature[] = [];
  const loadedLinks = Object.values(links);

  plannedLinks.forEach((plannedLink) => {
      const from = portals[plannedLink.fromPortalId];
      const to = portals[plannedLink.toPortalId];
      if (!from || !to) {
        return;
      }

      features.push({
        type: 'Feature',
        id: plannedLink.id,
        geometry: {
          type: 'LineString',
          coordinates: [
            [from.lng, from.lat],
            [to.lng, to.lat],
          ],
        },
        properties: {
          id: plannedLink.id,
          plannedType: 'link',
          plannedItemType: 'link',
          selected: selectedPlannedItemId === plannedLink.id,
          color: PLANNED_LINK_COLOR,
          opacity: 0.92,
        },
      } as GeoJSON.Feature);

      loadedLinks.forEach((link) => {
        if (
          link.fromPortalId === plannedLink.fromPortalId ||
          link.toPortalId === plannedLink.fromPortalId ||
          link.fromPortalId === plannedLink.toPortalId ||
          link.toPortalId === plannedLink.toPortalId
        ) {
          return;
        }

        if (!segmentsIntersect(
          { lng: from.lng, lat: from.lat },
          { lng: to.lng, lat: to.lat },
          { lng: link.fromLng, lat: link.fromLat },
          { lng: link.toLng, lat: link.toLat }
        )) {
          return;
        }

        features.push({
          type: 'Feature',
          id: `planned-crossing:${plannedLink.id}:${link.id}`,
          geometry: {
            type: 'LineString',
            coordinates: [
              [link.fromLng, link.fromLat],
              [link.toLng, link.toLat],
            ],
          },
          properties: {
            id: `planned-crossing:${plannedLink.id}:${link.id}`,
            plannedType: 'crossing',
            color: PLANNED_CROSSLINK_COLOR,
            opacity: 0.95,
          },
        });
      });
  });

  planningPortalPath.forEach((portalId, index) => {
    const portal = portals[portalId];
    if (!portal) {
      return;
    }

    features.push({
      type: 'Feature',
      id: `planned-path:${index}:${portalId}`,
      geometry: {
        type: 'Point',
        coordinates: [portal.lng, portal.lat],
      },
      properties: {
        id: `planned-path:${index}:${portalId}`,
        plannedType: index === 0 ? 'anchor' : 'target',
        color: PLANNED_LINK_COLOR,
        opacity: 0.95,
      },
    });
  });

  for (let index = 0; index < planningPortalPath.length - 1; index += 1) {
    const fromPortalId = planningPortalPath[index];
    const toPortalId = planningPortalPath[index + 1];
    const from = portals[fromPortalId];
    const to = portals[toPortalId];
    if (!from || !to) {
      continue;
    }

    features.push({
      type: 'Feature',
      id: `planned-preview:${index}:${fromPortalId}:${toPortalId}`,
      geometry: {
        type: 'LineString',
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
      },
      properties: {
        id: `planned-preview:${index}:${fromPortalId}:${toPortalId}`,
        plannedType: 'preview',
        color: PLANNED_LINK_COLOR,
        opacity: 0.72,
      },
    });
  }

  plannedMarkers.forEach((plannedMarker) => {
    features.push({
      type: 'Feature',
      id: plannedMarker.id,
      geometry: {
        type: 'Point',
        coordinates: [plannedMarker.lng, plannedMarker.lat],
      },
      properties: {
        id: plannedMarker.id,
        label: plannedMarker.label,
        portalId: plannedMarker.portalId,
        plannedType: 'marker',
        plannedItemType: 'marker',
        selected: selectedPlannedItemId === plannedMarker.id,
        color: PLANNED_MARKER_COLORS[plannedMarker.color] ?? PLANNED_MARKER_COLORS.blue,
        opacity: 0.95,
      },
    });
  });

  return features;
}

function segmentsIntersect(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
  c: { lng: number; lat: number },
  d: { lng: number; lat: number }
): boolean {
  const denominator = ((a.lng - b.lng) * (c.lat - d.lat)) - ((a.lat - b.lat) * (c.lng - d.lng));
  if (Math.abs(denominator) < 1e-12) {
    return false;
  }

  const t = (((a.lng - c.lng) * (c.lat - d.lat)) - ((a.lat - c.lat) * (c.lng - d.lng))) / denominator;
  const u = -(((a.lng - b.lng) * (a.lat - c.lat)) - ((a.lat - b.lat) * (a.lng - c.lng))) / denominator;

  return t > 0 && t < 1 && u > 0 && u < 1;
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
  const [htmlMarkerSyncTick, setHtmlMarkerSyncTick] = useState(0);

  // Prevents moveend from echoing back to Intel when we programmatically jump
  const isMoving = useRef(false);
  const isUserMovingMap = useRef(false);
  const htmlMarkerSettleTimer = useRef<number | null>(null);
  const isFirstSync = useRef(true);

  // Core entities are NOT subscribed here anymore. We use the globalSpatialIndex for viewport sync.
  const artifacts = useStore((state) => state.artifacts);
  const mockOrnaments = useStore((state) => state.mockOrnaments);
  const missionDetails = useStore((state) => state.missionDetails);
  const pluginFeatures = useStore((state) => state.pluginFeatures);
  const plannedLinks = useStore((state) => state.plannedLinks);
  const plannedMarkers = useStore((state) => state.plannedMarkers);
  const planningMode = useStore((state) => state.planningMode);
  const planningTool = useStore((state) => state.planningTool);
  const planningAnchorPortalId = useStore((state) => state.planningAnchorPortalId);
  const planningPortalPath = useStore((state) => state.planningPortalPath);
  const selectedPlannedItemId = useStore((state) => state.selectedPlannedItemId);
  const plannedLinksEnabled = useStore((state) => state.pluginStates['planned-links'] ?? false);
  const selectedPortalId = useStore((state) => state.selectedPortalId);
  const selectedFieldId = useStore((state) => state.selectedFieldId);
  const selectedLinkId = useStore((state) => state.selectedLinkId);
  const pluginMarkers = useRef<Map<string, MarkerRegistryEntry>>(new Map());
  const syncViewportRef = useRef<() => void>(() => undefined);
  const scheduledViewportSyncFrame = useRef<number | null>(null);
  const lastViewportPerfLogAt = useRef(0);
  const lastHtmlMarkerPerfLogAt = useRef(0);
  const movingFrameRequest = useRef<number | null>(null);
  const panBenchmarkActive = useRef(false);
  const panBenchmarkSettleTimer = useRef<number | null>(null);
  const panBenchmarkAnimation = useRef<number | null>(null);
  const movingFrameSample = useRef<MovingFrameSample>({
    active: false,
    startedAt: 0,
    lastFrameAt: null,
    frameCount: 0,
    totalFrameMs: 0,
    maxFrameMs: 0,
    slowFrameCount: 0,
  });
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
  const layerShowFields = useStore((state) => state.layerShowFields);
  const layerShowLinks = useStore((state) => state.layerShowLinks);
  const layerShowOrnaments = useStore((state) => state.layerShowOrnaments);
  const layerShowArtifacts = useStore((state) => state.layerShowArtifacts);
  const filterShowResistance = useStore((state) => state.filterShowResistance);
  const filterShowEnlightened = useStore((state) => state.filterShowEnlightened);
  const filterShowMachina = useStore((state) => state.filterShowMachina);
  const filterShowUnclaimedPortals = useStore((state) => state.filterShowUnclaimedPortals);
  const filterShowLevel = useStore((state) => state.filterShowLevel);
  const filterShowHealth = useStore((state) => state.filterShowHealth);
  const filterShowVisited = useStore((state) => state.filterShowVisited);
  const filterShowCaptured = useStore((state) => state.filterShowCaptured);
  const filterShowScanned = useStore((state) => state.filterShowScanned);
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

    const perfStart = performance.now();
    const debugLogging = useStore.getState().debugLogging;
    let setDataMs = 0;
    const sourceSetDataMs: Record<string, number> = {};
    const sourceFeatureCounts: Record<string, number> = {};
    const setSourceData = (sourceId: string, featureCollection: GeoJSON.FeatureCollection): void => {
      const source = getGeoJsonSource(sourceId);
      if (!source) return;

      sourceFeatureCounts[sourceId] = featureCollection.features.length;
      const setDataStart = performance.now();
      source.setData(featureCollection);
      const elapsed = performance.now() - setDataStart;
      sourceSetDataMs[sourceId] = (sourceSetDataMs[sourceId] ?? 0) + elapsed;
      setDataMs += elapsed;
    };

    const bounds = map.current.getBounds();
    const zoom = map.current.getZoom();
    const minLevel = getMinLevelForZoom(zoom);
    
    const buffer = getViewportQueryBufferDegrees(bounds);
    const queryBounds = {
        minLat: bounds.getSouth() - buffer,
        minLng: bounds.getWest() - buffer,
        maxLat: bounds.getNorth() + buffer,
        maxLng: bounds.getEast() + buffer
    };

    const queryStart = performance.now();
    const results = globalSpatialIndex.query(queryBounds);
    const queryMs = performance.now() - queryStart;
    const store = useStore.getState();

    // 1. Filter and Build Portals
    const viewportPortals: Record<string, Portal> = {};
    results.filter(r => r.type === 'portal').forEach(r => {
        const p = store.portals[r.id];
        if (p && (p.level === undefined || p.level >= minLevel)) {
            viewportPortals[p.id] = p;
        }
    });

    // Ensure selected portal is in viewportPortals if it exists in store
    if (selectedPortalId && store.portals[selectedPortalId]) {
      viewportPortals[selectedPortalId] = store.portals[selectedPortalId];
    }

    const portalFeatures = buildPortalFeatures(viewportPortals, {
        showResistance: filterShowResistance, 
        showEnlightened: filterShowEnlightened, 
        showMachina: filterShowMachina, 
        showUnclaimedPortals: filterShowUnclaimedPortals, 
        showLevel: filterShowLevel, 
        showHealth: filterShowHealth,
        showVisited: filterShowVisited,
        showCaptured: filterShowCaptured,
        showScanned: filterShowScanned
    }, selectedPortalId);
    setSourceData('portals', toFeatureCollection(portalFeatures));

    // Update portal selection highlight
    if (selectedPortalId && store.portals[selectedPortalId]) {
      const p = store.portals[selectedPortalId];
      setSourceData('portal-selected', toFeatureCollection([{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id }
      }]));
    } else {
      setSourceData('portal-selected', toFeatureCollection([]));
    }

    // 2. Filter and Build Links
    const viewportLinks: Record<string, Link> = {};
    results.filter(r => r.type === 'link').forEach(r => {
        const l = store.links[r.id];
        if (l) {
            const p1 = store.portals[l.fromPortalId];
            const p2 = store.portals[l.toPortalId];
            const p1Visible = p1 && (p1.level === undefined || p1.level >= minLevel);
            const p2Visible = p2 && (p2.level === undefined || p2.level >= minLevel);
            
            if (p1Visible && p2Visible) {
                viewportLinks[l.id] = l;
            }
        }
    });
    const linkFeatures = buildLinkFeatures(viewportLinks, {
        showLinks: layerShowLinks, 
        showResistance: filterShowResistance, 
        showEnlightened: filterShowEnlightened, 
        showMachina: filterShowMachina, 
        showUnclaimedPortals: filterShowUnclaimedPortals
    });
    setSourceData('links', toFeatureCollection(linkFeatures));

    // Update link selection highlight
    if (selectedLinkId && store.links[selectedLinkId]) {
      const l = store.links[selectedLinkId];
      setSourceData('link-selected', toFeatureCollection([{
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[l.fromLng, l.fromLat], [l.toLng, l.toLat]]
        },
        properties: { id: l.id }
      }]));
    } else {
      setSourceData('link-selected', toFeatureCollection([]));
    }

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

    // Ensure selected field is in viewportFields if it exists in store
    if (selectedFieldId && store.fields[selectedFieldId]) {
      viewportFields[selectedFieldId] = store.fields[selectedFieldId];
    }

    const fieldFeatures = buildFieldFeatures(viewportFields, {
        showFields: layerShowFields, 
        showResistance: filterShowResistance, 
        showEnlightened: filterShowEnlightened, 
        showMachina: filterShowMachina, 
        showUnclaimedPortals: filterShowUnclaimedPortals
    });
    setSourceData('fields', toFeatureCollection(fieldFeatures));

    // Update field selection highlight
    if (selectedFieldId && store.fields[selectedFieldId]) {
      const f = store.fields[selectedFieldId];
      const poly = [...f.points.map((p) => [p.lng, p.lat] as [number, number]), [f.points[0].lng, f.points[0].lat] as [number, number]];
      setSourceData('field-selected', toFeatureCollection([{
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: poly },
        properties: { id: f.id }
      }]));
    } else {
      setSourceData('field-selected', toFeatureCollection([]));
    }

    // 4. Other overlays (keep full records for now if small)
    const artifactFeatures = buildArtifactFeatures(artifacts, store.portals, { showArtifacts: layerShowArtifacts });
    const ornamentFeatures = buildOrnamentFeatures(viewportPortals, mockOrnaments, {
      showOrnaments: layerShowOrnaments, 
      showResistance: filterShowResistance, 
      showEnlightened: filterShowEnlightened, 
      showMachina: filterShowMachina, 
      showUnclaimedPortals: filterShowUnclaimedPortals, 
      showLevel: filterShowLevel, 
      showHealth: filterShowHealth,
      showVisited: filterShowVisited,
      showCaptured: filterShowCaptured,
      showScanned: filterShowScanned
    });
    const missionRouteFeatures = buildMissionRouteFeatures(missionDetails);
    const missionWaypointFeatures = buildMissionWaypointFeatures(missionDetails);
    setSourceData('artifacts', toFeatureCollection(artifactFeatures));
    setSourceData('ornaments', toFeatureCollection(ornamentFeatures));
    setSourceData('mission-route', toFeatureCollection(missionRouteFeatures));
    setSourceData('mission-waypoints', toFeatureCollection(missionWaypointFeatures));
    setSourceData('plugin-features', pluginFeatures);

    const now = Date.now();
    if (now - lastViewportPerfLogAt.current > 1000) {
      lastViewportPerfLogAt.current = now;
      const totalMs = performance.now() - perfStart;
      store.setMapPerfSnapshot({
        type: 'viewport',
        time: now,
        totalMs,
        queryMs,
        setDataMs,
        zoom,
        queryBufferDegrees: buffer,
        sourceSetDataMs,
        sourceFeatureCounts,
        itemCount: results.length,
        portalCount: portalFeatures.length,
        linkCount: linkFeatures.length,
        fieldCount: fieldFeatures.length,
        artifactCount: artifactFeatures.length,
        ornamentCount: ornamentFeatures.length,
        pluginCount: pluginFeatures.features.length,
      });
      if (debugLogging) {
        console.log(
          `[IRIS] VIEWPORT sync ${Math.round(totalMs)}ms | ` +
          `query ${Math.round(queryMs)}ms | setData ${Math.round(setDataMs)}ms | ` +
          `z ${zoom.toFixed(2)} | buffer ${buffer.toFixed(4)} | ` +
          `items ${results.length} | P ${portalFeatures.length} | L ${linkFeatures.length} | F ${fieldFeatures.length} | ` +
          `art ${artifactFeatures.length} | orn ${ornamentFeatures.length} | plugin ${pluginFeatures.features.length}`
        );
      }
    }

  }, [styleLoaded, layerShowFields, layerShowLinks, layerShowOrnaments, layerShowArtifacts, filterShowResistance, filterShowEnlightened, filterShowMachina, filterShowUnclaimedPortals, filterShowLevel, filterShowHealth, filterShowVisited, filterShowCaptured, filterShowScanned, artifacts, mockOrnaments, missionDetails, pluginFeatures, selectedPortalId, selectedFieldId, selectedLinkId]);

  useEffect((): void => {
    syncViewportRef.current = syncViewport;
  }, [syncViewport]);

  useEffect((): void => {
    if (!map.current || !styleLoaded) return;
    getGeoJsonSource('plugin-features')?.setData(pluginFeatures);
  }, [pluginFeatures, styleLoaded]);

  useEffect((): void => {
    if (!map.current || !styleLoaded) return;
    const state = useStore.getState();
    const activePlanningPath = planningMode && planningTool === 'markers' && planningAnchorPortalId
      ? [planningAnchorPortalId]
      : planningMode ? planningPortalPath : [];
    getGeoJsonSource('planned-links')?.setData({
      type: 'FeatureCollection',
      features: plannedLinksEnabled ? buildPlannedLinkFeatures(
          plannedLinks,
          plannedMarkers,
          state.portals,
          state.links,
          activePlanningPath,
          selectedPlannedItemId
      ) : [],
    });
  }, [plannedLinks, plannedMarkers, planningMode, planningTool, planningAnchorPortalId, planningPortalPath, selectedPlannedItemId, plannedLinksEnabled, styleLoaded]);

  useEffect((): undefined | (() => void) => {
    if (!map.current || !styleLoaded) return;

    const syncPlannedLinks = (): void => {
      const state = useStore.getState();
      const activePlanningPath = state.planningMode && state.planningTool === 'markers' && state.planningAnchorPortalId
        ? [state.planningAnchorPortalId]
        : state.planningMode ? state.planningPortalPath : [];
      getGeoJsonSource('planned-links')?.setData({
        type: 'FeatureCollection',
        features: (state.pluginStates['planned-links'] ?? false) ? buildPlannedLinkFeatures(
          state.plannedLinks,
          state.plannedMarkers,
          state.portals,
          state.links,
          activePlanningPath,
          state.selectedPlannedItemId
        ) : [],
      });
    };

    const unsubPortals = useStore.subscribe((state) => state.portals, syncPlannedLinks);
    const unsubLinks = useStore.subscribe((state) => state.links, syncPlannedLinks);
    const unsubMarkers = useStore.subscribe((state) => state.plannedMarkers, syncPlannedLinks);

    return () => {
      unsubPortals();
      unsubLinks();
      unsubMarkers();
    };
  }, [styleLoaded]);

  const scheduleViewportSync = useCallback((): void => {
    if (!map.current || !styleLoaded || scheduledViewportSyncFrame.current !== null) {
      return;
    }

    scheduledViewportSyncFrame.current = window.requestAnimationFrame(() => {
      scheduledViewportSyncFrame.current = null;
      syncViewportRef.current();
    });
  }, [styleLoaded]);

  const applyMovingRenderMode = useCallback((enabled: boolean): void => {
    const mapInstance = map.current;
    if (!mapInstance || !isMobileMapViewport()) {
      return;
    }

    setLayerVisibilityIfExists(mapInstance, 'fields', enabled ? 'none' : 'visible');
    setPaintIfLayerExists(mapInstance, 'fields', 'fill-opacity', FIELD_FILL_OPACITY);
    setPaintIfLayerExists(
      mapInstance,
      'links',
      'line-width',
      enabled ? MOVING_LINK_LINE_WIDTH : LINK_LINE_WIDTH
    );
    setPaintIfLayerExists(
      mapInstance,
      'links',
      'line-opacity',
      enabled ? MOVING_LINK_LINE_OPACITY : LINK_LINE_OPACITY
    );
  }, []);

  const stopMovingFrameSample = useCallback((publish = true): MapPerfSnapshot | null => {
    const sample = movingFrameSample.current;
    if (!sample.active) {
      return null;
    }

    sample.active = false;
    if (movingFrameRequest.current !== null) {
      window.cancelAnimationFrame(movingFrameRequest.current);
      movingFrameRequest.current = null;
    }

    if (sample.frameCount === 0) {
      return null;
    }

    const now = performance.now();
    const averageFrameMs = sample.totalFrameMs / sample.frameCount;
    const snapshot: MapPerfSnapshot = {
      type: 'frame',
      time: Date.now(),
      totalMs: now - sample.startedAt,
      frameCount: sample.frameCount,
      averageFrameMs,
      maxFrameMs: sample.maxFrameMs,
      slowFrameCount: sample.slowFrameCount,
      estimatedFps: Math.round(1000 / averageFrameMs),
    };

    if (publish) {
      useStore.getState().setMapPerfSnapshot(snapshot);
    }

    return snapshot;
  }, []);

  const startMovingFrameSample = useCallback((): void => {
    const sample = movingFrameSample.current;
    if (sample.active) {
      return;
    }

    sample.active = true;
    sample.startedAt = performance.now();
    sample.lastFrameAt = null;
    sample.frameCount = 0;
    sample.totalFrameMs = 0;
    sample.maxFrameMs = 0;
    sample.slowFrameCount = 0;

    const tick = (now: number): void => {
      if (!movingFrameSample.current.active) {
        return;
      }

      const currentSample = movingFrameSample.current;
      if (currentSample.lastFrameAt !== null) {
        const frameMs = now - currentSample.lastFrameAt;
        currentSample.frameCount += 1;
        currentSample.totalFrameMs += frameMs;
        currentSample.maxFrameMs = Math.max(currentSample.maxFrameMs, frameMs);
        if (frameMs >= SLOW_FRAME_MS) {
          currentSample.slowFrameCount += 1;
        }
      }
      currentSample.lastFrameAt = now;
      movingFrameRequest.current = window.requestAnimationFrame(tick);
    };

    movingFrameRequest.current = window.requestAnimationFrame(tick);
  }, []);

  const publishBenchmarkFrameSnapshot = useCallback((snapshots: MapPerfSnapshot[]): void => {
    const validSnapshots = snapshots.filter((snapshot) => typeof snapshot.averageFrameMs === 'number');
    if (validSnapshots.length === 0) {
      return;
    }

    const averageValues = validSnapshots
      .map((snapshot) => snapshot.averageFrameMs as number)
      .sort((a, b) => a - b);
    const middle = Math.floor(averageValues.length / 2);
    const medianAverageFrameMs = averageValues.length % 2 === 0
      ? (averageValues[middle - 1] + averageValues[middle]) / 2
      : averageValues[middle];
    const totalFrameCount = validSnapshots.reduce((total, snapshot) => total + (snapshot.frameCount ?? 0), 0);
    const totalFrameMs = validSnapshots.reduce(
      (total, snapshot) => total + ((snapshot.averageFrameMs ?? 0) * (snapshot.frameCount ?? 0)),
      0
    );
    const totalMs = validSnapshots.reduce((total, snapshot) => total + snapshot.totalMs, 0);
    const averageFrameMs = totalFrameCount > 0 ? totalFrameMs / totalFrameCount : medianAverageFrameMs;

    useStore.getState().setMapPerfSnapshot({
      type: 'frame',
      time: Date.now(),
      totalMs,
      frameCount: totalFrameCount,
      averageFrameMs,
      maxFrameMs: Math.max(...validSnapshots.map((snapshot) => snapshot.maxFrameMs ?? 0)),
      slowFrameCount: validSnapshots.reduce((total, snapshot) => total + (snapshot.slowFrameCount ?? 0), 0),
      estimatedFps: Math.round(1000 / averageFrameMs),
      benchmarkRunCount: validSnapshots.length,
      benchmarkMedianAverageFrameMs: medianAverageFrameMs,
      benchmarkMinAverageFrameMs: averageValues[0],
      benchmarkMaxAverageFrameMs: averageValues[averageValues.length - 1],
      benchmarkMaxFrameMs: Math.max(...validSnapshots.map((snapshot) => snapshot.maxFrameMs ?? 0)),
    });
  }, []);

  const stopPanBenchmark = useCallback((): void => {
    if (panBenchmarkSettleTimer.current !== null) {
      window.clearTimeout(panBenchmarkSettleTimer.current);
      panBenchmarkSettleTimer.current = null;
    }
    if (panBenchmarkAnimation.current !== null) {
      window.cancelAnimationFrame(panBenchmarkAnimation.current);
      panBenchmarkAnimation.current = null;
    }
    panBenchmarkActive.current = false;
    applyMovingRenderMode(false);
    stopMovingFrameSample();
  }, [applyMovingRenderMode, stopMovingFrameSample]);

  const runPanBenchmark = useCallback((): void => {
    const mapInstance = map.current;
    if (!mapInstance) {
      return;
    }

    stopPanBenchmark();
    mapInstance.jumpTo({
      center: [PAN_BENCHMARK_START.lng, PAN_BENCHMARK_START.lat],
      zoom: PAN_BENCHMARK_START.zoom,
    });
    scheduleViewportSync();

    const runSnapshots: MapPerfSnapshot[] = [];

    const runSingleBenchmark = (runIndex: number): void => {
      const currentMap = map.current;
      if (!currentMap) {
        stopPanBenchmark();
        return;
      }

      currentMap.jumpTo({
        center: [PAN_BENCHMARK_START.lng, PAN_BENCHMARK_START.lat],
        zoom: PAN_BENCHMARK_START.zoom,
      });
      scheduleViewportSync();

      panBenchmarkSettleTimer.current = window.setTimeout(() => {
        const settledMap = map.current;
        if (!settledMap) {
          stopPanBenchmark();
          return;
        }

        panBenchmarkSettleTimer.current = null;
        panBenchmarkActive.current = true;
        isUserMovingMap.current = true;
        applyMovingRenderMode(true);
        startMovingFrameSample();

        const startPoint = settledMap.project([PAN_BENCHMARK_START.lng, PAN_BENCHMARK_START.lat]);
        const startedAt = performance.now();

        const tick = (now: number): void => {
          const activeMap = map.current;
          if (!activeMap || !panBenchmarkActive.current) {
            return;
          }

          const elapsed = now - startedAt;
          const progress = Math.min(elapsed / PAN_BENCHMARK_RUN_DURATION_MS, 1);
          const offset = Math.sin(progress * Math.PI * 4) * PAN_BENCHMARK_STEP_PX;
          const center = activeMap.unproject([startPoint.x + offset, startPoint.y]);
          activeMap.jumpTo({
            center: [center.lng, center.lat],
            zoom: PAN_BENCHMARK_START.zoom,
          });

          if (progress < 1) {
            panBenchmarkAnimation.current = window.requestAnimationFrame(tick);
            return;
          }

          panBenchmarkAnimation.current = null;
          const snapshot = stopMovingFrameSample(false);
          if (snapshot) {
            runSnapshots.push(snapshot);
          }

          if (runIndex + 1 < PAN_BENCHMARK_RUN_COUNT) {
            panBenchmarkSettleTimer.current = window.setTimeout(() => {
              runSingleBenchmark(runIndex + 1);
            }, PAN_BENCHMARK_SETTLE_MS);
            return;
          }

          panBenchmarkActive.current = false;
          isUserMovingMap.current = false;
          applyMovingRenderMode(false);
          publishBenchmarkFrameSnapshot(runSnapshots);
          setHtmlMarkerSyncTick((value) => value + 1);
        };

        panBenchmarkAnimation.current = window.requestAnimationFrame(tick);
      }, PAN_BENCHMARK_SETTLE_MS);
    };

    panBenchmarkSettleTimer.current = window.setTimeout(() => {
      if (!map.current) {
        return;
      }
      runSingleBenchmark(0);
    }, PAN_BENCHMARK_SETTLE_MS);
  }, [applyMovingRenderMode, publishBenchmarkFrameSnapshot, scheduleViewportSync, startMovingFrameSample, stopPanBenchmark, stopMovingFrameSample]);

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
          'portal-selected': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          'field-selected': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
          'link-selected': {
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
          'planned-links': {
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
            id: 'field-selected',
            type: 'line',
            source: 'field-selected',
            paint: {
              'line-color': '#fff',
              'line-width': 3,
            },
          },
          {
            id: 'fields',
            type: 'fill',
            source: 'fields',
            paint: {
              'fill-color': initialTeamColourExpr.current,
              'fill-opacity': FIELD_FILL_OPACITY,
              'fill-antialias': false,
            },
          },
          {
            id: 'link-selected',
            type: 'line',
            source: 'link-selected',
            paint: {
              'line-color': '#fff',
              'line-width': 4,
            },
          },
          {
            id: 'links',
            type: 'line',
            source: 'links',
            paint: {
              'line-width': LINK_LINE_WIDTH,
              'line-color': initialTeamColourExpr.current,
              'line-opacity': LINK_LINE_OPACITY,
            },
          },
          {
            id: 'planned-links',
            type: 'line',
            source: 'planned-links',
            filter: ['all', ['==', '$type', 'LineString'], ['!=', 'plannedType', 'crossing']],
            paint: {
              'line-width': ['case', ['==', ['get', 'selected'], true], 6, 3],
              'line-color': PLANNED_LINK_COLOR,
              'line-opacity': 0.92,
              'line-dasharray': [2, 2],
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
            id: 'portal-selected',
            type: 'circle',
            source: 'portal-selected',
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                3, 3,
                10, 6,
                15, 12,
              ],
              'circle-color': 'transparent',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#fff',
              'circle-stroke-opacity': 0.8,
            },
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
                10, 7,
                15, 14,
              ],
              'circle-color': 'transparent',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': SEMANTIC_COLORS.ARTIFACT,
              'circle-stroke-opacity': 0.85,
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
              'circle-stroke-color': SEMANTIC_COLORS.ORNAMENT,
              'circle-stroke-opacity': 0.8,
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
              ['!=', 'isLabelMarker', true],
            ],
            paint: {
              'circle-radius': 8,
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 2,
              'circle-stroke-color': [
                'match', ['get', 'team'],
                'E', theme.E,
                'R', theme.R,
                'M', theme.M,
                'N', theme.N,
                '#ffffff' // Fallback for features without a team
              ],
              'circle-opacity': ['coalesce', ['get', 'opacity'], 1],
              'circle-stroke-opacity': ['coalesce', ['get', 'opacity'], 1],
            },
          },
          {
            id: 'planned-anchor',
            type: 'circle',
            source: 'planned-links',
            filter: ['all', ['==', '$type', 'Point'], ['any', ['==', 'plannedType', 'anchor'], ['==', 'plannedType', 'target']]],
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 7,
                15, 12,
              ],
              'circle-color': 'transparent',
              'circle-stroke-width': 3,
              'circle-stroke-color': PLANNED_LINK_COLOR,
              'circle-stroke-opacity': 0.95,
            },
          },
          {
            id: 'planned-markers',
            type: 'circle',
            source: 'planned-links',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'plannedType', 'marker']],
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 5,
                15, 9,
              ],
              'circle-color': ['coalesce', ['get', 'color'], PLANNED_LINK_COLOR],
              'circle-opacity': 0.9,
              'circle-stroke-width': ['case', ['==', ['get', 'selected'], true], 4, 2],
              'circle-stroke-color': ['case', ['==', ['get', 'selected'], true], '#fff', '#000'],
              'circle-stroke-opacity': ['case', ['==', ['get', 'selected'], true], 1, 0.85],
            },
          },
          {
            id: 'planned-link-hitbox',
            type: 'line',
            source: 'planned-links',
            filter: ['all', ['==', '$type', 'LineString'], ['==', 'plannedItemType', 'link']],
            paint: {
              'line-width': 22,
              'line-color': '#fff',
              'line-opacity': 0,
            },
          },
          {
            id: 'planned-marker-hitbox',
            type: 'circle',
            source: 'planned-links',
            filter: ['all', ['==', '$type', 'Point'], ['==', 'plannedItemType', 'marker']],
            paint: {
              'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, 14,
                15, 20,
              ],
              'circle-color': '#fff',
              'circle-opacity': 0,
            },
          },
          {
            id: 'planned-crossings',
            type: 'line',
            source: 'planned-links',
            filter: ['all', ['==', '$type', 'LineString'], ['==', 'plannedType', 'crossing']],
            paint: {
              'line-width': 4,
              'line-color': PLANNED_CROSSLINK_COLOR,
              'line-opacity': 0.95,
              'line-dasharray': [1, 1],
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

    const markHtmlMarkersMoving = (): void => {
      if (htmlMarkerSettleTimer.current !== null) {
        window.clearTimeout(htmlMarkerSettleTimer.current);
        htmlMarkerSettleTimer.current = null;
      }
      isUserMovingMap.current = true;
      applyMovingRenderMode(true);
      startMovingFrameSample();
      map.current?.getCanvas().style.setProperty('cursor', '');
    };

    const markHtmlMarkersSettling = (): void => {
      if (htmlMarkerSettleTimer.current !== null) {
        window.clearTimeout(htmlMarkerSettleTimer.current);
      }
      if (panBenchmarkActive.current) {
        return;
      }
      stopMovingFrameSample();

      htmlMarkerSettleTimer.current = window.setTimeout(() => {
        htmlMarkerSettleTimer.current = null;
        isUserMovingMap.current = false;
        applyMovingRenderMode(false);
        setHtmlMarkerSyncTick((value) => value + 1);
      }, SETTLE_DELAY_MS);
    };

    map.current.on('movestart', markHtmlMarkersMoving);
    map.current.on('zoomstart', markHtmlMarkersMoving);
    map.current.on('moveend', markHtmlMarkersSettling);
    map.current.on('zoomend', markHtmlMarkersSettling);

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

    const handleInteraction = (
      e: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent,
      options: { portalThreshold?: number } = {}
    ): void => {
        if (!map.current) return;
        const state = useStore.getState();
        const plannedFeature = map.current.queryRenderedFeatures(e.point, {
            layers: ['planned-marker-hitbox', 'planned-link-hitbox', 'planned-markers', 'planned-links'],
        }).find((feature) =>
            feature.properties?.plannedItemType === 'marker' ||
            feature.properties?.plannedItemType === 'link'
        );

        if (plannedFeature?.properties?.id && plannedFeature.properties.plannedItemType) {
            state.selectPlannedItem(
                String(plannedFeature.properties.id),
                plannedFeature.properties.plannedItemType === 'marker' ? 'marker' : 'link'
            );
            return;
        }

        const portalThreshold = options.portalThreshold ?? (state.planningMode ? TOUCH_PORTAL_THRESHOLD_PX : undefined);
        const selection = resolveMapSelection({
            portals: state.portals,
            fields: state.fields,
            links: state.links,
            point: e.point,
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            zoom: map.current.getZoom(),
            project: (lng, lat) => {
                const projected = map.current?.project([lng, lat]);
                return projected ? {x: projected.x, y: projected.y} : null;
            },
            portalThreshold,
        });

        if (selection) {
            if (selection.reason === 'portal') {
              emitPortalClick(document, selection.portalId);
            } else if (selection.reason === 'field') {
              state.selectField(selection.fieldId);
            } else if (selection.reason === 'link') {
              state.selectLink(selection.linkId);
            }
        } else {
            state.selectPortal(null);
        }
    };

    map.current.on('click', handleInteraction);

    const removePortalSelectionBridge = installPortalSelectionBridge({
      target: document,
      windowLike: window,
      selectPortal: (id: string | null) => useStore.getState().selectPortal(id),
      selectPlanningPortal: (id: string) => useStore.getState().selectPlanningPortal(id),
      isPlanningMode: () => useStore.getState().planningMode,
    });

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
            if (Math.sqrt(dx * dx + dy * dy) > TOUCH_TAP_MOVE_THRESHOLD_PX) {
                touchState.current.hasMoved = true;
            }
        } else {
            touchState.current.hasMoved = true;
        }
    });

    map.current.on('touchend', (e: maplibregl.MapTouchEvent) => {
        if (touchState.current.maxFingers === 1 && !touchState.current.hasMoved) {
            handleInteraction(e, { portalThreshold: TOUCH_PORTAL_THRESHOLD_PX });
        }

        if (e.originalEvent.touches.length === 0) {
            touchState.current.maxFingers = 0;
            touchState.current.hasMoved = false;
        }
    });

    let lastMove = 0;
    map.current.on('mousemove', (e: maplibregl.MapMouseEvent) => {
        if (isUserMovingMap.current) {
          map.current?.getCanvas().style.setProperty('cursor', '');
          return;
        }

        const now = Date.now();
        if (now - lastMove < 100) return;
        lastMove = now;

        if (!map.current) return;
        const state = useStore.getState();
        const selection = resolveMapSelection({
            portals: state.portals,
            fields: state.fields,
            links: state.links,
            point: e.point,
            lng: e.lngLat.lng,
            lat: e.lngLat.lat,
            zoom: map.current.getZoom(),
            project: (lng, lat) => {
                const projected = map.current?.project([lng, lat]);
                return projected ? {x: projected.x, y: projected.y} : null;
            },
            portalThreshold: 12,
        });
        map.current.getCanvas().style.cursor = selection ? 'pointer' : '';
    });

    return (): void => {
      if (htmlMarkerSettleTimer.current !== null) {
        window.clearTimeout(htmlMarkerSettleTimer.current);
        htmlMarkerSettleTimer.current = null;
      }
      stopPanBenchmark();
      applyMovingRenderMode(false);
      stopMovingFrameSample();
      if (scheduledViewportSyncFrame.current !== null) {
        window.cancelAnimationFrame(scheduledViewportSyncFrame.current);
        scheduledViewportSyncFrame.current = null;
      }
      markerRegistry.forEach(({ marker }) => marker.remove());
      markerRegistry.clear();
      map.current?.remove();
      removePortalSelectionBridge();
    };
  // The MapLibre instance must be created once; runtime state is read through refs/store selectors.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Camera
  useEffect((): void => {
    if (!map.current || !styleLoaded || (lat === 0 && lng === 0)) return;

    if (isFirstSync.current) {
        isFirstSync.current = false;
        if (isCurrentMapView(map.current, lat, lng, zoom)) {
          useStore.getState().reverseGeocode(lat, lng);
          return;
        }
        map.current.jumpTo({ center: [lng, lat], zoom });
        useStore.getState().reverseGeocode(lat, lng);
    } else {
        if (isCurrentMapView(map.current, lat, lng, zoom)) {
          return;
        }
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

  // Sync Viewport on Map Movement
  useEffect((): undefined | (() => void) => {
    if (!map.current || !styleLoaded) return;
    
    const onMove = (): void => scheduleViewportSync();
    map.current.on('moveend', onMove);
    map.current.on('zoomend', onMove);
    
    // External command listeners
    const commandHandler = (event: MessageEvent): void => {
        const msg = event.data as { type?: string; dx?: number; dy?: number };
        if (msg?.type === 'IRIS_PAN_MAP') {
            panBy(msg.dx ?? 0, msg.dy ?? 0);
        } else if (msg?.type === 'IRIS_RUN_PAN_BENCHMARK') {
            runPanBenchmark();
        }
    };
    window.addEventListener('message', commandHandler);

    // Initial sync
    scheduleViewportSync();

    return () => {
      map.current?.off('moveend', onMove);
      map.current?.off('zoomend', onMove);
      window.removeEventListener('message', commandHandler);
    };
  }, [styleLoaded, scheduleViewportSync, runPanBenchmark]);

  // Sync Viewport on Layer/Filter Changes
  useEffect((): void => {
    scheduleViewportSync();
  }, [
    scheduleViewportSync,
    layerShowFields,
    layerShowLinks,
    layerShowOrnaments,
    layerShowArtifacts,
    filterShowResistance,
    filterShowEnlightened,
    filterShowMachina,
    filterShowUnclaimedPortals,
    filterShowLevel,
    filterShowHealth,
    filterShowVisited,
    filterShowCaptured,
    filterShowScanned,
  ]);

  // Sync Viewport on Store Entity Changes (Decoupled from render cycle)
  useEffect((): undefined | (() => void) => {
    if (!map.current || !styleLoaded) return;

    // Subscribe to portal changes to trigger re-sync if they happen while in view
    const unsubPortals = useStore.subscribe(
        state => state.portals,
        () => scheduleViewportSync()
    );
    const unsubLinks = useStore.subscribe(
        state => state.links,
        () => scheduleViewportSync()
    );
    const unsubFields = useStore.subscribe(
        state => state.fields,
        () => scheduleViewportSync()
    );

    return () => {
        unsubPortals();
        unsubLinks();
        unsubFields();
    };
  }, [styleLoaded, scheduleViewportSync]);

  // Sync HTML Markers (Independent effect for performance)
  useEffect((): undefined | (() => void) => {
    if (!map.current || !styleLoaded) return;

    if (isUserMovingMap.current) {
      if (useStore.getState().debugLogging) {
        console.log('IRIS: HTML marker sync deferred during map movement');
      }
      return;
    }

    const perfStart = performance.now();
    const debugLogging = useStore.getState().debugLogging;
    let candidates = 0;
    let updated = 0;
    let created = 0;
    let removed = 0;
    const activeMarkerIds = new Set<string>();
    const currentZoom = map.current.getZoom();

    pluginFeatures.features.forEach((feature) => {
      const properties = (feature.properties ?? {}) as PluginFeatureProperties;
      if ((!properties.isPlayerMarker && !properties.isHtmlMarker) || feature.geometry.type !== 'Point' || !map.current) {
        return;
      }
      candidates++;

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
        updated++;
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
      created++;
    });

    pluginMarkers.current.forEach((entry, markerId) => {
      if (!activeMarkerIds.has(markerId)) {
        entry.marker.remove();
        pluginMarkers.current.delete(markerId);
        removed++;
      }
    });

    const now = Date.now();
    if (now - lastHtmlMarkerPerfLogAt.current > 1000) {
      lastHtmlMarkerPerfLogAt.current = now;
      const totalMs = performance.now() - perfStart;
      useStore.getState().setMapPerfSnapshot({
        type: 'htmlMarkers',
        time: now,
        totalMs,
        candidateCount: candidates,
        activeCount: activeMarkerIds.size,
        existingCount: pluginMarkers.current.size,
        createdCount: created,
        updatedCount: updated,
        removedCount: removed,
      });
      if (debugLogging) {
        console.log(
          `[IRIS] HTML markers sync ${Math.round(totalMs)}ms | ` +
          `candidates ${candidates} | active ${activeMarkerIds.size} | existing ${pluginMarkers.current.size} | ` +
          `created ${created} | updated ${updated} | removed ${removed}`
        );
      }
    }
  }, [pluginFeatures, styleLoaded, zoom, htmlMarkerSyncTick]);

  const panBy = (x: number, y: number): void => {
    map.current?.panBy([x, y], { duration: 200 });
  };

  return (
      <div className="iris-map-wrapper">
          <div
              ref={mapContainer}
              className="iris-map-container"
          />
      </div>
  );
}
