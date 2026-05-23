const INTEL_URL = 'https://intel.ingress.com/';
const INTEL_URL_PATTERN = 'https://intel.ingress.com/*';

let lastIntelTabId: number | null = null;
const initializedTabIds = new Set<number>();

function isIntelUrl(url?: string | null): boolean {
    return typeof url === 'string' && url.startsWith(INTEL_URL);
}

async function getExistingIntelTab(): Promise<chrome.tabs.Tab | null> {
    const tabs = await chrome.tabs.query({ url: [INTEL_URL_PATTERN] });

    if (lastIntelTabId !== null) {
        const rememberedTab = tabs.find((tab) => tab.id === lastIntelTabId);
        if (rememberedTab) {
            return rememberedTab;
        }
    }

    return tabs[0] ?? null;
}

async function focusOrOpenIntelTab(): Promise<void> {
    const existingTab = await getExistingIntelTab();

    if (existingTab?.id !== undefined) {
        lastIntelTabId = existingTab.id;
        await chrome.tabs.update(existingTab.id, { active: true });
        if (existingTab.windowId !== undefined) {
            await chrome.windows.update(existingTab.windowId, { focused: true });
        }
        return;
    }

    const createdTab = await chrome.tabs.create({
        url: INTEL_URL,
        active: true,
    });
    lastIntelTabId = createdTab.id ?? null;
}

chrome.action.onClicked.addListener(() => {
    void focusOrOpenIntelTab();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!isIntelUrl(tab.url)) {
        if (lastIntelTabId === tabId) {
            lastIntelTabId = null;
        }
        initializedTabIds.delete(tabId);
        return;
    }

    if (changeInfo.status !== 'complete') {
        initializedTabIds.delete(tabId);
        return;
    }

    if (initializedTabIds.has(tabId)) {
        return;
    }

    initializedTabIds.add(tabId);
    lastIntelTabId = tabId;
    console.log('IRIS: Background tracked Intel tab', tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
    initializedTabIds.delete(tabId);
    if (lastIntelTabId === tabId) {
        lastIntelTabId = null;
    }
});

console.log('IRIS: Background script loaded');

export {};
