import {describe, expect, it} from 'vitest';
import {
  buildClearPortalSelectionMessage,
  buildPanByMessage,
  buildSetViewMessage,
  buildZoomToAndShowPortalMessage,
  calculateZoomView,
} from './content-camera-actions';
import {IITC_IRIS_MESSAGES} from './messages';

describe('content-camera-actions', () => {
  it('builds setView message with clamped coordinates', () => {
    const msg = buildSetViewMessage(52.3, 4.9, 15);
    expect(msg).toEqual({
      type: IITC_IRIS_MESSAGES.setView,
      lat: 52.3,
      lng: 4.9,
      zoom: 15,
    });
  });

  it('calculates zoom view with clamped zoom bounds', () => {
    const view = calculateZoomView({lat: 52.3, lng: 4.9, zoom: 15}, 1);
    expect(view).toEqual({
      lat: 52.3,
      lng: 4.9,
      zoom: 16,
    });
  });

  it('builds panBy message with correct offsets', () => {
    expect(buildPanByMessage('east', 500)).toEqual({
      type: IITC_IRIS_MESSAGES.panBy,
      panX: 500,
      panY: 0,
    });
    expect(buildPanByMessage('north', 500)).toEqual({
      type: IITC_IRIS_MESSAGES.panBy,
      panX: 0,
      panY: -500,
    });
  });

  it('builds zoomToAndShowPortal message converting E6 coordinates', () => {
    const msg = buildZoomToAndShowPortalMessage('guid123', 52300000, 4900000, 17);
    expect(msg).toEqual({
      type: IITC_IRIS_MESSAGES.zoomToAndShowPortal,
      portalGuid: 'guid123',
      portalLat: 52.3,
      portalLng: 4.9,
      zoom: 17,
    });
  });

  it('builds clearPortalSelection message', () => {
    expect(buildClearPortalSelectionMessage()).toEqual({
      type: IITC_IRIS_MESSAGES.clearPortalSelection,
    });
  });
});
