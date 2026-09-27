import {describe, expect, it} from 'vitest';
import {
  filterAndSortDrawToolsMarkersForDisplay,
  filterAndSerializeDrawToolsItems,
  getDrawToolsLinkEndpointLabels,
  getDrawToolsItemCenter,
  getDrawToolsItemDistanceMeters,
  getDrawToolsItemDetail,
  getDrawToolsItemLabel,
  getDrawToolsMarkerCreatedIndexByStorageIndex,
  getDrawToolsMarkerPortalInfo,
  isSupportedDrawToolsItem,
  mergeDrawToolsMarkerPortalInfoCache,
  prepareDrawToolsImport,
  sortDrawToolsItemsByDistance,
  stripDrawToolsStorageIndex,
} from './content-draw-tools';
import type {IitcIrisDrawToolsItem} from '../messages';

describe('IITC IRIS Draw Tools helpers', () => {
  const marker: IitcIrisDrawToolsItem = {
    type: 'marker',
    storageIndex: 3,
    latLng: {lat: 52.1, lng: 4.2},
    color: '#ffffff',
    label: 'Target',
  };

  const link: IitcIrisDrawToolsItem = {
    type: 'polyline',
    storageIndex: 4,
    latLngs: [
      {lat: 52, lng: 4},
      {lat: 54, lng: 6},
    ],
    color: '#a24ac3',
  };

  it('formats labels and coordinate details for displayed items', () => {
    expect(getDrawToolsItemLabel(marker, 0)).toBe('Target');
    expect(getDrawToolsItemLabel({...marker, label: undefined}, 1)).toBe('Marker 2');
    expect(getDrawToolsItemLabel(link, 2)).toBe('Link 3');
    expect(getDrawToolsItemDetail(marker)).toBe('52.100000, 4.200000');
    expect(getDrawToolsItemDetail(link)).toBe('52.000000, 4.000000 -> 54.000000, 6.000000');
  });

  it('builds stable marker label indices from storage order', () => {
    expect(getDrawToolsMarkerCreatedIndexByStorageIndex([
      {...marker, storageIndex: 9},
      {...marker, storageIndex: 4},
      {...marker, storageIndex: 7},
    ])).toEqual({
      4: 0,
      7: 1,
      9: 2,
    });
  });

  it('computes item centers used by map centering actions', () => {
    expect(getDrawToolsItemCenter(marker)).toEqual({lat: 52.1, lng: 4.2});
    expect(getDrawToolsItemCenter(link)).toEqual({lat: 53, lng: 5});
  });

  it('sorts items by distance from an origin without changing storage indices', () => {
    const near = {...marker, storageIndex: 8, latLng: {lat: 52.11, lng: 4.21}};
    const far = {...marker, storageIndex: 9, latLng: {lat: 53, lng: 5}};

    expect(getDrawToolsItemDistanceMeters(near, {lat: 52.1, lng: 4.2})).toBeLessThan(2_000);
    expect(sortDrawToolsItemsByDistance([far, near], {lat: 52.1, lng: 4.2}).map((item) => item.storageIndex)).toEqual([8, 9]);
  });

  it('filters and sorts marker display items by faction metadata', () => {
    const resMarker = {...marker, storageIndex: 8, label: 'Resistance'};
    const enlMarker = {...marker, storageIndex: 5, label: 'Enlightened'};
    const unknownMarker = {...marker, storageIndex: 9, label: 'Unknown'};
    const markerInfo = {
      8: {title: 'RES Portal', team: 'R' as const, level: 4},
      5: {title: 'ENL Portal', team: 'E' as const, level: 7},
    };

    expect(filterAndSortDrawToolsMarkersForDisplay(
      [unknownMarker, resMarker, enlMarker],
      markerInfo,
      'R',
      'nearby',
    ).map((item) => item.storageIndex)).toEqual([8]);
    expect(filterAndSortDrawToolsMarkersForDisplay(
      [unknownMarker, resMarker, enlMarker],
      markerInfo,
      'unknown',
      'nearby',
    ).map((item) => item.storageIndex)).toEqual([9]);
    expect(filterAndSortDrawToolsMarkersForDisplay(
      [unknownMarker, resMarker, enlMarker],
      markerInfo,
      'all',
      'team',
    ).map((item) => item.storageIndex)).toEqual([8, 5, 9]);
  });

  it('sorts marker display items by created order, level, and name', () => {
    const unlabeledMarker = {...marker, storageIndex: 8, label: undefined};
    const namedMarker = {...marker, storageIndex: 5, label: 'Alpha'};
    const lowMarker = {...marker, storageIndex: 9, label: 'Beta'};
    const markerInfo = {
      8: {title: 'Zulu Portal', team: 'R' as const, level: 7},
      5: {title: 'Alpha Portal', team: 'E' as const, level: 4},
      9: {title: 'Beta Portal', team: 'M' as const, level: 1},
    };

    expect(filterAndSortDrawToolsMarkersForDisplay(
      [unlabeledMarker, lowMarker, namedMarker],
      markerInfo,
      'all',
      'created',
    ).map((item) => item.storageIndex)).toEqual([5, 8, 9]);
    expect(filterAndSortDrawToolsMarkersForDisplay(
      [lowMarker, namedMarker, unlabeledMarker],
      markerInfo,
      'all',
      'level',
    ).map((item) => item.storageIndex)).toEqual([8, 5, 9]);
    expect(filterAndSortDrawToolsMarkersForDisplay(
      [lowMarker, unlabeledMarker, namedMarker],
      markerInfo,
      'all',
      'name',
    ).map((item) => item.storageIndex)).toEqual([5, 9, 8]);
  });

  it('matches marker portal metadata by E6 coordinates', () => {
    expect(getDrawToolsMarkerPortalInfo(marker, [{
      guid: 'portal-1',
      title: 'Portal One',
      team: 'R',
      latE6: 52100000,
      lngE6: 4200000,
      level: 6,
      health: 100,
      resCount: 8,
      links: {in: 0, out: 0, count: 0},
      fields: 0,
      ap: {friendlyAp: 0, enemyAp: 0, destroyAp: 0, destroyResoAp: 0, captureAp: 0},
      history: {visited: false, captured: false, scoutControlled: false},
      mission: false,
      ornaments: 0,
      artifacts: 0,
    }])).toEqual({
      title: 'Portal One',
      team: 'R',
      level: 6,
    });
  });

  it('falls back to cached marker portal metadata and refreshes it with newer loaded portal data', () => {
    const oldCache = mergeDrawToolsMarkerPortalInfoCache({}, [{
      guid: 'portal-1',
      title: 'Old Portal',
      team: 'R',
      latE6: 52100000,
      lngE6: 4200000,
      level: 5,
      health: 100,
      resCount: 8,
      links: {in: 0, out: 0, count: 0},
      fields: 0,
      ap: {friendlyAp: 0, enemyAp: 0, destroyAp: 0, destroyResoAp: 0, captureAp: 0},
      history: {visited: false, captured: false, scoutControlled: false},
      mission: false,
      ornaments: 0,
      artifacts: 0,
    }]);

    expect(getDrawToolsMarkerPortalInfo(marker, [], oldCache)).toEqual({
      title: 'Old Portal',
      team: 'R',
      level: 5,
    });

    const refreshedCache = mergeDrawToolsMarkerPortalInfoCache(oldCache, [{
      guid: 'portal-1',
      title: 'Updated Portal',
      team: 'E',
      latE6: 52100000,
      lngE6: 4200000,
      level: 8,
      health: 100,
      resCount: 8,
      links: {in: 0, out: 0, count: 0},
      fields: 0,
      ap: {friendlyAp: 0, enemyAp: 0, destroyAp: 0, destroyResoAp: 0, captureAp: 0},
      history: {visited: false, captured: false, scoutControlled: false},
      mission: false,
      ornaments: 0,
      artifacts: 0,
    }]);

    expect(getDrawToolsMarkerPortalInfo(marker, [], refreshedCache)).toEqual({
      title: 'Updated Portal',
      team: 'E',
      level: 8,
    });
  });

  it('formats link endpoint labels from loaded or cached portal metadata', () => {
    const cache = mergeDrawToolsMarkerPortalInfoCache({}, [{
      guid: 'portal-start',
      title: 'Start Portal',
      team: 'E',
      latE6: 52000000,
      lngE6: 4000000,
      level: 7,
      health: 100,
      resCount: 8,
      links: {in: 0, out: 0, count: 0},
      fields: 0,
      ap: {friendlyAp: 0, enemyAp: 0, destroyAp: 0, destroyResoAp: 0, captureAp: 0},
      history: {visited: false, captured: false, scoutControlled: false},
      mission: false,
      ornaments: 0,
      artifacts: 0,
    }]);

    expect(getDrawToolsLinkEndpointLabels(link, [{
      guid: 'portal-end',
      title: 'End Portal',
      team: 'R',
      latE6: 54000000,
      lngE6: 6000000,
      level: 6,
      health: 100,
      resCount: 8,
      links: {in: 0, out: 0, count: 0},
      fields: 0,
      ap: {friendlyAp: 0, enemyAp: 0, destroyAp: 0, destroyResoAp: 0, captureAp: 0},
      history: {visited: false, captured: false, scoutControlled: false},
      mission: false,
      ornaments: 0,
      artifacts: 0,
    }], cache)).toEqual({
      from: 'Start Portal',
      to: 'End Portal',
    });
  });

  it('removes app-only storage indices before exporting IITC Draw Tools JSON', () => {
    expect(stripDrawToolsStorageIndex(marker)).toEqual({
      type: 'marker',
      latLng: {lat: 52.1, lng: 4.2},
      color: '#ffffff',
      label: 'Target',
    });
    expect(stripDrawToolsStorageIndex(link)).toEqual({
      type: 'polyline',
      latLngs: [
        {lat: 52, lng: 4},
        {lat: 54, lng: 6},
      ],
      color: '#a24ac3',
    });
  });

  it('keeps only supported Draw Tools item kinds for import', () => {
    expect(isSupportedDrawToolsItem({type: 'marker', latLng: {lat: 1, lng: 2}})).toBe(true);
    expect(isSupportedDrawToolsItem({type: 'polyline', latLngs: [{lat: 1, lng: 2}]})).toBe(true);
    expect(isSupportedDrawToolsItem({type: 'polygon', latLngs: [{lat: 1, lng: 2}]})).toBe(false);
  });

  it('filters and serializes items by type for copy action', () => {
    const jsonAll = filterAndSerializeDrawToolsItems([marker, link]);
    expect(jsonAll).toContain('Target');
    const jsonMarkers = filterAndSerializeDrawToolsItems([marker, link], 'marker');
    expect(jsonMarkers).toContain('Target');
    const jsonLinks = filterAndSerializeDrawToolsItems([marker, link], 'polyline');
    expect(jsonLinks).not.toContain('Target');
  });

  it('prepares imported JSON and filters out unsupported items', () => {
    const rawJson = JSON.stringify([
      {type: 'marker', latLng: {lat: 10, lng: 20}, color: '#ffffff', label: 'Imported'},
      {type: 'polygon', latLngs: [{lat: 1, lng: 2}, {lat: 3, lng: 4}]},
    ]);
    const prep = prepareDrawToolsImport(rawJson);
    expect(prep.supportedCount).toBe(1);
    expect(prep.skippedCount).toBe(1);
    expect(prep.supportedJson).toContain('Imported');

    expect(() => prepareDrawToolsImport(JSON.stringify([{type: 'polygon', latLngs: [{lat: 1, lng: 2}, {lat: 3, lng: 4}]}]))).toThrow(
      'no supported links or markers',
    );
  });
});
