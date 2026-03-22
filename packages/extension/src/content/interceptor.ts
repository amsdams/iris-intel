/**
 * Injected into the page's main world at document_start.
 * 1. Hooks google.maps.Map constructor to capture Intel's map instance
 * 2. Patches XHR prototype to intercept getEntities / getPortalDetails
 * 3. Wraps fetch for the same endpoints
 */
(function () {
  console.log('ITTCA: Interceptor started');

  // --- Google Maps Constructor Hook ---
  let intelMap: any = null;

  const hookGoogleMaps = () => {
    if ((window as any).google?.maps?.Map) {
      const OrigMap = (window as any).google.maps.Map;

      (window as any).google.maps.Map = function (...args: any[]) {
        const instance = new OrigMap(...args);
        console.log('ITTCA: Google Maps instance captured');
        intelMap = instance;
        return instance;
      };

      // Preserve prototype so instanceof checks pass
      (window as any).google.maps.Map.prototype = OrigMap.prototype;
      console.log('ITTCA: Google Maps constructor hooked');
    } else {
      // google.maps not ready yet — poll until it is
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).google?.maps?.Map) {
          clearInterval(interval);
          hookGoogleMaps();
        }
        if (attempts > 50) {
          clearInterval(interval);
          console.warn('ITTCA: Google Maps constructor not found after 50 attempts');
        }
      }, 100);
    }
  };

  hookGoogleMaps();

  // --- XHR Interception via prototype patching ---
  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      user?: string | null,
      password?: string | null
  ) {
    (this as any)._ittca_url = typeof url === 'string' ? url : url.toString();
    return origOpen.apply(this, arguments as any);
  };

  XMLHttpRequest.prototype.send = function (
      body?: Document | XMLHttpRequestBodyInit | null
  ) {
    const url: string = (this as any)._ittca_url || '';

    if (url.includes('/r/getEntities') && body) {
      try {
        const requestData = JSON.parse(body as string);
        if (requestData.tileKeys?.length > 0) {
          window.postMessage(
              { type: 'ITTCA_TILE_REQUEST', tileKeys: requestData.tileKeys },
              '*'
          );
        }
      } catch (e) {
        // body is not JSON — ignore
      }
    }

    this.addEventListener('load', function (this: XMLHttpRequest) {
      if (this.status !== 200) return;
      const url: string = (this as any)._ittca_url || '';
      if (
          url.includes('/r/getEntities') ||
          url.includes('/r/getPortalDetails')
      ) {
        try {
          const response = JSON.parse(this.responseText);
          window.postMessage(
              { type: 'ITTCA_DATA', url, data: response },
              '*'
          );
        } catch (e) {
          console.error('ITTCA: Failed to parse XHR response', e);
        }
      }
    });

    return origSend.apply(this, arguments as any);
  };

  // --- Fetch Interception ---
  const originalFetch = window.fetch;

  window.fetch = async (...args): Promise<Response> => {
    const response = await originalFetch(...args);
    const url =
        typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

    if (
        response.ok &&
        (url.includes('/r/getEntities') || url.includes('/r/getPortalDetails'))
    ) {
      try {
        const data = await response.clone().json();
        window.postMessage({ type: 'ITTCA_DATA', url, data }, '*');
      } catch (e) {
        console.error('ITTCA: Failed to parse fetch response', e);
      }
    }

    return response;
  };

  // --- Map Move Handler ---
  window.addEventListener('message', (event) => {
    if (!event.data?.type) return;

    if (event.data.type === 'ITTCA_MOVE_MAP_INTERNAL') {
      const { center, zoom } = event.data;

      if (intelMap) {
        try {
          intelMap.setCenter({ lat: center.lat, lng: center.lng });
          intelMap.setZoom(zoom);
          console.log('ITTCA: Intel map moved to', center.lat, center.lng, 'zoom', zoom);
        } catch (e) {
          console.error('ITTCA: Failed to move Intel map', e);
        }
      } else {
        console.warn('ITTCA: Intel map instance not captured yet');
      }
    }
  });

  console.log('ITTCA: Interceptor ready — XHR patched, fetch wrapped, Maps hook installed');
})();