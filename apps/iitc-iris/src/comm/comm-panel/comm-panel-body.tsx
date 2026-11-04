import {h} from 'preact';
import '../../ui/shared/input-surface.css';
import './comm.css';
import type {IitcIrisCommState} from '../../messages';

import {ActionButton} from '../../ui/action-button';
import {TextInput} from '../../ui/text-input';
import {completeIitcCommNickname} from '@iris/iitc-core';

export interface IitcIrisCommPanelBodyProps {
  commDraft: string;
  commState: IitcIrisCommState;
  onDraftChange: (value: string) => void;
  send: () => void;
  nicknames?: string[];
}

export function IitcIrisCommPanelBody(props: IitcIrisCommPanelBodyProps): h.JSX.Element {
  const {commDraft, commState} = props;
  return <>
    <form className="iitc-iris-comm-send-form" onSubmit={(event) => { event.preventDefault(); props.send(); }}>
      <TextInput className="iitc-iris-input-surface" value={commDraft} placeholder={commState.tab === 'faction' ? 'tell faction:' : commState.tab === 'all' ? 'broadcast:' : "can't send to alerts"} disabled={commState.tab === 'alerts' || commState.sendStatus === 'sending'} onInput={(event) => props.onDraftChange(event.currentTarget.value)}
        onKeyDown={event => {
          if (event.key !== 'Tab' || event.shiftKey) return;
          const input = event.currentTarget;
          if (input.selectionStart !== input.selectionEnd) return;
          const completion = completeIitcCommNickname(input.value, input.selectionStart ?? input.value.length, props.nicknames ?? []);
          if (!completion) return;
          event.preventDefault();
          props.onDraftChange(completion.text);
          window.requestAnimationFrame(() => input.setSelectionRange(completion.cursor, completion.cursor));
        }} />
      <ActionButton type="submit" disabled={!commDraft.trim() || commState.tab === 'alerts' || commState.sendStatus === 'sending'}>{commState.sendStatus === 'sending' ? 'Sending' : 'Send'}</ActionButton>
    </form>
  </>;
}
