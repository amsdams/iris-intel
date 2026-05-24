import { isIrisUrl } from './utils';

interface InternalMiniIrisRequestInit extends RequestInit {
    __miniIrisInternalRequest?: boolean;
}

/**
 * Hooks into network requests to intercept Intel API data.
 */
export function installNetworkHooks(): void {
    // 1. Hook XHR
    const XHR = XMLHttpRequest.prototype;
    const open = XHR.open;
    const send = XHR.send;

    XHR.open = function(
        this: XMLHttpRequestWithIrisUrl,
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null,
    ): void {
        this._irisUrl = typeof url === 'string' ? url : url.toString();
        if (typeof async === 'boolean') {
            open.call(this, method, url, async, username, password);
            return;
        }
        open.call(this, method, url, true);
    };

    XHR.send = function(this: XMLHttpRequestWithIrisUrl, body?: Document | XMLHttpRequestBodyInit | null): void {
        this.addEventListener('load', function(this: XMLHttpRequestWithIrisUrl): void {
            const url = this._irisUrl;
            if (url && isIrisUrl(url)) {
                try {
                    const data: unknown = JSON.parse(this.responseText);
                    window.postMessage({ type: 'IRIS_DATA', url, data, params: body }, '*');
                } catch {
                    // Ignore parse errors
                }
            }
        });
        send.call(this, body);
    };

    // 2. Hook Fetch
    const originalFetch = window.fetch;
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
        const isInternalRequest = (init as InternalMiniIrisRequestInit | undefined)?.__miniIrisInternalRequest === true;
        const response = await originalFetch(input, init);
        if (!isInternalRequest && isIrisUrl(url)) {
            try {
                const cloned = response.clone();
                const data: unknown = await cloned.json();
                window.postMessage({ type: 'IRIS_DATA', url, data, params: init?.body }, '*');
            } catch {
                // Ignore parse errors
            }
        }
        return response;
    };
}

interface XMLHttpRequestWithIrisUrl extends XMLHttpRequest {
    _irisUrl?: string;
}
