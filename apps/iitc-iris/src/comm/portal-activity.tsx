import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage, type IitcIrisSelectedPortal} from '../messages';
import {ActionButton} from '../ui/action-button';
import {Badge} from '../ui/badge';
import {ControlRow} from '../ui/control-row';
import {StatusText} from '../ui/status-text';
import {EmptyState} from '../ui/empty-state';
import {Section} from '../ui/section';
import {formatCommTime, getCommTeamClass} from './comm-display';
import '../ui/shared/section-summary.css';
import {getIitcCommAction} from '@iris/iitc-core';
import './portal-activity.css';

export function PortalActivity({portal, openPublicComm, selectPortal}: {
  portal: IitcIrisSelectedPortal;
  openPublicComm: () => void;
  selectPortal: (latE6?: number, lngE6?: number, guid?: string) => void;
}): h.JSX.Element {
  const [open, setOpen] = useState(false);
  const [activity, setActivity] = useState<IitcIrisMessage['portalActivity']>();
  useEffect(() => {
    setActivity(undefined);
    if (!open) return;
    const request = (): void => window.postMessage({type: IITC_IRIS_MESSAGES.portalActivityRequest,
      portalGuid: portal.guid, commVisible: true} satisfies IitcIrisMessage, '*');
    const receive = (event: MessageEvent<IitcIrisMessage>): void => {
      if (event.source !== window) return;
      if (event.data.type === IITC_IRIS_MESSAGES.pageReady) request();
      if (event.data.type === IITC_IRIS_MESSAGES.portalActivityStatus && event.data.portalActivity?.guid === portal.guid) {
        setActivity(event.data.portalActivity);
      }
    };
    window.addEventListener('message', receive);
    request();
    return (): void => {
      window.removeEventListener('message', receive);
      window.postMessage({type: IITC_IRIS_MESSAGES.portalActivityRequest,
        portalGuid: portal.guid, commVisible: false} satisfies IitcIrisMessage, '*');
    };
  }, [open, portal.guid]);
  const current = activity?.guid === portal.guid ? activity : undefined;
  const actionLabels = {chat: 'Chat', capture: 'Capture', deploy: 'Deploy', destroy: 'Destroy', link: 'Link', field: 'Field', other: 'Activity'};
  return <details className="iitc-iris-portal-activity iitc-iris-portal-section" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="iitc-iris-section-summary">Portal activity{current && <Badge>{current.total}</Badge>}</summary>
    {open && <Section className="iitc-iris-portal-activity-content">
      <p><StatusText>Loaded public COMM only. Not complete history or current ownership.</StatusText></p>
      <ControlRow>
        <ActionButton onClick={openPublicComm}>Open All COMM</ActionButton>
        {current && <StatusText>{current.recent.length} of {current.total} loaded events{current.total > 100 ? ' · most recent 100' : ''}</StatusText>}
      </ControlRow>
      {!current ? <p><StatusText role="status">Reading loaded activity…</StatusText></p>
        : !current.recent.length ? <EmptyState>No activity for this portal in loaded public COMM.</EmptyState>
        : <ol className="iitc-iris-portal-activity-list">{current.recent.map(message => <li key={message.id}>
          <details className="iitc-iris-portal-activity-event">
            <summary>
              <time dateTime={new Date(message.time).toISOString()} title={new Date(message.time).toLocaleString()}>
                <span>{new Date(message.time).toLocaleDateString()}</span><b>{formatCommTime(message.time)}</b>
              </time>
              <span className={`iitc-iris-portal-activity-agent ${getCommTeamClass(message.playerTeam || message.team)}`}>{message.player || 'System'}</span>
              <Badge>{actionLabels[getIitcCommAction(message)]}</Badge>
            </summary>
            <div className="iitc-iris-portal-activity-event-body">
              <p>{message.text || message.parts.map(part => part.text).join(' ')}</p>
              <ControlRow>{message.portals.map((target, index) => <ActionButton key={index}
                title={`View ${target.name || 'portal'} on the map`}
                disabled={target.latE6 === undefined || target.lngE6 === undefined}
                onClick={() => selectPortal(target.latE6, target.lngE6, target.guid)}>{target.name || 'View portal'}</ActionButton>)}</ControlRow>
            </div>
          </details>
        </li>)}</ol>}
    </Section>}
  </details>;
}
