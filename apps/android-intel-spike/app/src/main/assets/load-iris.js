/* Bundled injection proof. Only fixed status text returns to native diagnostics. */
(() => {
  if (location.origin !== 'https://intel.ingress.com') return;
  const key = __IRIS_PROBE_KEY__;
  const base = 'https://intel.ingress.com/__iris_android__/';
  const cleanups = [];
  let active = true;
  const finish = (message) => {
    if (!active) return;
    active = false;
    window[key] = message;
    cleanups.splice(0).forEach((cleanup) => cleanup());
  };
  window[key] = 'Loading IRIS…';
  if (!document.body || !window.PLAYER || typeof window.PLAYER.nickname !== 'string' || !window.PLAYER.nickname) {
    finish('Sign in to Intel and wait for its map before loading IRIS.');
    return;
  }
  const timeout = setTimeout(() => finish('IRIS timed out. Tap Stock Intel to recover, or tap IRIS to retry.'), 30000);
  cleanups.push(() => clearTimeout(timeout));
  const onPageHide = () => finish('IRIS loading cancelled by navigation.');
  window.addEventListener('pagehide', onPageHide, {once: true});
  cleanups.push(() => window.removeEventListener('pagehide', onPageHide));

  const load = (tag, path) => new Promise((resolve, reject) => {
    const element = document.createElement(tag);
    const cleanup = () => { element.onload = null; element.onerror = null; };
    cleanups.push(cleanup);
    element.onload = () => { cleanup(); resolve(); };
    element.onerror = () => { cleanup(); reject(new Error('Bundled asset unavailable')); };
    if (tag === 'link') { element.rel = 'stylesheet'; element.href = base + path; }
    else { element.async = false; element.src = base + path; }
    (document.head || document.documentElement).appendChild(element);
  });
  const isReady = () => Boolean(document.getElementById('iitc-iris-root')
    && document.getElementById('iitc-iris-map') && window.__iitcIrisPageRuntimeInitialized && window.__iitcIrisMap);
  const waitForMap = () => new Promise((resolve) => {
    if (isReady()) { resolve(); return; }
    const listener = (event) => {
      if (event.source === window && event.origin === location.origin
          && event.data?.type === 'IITC_IRIS_PAGE_READY' && isReady()) {
        window.removeEventListener('message', listener);
        resolve();
      }
    };
    window.addEventListener('message', listener);
    cleanups.push(() => window.removeEventListener('message', listener));
  });

  (async () => {
    if (!window.__irisAndroidAssets) {
      window.__irisAndroidAssets = (async () => {
        let meta = document.querySelector('meta[name="iitc-iris-asset-base"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'iitc-iris-asset-base';
          (document.head || document.documentElement).appendChild(meta);
        }
        meta.content = base;
        let viewport = document.querySelector('meta[name="viewport"]');
        if (!viewport) {
          viewport = document.createElement('meta');
          viewport.name = 'viewport';
          (document.head || document.documentElement).appendChild(viewport);
        }
        viewport.content = 'width=device-width, initial-scale=1';
        await load('link', 'leaflet.css');
        if (!active) return;
        await load('link', 'iitc-iris.css');
        if (!active) return;
        await load('script', 'content.js');
      })();
    }
    await window.__irisAndroidAssets;
    if (!active) return;
    await waitForMap();
    if (!active) return;
    // Exercise the existing read-only shell → page runtime → shell message path.
    // Do not copy the returned Draw Tools payload into native code.
    const onReply = (event) => {
      if (event.source !== window || event.origin !== location.origin || !isReady()) return;
      if (event.data?.type === 'IITC_IRIS_DRAW_TOOLS_STATUS' && Array.isArray(event.data.drawToolsItems)) {
        finish('PASS: bundled IRIS UI, Leaflet runtime, and message round trip confirmed.');
      }
    };
    window.addEventListener('message', onReply);
    cleanups.push(() => window.removeEventListener('message', onReply));
    window.postMessage({type: 'IITC_IRIS_DRAW_TOOLS', drawToolsAction: 'requestStatus'}, location.origin);
  })().catch(() => finish('IRIS could not load. Tap Stock Intel to recover, or tap IRIS to retry.'));
})();
