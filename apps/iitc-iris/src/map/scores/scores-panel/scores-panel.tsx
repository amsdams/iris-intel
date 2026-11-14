import {h} from 'preact';
import {DataFreshness} from '../../../ui/data-freshness';
import {IITC_CHECKPOINT_COUNT} from '@iris/iitc-core';
import {RegionScoreboard} from './region-scoreboard';
import './scores-panel.css';
import '../../../ui/shared/section-summary.css';
import {getCommTeamClass} from '../../../comm/comm-display';
import type {IitcIrisScoresState} from '../../../messages';
import {getAuthErrorMessage} from '../../../ui-status';
import {ActionButton} from '../../../ui/action-button';
import {ControlRow} from '../../../ui/control-row';
import {EmptyState} from '../../../ui/empty-state';
import {PanelBody} from '../../../ui/panel';
import {StatusText} from '../../../ui/status-text';

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

export function IitcIrisScoresPanel({scoresState, refresh}: IitcIrisScoresPanelProps): h.JSX.Element {
  return <PanelBody className="iitc-iris-scores-body">
      {(scoresState.error || scoresState.region?.error) && (
        <StatusText role="alert" className="iitc-iris-warning" title={scoresState.error || scoresState.region?.error}>
          {scoresState.status === 'auth' || scoresState.region?.status === 'auth'
            ? 'Scores require an authenticated Intel session.'
            : getAuthErrorMessage(scoresState.status, scoresState.error || scoresState.region?.error)}
        </StatusText>
      )}
    {(scoresState.status === 'loading' || scoresState.status === 'error' || scoresState.status === 'auth') && scoresState.region?.name &&
      <StatusText>Showing previously received scores while {scoresState.status === 'loading' ? 'refreshing' : 'the latest request is unavailable'}.</StatusText>}
    <ControlRow>
      <ActionButton onClick={() => refresh()} disabled={scoresState.status === 'loading'} title="Fetch global and regional scores for the current map center">
        {scoresState.status === 'loading' ? 'Loading' : 'Refresh'}
      </ActionButton>
      {scoresState.status !== 'ready' && scoresState.status !== 'idle' && <StatusText className={scoresState.status === 'error' || scoresState.status === 'auth' ? 'iitc-iris-warning' : ''}>
        {scoresState.status}
      </StatusText>}
    </ControlRow>
    <section className="iitc-iris-score-block" aria-label="Global scores">
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
    </section>
    <DataFreshness receivedAt={scoresState.region?.receivedAt} label="Region updated" />
    <div className="iitc-iris-score-block">
      <div className="iitc-iris-score-heading">
        <span>{scoresState.region?.name || 'Region'}</span>
        <StatusText>
          CP {scoresState.region?.lastCheckpoint !== undefined ? `${scoresState.region.lastCheckpoint} / ${IITC_CHECKPOINT_COUNT}` : '-'}
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
      <StatusText>Region lead: {formatScoreLead(scoresState.region?.enlightenedAvg, scoresState.region?.resistanceAvg)}</StatusText>
    </div>
    {(scoresState.region?.status === 'ready' || Boolean(scoresState.region?.topAgentList?.length)) && (
      <section className="iitc-iris-score-block" aria-label="Top agents">
        <b>Top agents ({scoresState.region?.topAgents ?? 0})</b>
        {!scoresState.region?.topAgentList?.length ? <EmptyState>No top agents returned.</EmptyState> : <ol className="iitc-iris-region-agents">
          {scoresState.region.topAgentList.map((agent, index) => <li key={`${index}:${agent.nick}`} className={getCommTeamClass(agent.team)}>{agent.nick}</li>)}
        </ol>}
      </section>
    )}
    {scoresState.region && <RegionScoreboard region={scoresState.region} />}
  </PanelBody>;
}
