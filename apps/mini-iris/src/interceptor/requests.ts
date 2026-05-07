import { getCsrfToken, extractVersion } from './utils';
import { getMessageType, isRecord, numberOrNull, stringOrNull } from '../messages';

/**
 * Request Queue Configuration.
 */
const MAX_CONCURRENT_REQUESTS = 5;
const PLEXT_FRESHNESS_MS = 5000;
const PORTAL_DETAILS_FRESHNESS_MS = 15000;
const GAME_SCORE_FRESHNESS_MS = 5 * 60 * 1000;
const REGION_SCORE_FRESHNESS_MS = 5 * 60 * 1000;
const SUBSCRIPTION_FRESHNESS_MS = 10 * 60 * 1000;
const INVENTORY_FRESHNESS_MS = 5 * 60 * 1000;

const DEFAULT_FAILURE_BACKOFF_MS = 5000;
const LOGIN_FAILURE_BACKOFF_MS = 60 * 1000;
const MAX_FAILURE_BACKOFF_MS = 60 * 1000;

type RequestEndpoint = 'portalDetails' | 'gameScore' | 'regionScore' | 'subscription' | 'inventory' | 'plexts';

interface EndpointState {
    status: 'idle' | 'in_flight' | 'error';
    inFlightKey: string | null;
    inFlightKeys: Set<string>;
    inFlightCount: number;
    lastSuccessKey: string | null;
    lastSuccessAt: number | null;
    lastAttemptKey: string | null;
    lastAttemptAt: number | null;
    lastSkipReason: string | null;
    nextRefreshAt: number | null;
    failureCount: number;
    cooldownUntil: number | null;
}

interface RequestTask {
    endpoint: RequestEndpoint;
    key: string;
    freshnessMs: number;
    force: boolean;
    priority: number;
    enqueuedAt: number;
    run: () => Promise<void>;
}

const requestQueue: RequestTask[] = [];
let activeRequests = 0;
const endpointState: Record<RequestEndpoint, EndpointState> = {
    portalDetails: {
        status: 'idle',
        inFlightKey: null,
        inFlightKeys: new Set<string>(),
        inFlightCount: 0,
        lastSuccessKey: null,
        lastSuccessAt: null,
        lastAttemptKey: null,
        lastAttemptAt: null,
        lastSkipReason: null,
        nextRefreshAt: null,
        failureCount: 0,
        cooldownUntil: null,
    },
    gameScore: {
        status: 'idle',
        inFlightKey: null,
        inFlightKeys: new Set<string>(),
        inFlightCount: 0,
        lastSuccessKey: null,
        lastSuccessAt: null,
        lastAttemptKey: null,
        lastAttemptAt: null,
        lastSkipReason: null,
        nextRefreshAt: null,
        failureCount: 0,
        cooldownUntil: null,
    },
    regionScore: {
        status: 'idle',
        inFlightKey: null,
        inFlightKeys: new Set<string>(),
        inFlightCount: 0,
        lastSuccessKey: null,
        lastSuccessAt: null,
        lastAttemptKey: null,
        lastAttemptAt: null,
        lastSkipReason: null,
        nextRefreshAt: null,
        failureCount: 0,
        cooldownUntil: null,
    },
    subscription: {
        status: 'idle',
        inFlightKey: null,
        inFlightKeys: new Set<string>(),
        inFlightCount: 0,
        lastSuccessKey: null,
        lastSuccessAt: null,
        lastAttemptKey: null,
        lastAttemptAt: null,
        lastSkipReason: null,
        nextRefreshAt: null,
        failureCount: 0,
        cooldownUntil: null,
    },
    inventory: {
        status: 'idle',
        inFlightKey: null,
        inFlightKeys: new Set<string>(),
        inFlightCount: 0,
        lastSuccessKey: null,
        lastSuccessAt: null,
        lastAttemptKey: null,
        lastAttemptAt: null,
        lastSkipReason: null,
        nextRefreshAt: null,
        failureCount: 0,
        cooldownUntil: null,
    },
    plexts: {
        status: 'idle',
        inFlightKey: null,
        inFlightKeys: new Set<string>(),
        inFlightCount: 0,
        lastSuccessKey: null,
        lastSuccessAt: null,
        lastAttemptKey: null,
        lastAttemptAt: null,
        lastSkipReason: null,
        nextRefreshAt: null,
        failureCount: 0,
        cooldownUntil: null,
    },
};

const REQUEST_PRIORITIES: Record<RequestEndpoint, number> = {
    portalDetails: 100,
    plexts: 90,
    inventory: 80,
    gameScore: 70,
    regionScore: 70,
    subscription: 60,
};

