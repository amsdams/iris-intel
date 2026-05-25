export interface PlayerLevelProgressInput {
  ap: number | null | undefined;
  minApForCurrentLevel: number | null | undefined;
  minApForNextLevel: number | null | undefined;
}

export interface PlayerLevelProgress {
  hasNextLevel: boolean;
  percent: number;
}

export function formatActionPoints(value: number | null | undefined): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value as number)) : 0;
  return safeValue.toLocaleString('en-US');
}

export function getPlayerLevelProgress(input: PlayerLevelProgressInput): PlayerLevelProgress {
  const ap = Number.isFinite(input.ap) ? input.ap as number : 0;
  const current = Number.isFinite(input.minApForCurrentLevel) ? input.minApForCurrentLevel as number : 0;
  const next = Number.isFinite(input.minApForNextLevel) ? input.minApForNextLevel as number : 0;
  const span = next - current;

  if (next <= 0 || span <= 0) {
    return {
      hasNextLevel: false,
      percent: 100,
    };
  }

  return {
    hasNextLevel: true,
    percent: Math.min(100, Math.max(0, ((ap - current) / span) * 100)),
  };
}
