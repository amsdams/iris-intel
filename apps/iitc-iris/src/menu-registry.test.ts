import {describe, expect, it} from 'vitest';
import {
  AGENT_MENU_SHEET_REGISTRY,
  getPrimaryMenuId,
  isPrimaryMenuId,
  isSheetId,
  isSidePanelId,
  MAP_MENU_SHEET_REGISTRY,
  PRIMARY_MENU_REGISTRY,
  SELECTED_MENU_SHEET_REGISTRY,
  SHEET_REGISTRY,
  SIDE_PANEL_REGISTRY,
  SYSTEM_MENU_SHEET_REGISTRY,
  type IitcIrisSheetId,
} from './menu-registry';

describe('IITC IRIS menu registry', () => {
  it('keeps current primary menu order and shortcuts registered', () => {
    expect(PRIMARY_MENU_REGISTRY).toEqual([
      {id: 'selected', label: 'Selected', shortcut: 'P'},
      {id: 'map', label: 'Map', shortcut: 'M'},
      {id: 'agent', label: 'Agent', shortcut: 'A'},
      {id: 'comm', label: 'COMM', shortcut: 'C'},
      {id: 'system', label: 'System', shortcut: 'S'},
    ]);
    expect(isPrimaryMenuId('map')).toBe(true);
    expect(isPrimaryMenuId('missing')).toBe(false);
  });

  it('keeps current sheet ids and stored-sheet validation in sync', () => {
    const expectedSheetIds: IitcIrisSheetId[] = [
      'map',
      'search',
      'layers',
      'view',
      'missions',
      'scores',
      'portalCounts',
      'portalsList',
      'scoreboard',
      'drawLinks',
      'drawMarkers',
      'portal',
      'selectedLink',
      'selectedField',
      'agent',
      'inventory',
      'passcode',
      'comm',
      'system',
      'help',
    ];

    expect(SHEET_REGISTRY.map((entry) => entry.id)).toEqual(expectedSheetIds);
    expect(expectedSheetIds.every((id) => isSheetId(id))).toBe(true);
    expect(isSheetId('missing')).toBe(false);
  });

  it('derives side panels and primary menu ownership from registered sheets', () => {
    expect(SIDE_PANEL_REGISTRY.map((entry) => entry.id)).toEqual(['agent', 'comm', 'scores', 'missions', 'inventory', 'passcode']);
    expect(isSidePanelId('inventory')).toBe(true);
    expect(isSidePanelId('layers')).toBe(false);

    expect(MAP_MENU_SHEET_REGISTRY.map((entry) => entry.id)).toEqual([
      'search',
      'layers',
      'view',
      'missions',
      'scores',
      'portalCounts',
      'portalsList',
      'scoreboard',
      'drawLinks',
      'drawMarkers',
    ]);
    expect(SELECTED_MENU_SHEET_REGISTRY.map((entry) => entry.id)).toEqual(['portal', 'selectedLink', 'selectedField']);
    expect(AGENT_MENU_SHEET_REGISTRY.map((entry) => entry.id)).toEqual(['agent', 'inventory', 'passcode']);
    expect(SYSTEM_MENU_SHEET_REGISTRY.map((entry) => entry.id)).toEqual(['system', 'help']);

    expect(getPrimaryMenuId('portal')).toBe('selected');
    expect(getPrimaryMenuId('comm')).toBe('comm');
    expect(getPrimaryMenuId('scores')).toBe('map');
    expect(getPrimaryMenuId('layers')).toBe('map');
  });
});
