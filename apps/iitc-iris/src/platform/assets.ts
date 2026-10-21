/** Resolve bundled assets through the extension or an explicit host-provided asset base. */
export function getExtensionUrl(path: string): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) return chrome.runtime.getURL(path);
  const base = typeof document === 'undefined' ? undefined
    : document.querySelector<HTMLMetaElement>('meta[name="iitc-iris-asset-base"]')?.content;
  if (base) {
    try { return new URL(path, base).href; } catch { /* Keep the browser fallback for invalid host configuration. */ }
  }
  return path;
}
