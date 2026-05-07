/**
 * Reads and monitors the global PLAYER object for updates.
 */

export interface IntelPlayer {
    nickname: string;
    level: number;
    verified_level?: number;
    ap: number;
    team: string;
    energy: number;
    xm_capacity: number;
    available_invites: number;
    min_ap_for_current_level: number;
    min_ap_for_next_level: number;
    hasActiveSubscription: boolean;
}

export function installPlayerObserver(): void {
    const win = window as Window & { PLAYER?: IntelPlayer };
    let lastStatsKey = '';

    function numberOrZero(value: unknown): number {
        const parsed = parseInt(String(value), 10);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function normalizePlayerTeam(value: unknown): string {
        if (value === 'RESISTANCE' || value === 'R') return 'R';
        if (value === 'ENLIGHTENED' || value === 'E') return 'E';
        return 'N';
    }

    function readPlayerStats(): (IntelPlayerStatsMessage & { type: 'IRIS_PLAYER_STATS' }) | null {
        const p: IntelPlayer | undefined = win.PLAYER;
        if (!p || !p.nickname) return null;
        return {
            type: 'IRIS_PLAYER_STATS',
            nickname: p.nickname,
            level: numberOrZero(p.verified_level || p.level),
            ap: numberOrZero(p.ap),
            team: normalizePlayerTeam(p.team),
            energy: numberOrZero(p.energy),
            xm_capacity: numberOrZero(p.xm_capacity),
            available_invites: numberOrZero(p.available_invites),
            min_ap_for_current_level: numberOrZero(p.min_ap_for_current_level),
            min_ap_for_next_level: numberOrZero(p.min_ap_for_next_level),
            hasActiveSubscription: p.hasActiveSubscription ?? false
        };
    }

    function postPlayerStats(force = false): void {
        const stats = readPlayerStats();
        if (!stats) return;
        const key = JSON.stringify(stats);
        if (!force && key === lastStatsKey) return;
        lastStatsKey = key;
        window.postMessage(stats, '*');
    }

    window.addEventListener('message', (event: MessageEvent) => {
        const data: unknown = event.data;
        if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'IRIS_PLAYER_STATS_REQUEST') {
            postPlayerStats(true);
        }
    });

    // Initial checks cover Intel's async PLAYER bootstrap at document_start.
    postPlayerStats();
    setTimeout(() => postPlayerStats(), 1000);
    setTimeout(() => postPlayerStats(), 3000);
    window.setInterval(() => postPlayerStats(), 10000);

    // Watch for DOM changes which often correlate with Intel profile updates
    const observer = new MutationObserver(() => postPlayerStats());
    observer.observe(document.body || document.documentElement, { 
        childList: true, 
        subtree: true 
    });
}

interface IntelPlayerStatsMessage {
    nickname: string;
    level: number;
    ap: number;
    team: string;
    energy: number;
    xm_capacity: number;
    available_invites: number;
    min_ap_for_current_level: number;
    min_ap_for_next_level: number;
    hasActiveSubscription: boolean;
}
