import {describe, expect, it, vi} from 'vitest';
import {
  addDrawToolsLinkPointAction,
  addDrawToolsMarkerAction,
  centerDrawToolsItemAction,
  clearDrawToolsItemsAction,
  deleteDrawToolsAtContextAction,
  deleteDrawToolsItemAction,
  importDrawToolsItemsAction,
  renameDrawToolsMarkerAction,
  undoDrawToolsItemAction,
} from './content-draw-tools-panel-actions';

describe('content-draw-tools-panel-actions', () => {
  it('adds marker when target exists', () => {
    const setClearConfirm = vi.fn();
    const postAction = vi.fn();
    const setStatus = vi.fn();

    const result = addDrawToolsMarkerAction(
      {lat: 52.3, lng: 4.9, label: 'Portal Title'},
      'Custom Marker',
      '#ff0000',
      setClearConfirm,
      postAction,
      setStatus
    );

    expect(result).toBe(true);
    expect(setClearConfirm).toHaveBeenCalledWith(null);
    expect(postAction).toHaveBeenCalledWith({
      drawToolsAction: 'addMarker',
      drawToolsColor: '#ff0000',
      drawToolsLabel: 'Custom Marker',
      drawToolsLatLngs: [{lat: 52.3, lng: 4.9}],
    });
    expect(setStatus).toHaveBeenCalledWith('draw marker added');
  });

  it('renames marker item', () => {
    const postAction = vi.fn();
    const setStatus = vi.fn();

    const marker = {
      type: 'marker' as const,
      storageIndex: 2,
      latLng: {lat: 52.3, lng: 4.9},
      color: '#ff0000',
      label: 'Old',
    };

    const result = renameDrawToolsMarkerAction(marker, 'New', postAction, setStatus);
    expect(result).toBe(true);
    expect(postAction).toHaveBeenCalledWith({
      drawToolsAction: 'rename',
      drawToolsIndex: 2,
      drawToolsLabel: 'New',
    });
    expect(setStatus).toHaveBeenCalledWith('draw marker renamed');
  });

  it('handles link point addition sequence (start -> end)', () => {
    const setLinkStart = vi.fn();
    const setClearConfirm = vi.fn();
    const postAction = vi.fn();
    const setStatus = vi.fn();

    // 1st point sets start
    addDrawToolsLinkPointAction(
      {lat: 52.3, lng: 4.9},
      null,
      setLinkStart,
      setClearConfirm,
      postAction,
      setStatus
    );

    expect(setLinkStart).toHaveBeenCalledWith({lat: 52.3, lng: 4.9});
    expect(setStatus).toHaveBeenCalledWith('draw link start set');
    expect(postAction).not.toHaveBeenCalled();

    // 2nd point draws polyline
    addDrawToolsLinkPointAction(
      {lat: 52.4, lng: 5.0},
      {lat: 52.3, lng: 4.9},
      setLinkStart,
      setClearConfirm,
      postAction,
      setStatus
    );

    expect(setClearConfirm).toHaveBeenCalledWith(null);
    expect(postAction).toHaveBeenCalledWith({
      drawToolsAction: 'addPolyline',
      drawToolsColor: '#a24ac3',
      drawToolsLatLngs: [
        {lat: 52.3, lng: 4.9},
        {lat: 52.4, lng: 5.0},
      ],
    });
    expect(setLinkStart).toHaveBeenCalledWith(null);
    expect(setStatus).toHaveBeenCalledWith('draw link added');
  });

  it('deletes item at context lat/lng', () => {
    const setClearConfirm = vi.fn();
    const postAction = vi.fn();
    const setStatus = vi.fn();

    deleteDrawToolsAtContextAction(
      {lat: 52.3, lng: 4.9},
      'polyline',
      setClearConfirm,
      postAction,
      setStatus
    );

    expect(setClearConfirm).toHaveBeenCalledWith(null);
    expect(postAction).toHaveBeenCalledWith({
      drawToolsAction: 'deleteAt',
      drawToolsLatLngs: [{lat: 52.3, lng: 4.9}],
      drawToolsItemType: 'polyline',
    });
    expect(setStatus).toHaveBeenCalledWith('draw item delete requested');
  });

  it('deletes specific draw item by index', () => {
    const setClearConfirm = vi.fn();
    const postAction = vi.fn();
    const setStatus = vi.fn();

    deleteDrawToolsItemAction(
      {type: 'marker', storageIndex: 3, latLng: {lat: 52.3, lng: 4.9}, color: '#f00'},
      setClearConfirm,
      postAction,
      setStatus
    );

    expect(postAction).toHaveBeenCalledWith({
      drawToolsAction: 'deleteIndex',
      drawToolsIndex: 3,
    });
    expect(setStatus).toHaveBeenCalledWith('draw marker delete requested');
  });

  it('undoes draw item', () => {
    const setClearConfirm = vi.fn();
    const postAction = vi.fn();
    const setStatus = vi.fn();

    undoDrawToolsItemAction('marker', setClearConfirm, postAction, setStatus);
    expect(postAction).toHaveBeenCalledWith({
      drawToolsAction: 'undo',
      drawToolsItemType: 'marker',
    });
    expect(setStatus).toHaveBeenCalledWith('draw marker undo requested');
  });

  it('handles clear items two-step confirmation', () => {
    const setClearConfirm = vi.fn();
    const setLinkStart = vi.fn();
    const postAction = vi.fn();
    const setStatus = vi.fn();

    // 1st click sets confirmation
    clearDrawToolsItemsAction(
      'polyline',
      null,
      setClearConfirm,
      setLinkStart,
      postAction,
      setStatus
    );

    expect(setClearConfirm).toHaveBeenCalledWith('polyline');
    expect(setStatus).toHaveBeenCalledWith('click Clear again to remove drawn links');
    expect(postAction).not.toHaveBeenCalled();

    // 2nd click executes clear
    clearDrawToolsItemsAction(
      'polyline',
      'polyline',
      setClearConfirm,
      setLinkStart,
      postAction,
      setStatus
    );

    expect(setClearConfirm).toHaveBeenCalledWith(null);
    expect(postAction).toHaveBeenCalledWith({
      drawToolsAction: 'clear',
      drawToolsItemType: 'polyline',
    });
    expect(setLinkStart).toHaveBeenCalledWith(null);
    expect(setStatus).toHaveBeenCalledWith('draw links cleared');
  });

  it('centers map on draw tools item', () => {
    const setMapView = vi.fn();
    const postAction = vi.fn();
    centerDrawToolsItemAction(
      {type: 'marker', storageIndex: 0, latLng: {lat: 52.3, lng: 4.9}, color: '#00f'},
      12,
      setMapView,
      postAction
    );
    expect(setMapView).toHaveBeenCalledWith(52.3, 4.9, 15);
    expect(postAction).toHaveBeenCalledWith({
      drawToolsAction: 'highlightIndex',
      drawToolsIndex: 0,
    });
  });

  it('imports valid draw tools items payload', () => {
    const setClearConfirm = vi.fn();
    const postAction = vi.fn();
    const setImportStatus = vi.fn();

    const validJson = JSON.stringify([{type: 'marker', latLng: {lat: 52.3, lng: 4.9}}]);
    importDrawToolsItemsAction(validJson, true, setClearConfirm, postAction, setImportStatus);

    expect(postAction).toHaveBeenCalled();
    expect(setClearConfirm).toHaveBeenCalledWith(null);
    expect(setImportStatus).toHaveBeenCalledWith('importing 1');
  });
});
