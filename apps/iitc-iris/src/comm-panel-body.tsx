import {h} from 'preact';
import type {IitcIrisCommState} from './messages';

export interface IitcIrisCommPanelBodyProps {
  commDraft: string;
  commState: IitcIrisCommState;
  onDraftChange: (value: string) => void;
  send: () => void;
}

export function IitcIrisCommPanelBody(props: IitcIrisCommPanelBodyProps): h.JSX.Element {
  const {commDraft, commState} = props;
  return <>
    <form className="iitc-iris-comm-send-form" onSubmit={(event) => { event.preventDefault(); props.send(); }}>
      <input className="iitc-iris-passcode-input" value={commDraft} placeholder={commState.tab === 'faction' ? 'tell faction:' : commState.tab === 'all' ? 'broadcast:' : "can't send to alerts"} disabled={commState.tab === 'alerts' || commState.sendStatus === 'sending'} onInput={(event) => props.onDraftChange(event.currentTarget.value)} />
      <button className="iitc-iris-portal-action" type="submit" disabled={!commDraft.trim() || commState.tab === 'alerts' || commState.sendStatus === 'sending'}>{commState.sendStatus === 'sending' ? 'Sending' : 'Send'}</button>
    </form>
  </>;
}
