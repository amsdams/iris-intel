import {describe, expect, it} from 'vitest';
import {
  getCommAutoRequest,
  getInventoryAutoRequest,
  getScoresAutoRequest,
} from './content-side-panel-auto-requests';

describe('getCommAutoRequest', () => {
  it('returns auto-request when COMM panel is active and idle', () => {
    const req = getCommAutoRequest('comm', 'idle', 'all');
    if (!req) throw new Error('expected a result, got null');
    expect(req.message).toEqual({type: 'IITC_IRIS_REQUEST_COMM', commTab: 'all'});
    expect(req.retryDelaysMs).toEqual([500, 1500]);
  });

  it('preserves commTab in the message', () => {
    const req = getCommAutoRequest('comm', 'idle', 'faction');
    if (!req) throw new Error('expected a result, got null');
    expect(req.message).toEqual({type: 'IITC_IRIS_REQUEST_COMM', commTab: 'faction'});
  });

  it('does not include commOlder in the message', () => {
    // commOlder must be absent — adding commOlder: false would be a payload divergence.
    const req = getCommAutoRequest('comm', 'idle', 'alerts');
    if (!req) throw new Error('expected a result, got null');
    expect(Object.prototype.hasOwnProperty.call(req.message, 'commOlder')).toBe(false);
  });

  it('returns null when panel is not comm', () => {
    expect(getCommAutoRequest('scores', 'idle', 'all')).toBeNull();
    expect(getCommAutoRequest(null, 'idle', 'all')).toBeNull();
    expect(getCommAutoRequest('inventory', 'idle', 'all')).toBeNull();
  });

  it('returns null when comm panel is active but status is not idle', () => {
    expect(getCommAutoRequest('comm', 'loading', 'all')).toBeNull();
    expect(getCommAutoRequest('comm', 'ready', 'all')).toBeNull();
    expect(getCommAutoRequest('comm', 'error', 'all')).toBeNull();
    expect(getCommAutoRequest('comm', 'auth', 'all')).toBeNull();
  });
});

describe('getScoresAutoRequest', () => {
  it('returns auto-request when scores panel is active and idle', () => {
    const req = getScoresAutoRequest('scores', 'idle');
    if (!req) throw new Error('expected a result, got null');
    expect(req.message).toEqual({type: 'IITC_IRIS_REQUEST_SCORES'});
    expect(req.retryDelaysMs).toEqual([500]);
  });

  it('returns null when panel is not scores', () => {
    expect(getScoresAutoRequest('comm', 'idle')).toBeNull();
    expect(getScoresAutoRequest(null, 'idle')).toBeNull();
  });

  it('returns null when scores panel is active but status is not idle', () => {
    expect(getScoresAutoRequest('scores', 'loading')).toBeNull();
    expect(getScoresAutoRequest('scores', 'auth')).toBeNull();
  });
});

describe('getInventoryAutoRequest', () => {
  it('returns auto-request when inventory panel is active and idle', () => {
    const req = getInventoryAutoRequest('inventory', 'idle');
    if (!req) throw new Error('expected a result, got null');
    expect(req.message).toEqual({type: 'IITC_IRIS_REQUEST_INVENTORY'});
    expect(req.retryDelaysMs).toEqual([500]);
  });

  it('returns null when panel is not inventory', () => {
    expect(getInventoryAutoRequest('comm', 'idle')).toBeNull();
    expect(getInventoryAutoRequest(null, 'idle')).toBeNull();
  });

  it('returns null when inventory panel is active but status is not idle', () => {
    expect(getInventoryAutoRequest('inventory', 'loading')).toBeNull();
    expect(getInventoryAutoRequest('inventory', 'auth')).toBeNull();
  });
});

describe('no browser side effects', () => {
  it('helpers return plain serialisable objects', () => {
    const commReq = getCommAutoRequest('comm', 'idle', 'all');
    const scoresReq = getScoresAutoRequest('scores', 'idle');
    const inventoryReq = getInventoryAutoRequest('inventory', 'idle');

    expect(typeof commReq).toBe('object');
    expect(typeof scoresReq).toBe('object');
    expect(typeof inventoryReq).toBe('object');
    expect(JSON.stringify(commReq)).toBeDefined();
    expect(JSON.stringify(scoresReq)).toBeDefined();
    expect(JSON.stringify(inventoryReq)).toBeDefined();
  });
});
