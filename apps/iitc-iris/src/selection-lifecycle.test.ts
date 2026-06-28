import {describe, expect, it} from 'vitest';
import {getSelectionView, mapContextSelected, portalSelected, type IitcIrisMapContextSelection} from './selection-lifecycle';
import type {IitcIrisSelectedPortal} from './messages';

const selectedPortal: IitcIrisSelectedPortal = {
  guid: 'portal-guid',
  title: 'Portal',
  team: 'E',
  latE6: 52_000_000,
  lngE6: 5_000_000,
  isPlaceholder: false,
  ornaments: [],
  artifacts: [],
  links: {count: 0, incoming: 0, outgoing: 0, guids: []},
  fields: {count: 0, guids: []},
};

const selectedLink: IitcIrisMapContextSelection = {
  target: 'link',
  lat: 52,
  lng: 5,
  zoom: 15,
  guid: 'link-guid',
};

describe('IITC IRIS selection lifecycle facade', () => {
  it('derives the selected menu view from selected portal state', () => {
    expect(getSelectionView({selectedPortal, mapContext: null}, 'map')).toMatchObject({
      selectedMapObject: null,
      hasSelectedObject: true,
      selectedPrimaryLabel: 'Portal',
      activeSelectedSheet: 'portal',
      selectedKind: 'portal',
      showPortalSidePanel: true,
    });
  });

  it('lets selected map objects own the selected menu and suppress portal side panel while their sheet is active', () => {
    expect(getSelectionView({selectedPortal, mapContext: selectedLink}, 'selectedLink')).toMatchObject({
      selectedMapObject: selectedLink,
      hasSelectedObject: true,
      selectedPrimaryLabel: 'Link',
      activeSelectedSheet: 'selectedLink',
      selectedKind: 'link',
      showPortalSidePanel: false,
    });
  });

  it('keeps map context separate from selected object state', () => {
    const view = getSelectionView({selectedPortal: null, mapContext: {...selectedLink, target: 'map'}}, 'view');

    expect(view).toMatchObject({
      selectedMapObject: null,
      hasSelectedObject: false,
      selectedPrimaryLabel: 'Selected',
      activeSelectedSheet: 'map',
      selectedKind: null,
      showPortalSidePanel: false,
    });
  });

  it('maps portal selection to the portal sheet and clears map context', () => {
    expect(portalSelected(true)).toEqual({
      mapContext: null,
      activeSheet: 'portal',
      cancelPanelRequests: true,
    });
  });

  it('maps context messages to the expected selected sheet and status text', () => {
    expect(mapContextSelected({
      lat: 52.1234567,
      lng: 5.9876543,
      contextTarget: 'field',
      contextGuid: 'field-guid',
      contextTeam: 'R',
      contextDistanceMeters: 1234,
    }, 14, false)).toEqual({
      mapContext: {
        lat: 52.1234567,
        lng: 5.9876543,
        zoom: 14,
        target: 'field',
        guid: 'field-guid',
        team: 'R',
        portalGuids: undefined,
        portalAnchors: undefined,
        distanceMeters: 1234,
      },
      activeSheet: 'selectedField',
      cancelPanelRequests: false,
      status: 'field context 52.123457,5.987654',
    });
  });
});
