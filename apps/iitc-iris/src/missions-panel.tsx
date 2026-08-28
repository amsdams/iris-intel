import {h} from 'preact';
import {getCommTeamClass} from './comm-display';
import type {IitcIrisMissionSource, IitcIrisMissionsState} from './messages';
import {formatElapsedSeconds, getAuthErrorMessage} from './ui-status';

const IITC_TM_ICON_BASE = 'https://commondatastorage.googleapis.com/ingress.com/img/tm_icons';
const MISSION_TYPE_IMAGE_BY_TYPE_NUM: Record<number, string> = {
  1: 'mission-type-sequential.png',
  2: 'mission-type-random.png',
  3: 'mission-type-hidden.png',
};

export interface IitcIrisMissionsPanelProps {
  cameraZoom: number;
  hasSelectedPortal: boolean;
  missionsState: IitcIrisMissionsState;
  refreshMissions: (source?: IitcIrisMissionSource) => void;
  requestMissionDetails: (missionGuid: string) => void;
  zoomToAndShowPortal: (portalGuid?: string, latE6?: number, lngE6?: number, zoom?: number) => void;
  zoomToMission: () => void;
}

function getExtensionUrl(path: string): string {
  return chrome.runtime.getURL(path);
}

function getMissionTypeIcon(typeNum?: number): string {
  return getExtensionUrl(`images/${MISSION_TYPE_IMAGE_BY_TYPE_NUM[typeNum ?? 0] ?? 'mission-type-unknown.png'}`);
}

function getMissionMetricIcon(name: 'rating' | 'time' | 'length' | 'agents' | 'waypoints' | 'order'): string {
  if (name === 'rating') return `${IITC_TM_ICON_BASE}/like.png`;
  if (name === 'time') return `${IITC_TM_ICON_BASE}/time.png`;
  if (name === 'agents') return `${IITC_TM_ICON_BASE}/players.png`;
  if (name === 'length') return getExtensionUrl('images/mission-length.png');
  return getMissionTypeIcon();
}

function formatMissionRating(ratingE6: number | undefined): string {
  if (ratingE6 === undefined) return '-';
  return `${Math.round(ratingE6 / 10_000)}%`;
}

