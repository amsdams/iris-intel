export * from './store';
export * from './PluginManager';

export const normalizeTeam = (team: string | undefined): string => {
    if (!team) return 'N';
    const t = team.toUpperCase();
    if (t === 'ALIENS' || t === 'ENLIGHTENED' || t === 'E') return 'E';
    if (t === 'RESISTANCE' || t === 'R') return 'R';
    if (t === 'MAC' || t === 'NEUTRAL' || t === 'MACHINA' || t === 'M') return 'M';
    return 'N';
};
