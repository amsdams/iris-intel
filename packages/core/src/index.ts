export * from './store';
export * from './PluginManager';

/**
 * Normalizes various team strings from Intel API into standard IRIS keys:
 * E: Enlightened
 * R: Resistance
 * M: Neutral, M(Machina)
 * N: Uncaptured, N
 */
export const normalizeTeam = (team: string | undefined): string => {
    let result = 'N';
    if (team) {
        const t = team.toUpperCase();
        if (t === 'ENLIGHTENED' || t === 'E') result = 'E';
        else if (t === 'RESISTANCE' || t === 'R') result = 'R';
        else if (t === 'NEUTRAL' || t === 'M') result = 'M';
    }
    return result;
};