function formatMissionDuration(milliseconds: number | undefined, label: string | undefined): string {
  if (label) return label;
  if (milliseconds === undefined || milliseconds <= 0) return '-';
  const minutes = Math.max(1, Math.round(milliseconds / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

function formatDistance(meters: number | undefined): string {
  if (meters === undefined || !Number.isFinite(meters) || meters <= 0) return '-';
  return meters > 1000 ? `${Math.round(meters / 100) / 10}km` : `${Math.round(meters * 10) / 10}m`;
}

function formatInteger(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : value.toLocaleString();
}

function formatMissionOrderLabel(order?: string): string {
  if (!order) return 'any order';
  return order.replace(/_/g, ' ').toLowerCase();
}

function formatMissionRowMeta(missionsState: IitcIrisMissionsState, mission: IitcIrisMissionsState['missions'][number]): string {
  const selected = missionsState.selectedMission?.guid === mission.guid ? missionsState.selectedMission : undefined;
  if (selected) {
    return [
      `${formatMissionRating(mission.ratingE6)} rating`,
      formatMissionDuration(mission.medianCompletionTimeMs, mission.durationLabel),
    ].filter((part) => part && part !== '-').join(' · ');
  }
  const parts = [
    `${formatMissionRating(mission.ratingE6)} rating`,
    formatMissionDuration(mission.medianCompletionTimeMs, mission.durationLabel),
  ];
  if (mission.authorNickname) parts.push(`by ${mission.authorNickname}`);
  if (mission.routeLengthMeters !== undefined) parts.push(formatDistance(mission.routeLengthMeters));
  if (mission.numUniqueCompletedPlayers !== undefined) parts.push(`${formatInteger(mission.numUniqueCompletedPlayers)} agents`);
  if (mission.waypointCount !== undefined) parts.push(`${mission.waypointCount} waypoints`);
  if (mission.type) parts.push(formatMissionOrderLabel(mission.type));
  return parts.filter((part) => part && part !== '-').join(' · ');
}

function MissionDetails(props: {
  cameraZoom: number;
  missionsState: IitcIrisMissionsState;
  zoomToAndShowPortal: (portalGuid?: string, latE6?: number, lngE6?: number, zoom?: number) => void;
  zoomToMission: () => void;
}): h.JSX.Element | null {
  const selectedMission = props.missionsState.selectedMission;
  if (!selectedMission) return null;
  const firstWaypoint = selectedMission.waypoints.find((waypoint) => waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined);
  const renderMissionMetric = (
    icon: 'rating' | 'time' | 'length' | 'agents' | 'waypoints' | 'order',
    value: string | number,
    label: string,
    title: string,
  ): h.JSX.Element => (
    <span title={title}>
      <img
        src={icon === 'waypoints' || icon === 'order' ? getMissionTypeIcon(selectedMission.typeNum) : getMissionMetricIcon(icon)}
        alt=""
        loading="lazy"
      />
      <b>{value}</b>
      <small>{label}</small>
    </span>
  );

  return <div className="iitc-iris-mission-details">
    <div className="iitc-iris-mission-expanded-top">
      <span className="iitc-iris-status">
        {selectedMission.authorNickname ? (
          <>
            by <b className={`iitc-iris-mission-author ${getCommTeamClass(selectedMission.authorTeam)}`}>{selectedMission.authorNickname}</b>
          </>
        ) : 'unknown author'}
      </span>
    </div>
    <div className="iitc-iris-mission-metrics">
      {renderMissionMetric('rating', formatMissionRating(selectedMission.ratingE6), 'rating', 'Average rating')}
      {renderMissionMetric('time', formatMissionDuration(selectedMission.medianCompletionTimeMs, selectedMission.durationLabel), 'typical', 'Typical duration')}
      {renderMissionMetric('length', formatDistance(selectedMission.routeLengthMeters), 'length', 'Length of this mission. The actual distance required may vary.')}
      {renderMissionMetric('agents', formatInteger(selectedMission.numUniqueCompletedPlayers), 'agents', 'Unique players who have completed this mission')}
      {renderMissionMetric('waypoints', selectedMission.waypoints.length, 'waypoints', `${selectedMission.type ?? 'Unknown'} mission with ${selectedMission.waypoints.length} waypoints`)}
      {renderMissionMetric('order', formatMissionOrderLabel(selectedMission.type), 'order', 'Mission order')}
    </div>
    <div className="iitc-iris-mission-detail-actions">
      <button
        className="iitc-iris-portal-action"
        type="button"
        onClick={() => firstWaypoint && props.zoomToAndShowPortal(firstWaypoint.portalGuid, firstWaypoint.latE6, firstWaypoint.lngE6, Math.max(props.cameraZoom, 17))}
        disabled={!firstWaypoint}
        title="Pan to the first visible waypoint and select it when the portal is loaded"
      >
        First
      </button>
      <button className="iitc-iris-portal-action" type="button" onClick={props.zoomToMission} disabled={!selectedMission.bounds} title="Zoom to mission route">
        Zoom
      </button>
    </div>
    {selectedMission.description && (
      <p className="iitc-iris-mission-description">{selectedMission.description}</p>
    )}
    <div className="iitc-iris-mission-waypoint-list">
      {selectedMission.waypoints.map((waypoint) => (
        <button
          className={`iitc-iris-mission-waypoint ${waypoint.hidden ? 'is-hidden' : ''}`}
          type="button"
          key={`${waypoint.guid}-${waypoint.index}`}
          onClick={() => {
            if (waypoint.latE6 !== undefined && waypoint.lngE6 !== undefined) {
              props.zoomToAndShowPortal(waypoint.portalGuid, waypoint.latE6, waypoint.lngE6);
            }
          }}
          disabled={waypoint.latE6 === undefined || waypoint.lngE6 === undefined}
          title={waypoint.portalGuid || waypoint.guid}
        >
          <b>{waypoint.index + 1}</b>
          <span>
            <strong>{waypoint.hidden ? 'Hidden waypoint' : waypoint.title}</strong>
            <small>{waypoint.objective} · {waypoint.type}</small>
          </span>
        </button>
      ))}
    </div>
  </div>;
}

export function IitcIrisMissionsPanel(props: IitcIrisMissionsPanelProps): h.JSX.Element {
  const {missionsState} = props;

  return <div className="iitc-iris-request-panel-body">
    <div className="iitc-iris-map-control-row">
      <button className="iitc-iris-portal-action" type="button" onClick={() => props.refreshMissions('view')} disabled={missionsState.status === 'loading'} title="Fetch top missions in the current map view">
        View
      </button>
      <button className="iitc-iris-portal-action" type="button" onClick={() => props.refreshMissions('portal')} disabled={!props.hasSelectedPortal || missionsState.status === 'loading'} title="Fetch top missions starting at the selected portal">
        Portal
      </button>
      <a className="iitc-iris-portal-action iitc-iris-mission-create-link" href="https://missions.ingress.com/" target="_blank" rel="noreferrer" title="Open the Ingress Mission Authoring Tool">
        Create
      </a>
      <button className="iitc-iris-portal-action" type="button" onClick={() => props.refreshMissions()} disabled={missionsState.status === 'loading'} title="Refresh current mission source">
        {missionsState.status === 'loading' ? 'Loading' : 'Refresh'}
      </button>
    </div>
    <div className="iitc-iris-panel-summary">
      <span><b>{formatInteger(missionsState.missions.length)}</b><small>{missionsState.source === 'portal' ? 'portal missions' : 'view missions'}</small></span>
      <span><b>{missionsState.selectedMission?.waypoints.length ?? '-'}</b><small>waypoints</small></span>
      <span><b>{formatDistance(missionsState.selectedMission?.routeLengthMeters)}</b><small>length</small></span>
    </div>
    {missionsState.caption && (
      <div className="iitc-iris-inventory-selected" title={missionsState.portalGuid}>
        <span className="iitc-iris-status">{missionsState.source === 'portal' ? 'portal' : 'view'}</span>
        <b>{missionsState.caption}</b>
      </div>
    )}
    {missionsState.status === 'loading' && (
      <div className="iitc-iris-empty-state">
        {missionsState.source === 'portal' ? 'Fetching missions starting at this portal...' : 'Fetching missions in the current map view...'}
      </div>
    )}
    {missionsState.status === 'empty' && (
      <div className="iitc-iris-empty-state">
        {missionsState.source === 'portal' ? 'No missions start at this portal.' : 'No missions found in this map view.'}
      </div>
    )}
    {(missionsState.status === 'error' || missionsState.status === 'auth') && missionsState.missions.length === 0 && (
      <div className="iitc-iris-empty-state">
        {missionsState.status === 'auth' ? 'Missions require an authenticated Intel session.' : 'Mission request failed.'}
      </div>
    )}
    <div className="iitc-iris-scroll-region iitc-iris-missions-scroll">
      {missionsState.missions.length > 0 && (
        <div className="iitc-iris-mission-list">
          {missionsState.missions.map((mission) => (
            <div className="iitc-iris-mission-entry" key={mission.guid}>
              <button
                className={`iitc-iris-mission-row ${missionsState.selectedMission?.guid === mission.guid ? 'is-active' : ''}`}
                type="button"
                onClick={() => props.requestMissionDetails(mission.guid)}
                disabled={missionsState.detailsStatus === 'loading' && missionsState.selectedMission?.guid === mission.guid}
                title={mission.guid}
              >
                {mission.image && <img src={mission.image} alt="" loading="lazy" />}
                <span>
                  <b>{mission.title}</b>
                  <small>{formatMissionRowMeta(missionsState, mission)}</small>
                </span>
              </button>
              {missionsState.selectedMission?.guid === mission.guid && (
                <MissionDetails
                  cameraZoom={props.cameraZoom}
                  missionsState={missionsState}
                  zoomToAndShowPortal={props.zoomToAndShowPortal}
                  zoomToMission={props.zoomToMission}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    <div className="iitc-iris-panel-footer">
      <span
        className="iitc-iris-diagnostics-chip"
        title={[
          missionsState.source === 'portal' ? 'request: /r/getTopMissionsForPortal' : 'request: /r/getTopMissionsInBounds',
          `portal: ${missionsState.portalGuid ?? '-'}`,
        ].join('\n')}
      >
        {missionsState.cached
          ? 'cached'
          : missionsState.elapsedMs !== undefined
            ? `request ${formatElapsedSeconds(missionsState.elapsedMs)}s`
            : 'request'}
      </span>
      {missionsState.detailsElapsedMs !== undefined && (
        <span className="iitc-iris-diagnostics-chip" title="request: /r/getMissionDetails">
          {missionsState.detailsCached ? 'details cached' : `details ${formatElapsedSeconds(missionsState.detailsElapsedMs)}s`}
        </span>
      )}
      {missionsState.error && (
        <span className="iitc-iris-warning" title={missionsState.error}>
          {missionsState.status === 'auth' || missionsState.detailsStatus === 'auth'
            ? 'Missions require an authenticated Intel session.'
            : getAuthErrorMessage(missionsState.status, missionsState.error)}
        </span>
      )}
    </div>
  </div>;
}

export {formatDistance as formatIitcIrisMissionDistance};