/**
 * Handles incoming request messages from the 3D map.
 */
export function installRequestHandlers(): void {
    window.addEventListener('message', (e) => {
        const msg: unknown = e.data;
        const type = getMessageType(msg);
        if (!isRecord(msg) || !type) return;

        switch (type) {
            case 'IRIS_PORTAL_DETAILS_REQUEST':
                enqueueRequest('portalDetails', stringOrNull(msg.guid) ?? '', PORTAL_DETAILS_FRESHNESS_MS, () => handlePortalDetailsRequest(stringOrNull(msg.guid) ?? ''));
                break;
            case 'IRIS_GAME_SCORE_REQUEST':
                enqueueRequest('gameScore', 'global', GAME_SCORE_FRESHNESS_MS, () => handleGameScoreRequest());
                break;
            case 'IRIS_REGION_SCORE_REQUEST':
                {
                    const lat = numberOrNull(msg.lat);
                    const lng = numberOrNull(msg.lng);
                    const key = lat !== null && lng !== null
                        ? `${Math.round(lat * 1e6)}:${Math.round(lng * 1e6)}`
                        : 'global';
                    enqueueRequest(
                        'regionScore',
                        key,
                        REGION_SCORE_FRESHNESS_MS,
                        () => handleRegionScoreRequest(lat ?? undefined, lng ?? undefined),
                    );
                }
                break;
            case 'IRIS_SUBSCRIPTION_REQUEST':
                enqueueRequest('subscription', 'global', SUBSCRIPTION_FRESHNESS_MS, () => handleSubscriptionRequest());
                break;
            case 'IRIS_INVENTORY_REQUEST':
                enqueueRequest('inventory', 'global', INVENTORY_FRESHNESS_MS, () => handleInventoryRequest(), msg.force === true);
                break;
            case 'IRIS_PLEXTS_REQUEST':
                {
                    const tab = stringOrNull(msg.tab) ?? 'all';
                    const minTimestampMs = numberOrNull(msg.minTimestampMs) ?? -1;
                    const maxTimestampMs = numberOrNull(msg.maxTimestampMs) ?? undefined;
                    const ascendingTimestampOrder = typeof msg.ascendingTimestampOrder === 'boolean' ? msg.ascendingTimestampOrder : undefined;
                    const minLatE6 = numberOrNull(msg.minLatE6) ?? undefined;
                    const minLngE6 = numberOrNull(msg.minLngE6) ?? undefined;
                    const maxLatE6 = numberOrNull(msg.maxLatE6) ?? undefined;
                    const maxLngE6 = numberOrNull(msg.maxLngE6) ?? undefined;
                    enqueueRequest(
                        'plexts',
                        keyForPlexts(tab, minTimestampMs, minLatE6, minLngE6, maxLatE6, maxLngE6),
                        PLEXT_FRESHNESS_MS,
                        () => handlePlextsRequest(
                            tab,
                            minTimestampMs,
                            maxTimestampMs,
                            ascendingTimestampOrder,
                            minLatE6,
                            minLngE6,
                            maxLatE6,
                            maxLngE6,
                        ),
                        msg.force === true,
                    );
                }
                break;
            default:
                break;
        }
    });
}

/**
 * Enqueues a request and triggers processing.
 */
function enqueueRequest(endpoint: RequestEndpoint, key: string, freshnessMs: number, run: () => Promise<void>, force = false): void {
    const now = Date.now();
    const state = endpointState[endpoint];

    if (!key) {
        return;
    }

    if (state.inFlightKeys.has(key)) {
        state.lastSkipReason = 'in-flight';
        emitEndpointState(endpoint);
        return;
    }

    if (state.cooldownUntil !== null && now < state.cooldownUntil) {
        state.lastSkipReason = 'cooldown';
        state.nextRefreshAt = state.cooldownUntil;
        emitEndpointState(endpoint);
        return;
    }

    if (!force && state.lastSuccessKey === key && state.lastSuccessAt !== null && now - state.lastSuccessAt < freshnessMs) {
        state.lastSkipReason = 'fresh';
        state.nextRefreshAt = state.lastSuccessAt + freshnessMs;
        emitEndpointState(endpoint);
        return;
    }

    if (requestQueue.some((task) => task.endpoint === endpoint && task.key === key)) {
        state.lastSkipReason = 'queued';
        emitEndpointState(endpoint);
        return;
    }

    insertTask({
        endpoint,
        key,
        freshnessMs,
        force,
        priority: REQUEST_PRIORITIES[endpoint],
        enqueuedAt: now,
        run,
    });
    processQueue();
}

/**
 * Processes the next item in the queue if concurrency limits allow.
 */
