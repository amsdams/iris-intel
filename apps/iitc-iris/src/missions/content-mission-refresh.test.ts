import {describe, expect, it} from 'vitest';
import {shouldRefreshPortalMissions, type ShouldRefreshPortalMissionsInput} from './content-mission-refresh';

const base: ShouldRefreshPortalMissionsInput = {
  activeSidePanel: 'missions',
  selectedPortalGuid: 'portal-abc',
  missionSource: 'portal',
  missionStatus: 'idle',
  missionPortalGuid: 'portal-xyz',
};

describe('shouldRefreshPortalMissions', () => {
  it('returns true when all conditions are met', () => {
    expect(shouldRefreshPortalMissions(base)).toBe(true);
  });

  it('returns false when the active panel is not missions', () => {
    expect(shouldRefreshPortalMissions({...base, activeSidePanel: 'comm'})).toBe(false);
    expect(shouldRefreshPortalMissions({...base, activeSidePanel: null})).toBe(false);
    expect(shouldRefreshPortalMissions({...base, activeSidePanel: 'inventory'})).toBe(false);
  });

  it('returns false when source is not portal', () => {
    expect(shouldRefreshPortalMissions({...base, missionSource: 'view'})).toBe(false);
    expect(shouldRefreshPortalMissions({...base, missionSource: undefined})).toBe(false);
  });

  it('returns false while missions are loading', () => {
    expect(shouldRefreshPortalMissions({...base, missionStatus: 'loading'})).toBe(false);
  });

  it('returns false when selected portal guid is missing', () => {
    expect(shouldRefreshPortalMissions({...base, selectedPortalGuid: undefined})).toBe(false);
    expect(shouldRefreshPortalMissions({...base, selectedPortalGuid: ''})).toBe(false);
  });

  it('returns false when selected portal guid already matches missionsState.portalGuid', () => {
    expect(shouldRefreshPortalMissions({...base, missionPortalGuid: base.selectedPortalGuid})).toBe(false);
  });

  it('returns true for all non-loading statuses when other conditions hold', () => {
    const statuses = ['idle', 'ready', 'empty', 'error', 'auth'] as const;
    for (const missionStatus of statuses) {
      expect(shouldRefreshPortalMissions({...base, missionStatus})).toBe(true);
    }
  });
});
