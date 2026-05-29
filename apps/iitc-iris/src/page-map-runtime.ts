import L, {type Map as LeafletMap, type Path as LeafletPath} from 'leaflet';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisRenderEntities} from './messages';
import {createIitcMapDataPlan, decodeIitcGetEntitiesResponse, type IitcGetEntitiesResponse, type IitcMapDataPlan} from '@iris/iitc-core';

const DEFAULT_CENTER: [number, number] = [52.3730796, 4.8924534];
const DEFAULT_ZOOM = 11;
let latestFetchGeneration = 0;
let latestRequestKey = '';
let refreshTimer: number | undefined;

function postMapMoved(): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  const center = map.getCenter();
  const bounds = map.getBounds();
  window.postMessage({
    type: IITC_IRIS_MESSAGES.mapMoved,
    lat: center.lat,
    lng: center.lng,
    zoom: map.getZoom(),
    bounds: {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    },
  }, '*');
  scheduleEntityRefresh();
}

declare global {
  interface Window {
    __iitcIrisMap?: LeafletMap;
    __iitcIrisMapContainer?: HTMLElement;
    __iitcIrisLayers?: {
      fields: LeafletPath[];
      links: LeafletPath[];
      portals: LeafletPath[];
      ornaments: LeafletPath[];
    };
  }
}

const TEAM_COLORS = {
  E: '#03dcff',
  R: '#00ff73',
  N: '#b8b8b8',
  M: '#ffce35',
} as const;

function toLatLng(latE6: number, lngE6: number): [number, number] {
  return [latE6 / 1e6, lngE6 / 1e6];
}

function getTeamColor(team: keyof typeof TEAM_COLORS): string {
  return TEAM_COLORS[team] ?? TEAM_COLORS.N;
}

function ensureLayers(): NonNullable<Window['__iitcIrisLayers']> {
  if (window.__iitcIrisLayers) return window.__iitcIrisLayers;

  window.__iitcIrisLayers = {
    fields: [],
    links: [],
    portals: [],
    ornaments: [],
  };
  return window.__iitcIrisLayers;
}

function clearRenderedPaths(paths: LeafletPath[]): void {
  while (paths.length > 0) {
    const path = paths.pop();
    path?.remove();
  }
}

function addRenderedPath(paths: LeafletPath[], path: LeafletPath): void {
  const map = window.__iitcIrisMap;
  if (!map) return;
  path.addTo(map);
  paths.push(path);
}

function renderEntities(entities: IitcIrisRenderEntities): void {
  const layers = ensureLayers();
  if (!window.__iitcIrisMap) return;

  clearRenderedPaths(layers.fields);
  clearRenderedPaths(layers.links);
  clearRenderedPaths(layers.portals);
  clearRenderedPaths(layers.ornaments);

  for (const field of entities.fields) {
    if (field.points.length !== 3) continue;
    addRenderedPath(layers.fields, L.polygon(field.points.map((point) => toLatLng(point.latE6, point.lngE6)), {
      color: getTeamColor(field.team),
      fillColor: getTeamColor(field.team),
      fillOpacity: 0.18,
      opacity: 0,
      weight: 0,
      interactive: false,
    }));
  }

  for (const link of entities.links) {
    addRenderedPath(layers.links, L.polyline([toLatLng(link.oLatE6, link.oLngE6), toLatLng(link.dLatE6, link.dLngE6)], {
      color: getTeamColor(link.team),
      opacity: 0.85,
      weight: 2,
      interactive: false,
    }));
  }

  for (const portal of entities.portals) {
    const color = getTeamColor(portal.team);
    const latLng = toLatLng(portal.latE6, portal.lngE6);
    const radius = portal.isPlaceholder ? 2.5 : Math.max(4, Math.min(8, (portal.level ?? 1) + 1));

    addRenderedPath(layers.portals, L.circleMarker(latLng, {
      radius,
      color,
      fillColor: color,
      fillOpacity: portal.isPlaceholder ? 0.35 : 0.75,
      opacity: portal.isPlaceholder ? 0.65 : 1,
      weight: portal.isPlaceholder ? 1 : 2,
      interactive: false,
    }));

    if (portal.ornaments && portal.ornaments.length > 0) {
      addRenderedPath(layers.ornaments, L.circleMarker(latLng, {
        radius: radius + 5,
        color: '#ffce35',
        fillOpacity: 0,
        opacity: 0.95,
        weight: 2,
        interactive: false,
      }));
    }
  }
}

function handleMessage(event: MessageEvent<IitcIrisMessage>): void {
  if (event.source !== window) return;
  if (event.data?.type === IITC_IRIS_MESSAGES.renderEntities && event.data.entities) {
    renderEntities(event.data.entities);
  }
}

function postEntityStatus(status: string, entities?: IitcIrisRenderEntities): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.entityStatus,
    status,
    portals: entities?.portals.length,
    links: entities?.links.length,
    fields: entities?.fields.length,
  } satisfies IitcIrisMessage, '*');
}

function getCsrfToken(): string {
  const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
  const csrfCookie = cookies.find((cookie) => cookie.startsWith('csrftoken='));
  if (!csrfCookie) return '';
  return csrfCookie.slice(csrfCookie.indexOf('=') + 1);
}

