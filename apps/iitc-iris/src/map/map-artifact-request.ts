import type {IitcRawGameEntity} from '@iris/iitc-core';
import {isIitcAuthError} from '../intel/intel-request';
import {getArtifactTypes} from './map-entity-adapter';
import {createArtifactFetchDiagnostics, type ArtifactFetchDiagnostics} from './map-request-diagnostics';

interface MapArtifactRequest {
  fetchArtifactEntitiesForRender: (version: string, signal: AbortSignal, generation: number) => Promise<IitcRawGameEntity[]>;
  resetArtifactDiagnostics: (status?: string) => void;
  getDiagnostics: () => ArtifactFetchDiagnostics;
}

export function createMapArtifactRequest(
  fetchArtifactPortals: (version: string, signal: AbortSignal) => Promise<IitcRawGameEntity[]>,
  isCurrentGeneration: (generation: number) => boolean,
): MapArtifactRequest {
  let latestArtifactDiagnostics = createArtifactFetchDiagnostics();

  function resetArtifactDiagnostics(status = 'disabled'): void {
    latestArtifactDiagnostics = createArtifactFetchDiagnostics(status);
  }

  async function fetchArtifactEntitiesForRender(version: string, signal: AbortSignal, generation: number): Promise<IitcRawGameEntity[]> {
    if (!isCurrentGeneration(generation)) return [];
    const startTime = performance.now();
    latestArtifactDiagnostics = createArtifactFetchDiagnostics('loading');

    try {
      const entities = await fetchArtifactPortals(version, signal);
      signal.throwIfAborted();
      if (!isCurrentGeneration(generation)) return [];
      latestArtifactDiagnostics = {
        status: entities.length > 0 ? 'ready' : 'empty',
        portalCount: entities.length,
        types: getArtifactTypes(entities),
        elapsedMs: performance.now() - startTime,
      };
      return entities;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (isIitcAuthError(error)) throw error;
      if (!isCurrentGeneration(generation)) return [];
      latestArtifactDiagnostics = {
        status: 'error',
        portalCount: 0,
        types: [],
        elapsedMs: performance.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
      return [];
    }
  }

  return {fetchArtifactEntitiesForRender, resetArtifactDiagnostics, getDiagnostics: (): ArtifactFetchDiagnostics => latestArtifactDiagnostics};
}
