import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, UI_COLORS } from '../../theme';

export function MissionDetailsPopup(): JSX.Element | null {
  const mission = useStore((state) => state.missionDetails);
  const clearMission = useStore((state) => state.setMissionDetails);
  const themeId = useStore((state) => state.themeId);
  const theme = THEMES[themeId] || THEMES.INGRESS;

  if (!mission) return null;

  const visibleWaypoints = mission.waypoints.filter((waypoint) => !waypoint.hidden);

  return (
    <Popup
      onClose={() => clearMission(null)}
      title="Mission Details"
      style={{
        top: '90px',
        right: '20px',
        minWidth: '320px',
        maxWidth: '420px',
        border: `2px solid ${theme.AQUA}`,
        boxShadow: `0 0 20px ${theme.AQUA}55`,
      }}
    >
      <div className="iris-mission-info">
        {mission.logoUrl && (
          <img
            src={mission.logoUrl}
            alt={mission.title}
            className="iris-mission-logo"
          />
        )}

        <div className="iris-mission-title" style={{ color: theme.AQUA }}>
          {mission.title}
        </div>

        {mission.author && (
          <div className="iris-mission-meta">
            Author:{' '}
            <span
              className="iris-mission-author"
              style={{
                backgroundImage: `linear-gradient(90deg, ${theme.E}, ${theme.R}, ${theme.M})`,
              }}
            >
              {mission.author}
            </span>
          </div>
        )}

        <div className="iris-mission-summary">
          {mission.rating !== undefined && (
            <div className="iris-mission-summary-item">
              Rating: <span style={{ color: theme.AQUA }}>{(mission.rating * 100).toFixed(0)}%</span>
            </div>
          )}
          {mission.medianCompletionTime && (
            <div className="iris-mission-summary-item">
              Time: <span style={{ color: theme.AQUA }}>{mission.medianCompletionTime}</span>
            </div>
          )}
          {mission.participants !== undefined && (
            <div className="iris-mission-summary-item">
              Players: <span style={{ color: theme.AQUA }}>{mission.participants}</span>
            </div>
          )}
        </div>

        {mission.description && (
          <div className="iris-mission-description">
            {mission.description}
          </div>
        )}

        <div className="iris-mission-waypoints">
          <div className="iris-mission-section-title">WAYPOINTS ({visibleWaypoints.length})</div>
          {visibleWaypoints.map((waypoint) => (
            <div key={waypoint.id} className="iris-mission-waypoint">
              <div className="iris-mission-waypoint-index" style={{ borderColor: theme.AQUA, color: theme.AQUA }}>
                {waypoint.index + 1}
              </div>
              <div className="iris-mission-waypoint-body">
                <div className="iris-mission-waypoint-title">{waypoint.title}</div>
                {waypoint.lat !== undefined && waypoint.lng !== undefined ? (
                  <div className="iris-mission-waypoint-coords">
                    {waypoint.lat.toFixed(6)}, {waypoint.lng.toFixed(6)}
                  </div>
                ) : (
                  <div className="iris-mission-waypoint-coords" style={{ color: UI_COLORS.TEXT_MUTED }}>
                    No map coordinates in payload
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Popup>
  );
}
