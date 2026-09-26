import {describe, expect, it} from 'vitest';
import {closeIitcIrisSheet, openIitcIrisSheet, toggleIitcIrisSheet} from './content-sheet-navigation';

describe('IITC IRIS content sheet navigation', () => {
  it('opens a side panel without cancelling its requests', () => {
    expect(openIitcIrisSheet({activeSheet: 'map', activeSidePanel: null}, 'comm')).toEqual({
      activeSheet: 'comm',
      activeSidePanel: 'comm',
      cancelPanelRequests: false,
    });
  });

  it('closes a side panel before opening a non-panel sheet', () => {
    expect(openIitcIrisSheet({activeSheet: 'comm', activeSidePanel: 'comm'}, 'layers')).toEqual({
      activeSheet: 'layers',
      activeSidePanel: null,
      cancelPanelRequests: true,
    });
  });

  it('closes the active sheet to the map when toggled', () => {
    const state = {activeSheet: 'inventory' as const, activeSidePanel: 'inventory' as const};
    expect(toggleIitcIrisSheet(state, 'inventory')).toEqual({
      activeSheet: 'map',
      activeSidePanel: null,
      cancelPanelRequests: true,
    });
    expect(closeIitcIrisSheet({activeSheet: 'search', activeSidePanel: null})).toEqual({
      activeSheet: 'map',
      activeSidePanel: null,
      cancelPanelRequests: false,
    });
  });
});
