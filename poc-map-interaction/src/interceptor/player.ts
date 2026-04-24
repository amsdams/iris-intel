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
    const win = window as any;
    let lastStatsKey = '';

    function readPlayerStats() {
        const p: IntelPlayer | undefined = win.PLAYER;
        if (!p || !p.nickname) return null;
        return {
            type: 'IRIS_PLAYER_STATS',
            nickname: p.nickname,
            level: parseInt(String(p.verified_level || p.level), 10),
            ap: parseInt(String(p.ap), 10),
            team: p.team === 'RESISTANCE' ? 'R' : (p.team === 'ENLIGHTENED' ? 'E' : 'N'),
            energy: parseInt(String(p.energy), 10),
            xm_capacity: parseInt(String(p.xm_capacity), 10),
            available_invites: parseInt(String(p.available_invites), 10),
            min_ap_for_current_level: parseInt(String(p.min_ap_for_current_level), 10),
            min_ap_for_next_level: parseInt(String(p.min_ap_for_next_level), 10),
            hasActiveSubscription: p.hasActiveSubscription ?? false
        };
    }

    function postPlayerStats() {
        const stats = readPlayerStats();
        if (!stats) return;
        const key = JSON.stringify(stats);
        if (key === lastStatsKey) return;
        lastStatsKey = key;
        window.postMessage(stats, '*');
    }

    // Initial check
    setTimeout(postPlayerStats, 1000);

    // Watch for DOM changes which often correlate with Intel profile updates
    const observer = new MutationObserver(() => postPlayerStats());
    observer.observe(document.body || document.documentElement, { 
        childList: true, 
        subtree: true 
    });
}
