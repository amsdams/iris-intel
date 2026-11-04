import {h, type RefObject} from 'preact';
import './comm.css';
import '../../ui/shared/scroll-region.css';
import '../../ui/shared/list-item.css';
import {formatCommActor, formatCommContextTitle, formatCommTimestamp, getCommDisplayParts, getCommTeamClass} from '../comm-display';
import type {IitcIrisCommMessage, IitcIrisCommState} from '../../messages';
import {splitIitcCommTextLinks} from '@iris/iitc-core';

export interface IitcIrisCommMessageListProps {
  commListRef: RefObject<HTMLDivElement>;
  commState: IitcIrisCommState;
  onScroll: () => void;
  addNickname: (nickname: string) => void;
  selectPortal: (latE6?: number, lngE6?: number, portalGuid?: string) => void;
  ownNickname?: string;
}

function IitcIrisCommMessageRow({message, timestamp, addNickname, selectPortal, ownNickname}: {message: IitcIrisCommMessage; timestamp: ReturnType<typeof formatCommTimestamp>; addNickname: (nickname: string) => void; selectPortal: (latE6?: number, lngE6?: number, portalGuid?: string) => void; ownNickname?: string}): h.JSX.Element {
  const displayParts = getCommDisplayParts(message);
  const own = Boolean(ownNickname && message.player?.toLowerCase() === ownNickname.toLowerCase());
  const mentioned = Boolean(ownNickname && message.parts.some(part => part.at && part.text.replace(/^@/, '').toLowerCase() === ownNickname.toLowerCase()));
  return <div className={`iitc-iris-list-item iitc-iris-comm-row ${message.alert ? 'is-alert' : ''} ${message.narrowcast ? 'is-direct' : ''} ${own ? 'is-own' : ''} ${mentioned ? 'is-mention' : ''}`} title={formatCommContextTitle(message)}>
    <span className={`iitc-iris-comm-meta ${getCommTeamClass(message.team)}`}><time dateTime={timestamp.iso} title={timestamp.full}>{timestamp.time}</time><span className="iitc-iris-comm-tags">{own && <small>you</small>}{mentioned && <small>mentions you</small>}{message.auto && <small>system</small>}{message.alert && <small>alert</small>}{message.narrowcast && <small>direct</small>}</span></span>
    <span className={`iitc-iris-comm-text ${message.narrowcast ? 'is-narrowcast' : ''}`}>
      {message.player ? <button type="button" className={`iitc-iris-comm-actor ${getCommTeamClass(message.playerTeam || message.team)}`} onClick={() => addNickname(message.player ?? '')} title={`Mention ${message.player}`}>{formatCommActor(message)}</button>
        : <span className="iitc-iris-comm-actor">{formatCommActor(message)}</span>}
      {displayParts.length > 0 ? displayParts.map((part, index) => {
      const key = `${message.id}-${index}`;
      if (part.type === 'portal') return <button className="iitc-iris-comm-portal" type="button" title={part.portal?.address || part.text} onClick={() => selectPortal(part.portal?.latE6, part.portal?.lngE6, part.portal?.guid)} key={key}>{part.text}</button>;
      if (part.type === 'player') return <button className={`iitc-iris-comm-player ${getCommTeamClass(part.team)} ${part.at ? 'is-at' : ''}`} type="button" onClick={() => addNickname(part.text)} title={`Message ${part.text}`} key={key}>{part.at ? '@' : ''}{part.text}</button>;
      if (part.type === 'faction') return <span className={`iitc-iris-comm-faction ${getCommTeamClass(part.team)}`} key={key}>{part.text}</span>;
      return <span className={getCommTeamClass(part.team)} key={key}>{splitIitcCommTextLinks(part.text).map((run, index) => run.href
        ? <a key={index} href={run.href} target="_blank" rel="noopener noreferrer">{run.text}</a> : run.text)}</span>;
    }) : splitIitcCommTextLinks(message.text || message.type).map((run, index) => run.href
      ? <a key={index} href={run.href} target="_blank" rel="noopener noreferrer">{run.text}</a> : run.text)}</span>
  </div>;
}

export function IitcIrisCommMessageList(props: IitcIrisCommMessageListProps): h.JSX.Element | null {
  const {commState} = props;
  if (!commState.recent?.length) return null;
  const dated = commState.recent.map(message => ({message, timestamp: formatCommTimestamp(message.time)}));
  return <div className="iitc-iris-comm-list iitc-iris-scroll-region" ref={props.commListRef} onScroll={props.onScroll}>
    {commState.requestOlder && commState.status === 'loading' && <span className="iitc-iris-comm-divider">loading older messages</span>}
    {commState.requestOlder && commState.oldMessagesWereAdded && <span className="iitc-iris-comm-divider">older messages loaded</span>}
    {dated.map(({message, timestamp}, index) => {
      const day = timestamp.date;
      const showDay = index === 0 || day !== dated[index - 1].timestamp.date;
      return <div key={message.id}>{showDay && <div className="iitc-iris-comm-divider">{day}</div>}
        <IitcIrisCommMessageRow timestamp={timestamp} addNickname={props.addNickname} message={message} selectPortal={props.selectPortal} ownNickname={props.ownNickname} /></div>;
    })}
  </div>;
}
