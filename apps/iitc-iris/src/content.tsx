import {h, render} from 'preact';
import {useEffect, useMemo, useState} from 'preact/hooks';
import './iitc-iris.css';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage} from './messages';
import {createIitcMapDataPlan, type IitcBounds, type IitcMapDataPlan} from '@iris/iitc-core';

interface CameraState {
  lat: number;
  lng: number;
  zoom: number;
  bounds: IitcBounds | null;
}

interface EntityFetchState {
  status: string;
  generation: number;
  key: string;
  collision: boolean;
  portals: number;
  links: number;
  fields: number;
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
    return createIitcMapDataPlan(camera.bounds, {lat: camera.lat, lng: camera.lng}, camera.zoom);
  } catch (error) {
    console.warn('[IITC IRIS] Failed to create map data plan', error);
    return null;
  }
}

function App(): h.JSX.Element {
  const [status, setStatus] = useState('booting');
  const [camera, setCamera] = useState<CameraState>({
    lat: 52.3730796,
    lng: 4.8924534,
    zoom: 11,
    bounds: null,
  });
  const [entityFetch, setEntityFetch] = useState<EntityFetchState>({
    status: 'idle',
    generation: 0,
    key: '',
    collision: false,
    portals: 0,
    links: 0,
    fields: 0,
  });
  const plan: IitcMapDataPlan | null = useMemo(() => createPlan(camera), [camera]);

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
          portals: event.data.portals ?? current.portals,
          links: event.data.links ?? current.links,
          fields: event.data.fields ?? current.fields,
        }));
      }
    };

    window.addEventListener('message', onMessage);
    return (): void => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="iitc-iris-shell">
      <div id="iitc-iris-map" className="iitc-iris-map" />
      <div className="iitc-iris-dock">
        <span className="iitc-iris-title">IITC IRIS</span>
        <span className="iitc-iris-status">{status}</span>
        <span className="iitc-iris-status">z {camera.zoom.toFixed(2)}</span>
        <span className="iitc-iris-status">data z {plan?.dataZoom ?? '-'}</span>
        <span className="iitc-iris-status">tiles {plan?.tiles.length ?? '-'}</span>
        <span className="iitc-iris-status">x {plan ? `${plan.xRange[0]}-${plan.xRange[1]}` : '-'}</span>
        <span className="iitc-iris-status">y {plan ? `${plan.yRange[0]}-${plan.yRange[1]}` : '-'}</span>
        <span className="iitc-iris-status">batch {plan?.requestBatches[0]?.length ?? 0}</span>
        {entityFetch.collision && <span className="iitc-iris-status iitc-iris-warning">old IRIS active</span>}
        <span className="iitc-iris-status">{entityFetch.status}</span>
        <span className="iitc-iris-status">p {entityFetch.portals}</span>
        <span className="iitc-iris-status">l {entityFetch.links}</span>
        <span className="iitc-iris-status">f {entityFetch.fields}</span>
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
