import {describe, expect, it} from 'vitest';
import {
  createGameScoreRequestMessage,
  createInventoryRequestMessage,
  createPortalDetailsRequestMessage,
  createRegionScoreRequestMessage,
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
