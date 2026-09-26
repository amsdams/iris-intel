import {describe, expect, it} from 'vitest';
import {getMapControlsPanelTitle} from './map-controls-panel-container';

const SHEETS_WITH_TOPBAR = [
  'view', 'layers', 'drawLinks', 'drawMarkers',
  'portalCounts', 'portalsList', 'scoreboard',
  'selectedLink', 'selectedField',
] as const;

const SHEETS_WITHOUT_TOPBAR = ['map', 'system', 'comm', 'portal', 'help', 'search', 'missions'] as const;

describe('map-controls-panel-container', () => {
  it('returns a non-empty title for every sheet that shows the topbar', () => {
    for (const sheet of SHEETS_WITH_TOPBAR) {
      const title = getMapControlsPanelTitle(sheet);
      expect(title, `expected title for sheet "${sheet}"`).not.toBe('');
    }
  });

  it('returns an empty title for sheets that do not own the controls aside', () => {
    for (const sheet of SHEETS_WITHOUT_TOPBAR) {
      const title = getMapControlsPanelTitle(sheet);
      expect(title, `expected empty title for sheet "${sheet}"`).toBe('');
    }
  });

  it('maps each topbar sheet to the correct label', () => {
    expect(getMapControlsPanelTitle('view')).toBe('Controls');
    expect(getMapControlsPanelTitle('selectedLink')).toBe('Link');
    expect(getMapControlsPanelTitle('selectedField')).toBe('Field');
    expect(getMapControlsPanelTitle('layers')).toBe('Display');
    expect(getMapControlsPanelTitle('drawLinks')).toBe('Draw Links');
    expect(getMapControlsPanelTitle('drawMarkers')).toBe('Draw Markers');
    expect(getMapControlsPanelTitle('portalCounts')).toBe('Portal Counts');
    expect(getMapControlsPanelTitle('portalsList')).toBe('Portals List');
    expect(getMapControlsPanelTitle('scoreboard')).toBe('Scoreboard');
  });
});
