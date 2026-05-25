export interface LatLng {
  lat: number;
  lng: number;
}

export interface AddressCacheSnapshot {
  discoveredLocation: string | null;
  portalAddresses: Record<string, string>;
  lastResolvedLatLng: LatLng | null;
}

export interface AddressResolutionTarget extends LatLng {
  portalId?: string;
}

export interface ResolvedAddressUpdate extends AddressResolutionTarget {
  address: string | null;
}

export interface AddressCacheUpdate {
  discoveredLocation?: string | null;
  portalAddresses?: Record<string, string>;
  lastResolvedLatLng?: LatLng | null;
}

const DEFAULT_COORDINATE_EPSILON = 0.000001;

export function normalizeResolvedAddress(address: string | null | undefined): string | null {
  if (typeof address !== 'string') return null;
  const trimmed = address.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isSameAddressLookupPoint(
  previous: LatLng | null | undefined,
  next: LatLng,
  epsilon = DEFAULT_COORDINATE_EPSILON,
): boolean {
  return !!previous &&
    Math.abs(previous.lat - next.lat) < epsilon &&
    Math.abs(previous.lng - next.lng) < epsilon;
}

export function shouldSkipAddressLookup(
  snapshot: Pick<AddressCacheSnapshot, 'portalAddresses' | 'lastResolvedLatLng'>,
  target: AddressResolutionTarget,
  epsilon = DEFAULT_COORDINATE_EPSILON,
): boolean {
  if (target.portalId && snapshot.portalAddresses[target.portalId]) return true;
  if (!target.portalId && isSameAddressLookupPoint(snapshot.lastResolvedLatLng, target, epsilon)) return true;
  return false;
}

export function applyResolvedAddress(
  snapshot: AddressCacheSnapshot,
  update: ResolvedAddressUpdate,
): AddressCacheUpdate {
  const address = normalizeResolvedAddress(update.address);
  if (!address) return {};

  if (update.portalId) {
    return {
      portalAddresses: {
        ...snapshot.portalAddresses,
        [update.portalId]: address,
      },
    };
  }

  return {
    discoveredLocation: address,
    lastResolvedLatLng: {lat: update.lat, lng: update.lng},
  };
}
