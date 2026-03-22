export const TEAM_COLOUR: Record<string, string> = {
    E: '#00ff00',
    R: '#0000ff',
    M: '#ff0000',
    N: '#ffffff',
};

export const TEAM_NAME: Record<string, string> = {
    E: 'Enlightened',
    R: 'Resistance',
    M: 'Machina',
    N: 'Neutral',
};

export const UI_COLORS = {
    AQUA: '#00ffff',
    GLOW: '#00ffff55',
    BG_BASE: 'rgba(0, 0, 0, 0.92)',
    TEXT_BASE: '#ffffff',
    TEXT_MUTED: '#aaaaaa',
    BORDER_DIM: '#333333',
};

export const normalizeTeam = (team: string | undefined): string => {
    if (!team) return 'N';
    const t = team.toUpperCase();
    if (t === 'ALIENS' || t === 'ENLIGHTENED' || t === 'E') return 'E';
    if (t === 'RESISTANCE' || t === 'R') return 'R';
    if (t === 'MAC' || t === 'MACHINA' || t === 'M') return 'M';
    return 'N';
};
