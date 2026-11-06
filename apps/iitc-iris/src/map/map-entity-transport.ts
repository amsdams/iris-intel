import type {IitcGetEntitiesResponse, IitcRawGameEntity} from '@iris/iitc-core';
import type {IitcIrisDataSourceSettings} from '../messages';
import {createIitcAuthError, getCsrfToken, looksLikeHtml, type IntelRequest} from '../intel/intel-request';
import type {IitcIrisMapLifetime} from './map-runtime-lifetime';
import {adaptArtifactPortalEntities} from './map-entity-adapter';

export interface MapTileBatchResult {
  tileKeys: string[];
  response?: IitcGetEntitiesResponse;
  error?: unknown;
}

interface MapEntityTransportOptions {
  getLifetime: () => Pick<IitcIrisMapLifetime, 'fetchText'> | undefined;
  fetchIitcEndpointText: IntelRequest['fetchIitcEndpointText'];
}

interface MapEntityTransport {
  fetchEntityBatchResult: (tileKeys: string[], version: string, signal: AbortSignal) => Promise<MapTileBatchResult>;
  fetchFixtureResponse: (source: Extract<IitcIrisDataSourceSettings, {mode: 'fixture'}>) => Promise<IitcGetEntitiesResponse>;
  fetchArtifactPortals: (version: string, signal?: AbortSignal) => Promise<IitcRawGameEntity[]>;
}

/** Endpoint formats/error semantics only; the coordinator supplies version, cancellation and request timing. */
export function createMapEntityTransport({getLifetime, fetchIitcEndpointText}: MapEntityTransportOptions): MapEntityTransport {
  interface ArtifactPortalsResponse {
    error?: string;
    result?: unknown;
  }
  async function fetchEntityBatch(tileKeys: string[], version: string, signal?: AbortSignal): Promise<IitcGetEntitiesResponse> {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new Error('getEntities missing csrftoken');

    const {response, text} = await fetchIitcEndpointText('getEntities', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({tileKeys, v: version}),
    }, 'entities');

    if (looksLikeHtml(text)) {
      throw createIitcAuthError('getEntities', response);
    }
    if (!response.ok) throw new Error(`getEntities failed HTTP ${response.status}`);
    if (!text.trim()) throw new Error('getEntities returned empty response');

    try {
      return JSON.parse(text) as IitcGetEntitiesResponse;
    } catch (error) {
      throw new Error(`getEntities returned non-JSON HTTP ${response.status}: ${error instanceof Error ? error.message : String(error)}`, {cause: error});
    }
  }

  async function fetchFixtureResponse(source: Extract<IitcIrisDataSourceSettings, {mode: 'fixture'}>): Promise<IitcGetEntitiesResponse> {
    const lifetime = getLifetime();
    if (!lifetime) throw new DOMException('Map is unavailable', 'AbortError');
    const {response, text} = await lifetime.fetchText(source.url);
    if (!response.ok) throw new Error(`fixture ${source.label} failed HTTP ${response.status}`);
    return JSON.parse(text) as IitcGetEntitiesResponse;
  }

  async function fetchArtifactPortals(version: string, signal?: AbortSignal): Promise<IitcRawGameEntity[]> {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new Error('getArtifactPortals missing csrftoken');

    const {response, text} = await fetchIitcEndpointText('getArtifactPortals', {
      method: 'POST',
      credentials: 'include',
      signal,
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/json; charset=utf-8',
        'X-CSRFToken': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({v: version}),
    }, 'artifacts');

    if (looksLikeHtml(text)) {
      throw new Error(`getArtifactPortals returned login html HTTP ${response.status}${response.redirected ? ' redirected' : ''}`);
    }
    if (!response.ok) throw new Error(`getArtifactPortals failed HTTP ${response.status}`);
    if (!text.trim()) throw new Error('getArtifactPortals returned empty response');

    const parsed = JSON.parse(text) as ArtifactPortalsResponse;
    if (parsed.error || !parsed.result) return [];
    return adaptArtifactPortalEntities(parsed.result, Date.now);
  }

  async function fetchEntityBatchResult(tileKeys: string[], version: string, signal: AbortSignal): Promise<MapTileBatchResult> {
    try {
      return {tileKeys, response: await fetchEntityBatch(tileKeys, version, signal)};
    } catch (error) {
      return {tileKeys, error};
    }
  }

  return {fetchEntityBatchResult, fetchFixtureResponse, fetchArtifactPortals};
}
