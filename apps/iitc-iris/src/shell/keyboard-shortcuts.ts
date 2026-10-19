import type {IitcIrisPrimaryMenuId, IitcIrisSheetId} from './menu-registry';

export type IitcIrisPanDirection = 'north' | 'south' | 'west' | 'east';

export interface IitcIrisKeyboardShortcutOptions {
  hasSelectedObject: boolean;
  portalImageOpen: boolean;
  shortcutsEnabled: boolean;
  closeSheets: () => void;
  closePortalImage: () => void;
  panMap: (direction: IitcIrisPanDirection) => void;
  togglePrimaryMenu: (menu: IitcIrisPrimaryMenuId) => void;
  toggleSheet: (sheet: IitcIrisSheetId) => void;
  zoomMap: (delta: number) => void;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable;
}

export function handleIitcIrisContentKeyDown(event: KeyboardEvent, options: IitcIrisKeyboardShortcutOptions): void {
  if (isEditableTarget(event.target)) return;
  const key = event.key.toLowerCase();

  if (event.key === 'Escape') {
    event.preventDefault();
    if (options.portalImageOpen) {
      options.closePortalImage();
      return;
    }
    options.closeSheets();
    return;
  }

  if (!options.shortcutsEnabled) return;

  if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    options.toggleSheet('help');
    return;
  }

  const menuShortcut = (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) ||
    (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey);
  if (menuShortcut) {
    if (key === 'm') {
      event.preventDefault();
      options.togglePrimaryMenu('map');
      return;
    }
    if (key === 'p' && options.hasSelectedObject) {
      event.preventDefault();
      options.togglePrimaryMenu('selected');
      return;
    }
    if (key === 'a') {
      event.preventDefault();
      options.togglePrimaryMenu('agent');
      return;
    }
    if (key === 'c') {
      event.preventDefault();
      options.togglePrimaryMenu('comm');
      return;
    }
    if (key === 's') {
      event.preventDefault();
      options.togglePrimaryMenu('system');
      return;
    }
  }

  if (event.key === '/') {
    event.preventDefault();
    options.toggleSheet('search');
    return;
  }
  if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    options.zoomMap(1);
    return;
  }
  if (event.key === '-' || event.key === '_') {
    event.preventDefault();
    options.zoomMap(-1);
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    options.panMap('north');
    return;
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    options.panMap('south');
    return;
  }
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    options.panMap('west');
    return;
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    options.panMap('east');
  }
}
