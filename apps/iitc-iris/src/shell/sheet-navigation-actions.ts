import {createCancelPanelRequestsMessage} from './outbound-messages';
import type {IitcIrisMessage} from '../messages';
import {closeIitcIrisSheet, openIitcIrisSheet, toggleIitcIrisSheet, type IitcIrisSheetNavigationEffect} from './sheet-navigation';
import type {IitcIrisSheetId, IitcIrisSidePanelId} from './menu-registry';

export type PostMessageFn = (message: IitcIrisMessage) => void;

export interface SheetNavigationSetters {
  setActiveSheet: (sheet: IitcIrisSheetId) => void;
  setActiveSidePanel: (panel: IitcIrisSidePanelId | null) => void;
  storeActiveSheet: (sheet: IitcIrisSheetId) => void;
  storeSidePanelId: (panel: IitcIrisSidePanelId | null) => void;
}

export function applySheetNavigationEffectCommand(
  effect: IitcIrisSheetNavigationEffect,
  postMessage: PostMessageFn,
  setters: SheetNavigationSetters,
  order: 'side-panel-first' | 'sheet-first',
): void {
  if (effect.cancelPanelRequests) {
    postMessage(createCancelPanelRequestsMessage());
  }
  if (order === 'side-panel-first') {
    setters.setActiveSidePanel(effect.activeSidePanel);
    setters.setActiveSheet(effect.activeSheet);
    setters.storeSidePanelId(effect.activeSidePanel);
    setters.storeActiveSheet(effect.activeSheet);
    return;
  }
  setters.setActiveSheet(effect.activeSheet);
  setters.storeActiveSheet(effect.activeSheet);
  setters.setActiveSidePanel(effect.activeSidePanel);
  setters.storeSidePanelId(effect.activeSidePanel);
}

export function closeSheetToMapCommand(
  activeSheet: IitcIrisSheetId,
  activeSidePanel: IitcIrisSidePanelId | null,
  postMessage: PostMessageFn,
  setters: SheetNavigationSetters,
): void {
  applySheetNavigationEffectCommand(closeIitcIrisSheet({activeSheet, activeSidePanel}), postMessage, setters, 'side-panel-first');
}

export function openSheetCommand(
  target: IitcIrisSheetId,
  activeSheet: IitcIrisSheetId,
  activeSidePanel: IitcIrisSidePanelId | null,
  postMessage: PostMessageFn,
  setters: SheetNavigationSetters,
): void {
  applySheetNavigationEffectCommand(openIitcIrisSheet({activeSheet, activeSidePanel}, target), postMessage, setters, 'sheet-first');
}

export function toggleSheetCommand(
  target: IitcIrisSheetId,
  activeSheet: IitcIrisSheetId,
  activeSidePanel: IitcIrisSidePanelId | null,
  postMessage: PostMessageFn,
  setters: SheetNavigationSetters,
): void {
  applySheetNavigationEffectCommand(toggleIitcIrisSheet({activeSheet, activeSidePanel}, target), postMessage, setters, 'sheet-first');
}
