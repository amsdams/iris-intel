import {h, type RefObject} from 'preact';
import {formatCommActor, formatCommContextTitle, formatCommTime, getCommDisplayParts, getCommTeamClass} from './comm-display';
import type {IitcIrisCommMessage, IitcIrisCommState} from './messages';

export interface IitcIrisCommMessageListProps {
  commListRef: RefObject<HTMLDivElement>;
  commState: IitcIrisCommState;
  onScroll: () => void;
  addNickname: (nickname: string) => void;
  selectPortal: (latE6?: number, lngE6?: number, portalGuid?: string) => void;
}

function IitcIrisCommMessageRow({message, addNickname, selectPortal}: {message: IitcIrisCommMessage; addNickname: (nickname: string) => void; selectPortal: (latE6?: number, lngE6?: number, portalGuid?: string) => void}): h.JSX.Element {
  const displayParts = getCommDisplayParts(message);
  return <div className={`iitc-iris-comm-row ${message.alert ? 'is-alert' : ''} ${message.narrowcast ? 'is-direct' : ''}`} title={formatCommContextTitle(message)}>
    <span className={`iitc-iris-comm-meta ${getCommTeamClass(message.team)}`}><b>{formatCommTime(message.time)}</b><span className="iitc-iris-comm-tags">{message.auto && <small>system</small>}{message.alert && <small>alert</small>}{message.narrowcast && <small>direct</small>}</span></span>
    <span className={`iitc-iris-comm-text ${message.narrowcast ? 'is-narrowcast' : ''}`}><span className={`iitc-iris-comm-actor ${getCommTeamClass(message.playerTeam || message.team)}`}>{formatCommActor(message)}</span>{displayParts.length > 0 ? displayParts.map((part, index) => {
      const key = `${message.id}-${index}`;
      if (part.type === 'portal') return <button className="iitc-iris-comm-portal" type="button" title={part.portal?.address || part.text} onClick={() => selectPortal(part.portal?.latE6, part.portal?.lngE6, part.portal?.guid)} key={key}>{part.text}</button>;
      if (part.type === 'player') return <button className={`iitc-iris-comm-player ${getCommTeamClass(part.team)} ${part.at ? 'is-at' : ''}`} type="button" onClick={() => addNickname(part.text)} title={`Message ${part.text}`} key={key}>{part.at ? '@' : ''}{part.text}</button>;
      if (part.type === 'faction') return <span className={`iitc-iris-comm-faction ${getCommTeamClass(part.team)}`} key={key}>{part.text}</span>;
      return <span className={getCommTeamClass(part.team)} key={key}>{part.text}</span>;
    }) : (message.text || message.type)}</span>
  </div>;
}

export function IitcIrisCommMessageList(props: IitcIrisCommMessageListProps): h.JSX.Element | null {
  const {commState} = props;
  if (!commState.recent?.length) return null;
  return <div className="iitc-iris-comm-list iitc-iris-scroll-region" ref={props.commListRef} onScroll={props.onScroll}>
    {commState.requestOlder && commState.status === 'loading' && <span className="iitc-iris-comm-divider">loading older messages</span>}
    {commState.requestOlder && commState.oldMessagesWereAdded && <span className="iitc-iris-comm-divider">older messages loaded</span>}
    {commState.recent.map((message) => <IitcIrisCommMessageRow addNickname={props.addNickname} key={message.id} message={message} selectPortal={props.selectPortal} />)}
  </div>;
}
