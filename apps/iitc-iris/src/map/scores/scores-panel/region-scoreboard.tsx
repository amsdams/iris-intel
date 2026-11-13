import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {getIitcCheckpointTime, getIitcRegionProjection, IITC_CHECKPOINT_COUNT, type IitcRegionCheckpoint} from '@iris/iitc-core';
import type {IitcIrisScoresState} from '../../../messages';
import {StatusText} from '../../../ui/status-text';
import {EmptyState} from '../../../ui/empty-state';
import './region-scoreboard.css';
import '../../../ui/shared/section-summary.css';

function number(value: number): string {return value.toLocaleString();}
function date(value: number): string {return new Date(value).toLocaleString();}
function countdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
}

function ScoreHistoryChart({history, cycleStart}: {history: IitcRegionCheckpoint[]; cycleStart: number}): h.JSX.Element {
  const [logscale, setLogscale] = useState(false);
  const maximum = Math.max(10, ...history.flatMap(row => [row.enlightened, row.resistance])) * 1.09;
  const x = (checkpoint: number): number => 42 + checkpoint / IITC_CHECKPOINT_COUNT * 270;
  const y = (value: number): number => 150 - (logscale ? 1 + Math.log10(Math.max(0.001, value / maximum)) / 3 : value / maximum) * 130;
  return <>
    <label><input type="checkbox" checked={logscale} onChange={event => setLogscale(event.currentTarget.checked)} /> Logarithmic scale</label>
    <svg className="iitc-iris-region-chart" viewBox="0 0 320 180" role="img" aria-label="Regional checkpoint MU history">
      <title>Checkpoint MU history. Exact values and times are in the checkpoint table.</title>
      <path d="M42 20V150H312" className="iitc-iris-region-axis" />
      <text x="38" y="24" text-anchor="end">{number(maximum)}</text>
      <text x="38" y="153" text-anchor="end">0</text>
      {[1, 5, 10, 15, 20, 25, 30, 35].map(cp => <text key={cp} x={x(cp)} y="170" text-anchor="middle">{cp}</text>)}
      {(['resistance', 'enlightened'] as const).map(team => <g key={team} className={`iitc-iris-region-${team}`}>
        <polyline stroke-dasharray="3,2" opacity="0.8" points={Array.from({length: IITC_CHECKPOINT_COUNT}, (_, index) => {
          const checkpoint = index + 1;
          const average = getIitcRegionProjection(history, checkpoint)[team].estimate;
          return `${x(checkpoint)},${y(average)}`;
        }).join(' ')} />
        <polyline points={history.map(row => `${x(row.checkpoint)},${y(row[team])}`).join(' ')} />
        {history.map(row => <circle key={row.checkpoint} cx={x(row.checkpoint)} cy={y(row[team])} r="3" tabIndex={0}>
          <title>{`${team === 'resistance' ? 'RES' : 'ENL'} CP ${row.checkpoint}: ${number(row[team])} MU; ${date(getIitcCheckpointTime(cycleStart, row.checkpoint))}`}</title>
        </circle>)}
      </g>)}
    </svg>
    <StatusText>RES blue · ENL green. Solid: checkpoint MU; dashed: average/projected average. Axes: checkpoint / MU.</StatusText>
  </>;
}

export function RegionScoreboard({region}: {region: NonNullable<IitcIrisScoresState['region']>}): h.JSX.Element | null {
  const [now, setNow] = useState(Date.now);
  const cycleStart = region.cycleStart;
  useEffect((): (() => void) | undefined => {
    if (cycleStart === undefined || region.status !== 'ready') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cycleStart, region.status]);
  if (region.status !== 'ready' || cycleStart === undefined) return null;
  const history = region.scoreHistory ?? [];
  const projection = getIitcRegionProjection(history);
  const lastCheckpoint = region.lastCheckpoint ?? 0;
  const nextCheckpoint = Math.min(IITC_CHECKPOINT_COUNT, lastCheckpoint + 1);
  const nextTime = getIitcCheckpointTime(cycleStart, nextCheckpoint);
  const end = getIitcCheckpointTime(cycleStart, IITC_CHECKPOINT_COUNT);
  return <section className="iitc-iris-region-scoreboard" aria-label="Regional scoreboard">
    <div className="iitc-iris-score-block">
      <b>Cycle and checkpoints</b>
      <span>Next CP {nextCheckpoint}: <time dateTime={new Date(nextTime).toISOString()}>{date(nextTime)}</time></span>
      <span>In {countdown(nextTime - now)}</span>
      {nextTime <= now && <StatusText>Refresh scores for the latest checkpoint or cycle.</StatusText>}

    </div>
    <details><summary className="iitc-iris-section-summary">Cycle timing</summary>
      <p>Cycle ends: <time dateTime={new Date(end).toISOString()}>{date(end)}</time></p>
      {region.receivedAt !== undefined && <StatusText>Updated {date(region.receivedAt)}</StatusText>}
    </details>
    {!history.length ? <EmptyState>No checkpoint history returned.</EmptyState> : <>
      <details>
        <summary className="iitc-iris-section-summary">Checkpoint history</summary>
        <ScoreHistoryChart history={history} cycleStart={cycleStart} />
        <div className="iitc-iris-region-table-scroll">
          <table className="iitc-iris-region-table">
            <caption>Checkpoint scores (MU)</caption>
            <thead><tr><th scope="col">CP</th><th scope="col">Time</th><th scope="col">RES</th><th scope="col">ENL</th></tr></thead>
            <tbody>{[...history].reverse().map(row => <tr key={row.checkpoint}>
              <th scope="row">{row.checkpoint}</th><td>{date(getIitcCheckpointTime(cycleStart, row.checkpoint))}</td>
              <td className="iitc-iris-team-res">{number(row.resistance)}</td>
              <td className="iitc-iris-team-enl">{number(row.enlightened)}</td>
            </tr>)}</tbody>
            <tfoot><tr><th scope="row" colSpan={2}>Total</th>
              <td>{number(projection.resistance.total)}</td><td>{number(projection.enlightened.total)}</td></tr></tfoot>
          </table>
        </div>
      </details>
      <details>
        <summary className="iitc-iris-section-summary">Cycle projection</summary>
        <p>Estimated final average: RES {number(projection.resistance.estimate)} MU · ENL {number(projection.enlightened.estimate)} MU.</p>
        <p>{IITC_CHECKPOINT_COUNT - lastCheckpoint} checkpoints after the latest received checkpoint.</p>
        {projection.trailingTeam && <p>{projection.trailingTeam === 'R' ? 'RES' : 'ENL'} needs {number(projection.requiredMu)} additional
          checkpoint MU to exceed the projected result.</p>}
        <StatusText>Estimate using the median of available checkpoint scores for missing and remaining checkpoints, as in IITC.</StatusText>
      </details>
    </>}
  </section>;
}
