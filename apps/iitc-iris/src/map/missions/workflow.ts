import {useCallback, useEffect, useState, type Dispatch, type StateUpdater} from 'preact/hooks';
import type {IitcIrisMessage, IitcIrisMissionSource, IitcIrisMissionsState} from '../../messages';
import type {IitcIrisSidePanelId} from '../../shell/menu-registry';
import {
  createMissionZoomMessage,
  createRequestMissionDetailsMessage,
  createRequestMissionsMessage,
} from '../../shell/outbound-messages';
import {shouldRefreshPortalMissions} from './refresh';

const EMPTY_MISSIONS_STATE: IitcIrisMissionsState = {
  status: 'idle',
  requestState: 'idle',
  missions: [],
  detailsStatus: 'idle',
};

interface MissionsWorkflow {
  missionsState: IitcIrisMissionsState;
  setMissionsState: Dispatch<StateUpdater<IitcIrisMissionsState>>;
  refreshMissions: (source?: IitcIrisMissionSource) => void;
  requestMissionDetails: (missionGuid: string) => void;
  zoomToMission: () => void;
}

export function useMissionsWorkflow(postMessage: (message: IitcIrisMessage) => void): MissionsWorkflow {
  const [missionsState, setMissionsState] = useState<IitcIrisMissionsState>(() => EMPTY_MISSIONS_STATE);

  const refreshMissions = useCallback((source: IitcIrisMissionSource = missionsState.source ?? 'view'): void => {
    postMessage(createRequestMissionsMessage(source));
  }, [missionsState.source, postMessage]);

  const requestMissionDetails = (missionGuid: string): void => {
    postMessage(createRequestMissionDetailsMessage(missionGuid));
  };

  const zoomToMission = (): void => {
    postMessage(createMissionZoomMessage());
  };

  return {missionsState, setMissionsState, refreshMissions, requestMissionDetails, zoomToMission};
}

// Keep portal-following requests at their original position among app effects.
export function useMissionsEffects(
  {missionsState, refreshMissions}: ReturnType<typeof useMissionsWorkflow>,
  activeSidePanel: IitcIrisSidePanelId | null,
  selectedPortalGuid: string | undefined,
): void {
  useEffect(() => {
    if (!shouldRefreshPortalMissions({
      activeSidePanel,
      selectedPortalGuid,
      missionSource: missionsState.source,
      missionStatus: missionsState.status,
      missionPortalGuid: missionsState.portalGuid,
    })) return;
    refreshMissions('portal');
  }, [activeSidePanel, selectedPortalGuid, missionsState.portalGuid, missionsState.source, missionsState.status, refreshMissions]);
}
