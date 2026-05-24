export interface SelectKeyedRefreshBatchOptions {
  pendingKeys: ReadonlySet<string>;
  lastRefreshTimes: ReadonlyMap<string, number>;
  now?: number;
  cooldownMs: number;
  maxBatchSize: number;
}

export interface KeyedRefreshBatch {
  keys: string[];
  knownCount: number;
  pendingCount: number;
  cooldownCount: number;
}

export function selectKeyedRefreshBatch(
  candidateKeys: string[],
  options: SelectKeyedRefreshBatchOptions,
): KeyedRefreshBatch {
  const now = options.now ?? Date.now();
  const maxBatchSize = Math.max(0, options.maxBatchSize);
  const seen = new Set<string>();
  const keys: string[] = [];
  let knownCount = 0;
  let pendingCount = 0;
  let cooldownCount = 0;

  for (const key of candidateKeys) {
    if (keys.length >= maxBatchSize) break;
    if (!key || seen.has(key)) continue;

    seen.add(key);
    knownCount += 1;

    if (options.pendingKeys.has(key)) {
      pendingCount += 1;
      continue;
    }

    const lastRefreshAt = options.lastRefreshTimes.get(key) ?? 0;
    if (now - lastRefreshAt < options.cooldownMs) {
      cooldownCount += 1;
      continue;
    }

    keys.push(key);
  }

  return {
    keys,
    knownCount,
    pendingCount,
    cooldownCount,
  };
}
