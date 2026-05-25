export interface NormalizeTeamOptions {
  fallback?: string;
}

/**
 * Normalizes various Intel API team strings into standard IRIS keys:
 * E: Enlightened
 * R: Resistance
 * M: Machina
 * N: Neutral/uncaptured
 */
export function normalizeTeam(team: string | undefined, options: NormalizeTeamOptions = {}): string {
  const fallback = options.fallback ?? 'N';
  if (!team) return fallback;

  const normalized = team.toUpperCase();
  if (normalized === 'ENLIGHTENED' || normalized === 'E') return 'E';
  if (normalized === 'RESISTANCE' || normalized === 'R') return 'R';
  if (normalized === 'MACHINA' || normalized === 'M' || normalized === 'ALIENS' || normalized === '__MACHINA__') return 'M';
  if (normalized === 'NEUTRAL' || normalized === 'N') return 'N';

  return fallback;
}
