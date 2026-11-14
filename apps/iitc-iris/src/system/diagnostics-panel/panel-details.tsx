import {Fragment, h} from 'preact';
import type {
  IitcIrisAgentState, IitcIrisCommState, IitcIrisInventoryState, IitcIrisMissionsState,
  IitcIrisPasscodeState, IitcIrisPortalDetailsState, IitcIrisScoresState, IitcIrisSearchState,
  IitcIrisSelectedPortal,
} from '../../messages';
import {formatCommBounds} from '../../comm/comm-display';
import {formatElapsedSeconds, formatSubscriptionLabel} from '../../ui-status';
import '../../ui/shared/section-summary.css';
import './panel-details.css';

export interface PanelDetailsProps {
  agentState: IitcIrisAgentState;
  commState: IitcIrisCommState;
  inventoryState: IitcIrisInventoryState;
  missionsState: IitcIrisMissionsState;
  passcodeState: IitcIrisPasscodeState;
  portalDetails: IitcIrisPortalDetailsState | null | undefined;
  portal: IitcIrisSelectedPortal | null;
  scoresState: IitcIrisScoresState;
  searchState: IitcIrisSearchState;
}

type Value = string | number | boolean | null | undefined;
interface Group {name: string; rows: [string, Value][]}

function duration(ms: number | undefined): string | undefined {
  return ms === undefined ? undefined : `${formatElapsedSeconds(ms)}s`;
}

function display(value: Value): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

/** Read existing UI state only: inspecting diagnostics never loads panel data. */
export function PanelDetails(props: PanelDetailsProps): h.JSX.Element {
  const {agentState: agent, commState: comm, inventoryState: inventory, missionsState: missions,
    passcodeState: passcode, portalDetails: portal, scoresState: scores, searchState: search} = props;
  const groups: Group[] = [
    {name: 'Portal', rows: [
      ['Request', '/r/getPortalDetails'], ['Status', portal?.status ?? 'idle'],
      ['GUID', props.portal?.guid], ['Cached', portal?.cached], ['Request time', duration(portal?.elapsedMs)],
    ]},
    {name: 'COMM', rows: [
      ['Request', `/r/getPlexts (${comm.tab})`], ['Status', comm.status], ['Request time', duration(comm.elapsedMs)],
      ['Bounds', formatCommBounds(comm.bounds)], ['Response messages', comm.responseMessages],
      ['Older response', comm.requestOlder ? (comm.oldMessagesWereAdded ? 'added' : 'none') : undefined],
    ]},
    {name: 'Scores', rows: [
      ['Requests', '/r/getGameScore + /r/getRegionScoreDetails'], ['Status', scores.status],
      ['Request state', scores.requestState], ['Region status', scores.region?.status],
      ['Center (E6)', scores.region?.center ? `${scores.region.center.latE6},${scores.region.center.lngE6}` : undefined],
      ['Request time', duration(scores.elapsedMs)],
    ]},
    {name: 'Missions', rows: [
      ['Request', missions.source === 'portal' ? '/r/getTopMissionsForPortal' : '/r/getTopMissionsInBounds'],
      ['Status', missions.status], ['Request state', missions.requestState], ['Portal GUID', missions.portalGuid],
      ['Cached', missions.cached], ['Request time', duration(missions.elapsedMs)],
      ['Details request', '/r/getMissionDetails'], ['Details status', missions.detailsStatus],
      ['Details cached', missions.detailsCached], ['Details time', duration(missions.detailsElapsedMs)],
    ]},
    {name: 'Inventory', rows: [
      ['Request', '/r/getInventory (lastQueryTimestamp=0)'], ['Status', inventory.status],
      ['Request state', inventory.requestState], ['Request time', duration(inventory.elapsedMs)],
      ['Raw items', inventory.rawItems], ['Selected portal', inventory.selectedPortalGuid],
      ['Subscription', formatSubscriptionLabel(inventory.subscription)], ['Subscription request', '/r/getHasActiveSubscription'],
      ['Subscription time', duration(inventory.subscription?.elapsedMs)],
    ]},
    {name: 'Profile', rows: [
      ['Source', 'window.PLAYER inline Intel data'], ['Status', agent.status],
      ['Subscription', formatSubscriptionLabel(agent.subscription)], ['Subscription request', '/r/getHasActiveSubscription'],
      ['Subscription time', duration(agent.subscription?.elapsedMs)], ['Refresh', 'Reload the page to refresh agent stats'],
    ]},
    {name: 'Search', rows: [
      ['Source', search.confirmed ? 'Nominatim search' : 'Local portal search only'], ['Status', search.status],
      ['Local results', search.localResults], ['Online results', search.onlineResults],
      ['Request time', duration(search.elapsedMs)],
    ]},
    {name: 'Passcode', rows: [
      ['Request', '/r/redeemReward'], ['Status', passcode.status], ['Request state', passcode.requestState],
      ['Request time', duration(passcode.elapsedMs)],
    ]},
  ];
  return <details className="iitc-iris-panel-diagnostics">
    <summary className="iitc-iris-section-summary">Panel details</summary>
    <div className="iitc-iris-panel-diagnostics-groups">
      {groups.map(group => <details key={group.name} aria-label={`${group.name} diagnostics`}>
        <summary className="iitc-iris-section-summary">{group.name}</summary>
        <dl>{group.rows.map(([label, value]) => <Fragment key={label}>
          <dt>{label}</dt><dd>{display(value)}</dd>
        </Fragment>)}</dl>
      </details>)}
    </div>
  </details>;
}
