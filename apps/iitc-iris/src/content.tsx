import {h, render} from 'preact';
import {useEffect, useMemo, useState} from 'preact/hooks';
import './iitc-iris.css';
import {IITC_IRIS_MESSAGES, type IitcIrisBaseLayerId, type IitcIrisDataSourceSettings, type IitcIrisLayerSettings, type IitcIrisMessage, type IitcIrisQueueDiagnostics, type IitcIrisRenderPolicy} from './messages';
import {
  createIitcMapDataPlan,
  IITC_EMPTY_TILE_RETRY_BATCH_SIZE,
  IITC_EMPTY_TILE_RETRY_LIMIT,
  IITC_EMPTY_TILE_RETRY_PASSES,
  IITC_LIVE_COMPAT_TILES_PER_REQUEST,
  type IitcBounds,
  type IitcMapDataPlan,
} from '@iris/iitc-core';

const REQUEST_BOUNDS_PADDING_RATIO = 0.25;
const BASE_LAYER_STORAGE_KEY = 'iitc-iris:base-layer';
const LAYER_SETTINGS_STORAGE_KEY = 'iitc-iris:layer-settings';
const DATA_SOURCE_STORAGE_KEY = 'iitc-iris:data-source';
const VIEW_PRESETS = [
  {id: 'amsterdam-z10', label: 'AMS 10', lat: 52.3730796, lng: 4.8924534, zoom: 10},
  {id: 'amsterdam-z15', label: 'AMS 15', lat: 52.3730796, lng: 4.8924534, zoom: 15},
  {id: 'damrak-z15', label: 'DAM 15', lat: 52.3761096, lng: 4.8980545, zoom: 15},
] as const;
const BASE_LAYER_OPTIONS: {id: IitcIrisBaseLayerId; label: string; title: string}[] = [
  {id: 'cartodb-dark-matter', label: 'Dark', title: 'CartoDB Dark Matter'},
  {id: 'cartodb-positron', label: 'Light', title: 'CartoDB Positron'},
  {id: 'osm', label: 'OSM', title: 'OpenStreetMap'},
];
const DATA_SOURCE_OPTIONS = [
  {id: 'live', label: 'Live', title: 'Fetch live Intel getEntities responses', mode: 'live' as const},
  {
    id: 'ams-z10',
    label: 'AMS F10',
    title: 'Amsterdam fixture from docs/update-map/get-entities-z10.json',
    mode: 'fixture' as const,
    fixturePath: 'fixtures/get-entities-z10.json',
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 10,
  },
  {
    id: 'ams-z14',
    label: 'AMS F14',
    title: 'Amsterdam fixture from docs/update-map/get-entities-z14.json',
    mode: 'fixture' as const,
    fixturePath: 'fixtures/get-entities-z14.json',
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 14,
  },
  {
    id: 'dam-iitc-z15',
    label: 'DAM IITC',
    title: 'Damrak fixture extracted from IITC HAR getEntities response',
    mode: 'fixture' as const,
    fixturePath: 'fixtures/get-entities-damrak-iitc-z15.json',
    lat: 52.3761096,
    lng: 4.8980545,
    zoom: 15,
  },
] as const;
const LAYER_TOGGLE_LABELS: [keyof IitcIrisLayerSettings, string][] = [
  ['fields', 'F'],
  ['links', 'LN'],
  ['portals', 'P'],
  ['levelFill', 'LF'],
  ['healthFill', 'HF'],
  ['ornaments', 'OR'],
  ['artifacts', 'AR'],
  ['labels', 'LV'],
  ['tiles', 'T'],
];
const DEFAULT_LAYER_SETTINGS: IitcIrisLayerSettings = {
  fields: true,
  links: true,
  portals: true,
  levelFill: false,
  healthFill: false,
  ornaments: false,
  artifacts: false,
  labels: false,
  tiles: false,
};
const DEFAULT_RENDER_POLICY: IitcIrisRenderPolicy = {
  optionalOverlayMinZoom: 14,
  detailedPortals: false,
  levelFill: false,
  healthFill: false,
  ornaments: false,
  artifacts: false,
  labels: false,
};

interface CameraState {
  lat: number;
  lng: number;
  zoom: number;
  bounds: IitcBounds | null;
}

