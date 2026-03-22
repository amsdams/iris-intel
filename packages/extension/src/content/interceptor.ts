/**
 * Injected into the page's main world.
 * Patches XHR prototype and wraps fetch to intercept Ingress Intel API calls.
 */
(function () {
  console.log('ITTCA: Interceptor started');

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

  console.log('ITTCA: Interceptor ready — XHR prototype patched, fetch wrapped');
})();