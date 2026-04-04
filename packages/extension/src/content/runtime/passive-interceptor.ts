import { isIrisUrl } from './interceptor-runtime';
import type { SessionRuntime } from './session-runtime';

export function installPassiveInterception(runtime: SessionRuntime): void {
    const originalOpen = XMLHttpRequest.prototype.open as (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async?: boolean,
        user?: string | null,
        password?: string | null
    ) => void;
    const originalSend = XMLHttpRequest.prototype.send;

    interface XMLHttpRequestAugmented extends XMLHttpRequest {
        _iris_url?: string;
    }

    XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequestAugmented,
        method: string,
        url: string | URL,
        async?: boolean,
        user?: string | null,
        password?: string | null
    ): void {
        this._iris_url = typeof url === 'string' ? url : url.toString();
        if (async === undefined) {
            originalOpen.call(this, method, url);
        } else {
            originalOpen.call(this, method, url, async, user, password);
        }
    };

    XMLHttpRequest.prototype.send = function (
        this: XMLHttpRequestAugmented,
        body: Document | XMLHttpRequestBodyInit | null | undefined,
    ): void {
        const url = this._iris_url || '';

        runtime.sniffIntelVersion(body);

        if (isIrisUrl(url)) {
            window.postMessage({ type: 'IRIS_REQUEST_START', url }, '*');

            this.addEventListener('load', function (this: XMLHttpRequestAugmented) {
                if (runtime.isAuthFailureStatus(this.status)) {
                    runtime.reportSessionExpired(url, this.status, this.statusText);
                } else if (this.status > 0 && this.status < 400) {
                    runtime.reportSessionSuccess(url);
                }

                if (runtime.isLoginHtmlResponse(this.responseText)) {
                    runtime.reportHtmlLoginResponse(url);
                    window.postMessage({
                        type: 'IRIS_REQUEST_FAILED',
                        url,
                        status: 200,
                        statusText: 'Login HTML returned instead of Intel API JSON',
                        time: Date.now(),
                    }, '*');
                    window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
                    return;
                }

                window.postMessage({ type: 'IRIS_REQUEST_SUCCESS', url, time: Date.now() }, '*');
                try {
                    const data = JSON.parse(this.responseText) as { v?: string };
                    window.postMessage({ type: 'IRIS_DATA', url, data, params: body }, '*');
                    runtime.observeIntelVersion(data.v);
                } catch (e) {
                    if (!runtime.isSessionExpired()) {
                        console.error('IRIS: Interceptor failed to parse JSON', e, url);
                    }
                } finally {
                    window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
                }
            });

            this.addEventListener('error', function (this: XMLHttpRequestAugmented) {
                window.postMessage({
                    type: 'IRIS_REQUEST_FAILED',
                    url,
                    status: this.status,
                    statusText: this.statusText,
                    time: Date.now(),
                }, '*');
                window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
            });
        } else if (url.includes('/r/')) {
            this.addEventListener('load', function (this: XMLHttpRequestAugmented) {
                try {
                    const data = JSON.parse(this.responseText) as { v?: string };
                    runtime.observeIntelVersion(data.v);
                } catch {
                    // ignore
                }
            });
        }

        originalSend.apply(this, [body]);
    };

    const originalFetch = window.fetch;
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
        const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);

        runtime.sniffIntelVersion(init?.body);

        if (isIrisUrl(url)) {
            window.postMessage({ type: 'IRIS_REQUEST_START', url }, '*');
            try {
                const response = await originalFetch(input, init);
                if (runtime.isAuthFailureStatus(response.status)) {
                    runtime.reportSessionExpired(url, response.status, response.statusText);
                } else if (response.status > 0 && response.status < 400) {
                    runtime.reportSessionSuccess(url);
                }

                try {
                    const data = await response.clone().json() as { v?: string };
                    window.postMessage({ type: 'IRIS_REQUEST_SUCCESS', url, time: Date.now() }, '*');
                    window.postMessage({ type: 'IRIS_DATA', url, data, params: init?.body }, '*');
                    runtime.observeIntelVersion(data.v);
                } catch {
                    try {
                        const text = await response.clone().text();
                        if (runtime.isLoginHtmlResponse(text)) {
                            runtime.reportHtmlLoginResponse(url);
                            window.postMessage({
                                type: 'IRIS_REQUEST_FAILED',
                                url,
                                status: response.status || 200,
                                statusText: 'Login HTML returned instead of Intel API JSON',
                                time: Date.now(),
                            }, '*');
                        } else if (!runtime.isSessionExpired()) {
                            console.error('IRIS: Fetch wrap failed to parse JSON for', url);
                        }
                    } catch (e) {
                        if (!runtime.isSessionExpired()) {
                            console.error('IRIS: Fetch wrap failed to inspect non-JSON response', e);
                        }
                    }
                }
                return response;
            } catch (e) {
                window.postMessage({
                    type: 'IRIS_REQUEST_FAILED',
                    url,
                    status: 0,
                    statusText: (e as Error).message,
                    time: Date.now(),
                }, '*');
                throw e;
            } finally {
                window.postMessage({ type: 'IRIS_REQUEST_END' }, '*');
            }
        } else if (url.includes('/r/')) {
            try {
                const response = await originalFetch(input, init);
                const cloned = response.clone();
                cloned.json().then((data: { v?: string }) => {
                    runtime.observeIntelVersion(data.v);
                }).catch((): undefined => undefined);
                return response;
            } catch {
                return originalFetch(input, init);
            }
        }

        return originalFetch(input, init);
    };
}
