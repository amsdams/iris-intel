import type {IitcIrisMissionSource, IitcIrisMissionsState} from './messages';
import type {IitcIrisSidePanelId} from './menu-registry';

export interface ShouldRefreshPortalMissionsInput {
  activeSidePanel: IitcIrisSidePanelId | null;
  selectedPortalGuid: string | undefined;
  missionSource: IitcIrisMissionSource | undefined;
  missionStatus: IitcIrisMissionsState['status'];
  missionPortalGuid: string | undefined;
}

/** Returns true when the portal-mission refresh effect should call refreshMissions('portal'). */
export function shouldRefreshPortalMissions(input: ShouldRefreshPortalMissionsInput): boolean {
  const {activeSidePanel, selectedPortalGuid, missionSource, missionStatus, missionPortalGuid} = input;
  if (activeSidePanel !== 'missions') return false;
  if (missionSource !== 'portal') return false;
  if (missionStatus === 'loading') return false;
  if (!selectedPortalGuid) return false;
  if (selectedPortalGuid === missionPortalGuid) return false;
  return true;
}
