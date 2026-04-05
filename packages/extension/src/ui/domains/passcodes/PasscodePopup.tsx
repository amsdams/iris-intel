import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES } from '../../theme';
import './passcodes.css';

interface PasscodePopupProps {
  onClose: () => void;
}

export function PasscodePopup({ onClose }: PasscodePopupProps): JSX.Element {
  const [passcode, setPasscode] = useState('');
  const themeId = useStore((state) => state.themeId);
  const theme = THEMES[themeId] || THEMES.INGRESS;
  const status = useStore((state) => state.passcodeRedeemStatus);
  const error = useStore((state) => state.passcodeRedeemError);
  const rewards = useStore((state) => state.passcodeRewards);
  const clearState = useStore((state) => state.clearPasscodeRedeemState);

  const submit = (): void => {
    const trimmed = passcode.trim();
    if (!trimmed || status === 'sending') return;

    window.postMessage({
      type: 'IRIS_PASSCODE_REDEEM_REQUEST',
      passcode: trimmed,
    }, '*');
  };

  const close = (): void => {
    clearState();
    onClose();
  };

  return (
    <Popup
      onClose={close}
      title="Passcode"
      className="iris-popup-center iris-popup-medium"
       style={{
                ['--iris-popup-border' as any]: theme.AQUA,
                ['--iris-popup-shadow' as any]: `${theme.AQUA}55`,
                ['--iris-popup-title-color' as any]: theme.AQUA,
            }}
    >
      <div className="iris-passcode-panel">
        <div className="iris-passcode-form">
          <input
            type="text"
            value={passcode}
            className="iris-passcode-input"
            onInput={(event) => setPasscode((event.target as HTMLInputElement).value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
            placeholder="enter passcode"
          />
          <button
            className="iris-passcode-submit"
            onClick={submit}
            disabled={status === 'sending' || !passcode.trim()}
          >
            {status === 'sending' ? 'Redeeming...' : 'Submit'}
          </button>
        </div>

        {status === 'sending' && (
          <div className="iris-passcode-status">Redeeming passcode...</div>
        )}

        {error && (
          <div className="iris-passcode-status iris-passcode-status-error">
            {error}
          </div>
        )}

        {rewards && (
          <div className="iris-passcode-results">
            <div className="iris-passcode-results-title">
              Passcode confirmed. Acquired items:
            </div>
            <ul className="iris-passcode-reward-list">
              {rewards.xm > 0 && <li>{rewards.xm} XM</li>}
              {rewards.ap > 0 && <li>{rewards.ap} AP</li>}
              {rewards.other.map((item) => (
                <li key={item}>{item}</li>
              ))}
              {rewards.inventory?.flatMap((item) =>
                item.awards.map((award, index) => (
                  <li key={`${item.name}-${award.level}-${index}`}>
                    {award.level > 0 && (
                      <span className={`iris-passcode-item-level iris-passcode-item-level-${award.level}`}>
                        L{award.level}
                      </span>
                    )}{' '}
                    {item.name}
                    {award.count > 1 ? ` (${award.count})` : ''}
                  </li>
                )),
              )}
            </ul>
          </div>
        )}
      </div>
    </Popup>
  );
}
