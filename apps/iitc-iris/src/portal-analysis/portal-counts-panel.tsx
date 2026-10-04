import { h } from 'preact';
import {
  IitcPortalCounts,
  IitcPortalsListEntry,
  IitcScoreboard,
} from '@iris/iitc-core';
import { formatInteger } from '../ui-status';
import { DiagnosticsChip } from '../ui/diagnostics-chip';
import { Section } from '../ui/section';
import { EmptyState } from '../ui/empty-state';
import {
  getPortalCountsBars,
  getPortalCountsLevelColor,
  getPortalCountsLevelRingSegments,
  getPortalCountsPieSegments,
  PORTAL_COUNTS_BAR_PADDING,
  PORTAL_COUNTS_BAR_TOP,
  PORTAL_COUNTS_BAR_WIDTH,
  PORTAL_COUNTS_PIE_CENTER_X,
  PORTAL_COUNTS_PIE_CENTER_Y,
  PORTAL_COUNTS_RADIUS_OUTER,
  PORTAL_COUNTS_SVG_HEIGHT,
  PORTAL_COUNTS_SVG_WIDTH,
} from './content-portal-analysis';
import {PortalAnalysisTable} from './portal-analysis-table';

export interface IitcIrisPortalCountsPanelProps {
  portalAnalysis: {
    portalcounts: IitcPortalCounts;
    portalslist: IitcPortalsListEntry[];
    scoreboard: IitcScoreboard;
  } | null;
}

