import {h} from 'preact';
import {formatIitcColorVars, getIitcLevelColor} from '../iitc-colors';
import type {IitcIrisPasscodeRewardItem, IitcIrisPasscodeState} from '../messages';
import {Badge} from '../ui/badge';
import {TextInput} from '../ui/text-input';
import {SummaryCell} from '../ui/summary-cell';
import {SummaryGrid} from '../ui/summary-grid';
import {formatElapsedSeconds, getAuthErrorMessage} from '../ui-status';

export interface IitcIrisPasscodePanelProps {
  passcodeDraft: string;
  passcodeState: IitcIrisPasscodeState;
  onDraftChange: (value: string) => void;
  redeem: () => void;
}

function formatInteger(value: number | undefined): string {
  return new Intl.NumberFormat('en-US').format(value ?? 0);
}

function formatItemBadge(item: IitcIrisPasscodeRewardItem): string {
  if (item.level !== undefined) return `L${item.level}`;
  return 'IT';
}

export function IitcIrisPasscodePanel(props: IitcIrisPasscodePanelProps): h.JSX.Element {
  const {passcodeDraft, passcodeState} = props;
  return <div className="iitc-iris-request-panel-body">
    <form
      className="iitc-iris-passcode-form"
      onSubmit={(event) => {
        event.preventDefault();
        props.redeem();
      }}
    >
      <TextInput
        className="iitc-iris-passcode-input"
        type="text"
        value={passcodeDraft}
        placeholder="passcode"
        disabled={passcodeState.status === 'loading'}
        onInput={(event) => props.onDraftChange(event.currentTarget.value)}
      />
      <button className="iitc-iris-portal-action" type="submit" disabled={!passcodeDraft.trim() || passcodeState.status === 'loading'}>
        {passcodeState.status === 'loading' ? 'Redeeming' : 'Redeem'}
      </button>
    </form>
    <SummaryGrid>
      <SummaryCell value={formatInteger(passcodeState.ap)} label="AP" />
      <SummaryCell value={formatInteger(passcodeState.xm)} label="XM" />
      <SummaryCell value={formatInteger(passcodeState.items?.reduce((sum, item) => sum + (item.count ?? 1), 0))} label="items" />
    </SummaryGrid>
    {passcodeState.other && passcodeState.other.length > 0 && (
      <div className="iitc-iris-inventory-list">
        {passcodeState.other.map((reward) => (
          <div className="iitc-iris-inventory-row" key={reward}>
            <span>{reward}</span>
            <b>1</b>
          </div>
        ))}
      </div>
    )}
    {passcodeState.items && passcodeState.items.length > 0 && (
      <div className="iitc-iris-inventory-list">
        {passcodeState.items.map((item, index) => (
          <div
            className="iitc-iris-inventory-row"
            key={`${item.label}-${item.level ?? ''}-${index}`}
            style={formatIitcColorVars(getIitcLevelColor(item.level))}
          >
            <span><Badge as="b" className="iitc-iris-item-badge">{formatItemBadge(item)}</Badge>{item.label}{item.level ? ` L${item.level}` : ''}</span>
            <b>{item.count ?? 1}</b>
          </div>
        ))}
      </div>
    )}
    {(passcodeState.status === 'empty' || passcodeState.error) && (
      <div className={passcodeState.error ? 'iitc-iris-warning' : 'iitc-iris-empty-state'}>
        {passcodeState.error
          ? passcodeState.status === 'auth'
            ? 'Passcode redemption requires an authenticated Intel session.'
            : getAuthErrorMessage(passcodeState.status, passcodeState.error)
          : 'Passcode returned no rewards.'}
      </div>
    )}
    <div className="iitc-iris-panel-footer">
      <span
        className="iitc-iris-diagnostics-chip"
        title={[
          'request: /r/redeemReward',
          `passcode: ${passcodeState.passcode ?? '-'}`,
        ].join('\n')}
      >
        {passcodeState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(passcodeState.elapsedMs)}s` : 'request'}
      </span>
    </div>
  </div>;
}
