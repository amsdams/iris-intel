export * from './store';
export * from './PluginManager';

/**
 * Normalizes various team strings from Intel API into standard IRIS keys:
 * E: Enlightened
 * R: Resistance
 * M: Machina
 * N: Neutral
 */
export const normalizeTeam = (source: string, team: string | undefined): string => {
    let result = 'N';
    if (team) {
        const t = team.toUpperCase();
        if (t === 'ENLIGHTENED' || t === 'E') result = 'E';
        else if (t === 'RESISTANCE' || t === 'R') result = 'R';
        else if (t === 'NEUTRAL' || t === 'M') result = 'M';
    }

    console.log(`[IRIS:${source}] normalizing team: "${team}" -> "${result}"`);
    return result;
};
