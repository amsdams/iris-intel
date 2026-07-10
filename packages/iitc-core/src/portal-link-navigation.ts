export interface IitcPortalLinkNavigationPortal {
  guid: string;
  latE6: number;
  lngE6: number;
}

export interface IitcPortalLinkNavigationTarget {
  guid?: string;
  lat?: number;
  lng?: number;
  zoom?: number;
}

export interface IitcPendingPortalSelection {
  guid?: string;
  lat?: number;
  lng?: number;
}

export interface IitcPortalLinkNavigationFocus {
  lat: number;
  lng: number;
  zoom?: number;
}

export interface IitcPortalLinkNavigationPlan<TPortal extends IitcPortalLinkNavigationPortal> {
  portal?: TPortal;
  pendingSelection?: IitcPendingPortalSelection;
  focus?: IitcPortalLinkNavigationFocus;
}

function hasLatLng(target: Pick<IitcPortalLinkNavigationTarget, 'lat' | 'lng'>): boolean {
  return target.lat !== undefined && target.lng !== undefined;
}

export function findIitcPortalByGuidOrLatLng<TPortal extends IitcPortalLinkNavigationPortal>(
  portals: readonly TPortal[],
  target: IitcPortalLinkNavigationTarget,
): TPortal | undefined {
  if (target.guid) {
    const portal = portals.find((candidate) => candidate.guid === target.guid);
    if (portal) return portal;
  }

  if (!hasLatLng(target)) return undefined;

  const {lat, lng} = target;
  if (lat === undefined || lng === undefined) return undefined;
  const latE6 = Math.round(lat * 1_000_000);
  const lngE6 = Math.round(lng * 1_000_000);
  return portals.find((portal) => Math.abs(portal.latE6 - latE6) <= 1 && Math.abs(portal.lngE6 - lngE6) <= 1);
}

export function createIitcPortalLinkPendingSelection(target: IitcPortalLinkNavigationTarget): IitcPendingPortalSelection | undefined {
  const {lat, lng} = target;
  if (lat !== undefined && lng !== undefined) return target.guid ? {guid: target.guid, lat, lng} : {lat, lng};
  if (target.guid) return {guid: target.guid};
  return undefined;
}

export function planIitcPortalLinkNavigation<TPortal extends IitcPortalLinkNavigationPortal>(
  portals: readonly TPortal[],
  target: IitcPortalLinkNavigationTarget,
): IitcPortalLinkNavigationPlan<TPortal> {
  const portal = findIitcPortalByGuidOrLatLng(portals, target);
  if (portal) {
    return {
      portal,
      focus: {
        lat: portal.latE6 / 1_000_000,
        lng: portal.lngE6 / 1_000_000,
        zoom: target.zoom,
      },
    };
  }

  const pendingSelection = createIitcPortalLinkPendingSelection(target);
  const {lat, lng} = target;
  if (lat === undefined || lng === undefined) return pendingSelection ? {pendingSelection} : {};

  return {
    pendingSelection,
    focus: {
      lat,
      lng,
      zoom: target.zoom,
    },
  };
}

export function resolveIitcPendingPortalSelection<TPortal extends IitcPortalLinkNavigationPortal>(
  pendingSelection: IitcPendingPortalSelection,
  portals: readonly TPortal[],
): TPortal | undefined {
  return findIitcPortalByGuidOrLatLng(portals, pendingSelection);
}
