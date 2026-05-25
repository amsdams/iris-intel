import {describe, expect, it} from 'vitest';
import {
  createArtifactsRequestMessage,
  createEntitiesRequestMessage,
  createGameScoreRequestMessage,
  createInventoryRequestMessage,
  createPlayerStatsRequestMessage,
  createPortalDetailsRequestMessage,
  createRegionScoreRequestMessage,
  createSubscriptionRequestMessage,
} from './extension-messages';

describe('extension request message builders', () => {
  it('creates portal detail request messages for valid portal guids', () => {
    expect(createPortalDetailsRequestMessage(' portal-guid ')).toEqual({
      type: 'IRIS_PORTAL_DETAILS_REQUEST',
      guid: 'portal-guid',
    });
  });

  it('rejects empty portal detail request guids', () => {
    expect(createPortalDetailsRequestMessage('')).toBeNull();
    expect(createPortalDetailsRequestMessage('   ')).toBeNull();
    expect(createPortalDetailsRequestMessage(null)).toBeNull();
  });

  it('creates inventory request messages with optional force', () => {
    expect(createInventoryRequestMessage()).toEqual({type: 'IRIS_INVENTORY_REQUEST'});
    expect(createInventoryRequestMessage({force: true})).toEqual({
      type: 'IRIS_INVENTORY_REQUEST',
      force: true,
    });
  });

  it('creates entity request messages for valid tile keys', () => {
    expect(createEntitiesRequestMessage([' tile-a ', '', 'tile-b'], {force: true})).toEqual({
      type: 'IRIS_ENTITIES_REQUEST',
      tileKeys: ['tile-a', 'tile-b'],
      force: true,
    });
    expect(createEntitiesRequestMessage(['', '   '])).toBeNull();
  });

  it('creates simple extension request messages', () => {
    expect(createArtifactsRequestMessage()).toEqual({type: 'IRIS_ARTIFACTS_REQUEST'});
    expect(createArtifactsRequestMessage({force: true})).toEqual({
      type: 'IRIS_ARTIFACTS_REQUEST',
      force: true,
    });
    expect(createSubscriptionRequestMessage()).toEqual({type: 'IRIS_SUBSCRIPTION_REQUEST'});
    expect(createPlayerStatsRequestMessage()).toEqual({type: 'IRIS_PLAYER_STATS_REQUEST'});
  });

  it('creates score request messages', () => {
    expect(createGameScoreRequestMessage()).toEqual({type: 'IRIS_GAME_SCORE_REQUEST'});
    expect(createRegionScoreRequestMessage(52.37, 4.9)).toEqual({
      type: 'IRIS_REGION_SCORE_REQUEST',
      lat: 52.37,
      lng: 4.9,
    });
  });

  it('rejects invalid region score coordinates', () => {
    expect(createRegionScoreRequestMessage(Number.NaN, 4.9)).toBeNull();
    expect(createRegionScoreRequestMessage(52.37, Infinity)).toBeNull();
    expect(createRegionScoreRequestMessage(undefined, 4.9)).toBeNull();
  });
});
