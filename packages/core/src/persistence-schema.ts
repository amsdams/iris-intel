export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readNestedRecord(root: unknown, keys: readonly string[]): Record<string, unknown> | null {
  let current: unknown = root;
  for (const key of keys) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return isRecord(current) ? current : null;
}

export function parseStringChoice<T extends string>(
  value: unknown,
  choices: Record<T, unknown> | ReadonlySet<T> | readonly T[],
  fallback: T,
): T {
  if (typeof value !== 'string') return fallback;
  if (Array.isArray(choices)) return choices.includes(value as T) ? value as T : fallback;
  if (choices instanceof Set) return choices.has(value as T) ? value as T : fallback;
  return Object.prototype.hasOwnProperty.call(choices, value) ? value as T : fallback;
}
