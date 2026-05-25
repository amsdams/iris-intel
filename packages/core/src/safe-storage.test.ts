import {describe, expect, it} from 'vitest';
import {
  readStorageBoolean,
  readStorageJson,
  readStorageString,
  writeStorageBoolean,
  writeStorageJson,
  writeStorageString,
  type KeyValueStorage,
} from './safe-storage';

class MemoryStorage implements KeyValueStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const throwingStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('safe storage helpers', () => {
  it('reads and writes strings without leaking storage errors', () => {
    const storage = new MemoryStorage();

    expect(writeStorageString('key', 'value', storage)).toBe(true);
    expect(readStorageString('key', storage)).toBe('value');
    expect(readStorageString('key', throwingStorage)).toBe(null);
    expect(writeStorageString('key', 'value', throwingStorage)).toBe(false);
  });

  it('reads and writes JSON with invalid JSON fallback', () => {
    const storage = new MemoryStorage();

    expect(writeStorageJson('state', {lat: 52}, storage)).toBe(true);
    expect(readStorageJson<{lat: number}>('state', storage)).toEqual({lat: 52});

    storage.setItem('broken', '{');
    expect(readStorageJson('broken', storage)).toBe(null);
  });

  it('reads and writes boolean preferences', () => {
    const storage = new MemoryStorage();

    expect(readStorageBoolean('flag', true, storage)).toBe(true);
    expect(writeStorageBoolean('flag', false, storage)).toBe(true);
    expect(readStorageBoolean('flag', true, storage)).toBe(false);
  });
});
