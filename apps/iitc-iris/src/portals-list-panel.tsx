import { h } from 'preact';
import {
  IitcPortalCounts,
  IitcPortalsListEntry,
  IitcScoreboard,
} from '@iris/iitc-core';
import { formatInteger } from './ui-status';
import {
  formatPortalAnalysisPercent,
  formatPortalHistory,
  formatPortalMission,
  formatScoutControlled,
  formatTeamClass,
  formatTeamShortLabel,
  PortalAnalysisListSummary,
  PortalsListLevelFilter,
  PortalsListSortField,
  PortalsListTeamFilter,
  SortOrder,
} from './content-portal-analysis';

export interface IitcIrisPortalsListPanelProps {
  cameraZoom: number;
  portalAnalysis: {
    portalcounts: IitcPortalCounts;
    portalslist: IitcPortalsListEntry[];
    scoreboard: IitcScoreboard;
  } | null;
  portalsListLevelFilter: PortalsListLevelFilter;
  portalsListSortBy: PortalsListSortField;
  portalsListSortOrder: SortOrder;
  portalsListSummary: PortalAnalysisListSummary;
  portalsListTeamFilter: PortalsListTeamFilter;
  portalsListTextFilter: string;
  sortedPortalsList: IitcPortalsListEntry[];
  setPortalsListLevelFilter: (filter: PortalsListLevelFilter) => void;
  setPortalsListTeamFilter: (filter: PortalsListTeamFilter) => void;
  setPortalsListTextFilter: (text: string) => void;
  sortPortalsListBy: (field: PortalsListSortField) => void;
  zoomToAndShowPortal: (guid: string, latE6?: number, lngE6?: number, zoom?: number) => void;
}

