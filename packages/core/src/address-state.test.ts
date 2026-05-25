import {describe, expect, it} from 'vitest';
import {applyResolvedAddress, normalizeResolvedAddress, shouldSkipAddressLookup} from './address-state';

describe('address-state', () => {
  it('normalizes blank addresses to null', () => {
    expect(normalizeResolvedAddress(' Amsterdam ')).toBe('Amsterdam');
    expect(normalizeResolvedAddress('   ')).toBeNull();
    expect(normalizeResolvedAddress(null)).toBeNull();
  });

  it('skips cached portal and same-center lookups', () => {
    const snapshot = {
      portalAddresses: {'portal-a': 'Portal Address'},
      lastResolvedLatLng: {lat: 52.1, lng: 4.2},
    };

    expect(shouldSkipAddressLookup(snapshot, {portalId: 'portal-a', lat: 1, lng: 2})).toBe(true);
    expect(shouldSkipAddressLookup(snapshot, {lat: 52.1000004, lng: 4.2000004})).toBe(true);
    expect(shouldSkipAddressLookup(snapshot, {lat: 52.2, lng: 4.2})).toBe(false);
  });

  it('applies portal and center address updates separately', () => {
    const snapshot = {
      discoveredLocation: 'Old Center',
      portalAddresses: {'portal-a': 'A'},
      lastResolvedLatLng: {lat: 52, lng: 4},
    };

    expect(applyResolvedAddress(snapshot, {
      portalId: 'portal-b',
      address: 'B',
      lat: 53,
      lng: 5,
    })).toEqual({
      portalAddresses: {'portal-a': 'A', 'portal-b': 'B'},
    });

    expect(applyResolvedAddress(snapshot, {
      address: 'New Center',
      lat: 53,
      lng: 5,
    })).toEqual({
      discoveredLocation: 'New Center',
      lastResolvedLatLng: {lat: 53, lng: 5},
    });
  });
});
