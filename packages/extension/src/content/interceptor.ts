/**
 * This script is injected into the "main world" (the page context)
 * to intercept XHR and Fetch calls from the Ingress Intel Map.
 */

(function () {
  const originalXHR = window.XMLHttpRequest;

  interface ITTCAXHR extends XMLHttpRequest {
    _url?: string;
  }

  function ITTCA_XHR(this: ITTCAXHR) {
    const xhr = new originalXHR() as ITTCAXHR;
    const originalOpen = xhr.open;
    const originalSend = xhr.send;

    xhr.open = function (this: ITTCAXHR, method: string, url: string | URL) {
      this._url = typeof url === 'string' ? url : url.toString();
      return originalOpen.apply(this, arguments as any);
    } as any;

    xhr.send = function (this: ITTCAXHR, data?: Document | XMLHttpRequestBodyInit | null) {
      this.addEventListener('load', function (this: ITTCAXHR) {
        const url = this._url || '';
        if (url.includes('/r/getEntities') || url.includes('/r/getPortalDetails')) {
          try {
            const response = JSON.parse(this.responseText);
            let params = {};
            if (data && typeof data === 'string') {
              try {
                params = JSON.parse(data);
              } catch (e) {}
            }
            window.postMessage({ type: 'ITTCA_DATA', url, data: response, params }, '*');
          } catch (e) {
            console.error('ITTCA: Error parsing XHR response', e);
          }
        }
      });
      return originalSend.apply(this, arguments as any);
    } as any;

    return xhr;
  }

  // Override XMLHttpRequest
  (window as any).XMLHttpRequest = ITTCA_XHR;

  // Sync Map State
  function syncMap() {
    const map = (window as any).map;
    if (map && map.getCenter && map.getZoom) {
      const center = map.getCenter();
      window.postMessage({
        type: 'ITTCA_MAP_SYNC',
        center: { lat: center.lat, lng: center.lng },
        zoom: map.getZoom()
      }, '*');
    }
  }

  // Hook into Leaflet map events if available
  const checkMap = setInterval(() => {
    const map = (window as any).map;
    if (map) {
      clearInterval(checkMap);
      map.on('move', syncMap);
      syncMap(); // Initial sync
      console.log('ITTCA: Leaflet map hooked for sync');
    }
  }, 1000);

  // Also handle Fetch
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const firstArg = args[0];
    let url = '';
    
    if (typeof firstArg === 'string') {
      url = firstArg;
    } else if (firstArg instanceof URL) {
      url = firstArg.toString();
    } else if (firstArg instanceof Request) {
      url = firstArg.url;
    }

    if (url.includes('/r/getEntities') || url.includes('/r/getPortalDetails')) {
      const clone = response.clone();
      try {
        const data = await clone.json();
        window.postMessage({ type: 'ITTCA_DATA', url, data }, '*');
      } catch (e) {
        console.error('ITTCA: Error parsing Fetch response', e);
      }
    }
    return response;
  };

  console.log('ITTCA: Interceptor injected successfully');
})();
