import {describe, expect, it} from 'vitest';
import {getDrawToolsWorkflowDerivedState} from './content-draw-tools-workflow';
import type {IitcIrisPortalAnalysis} from './messages';

const markerItem = {
  type: 'marker' as const,
  storageIndex: 1,
  latLng: {lat: 52.3, lng: 4.9},
  color: '#ff0000',
  label: 'Marker',
};

const polylineItem = {
  type: 'polyline' as const,
  storageIndex: 2,
  latLngs: [
    {lat: 52.3, lng: 4.9},
    {lat: 52.4, lng: 5.0},
  ],
  color: '#a24ac3',
};

describe('content-draw-tools-workflow', () => {
  it('derives Draw Tools target and typed item lists from selected portal state', () => {
    const result = getDrawToolsWorkflowDerivedState(
      [markerItem, polylineItem],
      {guid: 'portal-1', latE6: 52300000, lngE6: 4900000, title: 'Portal Title'},
      null,
      {lat: 52.3, lng: 4.9},
      null
    );

    expect(result.drawToolsTarget).toEqual({
      lat: 52.3,
      lng: 4.9,
      label: 'Portal Title',
    });
    expect(result.drawToolsTargetDefaultLabel).toBe('Portal Title');
    expect(result.drawToolsLinkItems).toEqual([polylineItem]);
    expect(result.drawToolsMarkerItems).toEqual([markerItem]);
  });

  it('falls back to map context when no portal is selected', () => {
    const result = getDrawToolsWorkflowDerivedState([], null, {lat: 52.31, lng: 4.91}, {lat: 52.3, lng: 4.9}, null);

    expect(result.drawToolsTarget).toEqual({
      lat: 52.31,
      lng: 4.91,
      label: '52.310000, 4.910000',
    });
    expect(result.drawToolsTargetDefaultLabel).toBe('52.310000, 4.910000');
  });

  it('sorts drawn links and markers by distance from the current map center', () => {
    const nearMarker = {...markerItem, storageIndex: 4, latLng: {lat: 52.31, lng: 4.91}};
    const farMarker = {...markerItem, storageIndex: 5, latLng: {lat: 53, lng: 6}, label: 'Far'};
    const nearLink = {
      ...polylineItem,
      storageIndex: 6,
      latLngs: [{lat: 52.31, lng: 4.91}, {lat: 52.32, lng: 4.92}],
    };
    const farLink = {
      ...polylineItem,
      storageIndex: 7,
      latLngs: [{lat: 53, lng: 6}, {lat: 53.1, lng: 6.1}],
    };

    const result = getDrawToolsWorkflowDerivedState(
      [farMarker, nearMarker, farLink, nearLink],
      null,
      null,
      {lat: 52.3, lng: 4.9},
      null
    );

    expect(result.drawToolsMarkerItems.map((item) => item.storageIndex)).toEqual([4, 5]);
    expect(result.drawToolsLinkItems.map((item) => item.storageIndex)).toEqual([6, 7]);
  });

  it('matches drawn markers to currently loaded portal levels by coordinates', () => {
    const portalAnalysis = {
      portalslist: [{
        guid: 'portal-1',
        title: 'Loaded Portal',
        team: 'E',
        latE6: 52300000,
        lngE6: 4900000,
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
      }],
    } as unknown as IitcIrisPortalAnalysis;

    const result = getDrawToolsWorkflowDerivedState(
      [markerItem],
      null,
      null,
      {lat: 52.3, lng: 4.9},
      portalAnalysis
    );

    expect(result.drawToolsMarkerPortalInfoByStorageIndex[1]).toEqual({
      title: 'Loaded Portal',
      team: 'E',
      level: 8,
    });
  });
});
