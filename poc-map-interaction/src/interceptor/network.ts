import { isIrisUrl } from './utils';

/**
 * Hooks into network requests to intercept Intel API data.
 */
export function installNetworkHooks(): void {
    // 1. Hook XHR
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;

    XHR.open = function(this: any, _method: string, url: string | URL) {
        this._url = typeof url === 'string' ? url : url.toString();
        return open.apply(this, arguments as any);
    };

    XHR.send = function(this: any, body?: Document | XMLHttpRequestBodyInit | null) {
        this.addEventListener('load', function(this: any) {
            if (isIrisUrl(this._url)) {
                try {
                    const data = JSON.parse(this.responseText);
                    window.postMessage({ type: 'IRIS_DATA', url: this._url, data: data, params: body }, '*');
                } catch (e) {
                    // Ignore parse errors
                }
            }
        });
        return send.apply(this, arguments as any);
    };

    // 2. Hook Fetch
    const originalFetch = window.fetch;
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
        const response = await originalFetch(input, init);
        if (isIrisUrl(url)) {
            try {
                const cloned = response.clone();
                const data = await cloned.json();
                window.postMessage({ type: 'IRIS_DATA', url, data: data, params: init?.body }, '*');
            } catch (e) {
                // Ignore parse errors
            }
        }
        return response;
    };
}
