import {h} from 'preact';
import {getCommTeamClass} from '../comm/comm-display';
import type {IitcIrisScoresState} from '../messages';
import {formatElapsedSeconds, getAuthErrorMessage} from '../ui-status';
import {ActionButton} from '../ui/action-button';
import {ControlRow} from '../ui/control-row';
import {StatusText} from '../ui/status-text';
import {SummaryCell} from '../ui/summary-cell';
import {SummaryGrid} from '../ui/summary-grid';

export interface IitcIrisScoresPanelProps {
  scoresState: IitcIrisScoresState;
  refresh: () => void;
}

function formatInteger(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : value.toLocaleString();
}

function formatPercent(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : `${Math.round(value)}%`;
}

function formatScoreLead(enlightened: number | undefined, resistance: number | undefined): string {
  if (enlightened === undefined || resistance === undefined) return '-';
  if (enlightened === resistance) return 'tied';
  const leader = enlightened > resistance ? 'ENL' : 'RES';
  return `${leader} +${formatInteger(Math.abs(enlightened - resistance))}`;
}

function getRegionEnlightenedPercent(scoresState: IitcIrisScoresState): number {
  return scoresState.region?.enlightenedAvg !== undefined && scoresState.region.resistanceAvg !== undefined
    ? Math.round((scoresState.region.enlightenedAvg / Math.max(1, scoresState.region.enlightenedAvg + scoresState.region.resistanceAvg)) * 100)
    : 50;
}

function formatRegionCenter(scoresState: IitcIrisScoresState): string {
  return scoresState.region?.center ? `${scoresState.region.center.latE6},${scoresState.region.center.lngE6}` : '-';
}

export function IitcIrisScoresPanel({scoresState, refresh}: IitcIrisScoresPanelProps): h.JSX.Element {
  return <div className="iitc-iris-request-panel-body">
    <ControlRow>
      <ActionButton onClick={() => refresh()} disabled={scoresState.status === 'loading'} title="Fetch global and regional scores for the current map center">
        {scoresState.status === 'loading' ? 'Loading' : 'Refresh'}
      </ActionButton>
      <StatusText className={scoresState.status === 'error' || scoresState.status === 'auth' ? 'iitc-iris-warning' : ''}>
        {scoresState.status}
      </StatusText>
    </ControlRow>
    <div className="iitc-iris-score-block">
      <div className="iitc-iris-score-heading">
        <span>Global</span>
        <StatusText>{formatScoreLead(scoresState.game?.enlightened, scoresState.game?.resistance)}</StatusText>
      </div>
      <div className="iitc-iris-score-bar" style={`--enl-percent: ${scoresState.game?.enlightenedPercent ?? 50}%;`}>
        <span className="iitc-iris-score-bar-enl" />
        <span className="iitc-iris-score-bar-res" />
      </div>
      <div className="iitc-iris-score-pair">
        <span className="is-enlightened">ENL <b>{formatInteger(scoresState.game?.enlightened)}</b> MU <small>{formatPercent(scoresState.game?.enlightenedPercent)}</small></span>
        <span className="is-resistance">RES <b>{formatInteger(scoresState.game?.resistance)}</b> MU <small>{formatPercent(scoresState.game?.resistancePercent)}</small></span>
      </div>
    </div>
    <div className="iitc-iris-score-block">
      <div className="iitc-iris-score-heading">
        <span>{scoresState.region?.name || 'Region'}</span>
        <StatusText>
          CP {scoresState.region?.lastCheckpoint !== undefined ? `${scoresState.region.lastCheckpoint} / ${scoresState.region.checkpoints ?? '-'}` : '-'}
        </StatusText>
      </div>
      <div className="iitc-iris-score-bar" style={`--enl-percent: ${getRegionEnlightenedPercent(scoresState)}%;`}>
        <span className="iitc-iris-score-bar-enl" />
        <span className="iitc-iris-score-bar-res" />
      </div>
      <div className="iitc-iris-score-pair">
        <span className="is-enlightened">ENL <b>{formatInteger(scoresState.region?.enlightenedAvg)}</b> MU</span>
        <span className="is-resistance">RES <b>{formatInteger(scoresState.region?.resistanceAvg)}</b> MU</span>
      </div>
    </div>
    <SummaryGrid>
      <SummaryCell value={formatScoreLead(scoresState.region?.enlightenedAvg, scoresState.region?.resistanceAvg)} label="region lead" />
      <SummaryCell value={formatInteger(scoresState.region?.topAgents)} label="top agents" />
      <SummaryCell value={formatRegionCenter(scoresState)} label="center" />
    </SummaryGrid>
    {scoresState.region?.topAgentList && scoresState.region.topAgentList.length > 0 && (
      <div className="iitc-iris-agent-list">
        {scoresState.region.topAgentList.slice(0, 5).map((agent, index) => (
          <span className="iitc-iris-agent-row" key={`${agent.nick}-${index}`}>
            <small>{index + 1}</small>
            <b className={getCommTeamClass(agent.team)}>{agent.nick}</b>
          </span>
        ))}
      </div>
    )}
    <div className="iitc-iris-panel-footer">
      <span
        className="iitc-iris-diagnostics-chip"
        title={[
          'request: /r/getGameScore + /r/getRegionScoreDetails',
          `center: ${formatRegionCenter(scoresState)}`,
        ].join('\n')}
      >
        {scoresState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(scoresState.elapsedMs)}s` : 'request'}
      </span>
      {(scoresState.error || scoresState.region?.error) && (
        <span className="iitc-iris-warning" title={scoresState.error || scoresState.region?.error}>
          {scoresState.status === 'auth' || scoresState.region?.status === 'auth'
            ? 'Scores require an authenticated Intel session.'
            : getAuthErrorMessage(scoresState.status, scoresState.error || scoresState.region?.error)}
        </span>
      )}
    </div>
  </div>;
}
