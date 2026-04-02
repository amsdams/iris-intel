import { extractVersionFromDOM } from './interceptor-runtime';

export type SessionState = 'ok' | 'initial_login_required' | 'expired' | 'recovering';

interface SessionMessagePayload {
    type: 'IRIS_INITIAL_LOGIN_REQUIRED' | 'IRIS_SESSION_EXPIRED' | 'IRIS_SESSION_RECOVERING' | 'IRIS_SESSION_RECOVERED';
    url: string;
    time: number;
    status?: number;
    statusText?: string;
}

export interface SessionRuntime {
    getIntelVersion: () => string;
    sniffIntelVersion: (body: unknown) => void;
    observeIntelVersion: (candidate?: string | null) => void;
    getSessionState: () => SessionState;
    isSessionExpired: () => boolean;
    isAuthFailureStatus: (status: number) => boolean;
    isLoginHtmlResponse: (text: string) => boolean;
    reportSessionExpired: (url: string, status: number, statusText: string) => void;
    reportSessionSuccess: (url: string) => void;
    reportHtmlLoginResponse: (url: string) => void;
    safeIrisFetch: (url: string, options: RequestInit) => Promise<Response>;
}

export function createSessionRuntime(win: Window, doc: Document): SessionRuntime {
    let intelVersion = extractVersionFromDOM(doc) ?? '';
    let sessionState: SessionState = 'ok';

    if (!intelVersion) {
        const observer = new MutationObserver(() => {
            if (!intelVersion) {
                intelVersion = extractVersionFromDOM(doc) ?? '';
            }
            if (intelVersion) observer.disconnect();
        });
        observer.observe(doc.head || doc.documentElement, { childList: true, subtree: true });
    }

    const postSessionMessage = (payload: SessionMessagePayload): void => {
        win.postMessage(payload, '*');
    };

    const isInitialLoginPage = (): boolean => {
        const signInLink = doc.querySelector<HTMLAnchorElement>('#dashboard_container a[href*="signin.nianticspatial.com/signin"]');
        const welcomeHeading = doc.querySelector('#dashboard_container h2');
        const hasIntelDashboard = doc.querySelector('#butterbar, #dashboard, #map_canvas, #playerstat');

        if (hasIntelDashboard) return false;
        if (signInLink) return true;

        return welcomeHeading?.textContent?.trim() === 'Welcome to Ingress.';
    };

    const syncLandingSessionState = (): void => {
        if (isInitialLoginPage()) {
            if (sessionState === 'ok') {
                sessionState = 'initial_login_required';
                postSessionMessage({
                    type: 'IRIS_INITIAL_LOGIN_REQUIRED',
                    url: win.location.href,
                    status: 401,
                    statusText: 'Intel landing page requires sign-in before dashboard requests can run',
                    time: Date.now(),
                });
            }
            return;
        }

        if (sessionState === 'initial_login_required') {
            sessionState = 'ok';
            postSessionMessage({
                type: 'IRIS_SESSION_RECOVERED',
                url: win.location.href,
                time: Date.now(),
            });
        }
    };

    const isAuthFailureStatus = (status: number): boolean => status === 401 || status === 403;

    const isLikelyHtmlDocument = (text: string): boolean => {
        const trimmed = text.trimStart();
        return trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<head') || trimmed.startsWith('<body');
    };

    const isLoginHtmlResponse = (text: string): boolean => {
        const lower = text.toLowerCase();
        return isLikelyHtmlDocument(text) && (
            lower.includes('intel.ingress.com') ||
            lower.includes('sign in') ||
            lower.includes('signin') ||
            lower.includes('login')
        );
    };

    const reportSessionExpired = (url: string, status: number, statusText: string): void => {
        if (sessionState === 'expired') return;
        sessionState = 'expired';
        postSessionMessage({
            type: 'IRIS_SESSION_EXPIRED',
            url,
            status,
            statusText,
            time: Date.now(),
        });
    };

    const reportSessionSuccess = (url: string): void => {
        if (sessionState === 'expired' || sessionState === 'initial_login_required') {
            sessionState = 'recovering';
            postSessionMessage({
                type: 'IRIS_SESSION_RECOVERING',
                url,
                time: Date.now(),
            });
        }

        if (sessionState === 'recovering') {
            sessionState = 'ok';
            postSessionMessage({
                type: 'IRIS_SESSION_RECOVERED',
                url,
                time: Date.now(),
            });
        }
    };

    const reportHtmlLoginResponse = (url: string): void => {
        reportSessionExpired(url, 200, 'Login HTML returned instead of Intel API JSON');
    };

    const sessionObserver = new MutationObserver(() => {
        syncLandingSessionState();
    });
    sessionObserver.observe(doc.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['id'],
    });
    syncLandingSessionState();

    const observeIntelVersion = (candidate?: string | null): void => {
        if (candidate && candidate !== intelVersion) {
            intelVersion = candidate;
        }
    };

    const sniffIntelVersion = (body: unknown): void => {
        if (typeof body !== 'string') return;
        try {
            const parsed = JSON.parse(body) as { v?: string };
            if (parsed.v) {
                observeIntelVersion(parsed.v);
            }
        } catch {
            // ignore
        }
    };

    const ensureIntelVersion = async (url: string): Promise<void> => {
        if (!intelVersion) {
            const runtimeWindow = win as Window & typeof globalThis & { niantic_params?: { version: string } };
            if (runtimeWindow.niantic_params?.version) {
                intelVersion = runtimeWindow.niantic_params.version;
            }
        }

        if (!intelVersion) {
            if (sessionState === 'expired') {
                throw new Error(`IRIS: blocked ${url} because Intel session is expired`);
            }
            console.warn(`IRIS: Waiting for version before fetching ${url}...`);
            let attempts = 0;
            while (!intelVersion && attempts < 20) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                attempts++;
                if (!intelVersion) {
                    intelVersion = extractVersionFromDOM(doc) ?? '';
                }
            }
        }

        if (!intelVersion && sessionState !== 'expired') {
            console.error(`IRIS: Failed to capture version after timeout. Request to ${url} may fail.`);
        }
    };

    const safeIrisFetch = async (url: string, options: RequestInit): Promise<Response> => {
        await ensureIntelVersion(url);

        if (sessionState === 'expired' || sessionState === 'initial_login_required') {
            throw new Error(`IRIS: blocked ${url} because Intel session is expired`);
        }

        const body = JSON.parse(options.body as string) as Record<string, unknown>;
        body.v = intelVersion;
        options.body = JSON.stringify(body);

        return fetch(url, options);
    };

    return {
        getIntelVersion: () => intelVersion,
        sniffIntelVersion,
        observeIntelVersion,
        getSessionState: () => sessionState,
        isSessionExpired: () => sessionState === 'expired' || sessionState === 'initial_login_required',
        isAuthFailureStatus,
        isLoginHtmlResponse,
        reportSessionExpired,
        reportSessionSuccess,
        reportHtmlLoginResponse,
        safeIrisFetch,
    };
}
