export * from './store';
export * from './PluginManager';
export * from './logic/EntityLogic';
export * from './parsers/EntityParser';
export * from './parsers/PortalDetailsParser';
export * from './parsers/ArtifactParser';
export * from './parsers/GameScoreParser';
export * from './parsers/InventoryParser';
export * from './parsers/MissionParser';
export * from './parsers/PlextParser';
export * from './parsers/RegionScoreParser';
export * from './parsers/PasscodeParser';
export * from './parsers/PlayerParser';
export * from './parsers/intel-types';

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
