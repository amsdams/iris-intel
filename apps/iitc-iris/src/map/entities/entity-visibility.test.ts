import {describe, expect, it} from 'vitest';
import {DEFAULT_LAYER_SETTINGS} from '../layers/layer-registry';
import type {IitcIrisLayerSettings, IitcIrisRenderPortal} from '../../messages';
import {getCoreEntityRenderScope, getSecondaryEntityRenderUpdate, getDirectFactionToggleTeam,
  isPortalVisibleWith, isLinkVisibleWith, isFieldVisibleWith, getPortalLevelBucket} from './entity-visibility';

const portal = (team: IitcIrisRenderPortal['team'] = 'R', level: number | undefined = 8, isPlaceholder = false): IitcIrisRenderPortal =>
  ({guid: 'portal', team, level, isPlaceholder, latE6: 52, lngE6: 4});
const settings = (changes: Partial<IitcIrisLayerSettings> = {}): IitcIrisLayerSettings => ({...DEFAULT_LAYER_SETTINGS, ...changes});

describe('entity visibility policy', () => {
  it('applies faction filters across entity kinds without hiding neutral entities', () => {
    for (const [team, key] of [['R', 'resistance'], ['E', 'enlightened'], ['M', 'machina']] as const) {
      const filters = settings({[key]: false});
      expect(isPortalVisibleWith(filters, portal(team))).toBe(false);
      expect(isLinkVisibleWith(filters, {guid: 'link', team, oLatE6: 1, oLngE6: 2, dLatE6: 3, dLngE6: 4})).toBe(false);
      expect(isFieldVisibleWith(filters, {guid: 'field', team, points: []})).toBe(false);
      expect(isPortalVisibleWith(filters, portal('N', 0))).toBe(true);
    }
  });
  it('keeps whole-overlay switches independent of the other entity kinds', () => {
    expect(isPortalVisibleWith(settings({portals: false}), portal())).toBe(false);
    expect(isLinkVisibleWith(settings({portals: false}), {guid: 'l', team: 'R', oLatE6: 1, oLngE6: 2, dLatE6: 3, dLngE6: 4})).toBe(true);
    expect(isFieldVisibleWith(settings({fields: false}), {guid: 'f', team: 'R', points: []})).toBe(false);
  });
  it('combines level and unclaimed filters while retaining their existing matching rules', () => {
    for (const team of ['R', 'E', 'M'] as const) {
      expect(isPortalVisibleWith(settings({level8Portals: false}), portal(team))).toBe(false);
      expect(isPortalVisibleWith(settings({level8Portals: false}), portal(team, 7))).toBe(true);
    }
    const filters = settings({unclaimedPortals: false});
    expect(isPortalVisibleWith(filters, portal('N', 0))).toBe(false);
    expect(isPortalVisibleWith(filters, {...portal(), level: undefined})).toBe(false);
    expect(isPortalVisibleWith(filters, portal('R', 8, true))).toBe(false);
    expect(isPortalVisibleWith(filters, portal('R', 8))).toBe(true);
    expect(getPortalLevelBucket(portal('R', 8, true))).toBe('unclaimed');
  });
  it('scopes combined changes and lets whole-overlay changes supersede narrower buckets', () => {
    const scoped = getCoreEntityRenderScope(['resistance', 'level8Portals', 'unclaimedPortals']);
    expect([...scoped.fieldTeams]).toEqual(['R']);
    expect([...scoped.portalTeams]).toEqual(['R', 'N']);
    expect([...scoped.portalLevels]).toEqual([8, 'unclaimed']);
    for (const keys of [['resistance', 'portals'], ['portals', 'resistance']] as const) {
      const scope = getCoreEntityRenderScope([...keys]);
      expect(scope.allPortals).toBe(true);
      expect(scope.portalTeams.size).toBe(0);
      expect(scope.portalLevels.size).toBe(0);
      expect([...scope.linkTeams]).toEqual(['R']);
    }
    expect(getDirectFactionToggleTeam(getCoreEntityRenderScope(['resistance']))).toBe('R');
    expect(getDirectFactionToggleTeam(scoped)).toBeNull();
    expect(getCoreEntityRenderScope([])).toMatchObject({fields: false, links: false, portals: false});
    expect(getCoreEntityRenderScope()).toMatchObject({allFields: true, allLinks: true, allPortals: true});
  });
  it('requests secondary work only for affected selections, overlays and drawings', () => {
    expect(getSecondaryEntityRenderUpdate(settings(), ['level8Portals'])).toEqual({portalOverlays: false,
      selectedPortal: true, selectedMapObject: false, drawTools: false});
    expect(getSecondaryEntityRenderUpdate(settings({keyCount: true}), ['level8Portals']).portalOverlays).toBe(true);
    expect(getSecondaryEntityRenderUpdate(settings(), ['links'])).toEqual({portalOverlays: false,
      selectedPortal: false, selectedMapObject: true, drawTools: true});
    expect(getSecondaryEntityRenderUpdate(settings(), ['ornaments'])).toEqual({portalOverlays: true,
      selectedPortal: false, selectedMapObject: false, drawTools: false});
    expect(getSecondaryEntityRenderUpdate(settings())).toEqual({portalOverlays: true,
      selectedPortal: true, selectedMapObject: true, drawTools: true});
  });
});
