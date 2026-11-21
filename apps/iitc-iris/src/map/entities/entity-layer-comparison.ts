import type {IitcIrisRenderField, IitcIrisRenderLink, IitcIrisRenderPortal} from '../../messages';

function areFieldPointsEqual(a: IitcIrisRenderField['points'], b: IitcIrisRenderField['points']): boolean {
  return a.length === b.length && a.every((point, index) =>
    point.guid === b[index]?.guid &&
    point.latE6 === b[index]?.latE6 &&
    point.lngE6 === b[index]?.lngE6);
}

export function areFieldLayersEqual(a: IitcIrisRenderField, b: IitcIrisRenderField): boolean {
  return a.team === b.team && areFieldPointsEqual(a.points, b.points);
}

export function areLinkLayersEqual(a: IitcIrisRenderLink, b: IitcIrisRenderLink): boolean {
  return a.team === b.team &&
    a.oGuid === b.oGuid &&
    a.oLatE6 === b.oLatE6 &&
    a.oLngE6 === b.oLngE6 &&
    a.dGuid === b.dGuid &&
    a.dLatE6 === b.dLatE6 &&
    a.dLngE6 === b.dLngE6;
}

function arePortalHistoriesEqual(aHistory: IitcIrisRenderPortal['history'], bHistory: IitcIrisRenderPortal['history']): boolean {
  return aHistory?.visited === bHistory?.visited &&
    aHistory?.captured === bHistory?.captured &&
    aHistory?.scoutControlled === bHistory?.scoutControlled;
}

export function arePortalLayersEqual(
  a: IitcIrisRenderPortal,
  b: IitcIrisRenderPortal,
  getPortalHistory: (guid: string) => IitcIrisRenderPortal['history'],
): boolean {
  return a.team === b.team &&
    a.latE6 === b.latE6 &&
    a.lngE6 === b.lngE6 &&
    a.level === b.level &&
    a.health === b.health &&
    a.isPlaceholder === b.isPlaceholder &&
    arePortalHistoriesEqual(a.history ?? getPortalHistory(a.guid), b.history ?? getPortalHistory(b.guid));
}
