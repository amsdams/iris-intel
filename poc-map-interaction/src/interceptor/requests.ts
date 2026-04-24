import { getCsrfToken, extractVersion } from './utils';

/**
 * Handles incoming request messages from the 3D map.
 */
export function installRequestHandlers(): void {
    window.addEventListener('message', (e) => {
        const msg = e.data;
        if (!msg) return;

        switch (msg.type) {
            case 'IRIS_PORTAL_DETAILS_REQUEST':
                handlePortalDetailsRequest(msg.guid);
                break;
            case 'IRIS_GAME_SCORE_REQUEST':
                handleGameScoreRequest();
                break;
            case 'IRIS_REGION_SCORE_REQUEST':
                handleRegionScoreRequest();
                break;
            case 'IRIS_SUBSCRIPTION_REQUEST':
                handleSubscriptionRequest();
                break;
            case 'IRIS_INVENTORY_REQUEST':
                handleInventoryRequest();
                break;
            case 'IRIS_PLEXTS_REQUEST':
                handlePlextsRequest(msg.tab, msg.minTimestampMs);
                break;
        }
    });
}

function handlePortalDetailsRequest(guid: string) {
    const body = JSON.stringify({ guid, v: extractVersion() });
    sendIntelRequest('/r/getPortalDetails', body, 'Detail Fetch Failed');
}

function handleGameScoreRequest() {
    const body = JSON.stringify({ v: extractVersion() });
    sendIntelRequest('/r/getGameScore', body, 'Game Score Fetch Failed');
}

function handleRegionScoreRequest() {
    const body = JSON.stringify({ v: extractVersion() });
    sendIntelRequest('/r/getRegionScoreDetails', body, 'Region Score Fetch Failed');
}

function handleSubscriptionRequest() {
    const body = JSON.stringify({ v: extractVersion() });
    sendIntelRequest('/r/getHasActiveSubscription', body, 'Subscription Fetch Failed');
}

function handleInventoryRequest() {
    const body = JSON.stringify({ lastQueryTimestamp: -1, v: extractVersion() });
    sendIntelRequest('/r/getInventory', body, 'Inventory Fetch Failed');
}

function handlePlextsRequest(tab: string, minTimestampMs: number) {
    const body = JSON.stringify({ 
        tab, 
        minTimestampMs, 
        maxTimestampMs: -1,
        ascendingTimestampMs: true,
        v: extractVersion() 
    });
    sendIntelRequest('/r/getPlexts', body, 'Plext Fetch Failed');
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
