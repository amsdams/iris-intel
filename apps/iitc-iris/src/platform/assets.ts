/** Resolve bundled assets in the extension, or relative to a browser-hosted app. */
export function getExtensionUrl(path: string): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(path) : path;
}