function extractVersion(): string {
  const scripts = document.querySelectorAll('script[src*="gen_dashboard_"]');
  for (const script of Array.from(scripts)) {
    const src = (script as HTMLScriptElement).src;
    const match = src.match(/gen_dashboard_([a-f0-9]+)\.js/);
    if (match) return match[1];
  }

  const params = (window as Window & {niantic_params?: {CURRENT_VERSION?: unknown; frontendVersion?: unknown}}).niantic_params;
  if (typeof params?.CURRENT_VERSION === 'string') return params.CURRENT_VERSION;
  if (typeof params?.frontendVersion === 'string') return params.frontendVersion;
  return '';
}

function looksLikeLoginHtml(text: string): boolean {
  return /<html|<!doctype|login|signin/i.test(text);
}

function createPlanFromMap(): IitcMapDataPlan | null {
  const map = window.__iitcIrisMap;
  if (!map) return null;

  const center = map.getCenter();
  const bounds = map.getBounds();
  return createIitcMapDataPlan({
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
  }, {lat: center.lat, lng: center.lng}, map.getZoom());
}

function createTileKeyChunks(tileKeys: string[], chunkSize = 25): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < tileKeys.length; index += chunkSize) {
    chunks.push(tileKeys.slice(index, index + chunkSize));
  }
  return chunks;
}

function mergeEntityResponses(responses: IitcGetEntitiesResponse[]): IitcGetEntitiesResponse {
  const map: NonNullable<NonNullable<IitcGetEntitiesResponse['result']>['map']> = {};
  for (const response of responses) {
    Object.assign(map, response.result?.map ?? {});
  }

  return {result: {map}};
}

function toRenderEntities(response: IitcGetEntitiesResponse, generation: number): IitcIrisRenderEntities {
  const decoded = decodeIitcGetEntitiesResponse(response);

  return {
    generation,
    portals: Object.values(decoded.portals).map((portal) => ({
      guid: portal.guid,
      team: portal.team,
      latE6: portal.latE6,
      lngE6: portal.lngE6,
      level: portal.level,
      health: portal.health,
      ornaments: portal.ornaments,
      isPlaceholder: portal.isPlaceholder,
    })),
    links: Object.values(decoded.links).map((link) => ({
      guid: link.guid,
      team: link.team,
      oLatE6: link.oLatE6,
      oLngE6: link.oLngE6,
      dLatE6: link.dLatE6,
      dLngE6: link.dLngE6,
    })),
    fields: Object.values(decoded.fields).map((field) => ({
      guid: field.guid,
      team: field.team,
      points: field.points.map((point) => ({latE6: point.latE6, lngE6: point.lngE6})),
    })),
  };
}

async function fetchEntityBatch(tileKeys: string[], version: string): Promise<IitcGetEntitiesResponse> {
  const response = await fetch('/r/getEntities', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({tileKeys, v: version}),
  });
  const text = await response.text();

  if (looksLikeLoginHtml(text)) throw new Error('getEntities returned login html');
  if (!response.ok) throw new Error(`getEntities failed HTTP ${response.status}`);
  if (!text.trim()) throw new Error('getEntities returned empty response');

  return JSON.parse(text) as IitcGetEntitiesResponse;
}

function scheduleEntityRefresh(): void {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    void refreshEntities();
  }, 250);
}

async function refreshEntities(): Promise<void> {
  try {
    const plan = createPlanFromMap();
    if (!plan || plan.tileKeys.length === 0) return;

    const requestKey = plan.tileKeys.join('|');
    if (requestKey === latestRequestKey) return;
    latestRequestKey = requestKey;

    const version = extractVersion();
    if (!version) throw new Error('waiting for Intel version');

    const generation = latestFetchGeneration + 1;
    latestFetchGeneration = generation;
    const batches = createTileKeyChunks(plan.tileKeys);
    const responses: IitcGetEntitiesResponse[] = [];
    postEntityStatus(`fetching ${plan.tileKeys.length} tiles`);

    for (let index = 0; index < batches.length; index += 1) {
      const response = await fetchEntityBatch(batches[index], version);
      if (generation !== latestFetchGeneration) return;
      responses.push(response);
      const entities = toRenderEntities(mergeEntityResponses(responses), generation);
      renderEntities(entities);
      postEntityStatus(`batch ${index + 1}/${batches.length}`, entities);
    }

    const entities = toRenderEntities(mergeEntityResponses(responses), generation);
    renderEntities(entities);
    postEntityStatus('entities ready', entities);
  } catch (error) {
    postEntityStatus(error instanceof Error ? error.message : String(error));
  }
}

function boot(): void {
  const container = document.getElementById('iitc-iris-map');
  if (!container) {
    window.setTimeout(boot, 50);
    return;
  }
  if (window.__iitcIrisPageRuntimeInitialized && window.__iitcIrisMapContainer === container && window.__iitcIrisMap) return;

  window.__iitcIrisPageRuntimeInitialized = true;
  if (window.__iitcIrisMap && window.__iitcIrisMapContainer !== container) {
    window.__iitcIrisMap.remove();
    window.__iitcIrisLayers = undefined;
  }

  const map = L.map(container, {
    zoomControl: false,
    preferCanvas: true,
  }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  window.__iitcIrisMap = map;
  window.__iitcIrisMapContainer = container;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: 'OpenStreetMap',
  }).addTo(map);
  L.control.zoom({position: 'topright'}).addTo(map);

  map.on('moveend', postMapMoved);
  window.setTimeout(() => {
    map.invalidateSize();
    postMapMoved();
    window.postMessage({type: IITC_IRIS_MESSAGES.pageReady}, '*');
  }, 0);
}

window.addEventListener('IITC_IRIS_CONTAINER_READY', boot);
window.addEventListener('message', handleMessage);
boot();
