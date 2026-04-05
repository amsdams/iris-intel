export interface IntelMapInstance {
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  getCenter: () => { lat: () => number; lng: () => number };
  getZoom: () => number;
  addListener: (event: string, callback: () => void) => void;
}

export interface GoogleMapConstructor {
  _iris_patched?: boolean;
  prototype: unknown;
  new (...args: unknown[]): IntelMapInstance;
}

export interface IntelPlayer {
  nickname: string;
  level: number;
  verified_level?: number;
  ap: number;
  team: string;
  energy: number;
  xm_capacity: number;
  available_invites: number;
  min_ap_for_current_level: number;
  min_ap_for_next_level: number;
  hasActiveSubscription: boolean;
}

export interface PlayerStatsPayload {
  type: 'IRIS_PLAYER_STATS';
  nickname: string;
  level: number;
  ap: number;
  team: string;
  energy: number;
  xm_capacity: number;
  available_invites: number;
  min_ap_for_current_level: number;
  min_ap_for_next_level: number;
  hasActiveSubscription: boolean;
}

export interface InterceptorMessage {
  type: string;
  center?: { lat: number; lng: number };
  lat?: number;
  lng?: number;
  zoom?: number;
  text?: string;
  tab?: string;
  minTimestampMs?: number;
  maxTimestampMs?: number;
  ascendingTimestampOrder?: boolean;
  latE6?: number;
  lngE6?: number;
  guid?: string;
  passcode?: string;
  minLatE6?: number;
  maxLatE6?: number;
  minLngE6?: number;
  maxLngE6?: number;
  lastQueryTimestamp?: number;
}

type GoogleWindow = Window & typeof globalThis & {
  google?: { maps?: { Map: GoogleMapConstructor } };
  PLAYER?: IntelPlayer;
  niantic_params?: { version: string };
};

export function extractVersionFromDOM(doc: Document): string | null {
  const scripts = doc.querySelectorAll('script[src*="gen_dashboard_"]');
  for (const script of scripts) {
    const src = (script as HTMLScriptElement).src;
    const match = src.match(/gen_dashboard_([a-f0-9]+)\.js/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export function getCsrfToken(doc: Document): string {
  const cookies = doc.cookie.split(';').map((cookie) => cookie.trim());
  const csrfCookie = cookies.find((cookie) => cookie.startsWith('csrftoken='));
  if (!csrfCookie) return '';

  const separatorIndex = csrfCookie.indexOf('=');
  return csrfCookie.slice(separatorIndex + 1);
}

export function isIrisUrl(url: string): boolean {
  return url.includes('getEntities') ||
    url.includes('getPortalDetails') ||
    url.includes('getMissionDetails') ||
    url.includes('getTopMissionsInBounds') ||
    url.includes('getTopMissionsForPortal') ||
    url.includes('getPlexts') ||
    url.includes('sendPlext') ||
    url.includes('redeemReward') ||
    url.includes('getArtifactPortals') ||
    url.includes('getGameScore') ||
    url.includes('getRegionScoreDetails') ||
    url.includes('getInventory') ||
    url.includes('getHasActiveSubscription');
}

export function getMissionGuidFromLocation(locationLike: Pick<Location, 'pathname'>): string | null {
  const match = locationLike.pathname.match(/\/mission\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function sniffVersionFromBody(body: unknown): string | null {
  if (typeof body !== 'string') return null;

  try {
    const parsed = JSON.parse(body) as { v?: string };
    return parsed.v ?? null;
  } catch {
    return null;
  }
}

export function hookGoogleMaps(
  win: GoogleWindow,
  setIntelMap: (map: IntelMapInstance) => void,
): void {
  if (win.google?.maps?.Map) {
    if (win.google.maps.Map._iris_patched) return;
    const originalMap = win.google.maps.Map;

    win.google.maps.Map = function (this: unknown, ...args: unknown[]) {
      const instance = new (originalMap as unknown as new (...innerArgs: unknown[]) => IntelMapInstance)(...args);
      setIntelMap(instance);
      return instance;
    } as unknown as GoogleMapConstructor;

    win.google.maps.Map.prototype = originalMap.prototype;
    win.google.maps.Map._iris_patched = true;
    return;
  }

  let attempts = 0;
  const interval = win.setInterval(() => {
    attempts++;
    if (win.google?.maps?.Map) {
      clearInterval(interval);
      hookGoogleMaps(win, setIntelMap);
    }
    if (attempts > 100) {
      clearInterval(interval);
      console.warn('IRIS: Google Maps constructor not found');
    }
  }, 200);
}

export function readPlayerStats(win: GoogleWindow): PlayerStatsPayload | null {
  const player = win.PLAYER;
  if (!player) return null;

  const nickname = player.nickname;
  if (!nickname) return null;

  return {
    type: 'IRIS_PLAYER_STATS',
    nickname,
    level: parseInt(String(player.verified_level || player.level), 10),
    ap: parseInt(String(player.ap), 10),
    team: player.team === 'RESISTANCE' ? 'R' : (player.team === 'ENLIGHTENED' ? 'E' : 'N'),
    energy: parseInt(String(player.energy), 10),
    xm_capacity: parseInt(String(player.xm_capacity), 10),
    available_invites: parseInt(String(player.available_invites), 10),
    min_ap_for_current_level: parseInt(String(player.min_ap_for_current_level), 10),
    min_ap_for_next_level: parseInt(String(player.min_ap_for_next_level), 10),
    hasActiveSubscription: player.hasActiveSubscription ?? false,
  };
}

export function getIntelPositionFromCookies(doc: Document): { lat: number; lng: number; zoom: number } | null {
  const cookies = Object.fromEntries(
    doc.cookie.split(';').map((cookie) => {
      const trimmed = cookie.trim();
      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex === -1) return [trimmed, ''];
      return [trimmed.slice(0, separatorIndex), trimmed.slice(separatorIndex + 1)];
    }),
  );

  const lat = parseFloat(cookies['ingress.intelmap.lat']);
  const lng = parseFloat(cookies['ingress.intelmap.lng']);
  const zoom = parseInt(cookies['ingress.intelmap.zoom'], 10);
  if (isNaN(lat) || isNaN(lng) || isNaN(zoom)) return null;

  return { lat, lng, zoom };
}