export function IitcIrisPortalCountsPanel({
  portalAnalysis,
}: IitcIrisPortalCountsPanelProps): h.JSX.Element {
  if (!portalAnalysis) {
    return (
      <Section className="iitc-iris-portal-analysis" titleHeading="Portal Counts">
        <EmptyState>No portal count data for the current view.</EmptyState>
      </Section>
    );
  }

  const portalcounts = portalAnalysis.portalcounts;
  const portalCountsBars = getPortalCountsBars(portalcounts.levels);
  const portalCountsPieSegments = getPortalCountsPieSegments(portalcounts.teams, portalcounts.total);
  const portalCountsLevelRingSegments = getPortalCountsLevelRingSegments(portalCountsPieSegments, portalcounts.levels, portalcounts.total);

  return (
    <Section className="iitc-iris-portal-analysis" titleHeading="Portal Counts">
      <div className="iitc-iris-analysis-summary-grid">
        <span><b>{formatInteger(portalcounts.total)}</b><small>visible</small></span>
        <span><b>{formatInteger(portalcounts.real)}</b><small>real</small></span>
        <span><b>{formatInteger(portalcounts.placeholders)}</b><small>placeholders</small></span>
        <span><b>{formatInteger(portalcounts.withKeys)}</b><small>with keys</small></span>
      </div>
      <div className="iitc-iris-analysis-chip-row">
        <DiagnosticsChip value={formatInteger(portalcounts.history.visited)} label="Visited" />
        <DiagnosticsChip value={formatInteger(portalcounts.history.captured)} label="Captured" />
        <DiagnosticsChip value={formatInteger(portalcounts.history.scoutControlled)} label="Scout" />
        <DiagnosticsChip value={formatInteger(portalcounts.missions)} label="Missions" />
        <DiagnosticsChip value={formatInteger(portalcounts.ornaments)} label="Ornaments" />
        <DiagnosticsChip value={formatInteger(portalcounts.artifacts)} label="Artifacts" />
      </div>
      {portalcounts.inaccurateAtLinkLevel && (
        <EmptyState>Portal counts are approximate at link-level zoom.</EmptyState>
      )}
      <PortalAnalysisTable variant="counts">
        <thead>
          <tr>
            <th>Level</th>
            <th className="iitc-iris-team-res">RES</th>
            <th className="iitc-iris-team-enl">ENL</th>
            <th className="iitc-iris-team-machina">MAC</th>
            <th className="iitc-iris-team-neutral">Neutral</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {[...portalcounts.levels].reverse().map((level) => (
            <tr key={level.level} className={level.count === 0 ? 'is-muted' : ''}>
              <td className={`iitc-iris-level-cell iitc-iris-level-${level.level}`}>{level.level === 0 ? 'P' : `L${level.level}`}</td>
              <td className="iitc-iris-team-res">{formatInteger(level.teams.R)}</td>
              <td className="iitc-iris-team-enl">{formatInteger(level.teams.E)}</td>
              <td className="iitc-iris-team-machina">{formatInteger(level.teams.M)}</td>
              <td className="iitc-iris-team-neutral">{formatInteger(level.teams.N)}</td>
              <td>{formatInteger(level.count)}</td>
            </tr>
          ))}
          <tr>
            <th>Total</th>
            <th className="iitc-iris-team-res">{formatInteger(portalcounts.teams.R)}</th>
            <th className="iitc-iris-team-enl">{formatInteger(portalcounts.teams.E)}</th>
            <th className="iitc-iris-team-machina">{formatInteger(portalcounts.teams.M)}</th>
            <th className="iitc-iris-team-neutral">{formatInteger(portalcounts.teams.N)}</th>
            <th>{formatInteger(portalcounts.total)}</th>
          </tr>
        </tbody>
      </PortalAnalysisTable>
      <div className="iitc-iris-counts-visuals" aria-label="Portal counts graph">
        <svg viewBox={`0 0 ${PORTAL_COUNTS_SVG_WIDTH} ${PORTAL_COUNTS_SVG_HEIGHT}`} role="img">
          <title>Portal counts by level and faction</title>
          {portalCountsBars.map((bar, index) => {
            const total = bar.levels.reduce((sum, count) => sum + count, 0);
            return (
              <g key={bar.id} transform={`translate(${index * (PORTAL_COUNTS_BAR_WIDTH + PORTAL_COUNTS_BAR_PADDING)} 0)`}>
                <text className="iitc-iris-counts-bar-team" fill={bar.color} x={PORTAL_COUNTS_BAR_WIDTH / 2} y={PORTAL_COUNTS_BAR_TOP * 0.75}>{bar.label}</text>
                {bar.segments.map((segment) => (
                  <rect
                    key={segment.level}
                    fill={getPortalCountsLevelColor(segment.level)}
                    height={segment.height}
                    width={PORTAL_COUNTS_BAR_WIDTH}
                    x="0"
                    y={segment.y + PORTAL_COUNTS_BAR_TOP}
                  />
                ))}
                <text className="iitc-iris-counts-bar-value" x={PORTAL_COUNTS_BAR_WIDTH / 2} y={PORTAL_COUNTS_SVG_HEIGHT - 4}>{formatInteger(total)}</text>
              </g>
            );
          })}
          <g transform={`translate(${PORTAL_COUNTS_PIE_CENTER_X} ${PORTAL_COUNTS_PIE_CENTER_Y})`}>
            <circle className="iitc-iris-counts-pie-track" cx="0" cy="0" r={PORTAL_COUNTS_RADIUS_OUTER} />
            {portalCountsPieSegments.map((segment) => (
              <path
                key={segment.team}
                className="iitc-iris-counts-pie-slice"
                d={segment.path}
                fill={segment.team === 'E' ? '#03fe03' : segment.team === 'R' ? '#00c5ff' : segment.team === 'M' ? '#ff0028' : '#cccccc'}
              />
            ))}
            {portalCountsLevelRingSegments.map((segment) => (
              <path
                key={`${segment.team}-${segment.level}`}
                className="iitc-iris-counts-level-ring"
                d={segment.path}
                fill={getPortalCountsLevelColor(segment.level)}
              />
            ))}
            {portalCountsPieSegments.map((segment) => (
              <text
                key={`${segment.team}-label`}
                className="iitc-iris-counts-pie-percent"
                x={segment.labelX}
                y={segment.labelY}
              >
                {segment.label}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </Section>
  );
}
