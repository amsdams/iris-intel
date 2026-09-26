import {describe, expect, it, vi} from 'vitest';
import {
  GEOLOCATION_MAX_ZOOM,
  jumpToPresetAction,
  jumpToViewInputAction,
  locateBrowserPositionAction,
  type GeolocationPositionCoords,
  type GeolocationPositionError,
} from './content-location-actions';

describe('content-location-actions', () => {
  it('jumps to preset coordinates and zoom', () => {
    const setMapView = vi.fn();
    jumpToPresetAction({lat: 52.3676, lng: 4.9041, zoom: 15}, setMapView);
    expect(setMapView).toHaveBeenCalledWith(52.3676, 4.9041, 15);
  });

  it('handles valid view input jumps', () => {
    const setMapView = vi.fn();
    const setViewInputStatus = vi.fn();
    const setTimeoutFn = vi.fn((fn: () => void) => {
      fn();
    });

    jumpToViewInputAction('52.3676, 4.9041, 14', 12, setMapView, setViewInputStatus, setTimeoutFn);

    expect(setMapView).toHaveBeenCalledWith(52.3676, 4.9041, 14);
    expect(setViewInputStatus).toHaveBeenNthCalledWith(1, 'jumped');
    expect(setViewInputStatus).toHaveBeenNthCalledWith(2, '');
  });

  it('handles invalid view input jumps', () => {
    const setMapView = vi.fn();
    const setViewInputStatus = vi.fn();
    const setTimeoutFn = vi.fn((fn: () => void) => {
      fn();
    });

    jumpToViewInputAction('invalid input string', 12, setMapView, setViewInputStatus, setTimeoutFn);

    expect(setMapView).not.toHaveBeenCalled();
    expect(setViewInputStatus).toHaveBeenNthCalledWith(1, 'bad view');
    expect(setViewInputStatus).toHaveBeenNthCalledWith(2, '');
  });

  it('handles missing geolocation support', () => {
    const setMapView = vi.fn();
    const setGeolocationStatus = vi.fn();
    const postMessageFn = vi.fn();
    const setTimeoutFn = vi.fn((fn: () => void) => {
      fn();
    });

    locateBrowserPositionAction(
      false,
      vi.fn(),
      setMapView,
      setGeolocationStatus,
      postMessageFn,
      setTimeoutFn
    );

    expect(setGeolocationStatus).toHaveBeenNthCalledWith(1, 'unavailable');
    expect(setGeolocationStatus).toHaveBeenNthCalledWith(2, '');
  });

  it('handles successful geolocation acquisition with accuracy', () => {
    const setMapView = vi.fn();
    const setGeolocationStatus = vi.fn();
    const postMessageFn = vi.fn();
    const setTimeoutFn = vi.fn((fn: () => void) => {
      fn();
    });
    const getCurrentPosition = vi.fn((success: (pos: {coords: GeolocationPositionCoords}) => void) => {
      success({coords: {latitude: 52.3, longitude: 4.9, accuracy: 15.4}});
    });

    locateBrowserPositionAction(
      true,
      getCurrentPosition,
      setMapView,
      setGeolocationStatus,
      postMessageFn,
      setTimeoutFn
    );

    expect(setGeolocationStatus).toHaveBeenNthCalledWith(1, 'locating...');
    expect(postMessageFn).toHaveBeenCalledWith({
      type: 'IITC_IRIS_SET_USER_LOCATION',
      userLat: 52.3,
      userLng: 4.9,
      userAccuracy: 15.4,
    });
    expect(setMapView).toHaveBeenCalledWith(52.3, 4.9, GEOLOCATION_MAX_ZOOM);
    expect(setGeolocationStatus).toHaveBeenNthCalledWith(2, 'located +/- 15m');
    expect(setGeolocationStatus).toHaveBeenNthCalledWith(3, '');
  });

  it('handles geolocation errors (permission denied)', () => {
    const setMapView = vi.fn();
    const setGeolocationStatus = vi.fn();
    const postMessageFn = vi.fn();
    const setTimeoutFn = vi.fn((fn: () => void) => {
      fn();
    });
    const getCurrentPosition = vi.fn(
      (_success: (pos: {coords: GeolocationPositionCoords}) => void, error: (err: GeolocationPositionError) => void) => {
        error({code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2});
      }
    );

    locateBrowserPositionAction(
      true,
      getCurrentPosition,
      setMapView,
      setGeolocationStatus,
      postMessageFn,
      setTimeoutFn
    );

    expect(setGeolocationStatus).toHaveBeenNthCalledWith(1, 'locating...');
    expect(setGeolocationStatus).toHaveBeenNthCalledWith(2, 'permission denied');
    expect(setGeolocationStatus).toHaveBeenNthCalledWith(3, '');
  });
});
