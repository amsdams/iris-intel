function getLocalStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

/** Keep all reads/parsing for one preference inside the same failure boundary. */
export function readLocalStorage<T>(read: (storage: Storage | null) => T, fallback: () => T): T {
  try {
    return read(getLocalStorage());
  } catch {
    return fallback();
  }
}

/** Optional persistence includes serialization and removal failures, not only setItem. */
export function writeLocalStorage(write: (storage: Storage | null) => void): void {
  try {
    write(getLocalStorage());
  } catch {
    // Preference persistence is optional; the page keeps its current state.
  }
}
