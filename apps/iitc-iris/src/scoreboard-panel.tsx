import { h } from 'preact';
import {
  IitcPortalCounts,
  IitcPortalsListEntry,
  IitcScoreboard,
} from '@iris/iitc-core';
import {
  formatTeamClass,
  getScoreboardTeamLabel,
  PORTAL_ANALYSIS_PLAYER_TEAMS,
  SCOREBOARD_ROWS,
} from './content-portal-analysis';

export interface IitcIrisScoreboardPanelProps {
  portalAnalysis: {
    portalcounts: IitcPortalCounts;
    portalslist: IitcPortalsListEntry[];
    scoreboard: IitcScoreboard;
  } | null;
}

export function IitcIrisScoreboardPanel({
  portalAnalysis,
}: IitcIrisScoreboardPanelProps): h.JSX.Element {
  if (!portalAnalysis) {
    return (
      <div className="iitc-iris-map-controls-section iitc-iris-portal-analysis">
        <span className="iitc-iris-status">Scoreboard</span>
        <div className="iitc-iris-empty-state">Nothing to show.</div>
      </div>
    );
  }

  return (
    <div className="iitc-iris-map-controls-section iitc-iris-portal-analysis">
      <span className="iitc-iris-status">Scoreboard</span>
      <div className="iitc-iris-portal-counts-table-wrap">
        <table className="iitc-iris-portal-analysis-table iitc-iris-scoreboard-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="iitc-iris-scoreboard-column iitc-iris-team-res">RES</th>
              <th className="iitc-iris-scoreboard-column iitc-iris-team-enl">ENL</th>
              <th className="iitc-iris-scoreboard-column iitc-iris-team-machina">MAC</th>
            </tr>
          </thead>
          <tbody>
            {SCOREBOARD_ROWS.map(({label, format}) => (
              <tr key={label}>
                <td>{label}</td>
                {PORTAL_ANALYSIS_PLAYER_TEAMS.map((team) => (
                  <td className={`iitc-iris-scoreboard-column ${formatTeamClass(team)}`} key={team} title={getScoreboardTeamLabel(team)}>
                    {format(portalAnalysis.scoreboard.teams[team])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
