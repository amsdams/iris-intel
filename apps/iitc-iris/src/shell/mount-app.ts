import {type ComponentChild, render} from 'preact';
import {getExtensionUrl} from '../platform/assets';

function injectScript(src: string): void {
  if (document.querySelector(`script[data-iitc-iris-src="${CSS.escape(src)}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = false;
  script.dataset.iitcIrisSrc = src;
  (document.head || document.documentElement).appendChild(script);
}

function createRoot(): HTMLElement {
  const existingRoot = document.getElementById('iitc-iris-root');
  if (existingRoot) return existingRoot;

  const root = document.createElement('div');
  root.id = 'iitc-iris-root';
  (document.body || document.documentElement).appendChild(root);
  return root;
}

function hasIntelDashboardBootstrap(): boolean {
  return document.querySelector('script[src*="gen_dashboard_"]') !== null;
}

export function mountApp(createApp: () => ComponentChild, loginBypassStorageKey: string): void {
  function shouldBypassForIntelLogin(): boolean {
    try {
      const value = Number(window.sessionStorage.getItem(loginBypassStorageKey) ?? 0);
      if (!Number.isFinite(value) || value <= Date.now() || hasIntelDashboardBootstrap()) {
        window.sessionStorage.removeItem(loginBypassStorageKey);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  function mount(): void {
    if (!document.body) {
      window.setTimeout(mount, 50);
      return;
    }

    if (shouldBypassForIntelLogin()) {
      window.setTimeout(mount, 1000);
      return;
    }

    const root = createRoot();
    render(createApp(), root);
    injectScript(getExtensionUrl('page-map-runtime.js'));
    window.dispatchEvent(new CustomEvent('IITC_IRIS_CONTAINER_READY'));

    if (window.__iitcIrisContentInitialized) return;
    window.__iitcIrisContentInitialized = true;

    const observer = new MutationObserver(() => {
      if (!document.getElementById('iitc-iris-root')) {
        render(createApp(), createRoot());
        window.dispatchEvent(new CustomEvent('IITC_IRIS_CONTAINER_READY'));
      }
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});
  }

  mount();
}
