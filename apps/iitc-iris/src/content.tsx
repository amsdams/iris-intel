import {h, render} from 'preact';
import {useEffect, useMemo, useState} from 'preact/hooks';
import './iitc-iris.css';
import {IITC_IRIS_MESSAGES, type IitcIrisLayerSettings, type IitcIrisMessage} from './messages';
import {createIitcMapDataPlan, type IitcBounds, type IitcMapDataPlan} from '@iris/iitc-core';

const REQUEST_BOUNDS_PADDING_RATIO = 0.25;
const ENTITY_TILES_PER_REQUEST = 5;
const LAYER_TOGGLE_LABELS: [keyof IitcIrisLayerSettings, string][] = [
  ['fields', 'F'],
  ['links', 'LN'],
  ['portals', 'P'],
  ['ornaments', 'OR'],
  ['artifacts', 'AR'],
  ['labels', 'LV'],
  ['tiles', 'T'],
];

function getRuntimeRequestBatchSizes(tileCount: number): number[] {
  const batches: number[] = [];
  for (let index = 0; index < tileCount; index += ENTITY_TILES_PER_REQUEST) {
    batches.push(Math.min(ENTITY_TILES_PER_REQUEST, tileCount - index));
  }
  return batches;
}

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
  requestedTiles: number;
  returnedTiles: number;
  nonEmptyTiles: number;
  retryRequests: number;
  retriedTileKeys: string[];
  recoveredTileKeys: string[];
  emptyTileKeys: string[];
  nonEmptyTileKeys: string[];
}

function getExtensionUrl(path: string): string {
  return chrome.runtime.getURL(path);
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
    });
  } catch (error) {
    console.warn('[IITC IRIS] Failed to create map data plan', error);
    return null;
  }
}

function App(): h.JSX.Element {
  const [status, setStatus] = useState('booting');
  const [copyStatus, setCopyStatus] = useState('');
  const [layerSettings, setLayerSettings] = useState<IitcIrisLayerSettings>({
    fields: true,
    links: true,
    portals: true,
    ornaments: true,
    artifacts: true,
    labels: true,
    tiles: false,
  });
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
    requestedTiles: 0,
    returnedTiles: 0,
    nonEmptyTiles: 0,
    retryRequests: 0,
    retriedTileKeys: [],
    recoveredTileKeys: [],
    emptyTileKeys: [],
    nonEmptyTileKeys: [],
  });
  const plan: IitcMapDataPlan | null = useMemo(() => createPlan(camera), [camera]);
  const summaryMode = plan?.tileParams.hasPortals ? 'summary' : 'placeholder';
  const runtimeRequestBatches = getRuntimeRequestBatchSizes(plan?.tileKeys.length ?? 0);
  const dockDiagnostics = {
    app: 'IITC IRIS',
    status,
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
      firstBatchSize: runtimeRequestBatches[0] ?? 0,
      requestBatches: runtimeRequestBatches,
      coreRequestBatches: plan.requestBatches.map((batch) => batch.length),
      dataBounds: plan.dataBounds,
    } : null,
    entities: {
      status: entityFetch.status,
      portals: entityFetch.portals,
      realPortals: entityFetch.realPortals,
      placeholderPortals: entityFetch.placeholderPortals,
      ornamentPortals: entityFetch.ornamentPortals,
      artifactPortals: entityFetch.artifactPortals,
      levelLabels: entityFetch.levelLabels,
      damagedPortals: entityFetch.damagedPortals,
      links: entityFetch.links,
      fields: entityFetch.fields,
      requestedTiles: entityFetch.requestedTiles,
      returnedTiles: entityFetch.returnedTiles,
      nonEmptyTiles: entityFetch.nonEmptyTiles,
      retryRequests: entityFetch.retryRequests,
      retriedTileKeys: entityFetch.retriedTileKeys,
      recoveredTileKeys: entityFetch.recoveredTileKeys,
      emptyTileKeys: entityFetch.emptyTileKeys,
      nonEmptyTileKeys: entityFetch.nonEmptyTileKeys,
      authRequired: entityFetch.authRequired,
    },
    layers: layerSettings,
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

  const openIntelLogin = (): void => {
    window.location.assign('https://intel.ingress.com/intel');
  };

  const toggleLayerSetting = (key: keyof IitcIrisLayerSettings): void => {
    setLayerSettings((current) => ({...current, [key]: !current[key]}));
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent<IitcIrisMessage>): void => {
      if (event.source !== window) return;
      if (typeof event.data?.type === 'string' && event.data.type.startsWith('IRIS_')) {
        setEntityFetch((current) => ({...current, collision: true}));
      }
      if (event.data?.type === IITC_IRIS_MESSAGES.pageReady) {
        setStatus('leaflet ready');
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
          requestedTiles: event.data.requestedTiles ?? current.requestedTiles,
          returnedTiles: event.data.returnedTiles ?? current.returnedTiles,
          nonEmptyTiles: event.data.nonEmptyTiles ?? current.nonEmptyTiles,
          retryRequests: event.data.retryRequests ?? current.retryRequests,
          retriedTileKeys: event.data.retriedTileKeys ?? current.retriedTileKeys,
          recoveredTileKeys: event.data.recoveredTileKeys ?? current.recoveredTileKeys,
          emptyTileKeys: event.data.emptyTileKeys ?? current.emptyTileKeys,
          nonEmptyTileKeys: event.data.nonEmptyTileKeys ?? current.nonEmptyTileKeys,
        }));
      }
    };

    window.addEventListener('message', onMessage);
    return (): void => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    window.postMessage({
      type: IITC_IRIS_MESSAGES.layerSettings,
      layerSettings,
    } satisfies IitcIrisMessage, '*');
  }, [layerSettings]);

  return (
    <div className="iitc-iris-shell">
      <div id="iitc-iris-map" className="iitc-iris-map" />
      <div className="iitc-iris-dock">
        <span className="iitc-iris-title">IITC IRIS</span>
        <button className="iitc-iris-copy" type="button" onClick={copyDockText} title="Copy JSON diagnostics">Copy JSON</button>
        {copyStatus && <span className="iitc-iris-status">{copyStatus}</span>}
        <span className="iitc-iris-status">{status}</span>
        <span className="iitc-iris-status">z {camera.zoom.toFixed(2)}</span>
        <span className="iitc-iris-status">data z {plan?.dataZoom ?? '-'}</span>
        <span className="iitc-iris-status">mode {summaryMode}</span>
        <span className="iitc-iris-status">tiles {plan?.tiles.length ?? '-'}</span>
        <span className="iitc-iris-status">x {plan ? `${plan.xRange[0]}-${plan.xRange[1]}` : '-'}</span>
        <span className="iitc-iris-status">y {plan ? `${plan.yRange[0]}-${plan.yRange[1]}` : '-'}</span>
        <span className="iitc-iris-status">batch {runtimeRequestBatches[0] ?? 0}</span>
        {entityFetch.collision && <span className="iitc-iris-status iitc-iris-warning">old IRIS active</span>}
        {entityFetch.authRequired && (
          <button className="iitc-iris-login" type="button" onClick={openIntelLogin} title="Open Intel login">
            Intel Login
          </button>
        )}
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
        <span className="iitc-iris-status">rt {entityFetch.returnedTiles}/{entityFetch.requestedTiles}</span>
        <span className="iitc-iris-status">nt {entityFetch.nonEmptyTiles}</span>
        {entityFetch.retryRequests > 0 && <span className="iitc-iris-status">retry {entityFetch.retryRequests}</span>}
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
