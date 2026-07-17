import {describe, expect, it} from 'vitest';
import {handleIitcIrisContentKeyDown, type IitcIrisKeyboardShortcutOptions, type IitcIrisPanDirection} from './content-keyboard-shortcuts';
import type {IitcIrisPrimaryMenuId, IitcIrisSheetId} from './menu-registry';

function keyEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    target: null,
    preventDefault: () => undefined,
    ...options,
  } as KeyboardEvent;
}

function shortcutOptions(overrides: Partial<IitcIrisKeyboardShortcutOptions> = {}): IitcIrisKeyboardShortcutOptions & {
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    hasSelectedObject: true,
    portalImageOpen: false,
    shortcutsEnabled: true,
    closeSheets: () => calls.push('closeSheets'),
    closePortalImage: () => calls.push('closePortalImage'),
    panMap: (direction: IitcIrisPanDirection) => calls.push(`pan:${direction}`),
    togglePrimaryMenu: (menu: IitcIrisPrimaryMenuId) => calls.push(`menu:${menu}`),
    toggleSheet: (sheet: IitcIrisSheetId) => calls.push(`sheet:${sheet}`),
    zoomMap: (delta: number) => calls.push(`zoom:${delta}`),
    ...overrides,
  };
}

describe('IITC IRIS content keyboard shortcuts', () => {
  it('routes Escape to portal image close before sheet close', () => {
    const imageOpen = shortcutOptions({portalImageOpen: true});
    handleIitcIrisContentKeyDown(keyEvent('Escape'), imageOpen);
    expect(imageOpen.calls).toEqual(['closePortalImage']);

    const imageClosed = shortcutOptions({portalImageOpen: false});
    handleIitcIrisContentKeyDown(keyEvent('Escape'), imageClosed);
    expect(imageClosed.calls).toEqual(['closeSheets']);
  });

  it('routes menu, search, zoom, and pan shortcuts', () => {
    const options = shortcutOptions();
    for (const key of ['m', 'p', 'a', 'c', 's', '/', '+', '-', 'ArrowUp', 'ArrowRight']) {
      handleIitcIrisContentKeyDown(keyEvent(key), options);
    }

    expect(options.calls).toEqual([
      'menu:map',
      'menu:selected',
      'menu:agent',
      'menu:comm',
      'menu:system',
      'sheet:search',
      'zoom:1',
      'zoom:-1',
      'pan:north',
      'pan:east',
    ]);
  });

  it('ignores non-Escape shortcuts when shortcuts are disabled', () => {
    const options = shortcutOptions({shortcutsEnabled: false});
    handleIitcIrisContentKeyDown(keyEvent('m'), options);
    handleIitcIrisContentKeyDown(keyEvent('/'), options);
    handleIitcIrisContentKeyDown(keyEvent('Escape'), options);

    expect(options.calls).toEqual(['closeSheets']);
  });

  it('does not open selected menu without a selected object', () => {
    const options = shortcutOptions({hasSelectedObject: false});
    handleIitcIrisContentKeyDown(keyEvent('p'), options);

    expect(options.calls).toEqual([]);
  });
});
