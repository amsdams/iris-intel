import {h} from 'preact';
import {getCommTeamClass} from '../comm/comm-display';
import type {IitcIrisAgentState} from '../messages';
import {formatElapsedSeconds, formatSubscriptionBadge, formatSubscriptionLabel, getSubscriptionStatusClass} from '../ui-status';
import {PlainDiagnosticsChip} from '../ui/diagnostics-chip';
import {EmptyState} from '../ui/empty-state';
import {StatusText} from '../ui/status-text';
import {SummaryCell} from '../ui/summary-cell';
import {SummaryGrid} from '../ui/summary-grid';

export interface IitcIrisAgentPanelProps {
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

export function IitcIrisAgentPanel({agentState}: IitcIrisAgentPanelProps): h.JSX.Element {
  return <div className="iitc-iris-request-panel-body">
    {agentState.status === 'ready' ? (
      <>
        <div className="iitc-iris-agent-card">
          <div className="iitc-iris-agent-level">
            <b className={getCommTeamClass(agentState.team)}>{agentState.level ?? '-'}</b>
            <span>
              <strong className={getCommTeamClass(agentState.team)}>{agentState.nickname}</strong>
              <small>{formatAgentTeam(agentState.team)}</small>
            </span>
            <span
              className={`iitc-iris-core-badge ${getSubscriptionStatusClass(agentState.subscription)}`}
              title={[
                formatSubscriptionLabel(agentState.subscription),
                agentState.subscription?.elapsedMs !== undefined ? `request: ${formatElapsedSeconds(agentState.subscription.elapsedMs)}s` : 'request: pending',
              ].join('\n')}
            >
              {formatSubscriptionBadge(agentState.subscription)}
            </span>
          </div>
          <SummaryGrid>
            <SummaryCell value={formatInteger(agentState.ap)} label="AP" />
            <SummaryCell value={`${formatInteger(agentState.energy)} / ${formatInteger(agentState.xmCapacity)}`} label="XM" />
            <SummaryCell value={formatInteger(agentState.availableInvites)} label="invites" />
          </SummaryGrid>
          <div className="iitc-iris-agent-progress">
            <div>
              <span>XM</span>
              <b>{agentState.xmPercent ?? 0}%</b>
            </div>
            <div className="iitc-iris-agent-progress-track">
              <span style={`width: ${agentState.xmPercent ?? 0}%;`} />
            </div>
          </div>
          <div className="iitc-iris-agent-progress">
            <div>
              <span>Level</span>
              <b>{agentState.maxLevel ? 'max' : `${agentState.levelPercent ?? 0}%`}</b>
            </div>
            <div className="iitc-iris-agent-progress-track">
              <span style={`width: ${agentState.levelPercent ?? 0}%;`} />
            </div>
          </div>
          {!agentState.maxLevel && (
            <StatusText>{formatInteger(agentState.apToNextLevel)} AP to next level</StatusText>
          )}
        </div>
        <div className="iitc-iris-panel-footer">
          <PlainDiagnosticsChip
            title={[
              'source: window.PLAYER inline Intel data',
              `subscription: ${formatSubscriptionLabel(agentState.subscription)}`,
              agentState.subscription?.elapsedMs !== undefined ? `subscription request: ${formatElapsedSeconds(agentState.subscription.elapsedMs)}s` : 'subscription request: pending',
              'matches IITC sidebar static stats behavior',
              'reload page to refresh agent stats',
            ].join('\n')}
          >
            {formatSubscriptionLabel(agentState.subscription)}
          </PlainDiagnosticsChip>
          {agentState.subscription?.elapsedMs !== undefined && (
            <PlainDiagnosticsChip>
              core {formatElapsedSeconds(agentState.subscription.elapsedMs)}s
            </PlainDiagnosticsChip>
          )}
        </div>
      </>
    ) : (
      <EmptyState>
        Agent stats require an authenticated Intel session.
      </EmptyState>
    )}
  </div>;
}
