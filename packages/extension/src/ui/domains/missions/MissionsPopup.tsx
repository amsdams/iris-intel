import { h, JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from '../../theme';
import './missions.css';

interface MissionsPopupProps {
  onClose: () => void;
}

export function MissionsPopup({ onClose }: MissionsPopupProps): JSX.Element {
  const missions = useStore((state) => state.missionsInView);
  const bounds = useStore((state) => state.mapState.bounds);
  const missionsPortalId = useStore((state) => state.missionsPortalId);
  const missionDetails = useStore((state) => state.missionDetails);
  const topMissionsStatus = useStore((state) => state.endpointDiagnostics.topMissions.status);
  const missionDetailsStatus = useStore((state) => state.endpointDiagnostics.missionDetails.status);
  const portalName = useStore((state) =>
    state.missionsPortalId ? state.portals[state.missionsPortalId]?.name : null
  );
  const themeId = useStore((state) => state.themeId);
  const theme = THEMES[themeId] || THEMES.INGRESS;

  useEffect(() => {
    if (missionsPortalId || bounds) {
      window.postMessage({
        type: 'IRIS_MISSIONS_REQUEST',
      }, '*');
    }
  }, [bounds, missionsPortalId]);

  const handleMissionClick = (missionId: string): void => {
    window.postMessage({
      type: 'IRIS_MISSION_DETAILS_REQUEST',
      guid: missionId,
    }, '*');
  };

  const selectedMissionId = missionDetails?.id ?? null;
  const sourceLabel = missionsPortalId ? 'Portal Missions' : 'Viewport Missions';
  const contextCopy = missionsPortalId
    ? 'Missions starting from the selected portal.'
    : 'Missions currently available within the Intel viewport.';
  const isLoadingList = topMissionsStatus === 'in_flight' && missions.length === 0;
  const isLoadingDetails = missionDetailsStatus === 'in_flight';

  return (
    <Popup
      onClose={onClose}
      title={missionsPortalId ? 'Missions Starting Here' : 'Missions'}
      className="iris-popup-center iris-popup-medium"
      style={{
        ['--iris-popup-border' as any]: theme.AQUA,
        ['--iris-popup-shadow' as any]: `${theme.AQUA}55`,
        ['--iris-popup-title-color' as any]: theme.AQUA,
      }}
    >
      <div className="iris-missions-list">
        <div className="iris-missions-header-card">
          <div className="iris-missions-header-top">
            <div className="iris-missions-source">
              {sourceLabel}
            </div>
            <div className="iris-missions-count">
              {missions.length} mission{missions.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="iris-missions-context-copy">
            {contextCopy}
          </div>
          {missionsPortalId && portalName && (
            <div className="iris-missions-context">
              {portalName}
            </div>
          )}
        </div>

        {!missionsPortalId && !bounds && (
          <div className="iris-missions-empty">
            Move the map once so IRIS has viewport bounds.
          </div>
        )}

        {isLoadingList && (
          <div className="iris-missions-loading">
            Loading missions from Intel...
          </div>
        )}

        {!isLoadingList && ((missionsPortalId !== null) || bounds) && missions.length === 0 && (
          <div className="iris-missions-empty">
            {missionsPortalId ? 'No missions starting here.' : 'No missions in range, try zooming out.'}
          </div>
        )}

        {missions.map((mission) => (
          <button
            key={mission.id}
            className={`iris-mission-list-item ${selectedMissionId === mission.id ? 'iris-mission-list-item-active' : ''}`}
            onClick={() => handleMissionClick(mission.id)}
          >
            {mission.logoUrl ? (
              <img
                src={mission.logoUrl}
                alt={mission.title}
                className="iris-mission-list-logo"
              />
            ) : (
              <div className="iris-mission-list-logo iris-mission-list-logo-placeholder" />
            )}
            <div className="iris-mission-list-body">
              <div className="iris-mission-list-title">
                {mission.title}
              </div>
              <div className="iris-mission-list-meta">
                {mission.rating !== undefined && <span>Rating: {(mission.rating * 100).toFixed(0)}%</span>}
                {mission.medianCompletionTime && <span>Time: {mission.medianCompletionTime}</span>}
              </div>
            </div>
          </button>
        ))}

        {missions.length > 0 && (
          <>
            <div className="iris-missions-hint">
              Select a mission to load details and draw its route on the map.
            </div>
            {isLoadingDetails && (
              <div className="iris-missions-loading-inline">
                Loading mission details...
              </div>
            )}
          </>
        )}
      </div>
    </Popup>
  );
}