function processQueue(): void {
    while (activeRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
        const nextRequest = requestQueue.shift();
        if (!nextRequest) return;

        const { endpoint, key, freshnessMs, force, run } = nextRequest;
        const state = endpointState[endpoint];
        const now = Date.now();

        if (state.inFlightKeys.has(key)) {
            state.lastSkipReason = 'in-flight';
            emitEndpointState(endpoint);
            continue;
        }

        if (state.cooldownUntil !== null && now < state.cooldownUntil) {
            state.lastSkipReason = 'cooldown';
            state.nextRefreshAt = state.cooldownUntil;
            emitEndpointState(endpoint);
            continue;
        }

        if (!force && state.lastSuccessKey === key && state.lastSuccessAt !== null && now - state.lastSuccessAt < freshnessMs) {
            state.lastSkipReason = 'fresh';
            state.nextRefreshAt = state.lastSuccessAt + freshnessMs;
            emitEndpointState(endpoint);
            continue;
        }

        activeRequests++;
        state.status = 'in_flight';
        state.inFlightKey = key;
        state.inFlightKeys.add(key);
        state.inFlightCount = state.inFlightKeys.size;
        state.lastAttemptKey = key;
        state.lastAttemptAt = now;
        state.lastSkipReason = null;
        emitEndpointState(endpoint);

        void (async (): Promise<void> => {
            try {
                await run();
                if (state.status !== 'error') {
                    state.status = 'idle';
                }
            } catch (e) {
                markEndpointFailure(endpoint, e instanceof Error ? e.message : 'request failed');
            } finally {
                activeRequests--;
                state.inFlightKeys.delete(key);
                state.inFlightCount = state.inFlightKeys.size;
                if (state.inFlightCount === 0) {
                    state.inFlightKey = null;
                } else if (state.inFlightKey === key) {
                    state.inFlightKey = Array.from(state.inFlightKeys)[0] ?? null;
                }
                emitEndpointState(endpoint);
                processQueue(); // Check for more work
            }
        })();
    }
}

function markEndpointSuccess(endpoint: RequestEndpoint, key: string): void {
    const state = endpointState[endpoint];
    const now = Date.now();
    state.status = 'idle';
    state.lastSuccessKey = key;
    state.lastSuccessAt = now;
    state.lastSkipReason = null;
    state.nextRefreshAt = now + getFreshnessMs(endpoint);
    state.failureCount = 0;
    state.cooldownUntil = null;
    emitEndpointState(endpoint);
}

function markEndpointFailure(endpoint: RequestEndpoint, reason: string): void {
    const state = endpointState[endpoint];
    const now = Date.now();
    state.failureCount += 1;
    state.status = 'error';
    state.lastSkipReason = reason;
    const cooldown = getFailureCooldownMs(state.failureCount, reason);
    state.cooldownUntil = now + cooldown;
    state.nextRefreshAt = state.cooldownUntil;
    emitEndpointState(endpoint);
}

function emitEndpointState(endpoint: RequestEndpoint): void {
    const state = endpointState[endpoint];
    window.postMessage({
        type: 'IRIS_ENDPOINT_STATE',
        endpoint,
        status: state.status,
        inFlightKey: state.inFlightKey,
        inFlightCount: state.inFlightCount,
        lastSuccessKey: state.lastSuccessKey,
        lastSuccessAt: state.lastSuccessAt,
        lastAttemptKey: state.lastAttemptKey,
        lastAttemptAt: state.lastAttemptAt,
        lastSkipReason: state.lastSkipReason,
        nextRefreshAt: state.nextRefreshAt,
        failureCount: state.failureCount,
        cooldownUntil: state.cooldownUntil,
    }, '*');
}

function insertTask(task: RequestTask): void {
    const insertAt = requestQueue.findIndex((current) => {
        if (current.priority !== task.priority) {
            return current.priority < task.priority;
        }
        return current.enqueuedAt > task.enqueuedAt;
    });

    if (insertAt === -1) {
        requestQueue.push(task);
        return;
    }

    requestQueue.splice(insertAt, 0, task);
}

async function handlePortalDetailsRequest(guid: string): Promise<void> {
    const body = JSON.stringify({ guid, v: extractVersion() });
    return sendIntelRequest('portalDetails', keyForPortalDetails(guid), '/r/getPortalDetails', body, 'Detail Fetch Failed');
}

async function handleGameScoreRequest(): Promise<void> {
    const body = JSON.stringify({ v: extractVersion() });
    return sendIntelRequest('gameScore', 'global', '/r/getGameScore', body, 'Game Score Fetch Failed');
}

