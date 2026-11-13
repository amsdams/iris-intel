import {h} from 'preact';
import {IITC_IRIS_MESSAGES, type IitcIrisPortalDetailsState} from '../messages';
import {ActionButton} from '../ui/action-button';

function number(value: number): string {return value.toLocaleString(undefined, {maximumFractionDigits: 2});}
function seconds(value: number): string {
  const minutes = Math.floor(value / 60);
  return `${minutes}m ${Math.round(value % 60)}s`;
}

export function PortalStatistics({details, showMap, summary = false}: {details: IitcIrisPortalDetailsState; showMap: () => void; summary?: boolean}): h.JSX.Element | null {
  const stats = details.statistics;
  if (!stats) return null;
  if (summary) return <>
    <span>link range</span>
    <span title={`Base: ${number(stats.range.base)} m; link amp boost: ×${number(stats.range.boost)}`}>
      <ActionButton disabled={stats.range.range <= 0} title="Zoom to portal link range"
        onClick={() => {
          window.postMessage({type: IITC_IRIS_MESSAGES.zoomPortalRange}, '*');
          showMap();
        }}>
        {number(stats.range.range)} m
      </ActionButton>{!stats.range.isLinkable && ' (needs 8 resonators)'}
    </span>
    <span>energy</span><span>{number(stats.currentEnergy)} / {number(stats.totalEnergy)} XM</span>
  </>;
  return <>
    <span>outgoing capacity</span><span>{number(stats.maxOutgoingLinks)} links</span>
    <span>AP gain</span>
    <span title={`Destroy resonators: ${stats.ap.resoAp}; links: ${stats.ap.linkAp}; fields: ${stats.ap.fieldAp}; capture and deploy: ${stats.ap.captureAp}`}>
      {number(stats.ap.enemyAp)} attack + capture
      {stats.friendly && stats.ap.friendlyAp !== undefined && <><br />{number(stats.ap.friendlyAp)} friendly
        ({stats.ap.deployCount} deploy, {stats.ap.upgradeCount} upgrade)</>}
    </span>
    <span>hacks</span>
    <span>{number(stats.hacks.count)} hacks; cooldown {stats.hacks.cooldown === undefined
      ? `${seconds(stats.hacks.friendlyCooldown)} friendly / ${seconds(stats.hacks.enemyCooldown)} enemy`
      : seconds(stats.hacks.cooldown)}
      {stats.hacks.burnout !== undefined && <><br />Burnout: {seconds(stats.hacks.burnout)}</>}
    </span>
    {(stats.attack.forceAmplifier > 0 || stats.attack.frequency > 0) && <>
      <span>attack modifiers</span><span>Force ×{number(stats.attack.forceAmplifier || 1)};
        frequency ×{number(stats.attack.frequency || 1)}; hit bonus {number(stats.attack.hitBonus)}%</span>
    </>}
    <span>coverage</span><span>Link/field AP uses loaded map data. Hack times are calculated, not live timers.</span>
  </>;
}
