import {h} from 'preact';
import {getCommTeamClass} from './comm-display';
import type {IitcIrisAgentState} from './messages';
import {formatElapsedSeconds, formatSubscriptionBadge, formatSubscriptionLabel, getSubscriptionStatusClass} from './ui-status';

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
          <div className="iitc-iris-panel-summary">
            <span><b>{formatInteger(agentState.ap)}</b><small>AP</small></span>
            <span><b>{formatInteger(agentState.energy)} / {formatInteger(agentState.xmCapacity)}</b><small>XM</small></span>
            <span><b>{formatInteger(agentState.availableInvites)}</b><small>invites</small></span>
          </div>
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
            <span className="iitc-iris-status">{formatInteger(agentState.apToNextLevel)} AP to next level</span>
          )}
        </div>
        <div className="iitc-iris-panel-footer">
          <span
            className="iitc-iris-diagnostics-chip"
            title={[
              'source: window.PLAYER inline Intel data',
              `subscription: ${formatSubscriptionLabel(agentState.subscription)}`,
              agentState.subscription?.elapsedMs !== undefined ? `subscription request: ${formatElapsedSeconds(agentState.subscription.elapsedMs)}s` : 'subscription request: pending',
              'matches IITC sidebar static stats behavior',
              'reload page to refresh agent stats',
            ].join('\n')}
          >
            {formatSubscriptionLabel(agentState.subscription)}
          </span>
          {agentState.subscription?.elapsedMs !== undefined && (
            <span className="iitc-iris-diagnostics-chip">
              core {formatElapsedSeconds(agentState.subscription.elapsedMs)}s
            </span>
          )}
        </div>
      </>
    ) : (
      <div className="iitc-iris-empty-state">
        Agent stats require an authenticated Intel session.
      </div>
    )}
  </div>;
}
