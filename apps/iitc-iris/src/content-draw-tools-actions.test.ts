import {describe, expect, it} from 'vitest';
import {
  buildAddMarkerPayload,
  buildClearDrawToolsPayload,
  buildRenameMarkerPayload,
} from './content-draw-tools-actions';

describe('content-draw-tools-actions', () => {
  it('builds add marker payload with custom or target label', () => {
    const target = {lat: 52.3, lng: 4.9, label: 'Portal Title'};
    const payload = buildAddMarkerPayload(target, 'My Label', '#ff0000');
    expect(payload).toEqual({
      drawToolsAction: 'addMarker',
      drawToolsColor: '#ff0000',
      drawToolsLabel: 'My Label',
      drawToolsLatLngs: [{lat: 52.3, lng: 4.9}],
    });
  });

  it('builds rename marker payload correctly', () => {
    const item = {
      type: 'marker' as const,
      latLng: {lat: 52.3, lng: 4.9},
      label: 'Old',
      storageIndex: 2,
    };
    const result = buildRenameMarkerPayload(item, 'New Label');
    expect(result?.statusText).toBe('draw marker renamed');
    expect(result?.payload).toEqual({
      drawToolsAction: 'rename',
      drawToolsIndex: 2,
      drawToolsLabel: 'New Label',
    });
  });

  it('builds clear payload for polyline', () => {
    const result = buildClearDrawToolsPayload('polyline');
    expect(result.statusText).toBe('draw links cleared');
    expect(result.payload).toEqual({
      drawToolsAction: 'clear',
      drawToolsItemType: 'polyline',
    });
  });
});