interface EntityFetchState {
  status: string;
  authRequired: boolean;
  generation: number;
  key: string;
  collision: boolean;
  portals: number;
  realPortals: number;
  placeholderPortals: number;
  ornamentPortals: number;
  artifactPortals: number;
  levelLabels: number;
  damagedPortals: number;
  links: number;
  fields: number;
  viewportPortals: number;
  viewportRealPortals: number;
  viewportPlaceholderPortals: number;
  viewportLinks: number;
  viewportFields: number;
  requestedTiles: number;
  returnedTiles: number;
  nonEmptyTiles: number;
  retryRequests: number;
  retriedTileKeys: string[];
  recoveredTileKeys: string[];
  emptyTileKeys: string[];
  nonEmptyTileKeys: string[];
  unaccountedTileKeys: string[];
  serverRetryTileKeys: string[];
  timeoutTileKeys: string[];
  errorTileKeys: string[];
  responseRetryTileKeys: string[];
  queueDelayReasons: string[];
  queue: IitcIrisQueueDiagnostics | null;
  baseLayerId: IitcIrisBaseLayerId;
  dataSource: IitcIrisDataSourceSettings;
  renderPolicy: IitcIrisRenderPolicy;
}

interface ParsedViewInput {
  lat: number;
  lng: number;
  zoom?: number;
}

function clampView(view: ParsedViewInput): ParsedViewInput {
  return {
    lat: Math.max(-85.051128, Math.min(85.051128, view.lat)),
    lng: Math.max(-180, Math.min(179.999999, view.lng)),
    zoom: view.zoom === undefined ? undefined : Math.max(0, Math.min(21, view.zoom)),
  };
}

function parseViewInput(value: string): ParsedViewInput | null {
  const text = value.trim();
  if (!text) return null;

  try {
    const url = new URL(text);
    const ll = url.searchParams.get('ll') ?? url.searchParams.get('pll');
    const z = url.searchParams.get('z');
    if (ll) {
      const [latText, lngText] = ll.split(',');
      const parsed = {
        lat: Number(latText),
        lng: Number(lngText),
        zoom: z ? Number(z) : undefined,
      };
      if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng) && (parsed.zoom === undefined || Number.isFinite(parsed.zoom))) return clampView(parsed);
    }
  } catch {
    // Fall through to coordinate parsing.
  }

  const [latText, lngText, zoomText] = text.split(/[,\s]+/).filter(Boolean);
  const parsed = {
    lat: Number(latText),
    lng: Number(lngText),
    zoom: zoomText ? Number(zoomText) : undefined,
  };
  if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lng)) return null;
  if (parsed.zoom !== undefined && !Number.isFinite(parsed.zoom)) return null;
  return clampView(parsed);
}

function getExtensionUrl(path: string): string {
  return chrome.runtime.getURL(path);
}

function isBaseLayerId(value: string | null): value is IitcIrisBaseLayerId {
  return value === 'osm' || value === 'cartodb-dark-matter' || value === 'cartodb-positron';
}

function loadStoredBaseLayerId(): IitcIrisBaseLayerId {
  try {
    const value = window.localStorage.getItem(BASE_LAYER_STORAGE_KEY);
    return isBaseLayerId(value) ? value : 'cartodb-dark-matter';
  } catch {
    return 'cartodb-dark-matter';
  }
}

function isLayerSettings(value: unknown): value is Partial<IitcIrisLayerSettings> {
  return !!value && typeof value === 'object';
}

function loadStoredLayerSettings(): IitcIrisLayerSettings {
  try {
    const value = window.localStorage.getItem(LAYER_SETTINGS_STORAGE_KEY);
    if (!value) return DEFAULT_LAYER_SETTINGS;
    const parsed = JSON.parse(value) as unknown;
    if (!isLayerSettings(parsed)) return DEFAULT_LAYER_SETTINGS;
    return {
      fields: typeof parsed.fields === 'boolean' ? parsed.fields : DEFAULT_LAYER_SETTINGS.fields,
      links: typeof parsed.links === 'boolean' ? parsed.links : DEFAULT_LAYER_SETTINGS.links,
      portals: typeof parsed.portals === 'boolean' ? parsed.portals : DEFAULT_LAYER_SETTINGS.portals,
      levelFill: typeof parsed.levelFill === 'boolean' ? parsed.levelFill : DEFAULT_LAYER_SETTINGS.levelFill,
      healthFill: typeof parsed.healthFill === 'boolean' ? parsed.healthFill : DEFAULT_LAYER_SETTINGS.healthFill,
      ornaments: typeof parsed.ornaments === 'boolean' ? parsed.ornaments : DEFAULT_LAYER_SETTINGS.ornaments,
      artifacts: typeof parsed.artifacts === 'boolean' ? parsed.artifacts : DEFAULT_LAYER_SETTINGS.artifacts,
      labels: typeof parsed.labels === 'boolean' ? parsed.labels : DEFAULT_LAYER_SETTINGS.labels,
      tiles: typeof parsed.tiles === 'boolean' ? parsed.tiles : DEFAULT_LAYER_SETTINGS.tiles,
    };
  } catch {
    return DEFAULT_LAYER_SETTINGS;
  }
}

