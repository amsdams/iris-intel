import {describe, expect, it} from 'vitest';
import {appendRenderQueueDiagnostics, createEmptyRenderQueueDiagnostics, createArtifactFetchDiagnostics} from './map-request-diagnostics';

describe('map request diagnostic snapshots', () => {
  it('accumulates render occurrences while keeping tile keys unique and prior snapshots intact', () => {
    const empty = createEmptyRenderQueueDiagnostics();
    const cached = appendRenderQueueDiagnostics({...empty, queuedTiles: 3}, {'a': 'cache-fresh', 'b': 'cache-stale'});
    const downloaded = appendRenderQueueDiagnostics(cached, {'a': 'ok', 'c': 'ok'});
    expect(downloaded).toEqual({queuedTiles: 0, renderedTiles: 4, renderedOkTiles: 2,
      renderedCacheFreshTiles: 1, renderedCacheStaleTiles: 1, lastRenderedTileStatus: 'ok', renderedTileKeys: ['a', 'b', 'c']});
    expect(cached).toMatchObject({renderedTiles: 2, renderedOkTiles: 0, renderedTileKeys: ['a', 'b']});
    expect(empty).toMatchObject({queuedTiles: 0, renderedTiles: 0, lastRenderedTileStatus: null, renderedTileKeys: []});
    expect(appendRenderQueueDiagnostics(downloaded, {})).toEqual(downloaded);
  });

  it('resets artifact status without retaining elapsed/error/type data or sharing arrays', () => {
    const disabled = createArtifactFetchDiagnostics();
    disabled.types.push('old');
    expect(createArtifactFetchDiagnostics()).toEqual({status: 'disabled', portalCount: 0, types: []});
    expect(createArtifactFetchDiagnostics('fixture-disabled')).toEqual({status: 'fixture-disabled', portalCount: 0, types: []});
    expect(createArtifactFetchDiagnostics('loading')).toEqual({status: 'loading', portalCount: 0, types: []});
  });
});
