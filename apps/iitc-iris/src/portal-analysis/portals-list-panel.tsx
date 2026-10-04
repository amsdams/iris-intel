import { h } from 'preact';
import {
  IitcPortalCounts,
  IitcPortalsListEntry,
  IitcScoreboard,
} from '@iris/iitc-core';
import { formatInteger } from '../ui-status';
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
import {Badge} from '../ui/badge';
import {TextInput} from '../ui/text-input';
import {ActionButton} from '../ui/action-button';
import {DiagnosticsChip} from '../ui/diagnostics-chip';
import {Section} from '../ui/section';
import {EmptyState} from '../ui/empty-state';
import {PortalAnalysisTable} from './portal-analysis-table';

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
      <Section className="iitc-iris-portal-analysis" titleHeading="Portals List">
        <EmptyState>Nothing to show.</EmptyState>
      </Section>
    );
  }

  return (
    <Section className="iitc-iris-portal-analysis" titleHeading="Portals List">
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
        <DiagnosticsChip value={formatInteger(portalsListSummary.portals)} label="Portals" />
        <DiagnosticsChip value={formatInteger(portalsListSummary.links)} label="Links" />
        <DiagnosticsChip value={formatInteger(portalsListSummary.fields)} label="Fields" />
        <DiagnosticsChip value={formatInteger(portalsListSummary.enemyAp)} label="AP" />
        <DiagnosticsChip value={formatInteger(portalsListSummary.keys)} label="Keys" />
        <DiagnosticsChip value={portalsListSortOrder === 1 ? 'Asc' : 'Desc'} label={<>Sort {portalsListSortBy}</>} />
      </div>
      <div className="iitc-iris-portals-list-filters">
        <TextInput
          aria-label="Filter portal list by name"
          className="iitc-iris-portals-list-search"
          placeholder="Filter portals"
          type="search"
          value={portalsListTextFilter}
          onInput={(event) => setPortalsListTextFilter(event.currentTarget.value)}
        />
        <select className="iitc-iris-select-input" aria-label="Filter portal list by faction" value={portalsListTeamFilter} onChange={(event) => setPortalsListTeamFilter(event.currentTarget.value as PortalsListTeamFilter)}>
          <option value="all">All factions</option>
          <option value="R">Resistance</option>
          <option value="E">Enlightened</option>
          <option value="M">Machina</option>
          <option value="N">Neutral</option>
        </select>
        <select className="iitc-iris-select-input" aria-label="Filter portal list by level" value={portalsListLevelFilter} onChange={(event) => setPortalsListLevelFilter(event.currentTarget.value as PortalsListLevelFilter)}>
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
        <ActionButton
          onClick={() => {
            setPortalsListTextFilter('');
            setPortalsListTeamFilter('all');
            setPortalsListLevelFilter('all');
          }}
          disabled={portalsListTextFilter === '' && portalsListTeamFilter === 'all' && portalsListLevelFilter === 'all'}
          title="Reset portal list filters"
        >
          Reset
        </ActionButton>
      </div>
      {sortedPortalsList.length > 0 ? (
        <PortalAnalysisTable variant="portals-list">
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
                <td><Badge className={`iitc-iris-team-pill ${formatTeamClass(portal.team)}`}>{formatTeamShortLabel(portal.team)}</Badge></td>
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
        </PortalAnalysisTable>
      ) : (
        <EmptyState>No portals match the current filters.</EmptyState>
      )}
    </Section>
  );
}
