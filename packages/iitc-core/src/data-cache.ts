export type IitcDataCacheFreshness = true | false | undefined;

export interface IitcDataCacheOptions {
  freshAgeSeconds?: number;
  maxAgeSeconds?: number;
  maxItems?: number;
  maxChars?: number;
  now?: () => number;
}

interface IitcDataCacheEntry {
  time: number;
  expire: number;
  dataStr: string;
}

export class IitcDataCache<T> {
  readonly REQUEST_CACHE_FRESH_AGE: number;
  readonly REQUEST_CACHE_MAX_AGE: number;
  readonly REQUEST_CACHE_MAX_ITEMS: number;
  readonly REQUEST_CACHE_MAX_CHARS: number;

  private readonly now: () => number;
  private cache = new Map<string, IitcDataCacheEntry>();
  private cacheCharSize = 0;

  constructor(options: IitcDataCacheOptions = {}) {
    this.REQUEST_CACHE_FRESH_AGE = options.freshAgeSeconds ?? 3 * 60;
    this.REQUEST_CACHE_MAX_AGE = options.maxAgeSeconds ?? 5 * 60;
    this.REQUEST_CACHE_MAX_ITEMS = options.maxItems ?? 1000;
    this.REQUEST_CACHE_MAX_CHARS = options.maxChars ?? 20_000_000 / 2;
    this.now = options.now ?? Date.now;
  }

  store(qk: string, data: T): void {
    this.remove(qk);

    const time = this.now();
    const expire = time + this.REQUEST_CACHE_FRESH_AGE * 1000;
    const dataStr = JSON.stringify(data);

    this.cacheCharSize += dataStr.length;
    this.cache.set(qk, {time, expire, dataStr});
  }

  remove(qk: string): void {
    const entry = this.cache.get(qk);
    if (!entry) return;
    this.cacheCharSize -= entry.dataStr.length;
    this.cache.delete(qk);
  }

  get(qk: string): T | undefined {
    const entry = this.cache.get(qk);
    return entry ? JSON.parse(entry.dataStr) as T : undefined;
  }

  getTime(qk: string): number {
    return this.cache.get(qk)?.time ?? 0;
  }

  isFresh(qk: string): IitcDataCacheFreshness {
    const entry = this.cache.get(qk);
    if (!entry) return undefined;
    return entry.expire >= this.now();
  }

  runExpire(): void {
    const oldestAllowedTime = this.now() - this.REQUEST_CACHE_MAX_AGE * 1000;
    let cacheSize = this.cache.size;

    for (const [qk, entry] of this.cache.entries()) {
      if (
        cacheSize > this.REQUEST_CACHE_MAX_ITEMS ||
        this.cacheCharSize > this.REQUEST_CACHE_MAX_CHARS ||
        entry.time < oldestAllowedTime
      ) {
        this.cacheCharSize -= entry.dataStr.length;
        this.cache.delete(qk);
        cacheSize -= 1;
      }
    }
  }
}
