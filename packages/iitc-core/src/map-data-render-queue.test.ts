import {describe, expect, it} from 'vitest';
import {createIitcRenderQueueState, drainIitcRenderQueueToResponse, pushIitcRenderQueueTile} from './map-data-render-queue';

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
});
