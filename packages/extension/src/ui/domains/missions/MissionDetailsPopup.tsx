import { h, JSX } from 'preact';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from '../../theme';
import './missions.css';

const WAYPOINT_TYPE_LABELS: Record<number, string> = {
  1: 'Portal',
  2: 'Field Trip',
};

const WAYPOINT_OBJECTIVE_LABELS: Record<number, string> = {
  1: 'Hack',
  2: 'Capture / Upgrade',
  3: 'Create Link',
  4: 'Create Field',
  5: 'Answer',
};

export function MissionDetailsPopup(): JSX.Element | null {
  const mission = useStore((state) => state.missionDetails);
  const clearMission = useStore((state) => state.setMissionDetails);
  const missionsPortalId = useStore((state) => state.missionsPortalId);
  const portalName = useStore((state) =>
    state.missionsPortalId ? state.portals[state.missionsPortalId]?.name : null
  );
  const zoom = useStore((state) => state.mapState.zoom);
  const themeId = useStore((state) => state.themeId);
  const theme = THEMES[themeId] || THEMES.INGRESS;

  if (!mission) return null;

  const visibleWaypoints = mission.waypoints.filter((waypoint) => !waypoint.hidden);
  const hiddenWaypointCount = mission.waypoints.length - visibleWaypoints.length;

  const focusWaypoint = (waypoint: typeof visibleWaypoints[number]): void => {
    if (waypoint.lat === undefined || waypoint.lng === undefined) return;

    window.postMessage({
      type: 'IRIS_MOVE_MAP',
      center: {
        lat: waypoint.lat,
        lng: waypoint.lng,
      },
      zoom: Math.max(zoom, 17),
    }, '*');

    if (waypoint.type === 1) {
      window.postMessage({
        type: 'IRIS_PORTAL_DETAILS_REQUEST',
        guid: waypoint.id,
      }, '*');
    }
  };

  return (
    <Popup
      onClose={() => clearMission(null)}
      title="Mission Details"
      className="iris-popup-top-right iris-popup-medium"
      style={{
        ['--iris-popup-border' as any]: theme.AQUA,
        ['--iris-popup-shadow' as any]: `${theme.AQUA}55`,
        ['--iris-popup-title-color' as any]: theme.AQUA,
      }}
    >
      <div className="iris-mission-info">
        <div className="iris-mission-header-card">
          <div className="iris-mission-source">
            {missionsPortalId ? 'Portal Mission Details' : 'Mission Details'}
          </div>
          {missionsPortalId && portalName && (
            <div className="iris-mission-context-copy">
              Starting from {portalName}
            </div>
          )}
        </div>

        {mission.logoUrl && (
          <img
            src={mission.logoUrl}
            alt={mission.title}
            className="iris-mission-logo"
          />
        )}

        <div className="iris-mission-title">
          {mission.title}
        </div>

        {mission.author && (
          <div className="iris-mission-meta iris-mission-meta-inline">
            <span>Author</span>
            <span className="iris-mission-author">
              {mission.author}
            </span>
          </div>
        )}

        <div className="iris-mission-summary">
          {mission.rating !== undefined && (
            <div className="iris-mission-summary-item">
              Rating: <span>{(mission.rating * 100).toFixed(0)}%</span>
            </div>
          )}
          {mission.medianCompletionTime && (
            <div className="iris-mission-summary-item">
              Time: <span>{mission.medianCompletionTime}</span>
            </div>
          )}
          {mission.participants !== undefined && (
            <div className="iris-mission-summary-item">
              Players: <span>{mission.participants}</span>
            </div>
          )}
          <div className="iris-mission-summary-item">
            Waypoints: <span>{visibleWaypoints.length}</span>
          </div>
          {hiddenWaypointCount > 0 && (
            <div className="iris-mission-summary-item">
              Hidden: <span>{hiddenWaypointCount}</span>
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
          {hiddenWaypointCount > 0 && (
            <div className="iris-mission-waypoint-note">
              Hidden waypoints are omitted until Intel reveals them.
            </div>
          )}
          {visibleWaypoints.map((waypoint) => (
            <div
              key={waypoint.id}
              className={`iris-mission-waypoint${
                waypoint.lat !== undefined && waypoint.lng !== undefined
                  ? ' iris-mission-waypoint-clickable'
                  : ''
              }`}
              onClick={() => focusWaypoint(waypoint)}
            >
              <div className="iris-mission-waypoint-index">
                {waypoint.index + 1}
              </div>
              <div className="iris-mission-waypoint-body">
                <div className="iris-mission-waypoint-title">{waypoint.title}</div>
                <div className="iris-mission-waypoint-meta">
                  <span>Type: {WAYPOINT_TYPE_LABELS[waypoint.type] ?? waypoint.type}</span>
                  <span>Objective: {WAYPOINT_OBJECTIVE_LABELS[waypoint.objective] ?? waypoint.objective}</span>
                </div>
                {waypoint.lat !== undefined && waypoint.lng !== undefined ? (
                  <div className="iris-mission-waypoint-coords">
                    {waypoint.lat.toFixed(6)}, {waypoint.lng.toFixed(6)}
                  </div>
                ) : (
                  <div className="iris-mission-waypoint-coords">
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
