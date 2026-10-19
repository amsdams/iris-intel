import type {IitcIrisPrimaryMenuId, IitcIrisSheetId} from './menu-registry';

export interface IitcIrisPrimaryMenuContext {
  activePrimaryMenu: IitcIrisPrimaryMenuId;
  activeSelectedSheet: IitcIrisSheetId;
  activeSheet: IitcIrisSheetId;
  hasSelectedObject: boolean;
}

export type IitcIrisPrimaryMenuEffect =
  | {kind: 'closeSheet'}
  | {kind: 'none'}
  | {kind: 'openSheet'; sheet: IitcIrisSheetId}
  | {kind: 'toggleComm'}
  | {kind: 'toggleSheet'; sheet: IitcIrisSheetId};

export function getIitcIrisPrimaryMenuEffect(
  menu: IitcIrisPrimaryMenuId,
  context: IitcIrisPrimaryMenuContext,
): IitcIrisPrimaryMenuEffect {
  if (menu === 'selected') {
    return context.hasSelectedObject
      ? {kind: 'toggleSheet', sheet: context.activeSelectedSheet}
      : {kind: 'none'};
  }
  if (menu === 'map') {
    return context.activePrimaryMenu === 'map' && context.activeSheet !== 'map'
      ? {kind: 'closeSheet'}
      : {kind: 'openSheet', sheet: 'layers'};
  }
  if (menu === 'agent') return {kind: 'toggleSheet', sheet: 'agent'};
  if (menu === 'comm') return {kind: 'toggleComm'};
  return {kind: 'toggleSheet', sheet: 'system'};
}