function loadStoredDataSourceId(): typeof DATA_SOURCE_OPTIONS[number]['id'] {
  try {
    const value = window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
    return DATA_SOURCE_OPTIONS.some((option) => option.id === value) ? value as typeof DATA_SOURCE_OPTIONS[number]['id'] : 'live';
  } catch {
    return 'live';
  }
}

function storeLayerSettings(value: IitcIrisLayerSettings): void {
  try {
    window.localStorage.setItem(LAYER_SETTINGS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Layer preferences are optional.
  }
}

function storeDataSourceId(value: string): void {
  try {
    window.localStorage.setItem(DATA_SOURCE_STORAGE_KEY, value);
  } catch {
    // Data source preference is optional.
  }
}

function createDataSourceSettings(id: typeof DATA_SOURCE_OPTIONS[number]['id']): IitcIrisDataSourceSettings {
  const option = DATA_SOURCE_OPTIONS.find((candidate) => candidate.id === id) ?? DATA_SOURCE_OPTIONS[0];
  if (option.mode === 'live') return {mode: 'live'};
  return {
    mode: 'fixture',
    id: option.id,
    label: option.label,
    url: getExtensionUrl(option.fixturePath),
  };
}

function injectScript(src: string): void {
  if (document.querySelector(`script[data-iitc-iris-src="${CSS.escape(src)}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = false;
  script.dataset.iitcIrisSrc = src;
  (document.head || document.documentElement).appendChild(script);
}

function createPlan(camera: CameraState): IitcMapDataPlan | null {
  if (!camera.bounds) return null;

  try {
    return createIitcMapDataPlan(camera.bounds, {lat: camera.lat, lng: camera.lng}, camera.zoom, {
      boundsPaddingRatio: REQUEST_BOUNDS_PADDING_RATIO,
      tilesPerRequest: IITC_LIVE_COMPAT_TILES_PER_REQUEST,
      sequentialRequestBatches: true,
    });
  } catch (error) {
    console.warn('[IITC IRIS] Failed to create map data plan', error);
    return null;
  }
}

function createIntelUrl(camera: CameraState): string {
  const lat = camera.lat.toFixed(6);
  const lng = camera.lng.toFixed(6);
  const zoom = String(Math.round(camera.zoom * 100) / 100);
  return `https://intel.ingress.com/intel?ll=${lat},${lng}&z=${zoom}`;
}

function App(): h.JSX.Element {
  const [status, setStatus] = useState('booting');
  const [copyStatus, setCopyStatus] = useState('');
  const [viewInput, setViewInput] = useState('');
  const [viewInputStatus, setViewInputStatus] = useState('');
  const [baseLayerId, setBaseLayerId] = useState<IitcIrisBaseLayerId>(() => loadStoredBaseLayerId());
  const [dataSourceId, setDataSourceId] = useState<typeof DATA_SOURCE_OPTIONS[number]['id']>(() => loadStoredDataSourceId());
  const [layerSettings, setLayerSettings] = useState<IitcIrisLayerSettings>(() => loadStoredLayerSettings());
  const [camera, setCamera] = useState<CameraState>({
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 11,
    bounds: null,
  });
  const [entityFetch, setEntityFetch] = useState<EntityFetchState>({
    status: 'idle',
    authRequired: false,
    generation: 0,
    key: '',
    collision: false,
    portals: 0,
    realPortals: 0,
    placeholderPortals: 0,
    ornamentPortals: 0,
    artifactPortals: 0,
    levelLabels: 0,
    damagedPortals: 0,
    links: 0,
    fields: 0,
    viewportPortals: 0,
    viewportRealPortals: 0,
    viewportPlaceholderPortals: 0,
    viewportLinks: 0,
    viewportFields: 0,
    requestedTiles: 0,
    returnedTiles: 0,
    nonEmptyTiles: 0,
    retryRequests: 0,
    retriedTileKeys: [],
    recoveredTileKeys: [],
    emptyTileKeys: [],
    nonEmptyTileKeys: [],
    unaccountedTileKeys: [],
    serverRetryTileKeys: [],
    timeoutTileKeys: [],
    errorTileKeys: [],
    responseRetryTileKeys: [],
    queueDelayReasons: [],
    queue: null,
    baseLayerId: loadStoredBaseLayerId(),
    dataSource: createDataSourceSettings(loadStoredDataSourceId()),
    renderPolicy: DEFAULT_RENDER_POLICY,
  });
  const plan: IitcMapDataPlan | null = useMemo(() => createPlan(camera), [camera]);
  const summaryMode = plan?.tileParams.hasPortals ? 'summary' : 'placeholder';
  const requestBatches = plan?.requestBatches.map((batch) => batch.length) ?? [];
  const intelUrl = createIntelUrl(camera);
  const dataSource = useMemo(() => createDataSourceSettings(dataSourceId), [dataSourceId]);
  const detailOverlaysActive = entityFetch.renderPolicy.levelFill ||
    entityFetch.renderPolicy.healthFill ||
    entityFetch.renderPolicy.ornaments ||
    entityFetch.renderPolicy.artifacts ||
    entityFetch.renderPolicy.labels;
  const dockDiagnostics = {
    app: 'IITC IRIS',
    status,
    intelUrl,
    camera: {
      lat: camera.lat,
      lng: camera.lng,
      zoom: camera.zoom,
      bounds: camera.bounds,
    },
    plan: plan ? {
      dataZoom: plan.dataZoom,
      mode: summaryMode,
      tiles: plan.tiles.length,
      xRange: plan.xRange,
      yRange: plan.yRange,
      firstBatchSize: requestBatches[0] ?? 0,
      requestBatches,
      requestPolicy: {
        name: 'live-compat',
        tilesPerRequest: IITC_LIVE_COMPAT_TILES_PER_REQUEST,
        sequentialRequestBatches: true,
        emptyTileRetryPasses: IITC_EMPTY_TILE_RETRY_PASSES,
        emptyTileRetryBatchSize: IITC_EMPTY_TILE_RETRY_BATCH_SIZE,
        emptyTileRetryLimit: IITC_EMPTY_TILE_RETRY_LIMIT,
      },
      dataBounds: plan.dataBounds,
    } : null,
    entities: {
      status: entityFetch.status,
      complete: entityFetch.status === 'entities ready',
      portals: entityFetch.portals,
      realPortals: entityFetch.realPortals,
      placeholderPortals: entityFetch.placeholderPortals,
      ornamentPortals: entityFetch.ornamentPortals,
      artifactPortals: entityFetch.artifactPortals,
      levelLabels: entityFetch.levelLabels,
      damagedPortals: entityFetch.damagedPortals,
      links: entityFetch.links,
      fields: entityFetch.fields,
      viewport: {
        portals: entityFetch.viewportPortals,
        realPortals: entityFetch.viewportRealPortals,
        placeholderPortals: entityFetch.viewportPlaceholderPortals,
        links: entityFetch.viewportLinks,
        fields: entityFetch.viewportFields,
      },
      requestedTiles: entityFetch.requestedTiles,
      returnedTiles: entityFetch.returnedTiles,
      nonEmptyTiles: entityFetch.nonEmptyTiles,
      retryRequests: entityFetch.retryRequests,
      retriedTileKeys: entityFetch.retriedTileKeys,
      recoveredTileKeys: entityFetch.recoveredTileKeys,
      emptyTileKeys: entityFetch.emptyTileKeys,
      nonEmptyTileKeys: entityFetch.nonEmptyTileKeys,
      unaccountedTileKeys: entityFetch.unaccountedTileKeys,
      serverRetryTileKeys: entityFetch.serverRetryTileKeys,
      timeoutTileKeys: entityFetch.timeoutTileKeys,
      errorTileKeys: entityFetch.errorTileKeys,
      responseRetryTileKeys: entityFetch.responseRetryTileKeys,
      queueDelayReasons: entityFetch.queueDelayReasons,
      queue: entityFetch.queue,
      authRequired: entityFetch.authRequired,
    },
    baseLayerId,
    dataSource,
    layers: layerSettings,
    renderPolicy: entityFetch.renderPolicy,
    collision: entityFetch.collision,
  };
  const copyDockText = (): void => {
    void navigator.clipboard.writeText(JSON.stringify(dockDiagnostics, null, 2))
      .then(() => {
        setCopyStatus('json copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const copyIntelUrl = (): void => {
    void navigator.clipboard.writeText(intelUrl)
      .then(() => {
        setCopyStatus('url copied');
        window.setTimeout(() => setCopyStatus(''), 1200);
      })
      .catch(() => {
        setCopyStatus('copy failed');
        window.setTimeout(() => setCopyStatus(''), 1600);
      });
  };

  const openIntelLogin = (): void => {
    window.location.assign('https://intel.ingress.com/intel');
  };

  const toggleLayerSetting = (key: keyof IitcIrisLayerSettings): void => {
    setLayerSettings((current) => ({...current, [key]: !current[key]}));
  };

  const jumpToPreset = (preset: typeof VIEW_PRESETS[number]): void => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.setView,
      lat: preset.lat,
      lng: preset.lng,
      zoom: preset.zoom,
    } satisfies IitcIrisMessage, '*');
  };

  const jumpToViewInput = (): void => {
    const parsed = parseViewInput(viewInput);
    if (!parsed) {
      setViewInputStatus('bad view');
      window.setTimeout(() => setViewInputStatus(''), 1600);
      return;
    }

    window.postMessage({
      type: IITC_IRIS_MESSAGES.setView,
      lat: parsed.lat,
      lng: parsed.lng,
      zoom: parsed.zoom ?? camera.zoom,
    } satisfies IitcIrisMessage, '*');
    setViewInputStatus('jumped');
    window.setTimeout(() => setViewInputStatus(''), 1200);
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent<IitcIrisMessage>): void => {
      if (event.source !== window) return;
      if (typeof event.data?.type === 'string' && event.data.type.startsWith('IRIS_')) {
        setEntityFetch((current) => ({...current, collision: true}));
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.pageReady) {
        setStatus('leaflet ready');
        window.postMessage({
          type: IITC_IRIS_MESSAGES.layerSettings,
          layerSettings,
          baseLayerId,
        } satisfies IitcIrisMessage, '*');
        window.postMessage({
          type: IITC_IRIS_MESSAGES.dataSourceSettings,
          dataSource,
        } satisfies IitcIrisMessage, '*');
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.mapMoved) {
        setCamera((current) => ({
          lat: event.data.lat ?? current.lat,
          lng: event.data.lng ?? current.lng,
          zoom: event.data.zoom ?? current.zoom,
          bounds: event.data.bounds ?? current.bounds,
        }));
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.entityStatus) {
        setEntityFetch((current) => ({
          ...current,
          status: event.data.status ?? current.status,
          authRequired: event.data.authRequired ?? current.authRequired,
          portals: event.data.portals ?? current.portals,
          realPortals: event.data.realPortals ?? current.realPortals,
          placeholderPortals: event.data.placeholderPortals ?? current.placeholderPortals,
          ornamentPortals: event.data.ornamentPortals ?? current.ornamentPortals,
          artifactPortals: event.data.artifactPortals ?? current.artifactPortals,
          levelLabels: event.data.levelLabels ?? current.levelLabels,
          damagedPortals: event.data.damagedPortals ?? current.damagedPortals,
          links: event.data.links ?? current.links,
          fields: event.data.fields ?? current.fields,
          viewportPortals: event.data.viewportPortals ?? current.viewportPortals,
          viewportRealPortals: event.data.viewportRealPortals ?? current.viewportRealPortals,
          viewportPlaceholderPortals: event.data.viewportPlaceholderPortals ?? current.viewportPlaceholderPortals,
          viewportLinks: event.data.viewportLinks ?? current.viewportLinks,
          viewportFields: event.data.viewportFields ?? current.viewportFields,
          requestedTiles: event.data.requestedTiles ?? current.requestedTiles,
          returnedTiles: event.data.returnedTiles ?? current.returnedTiles,
          nonEmptyTiles: event.data.nonEmptyTiles ?? current.nonEmptyTiles,
          retryRequests: event.data.retryRequests ?? current.retryRequests,
          retriedTileKeys: event.data.retriedTileKeys ?? current.retriedTileKeys,
          recoveredTileKeys: event.data.recoveredTileKeys ?? current.recoveredTileKeys,
          emptyTileKeys: event.data.emptyTileKeys ?? current.emptyTileKeys,
          nonEmptyTileKeys: event.data.nonEmptyTileKeys ?? current.nonEmptyTileKeys,
          unaccountedTileKeys: event.data.unaccountedTileKeys ?? current.unaccountedTileKeys,
          serverRetryTileKeys: event.data.serverRetryTileKeys ?? current.serverRetryTileKeys,
          timeoutTileKeys: event.data.timeoutTileKeys ?? current.timeoutTileKeys,
          errorTileKeys: event.data.errorTileKeys ?? current.errorTileKeys,
          responseRetryTileKeys: event.data.responseRetryTileKeys ?? current.responseRetryTileKeys,
          queueDelayReasons: event.data.queueDelayReasons ?? current.queueDelayReasons,
          queue: event.data.queue ?? current.queue,
          baseLayerId: event.data.baseLayerId ?? current.baseLayerId,
          dataSource: event.data.dataSource ?? current.dataSource,
          renderPolicy: event.data.renderPolicy ?? current.renderPolicy,
        }));
      }
    };

    window.addEventListener('message', onMessage);
    return (): void => window.removeEventListener('message', onMessage);
  }, [baseLayerId, dataSource, layerSettings]);

  useEffect(() => {
    storeLayerSettings(layerSettings);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.layerSettings,
      layerSettings,
      baseLayerId,
    } satisfies IitcIrisMessage, '*');
  }, [baseLayerId, layerSettings]);

  useEffect(() => {
    storeDataSourceId(dataSourceId);
    window.postMessage({
      type: IITC_IRIS_MESSAGES.dataSourceSettings,
      dataSource,
    } satisfies IitcIrisMessage, '*');
  }, [dataSource, dataSourceId]);

  const setDataSource = (id: typeof DATA_SOURCE_OPTIONS[number]['id']): void => {
    setDataSourceId(id);
    const option = DATA_SOURCE_OPTIONS.find((candidate) => candidate.id === id);
    if (!option || option.mode === 'live') return;
    window.postMessage({
      type: IITC_IRIS_MESSAGES.setView,
      lat: option.lat,
      lng: option.lng,
      zoom: option.zoom,
    } satisfies IitcIrisMessage, '*');
  };

  return (
    <div className="iitc-iris-shell">
      <div id="iitc-iris-map" className="iitc-iris-map" />
      <div className="iitc-iris-dock">
        <div className="iitc-iris-dock-row">
          <span className="iitc-iris-title">IITC IRIS</span>
          <button className="iitc-iris-copy" type="button" onClick={copyDockText} title="Copy JSON diagnostics">Copy JSON</button>
          <button className="iitc-iris-copy" type="button" onClick={copyIntelUrl} title="Copy current view as an Intel URL">Copy URL</button>
          {VIEW_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className="iitc-iris-preset"
              type="button"
              onClick={() => jumpToPreset(preset)}
              title={`${preset.label} ${preset.lat.toFixed(6)},${preset.lng.toFixed(6)}`}
            >
              {preset.label}
            </button>
          ))}
          <form
            className="iitc-iris-jump"
            onSubmit={(event) => {
              event.preventDefault();
              jumpToViewInput();
            }}
          >
            <input
              className="iitc-iris-jump-input"
              type="text"
              value={viewInput}
              onInput={(event) => setViewInput((event.currentTarget as HTMLInputElement).value)}
              placeholder="lat,lng,z or Intel URL"
              title="Paste lat,lng,z or an Intel URL with ll, pll, and optional z"
            />
            <button className="iitc-iris-preset" type="submit">Jump</button>
          </form>
          {viewInputStatus && <span className="iitc-iris-status">{viewInputStatus}</span>}
          {copyStatus && <span className="iitc-iris-status">{copyStatus}</span>}
        </div>
        <div className="iitc-iris-dock-row">
          <span className="iitc-iris-status">{status}</span>
          <span className="iitc-iris-status">z {camera.zoom.toFixed(2)}</span>
          <span className="iitc-iris-status">data z {plan?.dataZoom ?? '-'}</span>
          <span className="iitc-iris-status">mode {summaryMode}</span>
          <span className="iitc-iris-status">detail {detailOverlaysActive ? 'on' : 'off'}</span>
          <span className="iitc-iris-status">tiles {plan?.tiles.length ?? '-'}</span>
          <span className="iitc-iris-status">x {plan ? `${plan.xRange[0]}-${plan.xRange[1]}` : '-'}</span>
          <span className="iitc-iris-status">y {plan ? `${plan.yRange[0]}-${plan.yRange[1]}` : '-'}</span>
          <span className="iitc-iris-status">batch {requestBatches[0] ?? 0}</span>
          {entityFetch.collision && <span className="iitc-iris-status iitc-iris-warning">old IRIS active</span>}
          {entityFetch.authRequired && (
            <button className="iitc-iris-login" type="button" onClick={openIntelLogin} title="Open Intel login">
              Intel Login
            </button>
          )}
        </div>
        <div className="iitc-iris-dock-row">
          <span className="iitc-iris-status">{entityFetch.status}</span>
          <span className="iitc-iris-status">p {entityFetch.portals}</span>
          <span className="iitc-iris-status">real {entityFetch.realPortals}</span>
          <span className="iitc-iris-status">ph {entityFetch.placeholderPortals}</span>
          <span className="iitc-iris-status">orn {entityFetch.ornamentPortals}</span>
          <span className="iitc-iris-status">art {entityFetch.artifactPortals}</span>
          <span className="iitc-iris-status">lvl {entityFetch.levelLabels}</span>
          <span className="iitc-iris-status">dmg {entityFetch.damagedPortals}</span>
          <span className="iitc-iris-status">l {entityFetch.links}</span>
          <span className="iitc-iris-status">f {entityFetch.fields}</span>
          <span className="iitc-iris-status iitc-iris-compare">compare vp P/L/F {entityFetch.viewportPortals}/{entityFetch.viewportLinks}/{entityFetch.viewportFields}</span>
          <span className="iitc-iris-status">rt {entityFetch.returnedTiles}/{entityFetch.requestedTiles}</span>
          <span className="iitc-iris-status">nt {entityFetch.nonEmptyTiles}</span>
          {entityFetch.retryRequests > 0 && <span className="iitc-iris-status">retry {entityFetch.retryRequests}</span>}
        </div>
        <div className="iitc-iris-dock-row">
          <span className="iitc-iris-status">Data</span>
          {DATA_SOURCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`iitc-iris-layer-toggle iitc-iris-source-toggle ${dataSourceId === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
              type="button"
              onClick={() => setDataSource(option.id)}
              title={option.title}
            >
              {option.label}
            </button>
          ))}
          <span className="iitc-iris-divider" />
          <span className="iitc-iris-status">Base</span>
          {BASE_LAYER_OPTIONS.map((option) => (
            <button
              key={option.id}
              className={`iitc-iris-layer-toggle iitc-iris-base-toggle ${baseLayerId === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
              type="button"
              onClick={() => setBaseLayerId(option.id)}
              title={option.title}
            >
              {option.label}
            </button>
          ))}
          <span className="iitc-iris-divider" />
          <span className="iitc-iris-status">Layers</span>
          {LAYER_TOGGLE_LABELS.map(([key, label]) => (
            <button
              key={key}
              className={`iitc-iris-layer-toggle ${layerSettings[key] ? 'iitc-iris-layer-toggle-active' : ''}`}
              type="button"
              onClick={() => toggleLayerSetting(key)}
              title={`Toggle ${key}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function createRoot(): HTMLElement {
  const existingRoot = document.getElementById('iitc-iris-root');
  if (existingRoot) return existingRoot;

  const root = document.createElement('div');
  root.id = 'iitc-iris-root';
  (document.body || document.documentElement).appendChild(root);
  return root;
}

function mount(): void {
  if (!document.body) {
    window.setTimeout(mount, 50);
    return;
  }

  const root = createRoot();
  render(<App />, root);
  injectScript(getExtensionUrl('page-map-runtime.js'));
  window.dispatchEvent(new CustomEvent('IITC_IRIS_CONTAINER_READY'));

  if (window.__iitcIrisContentInitialized) return;
  window.__iitcIrisContentInitialized = true;

  const observer = new MutationObserver(() => {
    if (!document.getElementById('iitc-iris-root')) {
      render(<App />, createRoot());
      window.dispatchEvent(new CustomEvent('IITC_IRIS_CONTAINER_READY'));
    }
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
}

mount();
