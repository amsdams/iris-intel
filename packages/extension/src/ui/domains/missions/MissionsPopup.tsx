import { h, JSX } from 'preact';
import { useEffect } from 'preact/hooks';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, UI_COLORS } from '../../theme';

interface MissionsPopupProps {
  onClose: () => void;
}

export function MissionsPopup({ onClose }: MissionsPopupProps): JSX.Element {
  const missions = useStore((state) => state.missionsInView);
  const bounds = useStore((state) => state.mapState.bounds);
  const missionsPortalId = useStore((state) => state.missionsPortalId);
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

  return (
    <Popup
      onClose={onClose}
      title={missionsPortalId ? 'Missions Starting Here' : 'Missions'}
      style={{
        top: '90px',
        left: '20px',
        minWidth: '320px',
        maxWidth: '420px',
        border: `2px solid ${theme.AQUA}`,
        boxShadow: `0 0 20px ${theme.AQUA}55`,
      }}
    >
      <div className="iris-missions-list">
        {missionsPortalId && portalName && (
          <div className="iris-missions-context" style={{ color: theme.AQUA }}>
            {portalName}
          </div>
        )}

        {!missionsPortalId && !bounds && (
          <div className="iris-missions-empty">
            Move the map once so IRIS has viewport bounds.
          </div>
        )}

        {((missionsPortalId !== null) || bounds) && missions.length === 0 && (
          <div className="iris-missions-empty">
            {missionsPortalId ? 'No missions starting here.' : 'No missions in range, try zooming out.'}
          </div>
        )}

        {missions.map((mission) => (
          <button
            key={mission.id}
            className="iris-mission-list-item"
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
              <div className="iris-mission-list-title" style={{ color: theme.AQUA }}>
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
          <div className="iris-missions-hint" style={{ color: UI_COLORS.TEXT_MUTED }}>
            Click a mission to load route details.
          </div>
        )}
      </div>
    </Popup>
  );
}
