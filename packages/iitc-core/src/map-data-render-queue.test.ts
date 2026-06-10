import {describe, expect, it} from 'vitest';
import {createIitcRenderQueueState, drainIitcRenderQueueBatch, drainIitcRenderQueueToResponse, pushIitcRenderQueueTile} from './map-data-render-queue';

describe('map data render queue', () => {
  it('copies queued tile data and drains it into an IITC getEntities response', () => {
    const entity: [string, number, unknown[]] = ['p1', 1, ['p', 'N', 1, 2]];
    const tile = {gameEntities: [entity], deletedGameEntityGuids: ['old']};
    const queue = pushIitcRenderQueueTile(createIitcRenderQueueState(), 'tile', tile, 'cache-stale');
    tile.gameEntities.push(['p2', 2, ['p', 'N', 3, 4]]);
    tile.deletedGameEntityGuids.push('newer');

    const drained = drainIitcRenderQueueToResponse(queue);

    expect(drained.state.entries).toEqual([]);
    expect(drained.tileStatuses).toEqual({tile: 'cache-stale'});
    expect(drained.response.result?.map?.tile).toEqual({
      deletedGameEntityGuids: ['old'],
      gameEntities: [entity],
    });
  });

  it('drains queued tile data in IITC-style batches and keeps unfinished entries', () => {
    const tile = {
      deletedGameEntityGuids: ['old-1', 'old-2'],
      gameEntities: [
        ['p1', 1, ['p', 'N', 1, 2]],
        ['p2', 2, ['p', 'N', 3, 4]],
      ] satisfies [string, number, unknown[]][],
    };
    const queue = pushIitcRenderQueueTile(createIitcRenderQueueState(), 'tile', tile, 'ok');

    const first = drainIitcRenderQueueBatch(queue, 3);
    expect(first.tileStatuses).toEqual({});
    expect(first.state.entries[0]).toMatchObject({
      id: 'tile',
      deleted: [],
      entities: [['p2', 2, ['p', 'N', 3, 4]]],
      status: 'ok',
    });
    expect(first.response.result?.map?.tile).toEqual({
      deletedGameEntityGuids: ['old-1', 'old-2'],
      gameEntities: [['p1', 1, ['p', 'N', 1, 2]]],
    });

    const second = drainIitcRenderQueueBatch(first.state, 1, first.response);
    expect(second.state.entries).toEqual([]);
    expect(second.tileStatuses).toEqual({tile: 'ok'});
    expect(second.response.result?.map?.tile).toEqual({
      deletedGameEntityGuids: ['old-1', 'old-2'],
      gameEntities: [
        ['p1', 1, ['p', 'N', 1, 2]],
        ['p2', 2, ['p', 'N', 3, 4]],
      ],
    });
  });
});
