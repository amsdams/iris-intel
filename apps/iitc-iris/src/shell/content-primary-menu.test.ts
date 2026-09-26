import {describe, expect, it} from 'vitest';
import {getIitcIrisPrimaryMenuEffect, type IitcIrisPrimaryMenuContext} from './content-primary-menu';

const mapContext: IitcIrisPrimaryMenuContext = {
  activePrimaryMenu: 'map',
  activeSelectedSheet: 'portal',
  activeSheet: 'map',
  hasSelectedObject: true,
};

describe('IITC IRIS content primary menu', () => {
  it('does nothing for Selected when no map object is selected', () => {
    expect(getIitcIrisPrimaryMenuEffect('selected', {...mapContext, hasSelectedObject: false})).toEqual({kind: 'none'});
  });

  it('toggles the current selected-object sheet', () => {
    expect(getIitcIrisPrimaryMenuEffect('selected', {...mapContext, activeSelectedSheet: 'selectedLink'})).toEqual({
      kind: 'toggleSheet',
      sheet: 'selectedLink',
    });
  });

  it('toggles map menu sheets closed but opens display from the map', () => {
    expect(getIitcIrisPrimaryMenuEffect('map', {...mapContext, activeSheet: 'view'})).toEqual({kind: 'closeSheet'});
    expect(getIitcIrisPrimaryMenuEffect('map', mapContext)).toEqual({kind: 'openSheet', sheet: 'layers'});
    expect(getIitcIrisPrimaryMenuEffect('map', {...mapContext, activePrimaryMenu: 'selected', activeSheet: 'portal'})).toEqual({
      kind: 'openSheet',
      sheet: 'layers',
    });
  });

  it('routes Agent, COMM, and System to their existing handlers', () => {
    expect(getIitcIrisPrimaryMenuEffect('agent', mapContext)).toEqual({kind: 'toggleSheet', sheet: 'agent'});
    expect(getIitcIrisPrimaryMenuEffect('comm', mapContext)).toEqual({kind: 'toggleComm'});
    expect(getIitcIrisPrimaryMenuEffect('system', mapContext)).toEqual({kind: 'toggleSheet', sheet: 'system'});
  });
});
