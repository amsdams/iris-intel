import {h} from 'preact';
import './profile-panel.css';
import '../../ui/shared/section-summary.css';
import {DataFreshness} from '../../ui/data-freshness';
import {getCommTeamClass} from '../../comm/comm-display';
import type {IitcIrisAgentState} from '../../messages';
import {formatSubscriptionBadge, formatSubscriptionLabel, getSubscriptionStatusClass} from '../../ui-status';
import {Badge} from '../../ui/badge';
import {PanelBody} from '../../ui/panel';
import {EmptyState} from '../../ui/empty-state';
import {StatusText} from '../../ui/status-text';
import {SummaryCell} from '../../ui/summary-cell';
import {SummaryGrid} from '../../ui/summary-grid';

export interface IitcIrisProfilePanelProps {
  agentState: IitcIrisAgentState;
}

function formatInteger(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : value.toLocaleString();
}

function formatAgentTeam(team: IitcIrisAgentState['team']): string {
  if (team === 'R') return 'Resistance';
  if (team === 'E') return 'Enlightened';
  return 'Neutral';
}

export function IitcIrisProfilePanel({agentState}: IitcIrisProfilePanelProps): h.JSX.Element {
  const hasLevelProgress = agentState.ap !== undefined && agentState.level !== undefined &&
    (agentState.maxLevel || agentState.levelPercent !== undefined);
  return <PanelBody>
    {agentState.status === 'ready' ? (
      <>
        <div className="iitc-iris-agent-card">
          <div className="iitc-iris-agent-level">
            <b className={getCommTeamClass(agentState.team)}>{agentState.level ?? '-'}</b>
            <span>
              <strong className={getCommTeamClass(agentState.team)}>{agentState.nickname}</strong>
              <small>{formatAgentTeam(agentState.team)}</small>
            </span>
            <Badge
              className={`iitc-iris-core-badge ${getSubscriptionStatusClass(agentState.subscription)}`}
              title={formatSubscriptionLabel(agentState.subscription)}
              aria-label={formatSubscriptionLabel(agentState.subscription)}
            >
              {formatSubscriptionBadge(agentState.subscription)}
            </Badge>
          </div>
          <SummaryGrid className="iitc-iris-agent-summary">
            <SummaryCell value={formatInteger(agentState.ap)} label="AP" />
            <SummaryCell value={`${formatInteger(agentState.energy)} / ${formatInteger(agentState.xmCapacity)}`} label="XM">
              <div className="iitc-iris-agent-progress-track" role="progressbar" aria-label="XM capacity"
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={agentState.xmPercent}>
                <span style={`width: ${agentState.xmPercent ?? 0}%;`} />
              </div>
            </SummaryCell>
          </SummaryGrid>
          {hasLevelProgress ? <div className="iitc-iris-agent-progress">
            <div>
              <span>{agentState.maxLevel ? 'Maximum level' : `${formatInteger(agentState.apToNextLevel)} AP to next level`}</span>
              {!agentState.maxLevel && <b>{agentState.levelPercent ?? 0}%</b>}
            </div>
            <div className="iitc-iris-agent-progress-track">
              <span style={`width: ${agentState.levelPercent ?? 0}%;`} />
            </div>
          </div> : <StatusText>Level progress unavailable.</StatusText>}
          <details>
            <summary className="iitc-iris-section-summary">More agent information</summary>
            <StatusText>Available invites: {formatInteger(agentState.availableInvites)}</StatusText>
            <p><StatusText>Stats loaded with the Intel page. Reload to refresh.</StatusText></p>
            <DataFreshness receivedAt={agentState.subscription?.checkedAt} label="Subscription checked" />
          </details>
        </div>
      </>
    ) : (
      <EmptyState>
        Agent stats require an authenticated Intel session.
      </EmptyState>
    )}
  </PanelBody>;
}
