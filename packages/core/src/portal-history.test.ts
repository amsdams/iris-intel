import {describe, expect, it} from 'vitest';
import {
  DEFAULT_PORTAL_HISTORY_LAYER_STATE,
  getPortalHistoryOverlayFlags,
  isPortalHistoryMode,
  matchesPortalHistoryFilters,
  nextPortalHistoryMode,
  parsePortalHistoryLayerState,
} from './portal-history';

describe('portal history helpers', () => {
  it('cycles overlay modes in the Mini-IRIS order', () => {
    expect(nextPortalHistoryMode('off')).toBe('highlight');
    expect(nextPortalHistoryMode('highlight')).toBe('inverse');
    expect(nextPortalHistoryMode('inverse')).toBe('off');
  });

  it('validates persisted overlay modes', () => {
    expect(isPortalHistoryMode('off')).toBe(true);
    expect(isPortalHistoryMode('highlight')).toBe(true);
    expect(isPortalHistoryMode('inverse')).toBe(true);
    expect(isPortalHistoryMode('yes')).toBe(false);
  });

  it('parses persisted portal history layer state with defaults for invalid values', () => {
    expect(parsePortalHistoryLayerState({
      visited: 'highlight',
      captured: 'bad',
      scanned: 'inverse',
    })).toEqual({
      visited: 'highlight',
      captured: 'off',
      scanned: 'inverse',
    });
  });

  it('derives highlight and inverse overlay flags from portal history', () => {
    expect(getPortalHistoryOverlayFlags({
      visited: true,
      captured: false,
      scanned: true,
    }, {
      ...DEFAULT_PORTAL_HISTORY_LAYER_STATE,
      visited: 'highlight',
      captured: 'inverse',
      scanned: 'highlight',
    })).toEqual({
      visitedHighlight: true,
      capturedHighlight: false,
      scannedHighlight: true,
      visitedInverse: false,
      capturedInverse: true,
      scannedInverse: false,
    });
  });

  it('matches IRIS all/yes/no history filters', () => {
    const history = {visited: true, captured: false, scanned: true};

    expect(matchesPortalHistoryFilters(history, {
      showVisited: 'ALL',
      showCaptured: 'ALL',
      showScanned: 'ALL',
    })).toBe(true);
    expect(matchesPortalHistoryFilters(history, {
      showVisited: 'TRUE',
      showCaptured: 'FALSE',
      showScanned: 'TRUE',
    })).toBe(true);
    expect(matchesPortalHistoryFilters(history, {
      showVisited: 'FALSE',
      showCaptured: 'ALL',
      showScanned: 'ALL',
    })).toBe(false);
  });
});
