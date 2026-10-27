import type {IitcIrisMapLifetime} from '../map/map-runtime-lifetime';

interface IntelRequestOptions {
  getLifetime: () => IitcIrisMapLifetime | undefined;
  beginRequest: (endpoint: string, group?: string) => () => void;
}

export interface IntelRequest {
  fetchIitcEndpointText: (endpoint: string, init: RequestInit, group?: string) => Promise<{response: Response; text: string}>;
}

export function getCsrfToken(): string {
  const cookies = document.cookie.split(';').map((cookie) => cookie.trim());
  const csrfCookie = cookies.find((cookie) => cookie.startsWith('csrftoken='));
  if (!csrfCookie) return '';
  return csrfCookie.slice(csrfCookie.indexOf('=') + 1);
}

export function extractVersion(): string {
  const scripts = document.querySelectorAll('script[src*="gen_dashboard_"]');
  for (const script of Array.from(scripts)) {
    const src = (script as HTMLScriptElement).src;
    const match = src.match(/gen_dashboard_([a-f0-9]+)\.js/);
    if (match) return match[1];
  }

  const params = (window as Window & {niantic_params?: {CURRENT_VERSION?: unknown; frontendVersion?: unknown}}).niantic_params;
  if (typeof params?.CURRENT_VERSION === 'string') return params.CURRENT_VERSION;
  if (typeof params?.frontendVersion === 'string') return params.frontendVersion;
  return '';
}

export function looksLikeHtml(text: string): boolean {
  return /^\s*(?:<!doctype\s+html|<html|<head|<body)\b/i.test(text);
}

export function isIitcAuthMessage(message: string): boolean {
  return /login html|missing csrftoken|missing Intel version|waiting for Intel version/i.test(message);
}

export function isIitcAuthError(error: unknown): boolean {
  return error instanceof Error && isIitcAuthMessage(error.message);
}

export function createIitcAuthError(endpoint: string, response: Response): Error {
  return new Error(`${endpoint} returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
}

export function createMissingIntelVersionError(endpoint: string): Error {
  return new Error(`${endpoint} missing Intel version`);
}

/** Keep authenticated requests and their diagnostics within the current map lifetime. */
export function createIntelRequest({getLifetime, beginRequest}: IntelRequestOptions): IntelRequest {
  async function fetchIitcEndpointText(
    endpoint: string,
    init: RequestInit,
    group?: string,
  ): Promise<{response: Response; text: string}> {
    const lifetime = getLifetime();
    if (!lifetime) throw new DOMException('Map is unavailable', 'AbortError');
    const finish = beginRequest(endpoint, group);
    try {
      return await lifetime.fetchText(`/r/${endpoint}`, init);
    } finally {
      finish();
    }
  }

  return {fetchIitcEndpointText};
}
