import { getCsrfToken, extractVersion } from './utils';

/**
 * Request Queue Configuration
 */
const MAX_CONCURRENT_REQUESTS = 2;
const requestQueue: (() => Promise<void>)[] = [];
let activeRequests = 0;

/**
 * Handles incoming request messages from the 3D map.
 */
export function installRequestHandlers(): void {
    window.addEventListener('message', (e) => {
        const msg = e.data;
        if (!msg) return;

        switch (msg.type) {
            case 'IRIS_PORTAL_DETAILS_REQUEST':
                enqueueRequest(() => handlePortalDetailsRequest(msg.guid));
                break;
            case 'IRIS_GAME_SCORE_REQUEST':
                enqueueRequest(() => handleGameScoreRequest());
                break;
            case 'IRIS_REGION_SCORE_REQUEST':
                enqueueRequest(() => handleRegionScoreRequest());
                break;
            case 'IRIS_SUBSCRIPTION_REQUEST':
                enqueueRequest(() => handleSubscriptionRequest());
                break;
            case 'IRIS_INVENTORY_REQUEST':
                enqueueRequest(() => handleInventoryRequest());
                break;
            case 'IRIS_PLEXTS_REQUEST':
                enqueueRequest(() => handlePlextsRequest(msg.tab, msg.minTimestampMs));
                break;
        }
    });
}

/**
 * Enqueues a request and triggers processing.
 */
function enqueueRequest(fn: () => Promise<void>) {
    requestQueue.push(fn);
    processQueue();
}

/**
 * Processes the next item in the queue if concurrency limits allow.
 */
async function processQueue() {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS || requestQueue.length === 0) {
        return;
    }

    const nextRequest = requestQueue.shift();
    if (!nextRequest) return;

    activeRequests++;
    try {
        await nextRequest();
    } finally {
        activeRequests--;
        processQueue(); // Check for more work
    }
}

async function handlePortalDetailsRequest(guid: string) {
    const body = JSON.stringify({ guid, v: extractVersion() });
    return sendIntelRequest('/r/getPortalDetails', body, 'Detail Fetch Failed');
}

async function handleGameScoreRequest() {
    const body = JSON.stringify({ v: extractVersion() });
    return sendIntelRequest('/r/getGameScore', body, 'Game Score Fetch Failed');
}

async function handleRegionScoreRequest() {
    const body = JSON.stringify({ v: extractVersion() });
    return sendIntelRequest('/r/getRegionScoreDetails', body, 'Region Score Fetch Failed');
}

async function handleSubscriptionRequest() {
    const body = JSON.stringify({ v: extractVersion() });
    return sendIntelRequest('/r/getHasActiveSubscription', body, 'Subscription Fetch Failed');
}

async function handleInventoryRequest() {
    const body = JSON.stringify({ lastQueryTimestamp: -1, v: extractVersion() });
    return sendIntelRequest('/r/getInventory', body, 'Inventory Fetch Failed');
}

async function handlePlextsRequest(tab: string, minTimestampMs: number) {
    const body = JSON.stringify({ 
        tab, 
        minTimestampMs, 
        maxTimestampMs: -1,
        ascendingTimestampMs: true,
        v: extractVersion() 
    });
    return sendIntelRequest('/r/getPlexts', body, 'Plext Fetch Failed');
}

async function sendIntelRequest(url: string, body: string, errorMsg: string) {
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'X-CSRFToken': getCsrfToken() 
            },
            body: body
        });
        
        if (!res.ok) return;
        const data = await res.json();
        window.postMessage({ type: 'IRIS_DATA', url, data: data, params: body }, '*');
    } catch (e) {
        console.error(`IRIS POC: ${errorMsg}`, e);
    }
}
