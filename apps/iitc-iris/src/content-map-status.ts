import {
  createIitcMapDataPlan,
  type IitcMapDataPlan,
} from '@iris/iitc-core';
import type { CameraState, EntityFetchState } from './content-message-adapter';
import { formatElapsedSeconds } from './ui-status';
import type {
  IitcIrisRenderMutationDiagnostics,
  IitcIrisRequestDiagnostics,
} from './messages';

export const REQUEST_BOUNDS_PADDING_RATIO = 0.25;

export interface InnerStatusView {
  portalText: string;
  mapText: string;
  mapTitle: string;
  progressPercent: number | null;
  activeRequests: number;
  failedRequests: number;
}

export function createPlan(camera: CameraState): IitcMapDataPlan | null {
  if (!camera.bounds) return null;

  try {
    return createIitcMapDataPlan(camera.bounds, { lat: camera.lat, lng: camera.lng }, camera.zoom, {
      boundsPaddingRatio: REQUEST_BOUNDS_PADDING_RATIO,
    });
  } catch (error) {
    console.warn('[IITC IRIS] Failed to create map data plan', error);
    return null;
  }
}

export function createIntelUrl(camera: CameraState): string {
  const lat = camera.lat.toFixed(6);
  const lng = camera.lng.toFixed(6);
  const zoom = String(Math.round(camera.zoom * 100) / 100);
  return `https://intel.ingress.com/intel?ll=${lat},${lng}&z=${zoom}`;
}

export function formatLinkLength(meters: number): string {
  return meters > 1000 ? `${meters / 1000}km` : `${meters}m`;
}

export function formatSelectedPortal(portal: { guid: string; title?: string; level?: number; team?: string; isPlaceholder?: boolean } | null): string {
  if (!portal) return 'none';
  const label = portal.title || portal.guid.slice(0, 8);
  const level = portal.isPlaceholder || portal.level === undefined ? 'P' : `L${portal.level}`;
  return `${label} ${portal.team ?? ''}${level}`;
}

export function getPortalLatLng(portal: { latE6: number; lngE6: number }): { lat: number; lng: number } {
  return {
    lat: portal.latE6 / 1_000_000,
    lng: portal.lngE6 / 1_000_000,
  };
}

export function formatTeamLabel(team: string): string {
  if (team === 'E') return 'Enlightened';
  if (team === 'R') return 'Resistance';
  if (team === 'M') return 'Machina';
  if (team === 'N') return 'Neutral';
  return team || 'Unknown';
}

export function formatMapObjectDistance(meters: number | undefined): string {
  if (meters === undefined || !Number.isFinite(meters)) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters >= 10_000 ? 1 : 2)} km`;
  return `${Math.round(meters)} m`;
}

export function formatRenderMutationSummary(mutation: IitcIrisRenderMutationDiagnostics | null): string {
  if (!mutation) return 'render -';
  const portals = mutation.portals;
  return `${mutation.mode === 'incremental' ? 'inc' : 'full'} p +${portals.added}/-${portals.removed}/~${portals.unchanged}/r${portals.replaced}`;
}

export function createInnerStatusView(
  plan: IitcMapDataPlan | null,
  entityFetch: EntityFetchState,
  requests: IitcIrisRequestDiagnostics,
): InnerStatusView {
  const portalText = plan?.tileParams.hasPortals
    ? 'portals'
    : `links: ${plan && plan.tileParams.minLinkLength > 0 ? `>${formatLinkLength(plan.tileParams.minLinkLength)}` : 'all links'}`;
  const loading = entityFetch.requestedTiles > 0 && entityFetch.returnedTiles < entityFetch.requestedTiles;
  const activeRequests = requests.activeRequests || entityFetch.queue?.activeRequests || (loading ? 1 : 0);
  const failedRequests = entityFetch.queue?.failedTiles ?? entityFetch.errorTileKeys.length;
  const progressPercent = loading ? Math.floor((entityFetch.returnedTiles / entityFetch.requestedTiles) * 100) : null;

  let mapText = entityFetch.status;
  if (entityFetch.authRequired) {
    mapText = 'login';
  } else if (loading) {
    mapText = 'loading';
  } else if (entityFetch.status === 'entities ready') {
    mapText = failedRequests > 0 ? 'errors' : 'done';
  }

  const cachedTiles = entityFetch.entitySource === 'cache' ? entityFetch.returnedTiles : 0;
  const loadedTiles = entityFetch.entitySource === 'cache' ? 0 : entityFetch.returnedTiles;
  const remainingTiles = Math.max(0, entityFetch.requestedTiles - entityFetch.returnedTiles);
  const retryText = entityFetch.retryRequests > 0 ? `, ${entityFetch.retryRequests} retried` : '';
  const partialText = entityFetch.queue?.partialTiles ? `, ${entityFetch.queue.partialTiles} partial` : '';
  const sourceText = entityFetch.entitySource === 'idle' ? '' : `, source ${entityFetch.entitySource}`;
  const finalTimeText = !loading && entityFetch.elapsedMs !== null ? `, in ${formatElapsedSeconds(entityFetch.elapsedMs)} seconds` : '';
  const tileProgressText = !loading && entityFetch.elapsedMs !== null
    ? `Tiles: ${cachedTiles} cached, ${loadedTiles} loaded${retryText}${partialText}${finalTimeText}${sourceText}`
    : `Tiles: ${cachedTiles} cached, ${loadedTiles} loaded, ${remainingTiles} remaining${retryText}${sourceText}`;
  const mapTitle = entityFetch.requestedTiles > 0
    ? tileProgressText
    : `${entityFetch.status}${sourceText}`;

  return {
    portalText,
    mapText,
    mapTitle,
    progressPercent,
    activeRequests,
    failedRequests,
  };
}
