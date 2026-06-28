import {describe, expect, it} from 'vitest';
import {
  DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS,
  isPortalDetailSectionId,
  PORTAL_DETAIL_SECTION_REGISTRY,
  type IitcIrisPortalDetailSectionId,
} from './portal-detail-section-registry';

describe('IITC IRIS portal detail section registry', () => {
  it('keeps current portal detail section ids, labels, and default open state registered in UI order', () => {
    const expectedIds: IitcIrisPortalDetailSectionId[] = ['mods', 'resonators', 'facts'];

    expect(PORTAL_DETAIL_SECTION_REGISTRY.map((entry) => entry.id)).toEqual(expectedIds);
    expect(PORTAL_DETAIL_SECTION_REGISTRY.map((entry) => entry.label)).toEqual(['Mods', 'Resonators', 'Facts']);
    expect(DEFAULT_PORTAL_DETAIL_SECTION_SETTINGS).toEqual({
      mods: true,
      resonators: true,
      facts: false,
    });
  });

  it('validates stored portal detail section ids against the registry', () => {
    expect(isPortalDetailSectionId('mods')).toBe(true);
    expect(isPortalDetailSectionId('resonators')).toBe(true);
    expect(isPortalDetailSectionId('facts')).toBe(true);
    expect(isPortalDetailSectionId('history')).toBe(false);
  });
});
