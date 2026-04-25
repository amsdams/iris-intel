/**
 * Shared utilities for the Intel interceptor.
 */

export function getCsrfToken(): string {
    const cookies = document.cookie.split(';').map(c => c.trim());
    const csrf = cookies.find(c => c.startsWith('csrftoken='));
    return csrf ? csrf.split('=')[1] : '';
}

export function extractVersion(): string {
    const win = window as any;
    const scripts = document.querySelectorAll('script[src*="gen_dashboard_"]');
    for (const s of Array.from(scripts)) {
        const src = (s as HTMLScriptElement).src;
        const match = src.match(/gen_dashboard_([a-f0-9]+)\.js/);
        if (match) return match[1];
    }
    return win.niantic_params?.frontendVersion || '';
}

export const isIrisUrl = (url: string): boolean => 
    url.includes('getEntities') || 
    url.includes('getPortalDetails') || 
    url.includes('getPlexts') || 
    url.includes('getGameScore') || 
    url.includes('getRegionScoreDetails') || 
    url.includes('getHasActiveSubscription') || 
    url.includes('getInventory');
