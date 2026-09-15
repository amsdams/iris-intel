import {describe, expect, it} from 'vitest';
import {
  buildAddPolylinePayload,
  buildDeleteAtPayload,
  buildDeleteIndexPayload,
  buildUndoPayload,
} from './content-draw-tools-lifecycle';

describe('content-draw-tools-lifecycle', () => {
  it('builds add polyline payload', () => {
    const start = {lat: 52.3, lng: 4.9};
    const end = {lat: 52.4, lng: 5.0};
    const payload = buildAddPolylinePayload(start, end, '#ff0000');
    expect(payload).toEqual({
      drawToolsAction: 'addPolyline',
      drawToolsColor: '#ff0000',
      drawToolsLatLngs: [start, end],
    });
  });

  it('builds deleteAt payload', () => {
    const target = {lat: 52.3, lng: 4.9};
    const payload = buildDeleteAtPayload(target, 'marker');
    expect(payload).toEqual({
      drawToolsAction: 'deleteAt',
      drawToolsItemType: 'marker',
      drawToolsLatLngs: [target],
    });
  });

  it('builds deleteIndex payload and status text', () => {
    const item = {type: 'marker' as const, latLng: {lat: 52.3, lng: 4.9}, storageIndex: 3};
    const res = buildDeleteIndexPayload(item);
    expect(res.statusText).toBe('draw marker delete requested');
    expect(res.payload.drawToolsIndex).toBe(3);
  });

  it('builds undo payload and status text', () => {
    const res = buildUndoPayload('polyline');
    expect(res.statusText).toBe('draw link undo requested');
    expect(res.payload.drawToolsItemType).toBe('polyline');
  });
});
