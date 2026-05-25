export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getDefaultStorage(): KeyValueStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readStorageString(key: string, storage: KeyValueStorage | null = getDefaultStorage()): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorageString(
  key: string,
  value: string,
  storage: KeyValueStorage | null = getDefaultStorage(),
): boolean {
  try {
    storage?.setItem(key, value);
    return !!storage;
  } catch {
    return false;
  }
}

export function readStorageJson<T>(key: string, storage: KeyValueStorage | null = getDefaultStorage()): T | null {
  const raw = readStorageString(key, storage);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeStorageJson(
  key: string,
  value: unknown,
  storage: KeyValueStorage | null = getDefaultStorage(),
): boolean {
  try {
    return writeStorageString(key, JSON.stringify(value), storage);
  } catch {
    return false;
  }
}

export function readStorageBoolean(
  key: string,
  defaultValue = false,
  storage: KeyValueStorage | null = getDefaultStorage(),
): boolean {
  const raw = readStorageString(key, storage);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return defaultValue;
}

export function writeStorageBoolean(
  key: string,
  value: boolean,
  storage: KeyValueStorage | null = getDefaultStorage(),
): boolean {
  return writeStorageString(key, value ? 'true' : 'false', storage);
}
