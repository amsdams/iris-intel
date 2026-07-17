import {isSidePanelId, type IitcIrisSheetId, type IitcIrisSidePanelId} from './menu-registry';

export interface IitcIrisSheetNavigationState {
  activeSheet: IitcIrisSheetId;
  activeSidePanel: IitcIrisSidePanelId | null;
}

export interface IitcIrisSheetNavigationEffect extends IitcIrisSheetNavigationState {
  cancelPanelRequests: boolean;
}

export function closeIitcIrisSheet(state: IitcIrisSheetNavigationState): IitcIrisSheetNavigationEffect {
  return {
    activeSheet: 'map',
    activeSidePanel: null,
    cancelPanelRequests: state.activeSidePanel !== null,
  };
}

export function openIitcIrisSheet(
  state: IitcIrisSheetNavigationState,
  sheet: IitcIrisSheetId,
): IitcIrisSheetNavigationEffect {
  const activeSidePanel = isSidePanelId(sheet) ? sheet : null;
  return {
    activeSheet: sheet,
    activeSidePanel,
    cancelPanelRequests: activeSidePanel === null && state.activeSidePanel !== null,
  };
}

export function toggleIitcIrisSheet(
  state: IitcIrisSheetNavigationState,
  sheet: IitcIrisSheetId,
): IitcIrisSheetNavigationEffect {
  return state.activeSheet === sheet ? closeIitcIrisSheet(state) : openIitcIrisSheet(state, sheet);
}
