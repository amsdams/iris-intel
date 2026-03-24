export * from './store';
export * from './PluginManager';

export const normalizeTeam = (team: string | undefined): string => {
    if (!team) return 'N';
    const t = team.toUpperCase();
    let result = 'N';
    if (t === 'ALIENS' || t === 'ENLIGHTENED' || t === 'E') result = 'E';
    else if (t === 'RESISTANCE' || t === 'R') result = 'R';
    else if (t.startsWith('MAC') || t === 'M') result = 'M';
    else if (t === 'NEUTRAL' || t === 'N') result = 'M';
    
    return result;
};