async function handleRegionScoreRequest(lat?: number, lng?: number): Promise<void> {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return;
    }

    const body = JSON.stringify({
        latE6: Math.round(lat * 1e6),
        lngE6: Math.round(lng * 1e6),
        v: extractVersion(),
    });
    return sendIntelRequest('regionScore', 'global', '/r/getRegionScoreDetails', body, 'Region Score Fetch Failed');
}

async function handleSubscriptionRequest(): Promise<void> {
    const body = JSON.stringify({ v: extractVersion() });
    return sendIntelRequest('subscription', 'global', '/r/getHasActiveSubscription', body, 'Subscription Fetch Failed');
}

async function handleInventoryRequest(): Promise<void> {
    const body = JSON.stringify({ lastQueryTimestamp: -1, v: extractVersion() });
    return sendIntelRequest('inventory', 'global', '/r/getInventory', body, 'Inventory Fetch Failed');
}

async function handlePlextsRequest(
    tab: string,
    minTimestampMs: number,
    maxTimestampMs?: number,
    ascendingTimestampOrder?: boolean,
    minLatE6?: number,
    minLngE6?: number,
    maxLatE6?: number,
    maxLngE6?: number,
): Promise<void> {
    const body = JSON.stringify({
        tab,
        minTimestampMs,
        maxTimestampMs,
        ascendingTimestampOrder,
        minLatE6,
        minLngE6,
        maxLatE6,
        maxLngE6,
        v: extractVersion(),
    });
    return sendIntelRequest(
        'plexts',
        keyForPlexts(tab, minTimestampMs, minLatE6, minLngE6, maxLatE6, maxLngE6),
        '/r/getPlexts',
        body,
        'Plext Fetch Failed',
    );
}

async function sendIntelRequest(endpoint: RequestEndpoint, key: string, url: string, body: string, errorMsg: string): Promise<void> {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-CSRFToken': getCsrfToken() 
            },
            body: body
        });

        const text = await res.text();
        if (looksLikeLoginHtml(text)) {
            markEndpointFailure(endpoint, 'login html');
            return;
        }

        if (!res.ok) {
            markEndpointFailure(endpoint, `HTTP ${res.status}`);
            return;
        }

        let data: unknown;
        try {
            data = JSON.parse(text);
        } catch {
            markEndpointFailure(endpoint, 'invalid json');
            return;
        }

        markEndpointSuccess(endpoint, key);
        window.postMessage({ type: 'IRIS_DATA', url, data: data, params: body }, '*');
    } catch (e) {
        markEndpointFailure(endpoint, e instanceof Error ? e.message : 'request failed');
        console.error(`Mini IRIS: ${errorMsg}`, e);
    }
}

function keyForPortalDetails(guid: string): string {
    return guid.trim();
}

function keyForPlexts(
    tab: string | undefined,
    minTimestampMs: number | undefined,
    minLatE6?: number,
    minLngE6?: number,
    maxLatE6?: number,
    maxLngE6?: number,
): string {
    return [
        tab ?? 'all',
        typeof minTimestampMs === 'number' ? minTimestampMs : -1,
        typeof minLatE6 === 'number' ? minLatE6 : -1,
        typeof minLngE6 === 'number' ? minLngE6 : -1,
        typeof maxLatE6 === 'number' ? maxLatE6 : -1,
        typeof maxLngE6 === 'number' ? maxLngE6 : -1,
    ].join(':');
}

function getFreshnessMs(endpoint: RequestEndpoint): number {
    switch (endpoint) {
        case 'portalDetails':
            return PORTAL_DETAILS_FRESHNESS_MS;
        case 'gameScore':
            return GAME_SCORE_FRESHNESS_MS;
        case 'regionScore':
            return REGION_SCORE_FRESHNESS_MS;
        case 'subscription':
            return SUBSCRIPTION_FRESHNESS_MS;
        case 'inventory':
            return INVENTORY_FRESHNESS_MS;
        case 'plexts':
            return PLEXT_FRESHNESS_MS;
    }
}

function getFailureCooldownMs(failureCount: number, reason: string): number {
    if (reason.includes('login html') || reason.includes('HTTP 401') || reason.includes('HTTP 403')) {
        return LOGIN_FAILURE_BACKOFF_MS;
    }

    const backoff = DEFAULT_FAILURE_BACKOFF_MS * (2 ** Math.max(failureCount - 1, 0));
    return Math.min(backoff, MAX_FAILURE_BACKOFF_MS);
}

function looksLikeLoginHtml(text: string): boolean {
    const trimmed = text.trimStart().toLowerCase();
    if (!(trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.startsWith('<head') || trimmed.startsWith('<body'))) {
        return false;
    }

    return trimmed.includes('signin') || trimmed.includes('login') || trimmed.includes('intel.ingress.com');
}