export function IitcIrisPortalsListPanel({
  cameraZoom,
  portalAnalysis,
  portalsListLevelFilter,
  portalsListSortBy,
  portalsListSortOrder,
  portalsListSummary,
  portalsListTeamFilter,
  portalsListTextFilter,
  sortedPortalsList,
  setPortalsListLevelFilter,
  setPortalsListTeamFilter,
  setPortalsListTextFilter,
  sortPortalsListBy,
  zoomToAndShowPortal,
}: IitcIrisPortalsListPanelProps): h.JSX.Element {
  if (!portalAnalysis) {
    return (
      <div className="iitc-iris-map-controls-section iitc-iris-portal-analysis">
        <span className="iitc-iris-status">Portals List</span>
        <div className="iitc-iris-empty-state">Nothing to show.</div>
      </div>
    );
  }

  return (
    <div className="iitc-iris-map-controls-section iitc-iris-portal-analysis">
      <span className="iitc-iris-status">Portals List</span>
      <div className="iitc-iris-portals-list-summary" aria-label="Filtered portal list summary">
        {([
          ['R', 'Resistance', portalsListSummary.teams.R],
          ['E', 'Enlightened', portalsListSummary.teams.E],
          ['M', 'MACHINA', portalsListSummary.teams.M],
          ['N', 'Neutral', portalsListSummary.teams.N],
        ] as const).map(([team, label, count]) => (
          <div className={`iitc-iris-portals-list-summary-item ${formatTeamClass(team)}`} key={team}>
            <b>{formatInteger(count)} ({formatPortalAnalysisPercent(count, portalsListSummary.portals)})</b>
            <small>{label}</small>
          </div>
        ))}
        {([
          ['Visited', portalsListSummary.history.visited],
          ['Captured', portalsListSummary.history.captured],
          ['Scout Controlled', portalsListSummary.history.scoutControlled],
        ] as const).map(([label, count]) => (
          <div className="iitc-iris-portals-list-summary-item" key={label}>
            <b>{formatInteger(count)} ({formatPortalAnalysisPercent(count, portalsListSummary.portals)})</b>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <div className="iitc-iris-analysis-chip-row">
        <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.portals)}</b><small>Portals</small></span>
        <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.links)}</b><small>Links</small></span>
        <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.fields)}</b><small>Fields</small></span>
        <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.enemyAp)}</b><small>AP</small></span>
        <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{formatInteger(portalsListSummary.keys)}</b><small>Keys</small></span>
        <span className="iitc-iris-diagnostics-chip iitc-iris-analysis-chip"><b>{portalsListSortOrder === 1 ? 'Asc' : 'Desc'}</b><small>Sort {portalsListSortBy}</small></span>
      </div>
      <div className="iitc-iris-portals-list-filters">
        <input
          aria-label="Filter portal list by name"
          className="iitc-iris-portals-list-search"
          placeholder="Filter portals"
          type="search"
          value={portalsListTextFilter}
          onInput={(event) => setPortalsListTextFilter(event.currentTarget.value)}
        />
        <select aria-label="Filter portal list by faction" value={portalsListTeamFilter} onChange={(event) => setPortalsListTeamFilter(event.currentTarget.value as PortalsListTeamFilter)}>
          <option value="all">All factions</option>
          <option value="R">Resistance</option>
          <option value="E">Enlightened</option>
          <option value="M">Machina</option>
          <option value="N">Neutral</option>
        </select>
        <select aria-label="Filter portal list by level" value={portalsListLevelFilter} onChange={(event) => setPortalsListLevelFilter(event.currentTarget.value as PortalsListLevelFilter)}>
          <option value="all">All levels</option>
          <option value="0">Level 0 / Neutral</option>
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
          <option value="3">Level 3</option>
          <option value="4">Level 4</option>
          <option value="5">Level 5</option>
          <option value="6">Level 6</option>
          <option value="7">Level 7</option>
          <option value="8">Level 8</option>
        </select>
        <button
          className="iitc-iris-portal-action"
          type="button"
          onClick={() => {
            setPortalsListTextFilter('');
            setPortalsListTeamFilter('all');
            setPortalsListLevelFilter('all');
          }}
          disabled={portalsListTextFilter === '' && portalsListTeamFilter === 'all' && portalsListLevelFilter === 'all'}
          title="Reset portal list filters"
        >
          Reset
        </button>
      </div>
      {sortedPortalsList.length > 0 ? (
        <div className="iitc-iris-portals-list-table-wrap">
          <table className="iitc-iris-portal-analysis-table iitc-iris-portals-list-table">
            <thead>
              <tr>
                {([
                  ['title', 'Portal Name'],
                  ['level', 'Level'],
                  ['team', 'Team'],
                  ['health', 'Health'],
                  ['resCount', 'Res'],
                  ['links', 'Links'],
                  ['fields', 'Fields'],
                  ['enemyAp', 'AP'],
                  ['keys', 'Keys'],
                ] as const).map(([field, label]) => (
                  <th key={field}>
                    <button className="iitc-iris-table-sort" type="button" onClick={() => sortPortalsListBy(field)}>
                      {label}{portalsListSortBy === field ? portalsListSortOrder === 1 ? ' ^' : ' v' : ''}
                    </button>
                  </th>
                ))}
                <th>V/C</th>
                <th>S</th>
                <th>M</th>
                <th>Go</th>
              </tr>
            </thead>
            <tbody>
              {sortedPortalsList.map((portal) => (
                <tr key={portal.guid} className={formatTeamClass(portal.team)}>
                  <td className="iitc-iris-portal-list-title">
                    <button type="button" onClick={() => zoomToAndShowPortal(portal.guid, portal.latE6, portal.lngE6, cameraZoom)} onDblClick={() => zoomToAndShowPortal(portal.guid, portal.latE6, portal.lngE6)}>
                      {portal.title}
                    </button>
                  </td>
                  <td className={`iitc-iris-level-cell iitc-iris-level-${portal.level}`}>L{portal.level}</td>
                  <td><span className={`iitc-iris-team-pill ${formatTeamClass(portal.team)}`}>{formatTeamShortLabel(portal.team)}</span></td>
                  <td>{portal.health === null ? '-' : `${Math.round(portal.health)}%`}</td>
                  <td>{formatInteger(portal.resCount)}</td>
                  <td title={`In: ${portal.links.in}\nOut: ${portal.links.out}`}>{formatInteger(portal.links.count)}</td>
                  <td>{formatInteger(portal.fields)}</td>
                  <td title={`Destroy AP: ${portal.ap.destroyAp}\nCapture AP: ${portal.ap.captureAp}`}>{formatInteger(portal.ap.enemyAp)}</td>
                  <td>{portal.keyCount === undefined ? '-' : formatInteger(portal.keyCount)}</td>
                  <td>{formatPortalHistory(portal)}</td>
                  <td>{formatScoutControlled(portal)}</td>
                  <td>{formatPortalMission(portal)}</td>
                  <td>
                    <button className="iitc-iris-table-action" type="button" onClick={() => zoomToAndShowPortal(portal.guid, portal.latE6, portal.lngE6)} title="Zoom to and select portal">Zoom</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="iitc-iris-empty-state">No portals match the current filters.</div>
      )}
    </div>
  );
}
