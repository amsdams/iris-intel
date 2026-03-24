export * from './store';
export * from './PluginManager';

/**
 * Normalizes various team strings from Intel API into standard IRIS keys:
 * E: Enlightened
 * R: Resistance
 * M: Machina
 * N: Neutral
 */
export const normalizeTeam = (team: string | undefined): string => {
    if (!team) return 'N';
    const t = team.toUpperCase();
    
    if (t === 'ALIENS' || t === 'ENLIGHTENED' || t === 'E') return 'E';
    if (t === 'RESISTANCE' || t === 'R') return 'R';
    if (t.startsWith('MAC') || t === 'M') return 'M';
    if (t === 'NEUTRAL' || t === 'N') return 'N';
    
    return 'N';
};
