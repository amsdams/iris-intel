import { h, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { useStore } from '@iris/core';
import { Popup } from '../../shared/Popup';
import { THEMES, UI_COLORS } from '../../theme';
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
  const showMockTools = useStore((state) => state.showMockTools);

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

  const loadMock = (): void => {
    window.postMessage({ type: 'IRIS_LOAD_MOCK_PASSCODE' }, '*');
  };

  const clearMock = (): void => {
    window.postMessage({ type: 'IRIS_CLEAR_MOCK_PASSCODE' }, '*');
  };

  const isModReward = (name: string): boolean => {
    const normalized = name.toUpperCase();
    return (
      normalized.includes('PORTAL SHIELD') ||
      normalized.includes('HEAT SINK') ||
      normalized.includes('MULTI-HACK') ||
      normalized.includes('MULTIHACK') ||
      normalized.includes('LINK AMP') ||
      normalized.includes('FORCE AMP') ||
      normalized.includes('TURRET') ||
      normalized.includes('SOFTBANK') ||
      normalized.includes('ITO EN')
    );
  };

  const getRewardColor = (name: string, level: number): string => {
    if (isModReward(name)) {
      if (level === 0) return theme.MOD_RARITY.COMMON || UI_COLORS.TEXT_BASE;
      if (level === 1) return theme.MOD_RARITY.RARE || UI_COLORS.TEXT_BASE;
      if (level === 2) return theme.MOD_RARITY.VERY_RARE || UI_COLORS.TEXT_BASE;
      return theme.MOD_RARITY.COMMON || UI_COLORS.TEXT_BASE;
    }

    if (level > 0) {
      return theme.LEVELS[level] || UI_COLORS.TEXT_BASE;
    }

    const normalized = name.toUpperCase();
    if (normalized.includes('MEDIA')) return theme.ITEM_RARITY.VERY_COMMON || UI_COLORS.TEXT_BASE;
    if (normalized.includes('HYPERCUBE')) return theme.ITEM_RARITY.VERY_RARE || UI_COLORS.TEXT_BASE;
    if (normalized.includes('JARVIS') || normalized.includes('ADA')) return theme.ITEM_TYPES.VIRUS || UI_COLORS.TEXT_BASE;
    if (normalized.includes('KINETIC')) return theme.ITEM_TYPES.KINETIC_CAPSULE || UI_COLORS.TEXT_BASE;
    if (normalized.includes('CAPSULE')) return theme.ITEM_TYPES.CAPSULE || UI_COLORS.TEXT_BASE;
    if (normalized.includes('KEY')) return theme.ITEM_TYPES.PORTAL_LINK_KEY || UI_COLORS.TEXT_BASE;
    return theme.ITEM_RARITY.VERY_COMMON || UI_COLORS.TEXT_BASE;
  };

  return (
    <Popup
      onClose={close}
      title="Passcode"
      className="iris-popup-top-center iris-popup-medium"
      headerExtras={
        showMockTools ? (
          <div className="iris-flex iris-gap-2">
            <button className="iris-button iris-comm-refresh-btn" onClick={loadMock}>
              LOAD MOCK
            </button>
            <button className="iris-button iris-comm-refresh-btn" onClick={clearMock}>
              CLEAR MOCK
            </button>
          </div>
        ) : undefined
      }
       style={{
                '--iris-popup-border': theme.AQUA,
                '--iris-popup-shadow': `${theme.AQUA}55`,
                '--iris-popup-title-color': theme.AQUA,
                '--iris-level-1': theme.LEVELS[1],
                '--iris-level-2': theme.LEVELS[2],
                '--iris-level-3': theme.LEVELS[3],
                '--iris-level-4': theme.LEVELS[4],
                '--iris-level-5': theme.LEVELS[5],
                '--iris-level-6': theme.LEVELS[6],
                '--iris-level-7': theme.LEVELS[7],
                '--iris-level-8': theme.LEVELS[8],
            } as Record<string, string>}
    >
      <div className="iris-passcode-panel">
        <div className="iris-passcode-form">
          <input
            type="text"
            value={passcode}
            className="iris-input iris-passcode-input"
            onInput={(event) => setPasscode((event.target as HTMLInputElement).value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submit();
            }}
            placeholder="enter passcode"
          />
          <button
            className="iris-button iris-passcode-submit"
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
                    <span
                      className="iris-passcode-item-name"
                      style={{ '--iris-item-color': getRewardColor(item.name, award.level) } as Record<string, string>}
                    >
                    {award.level > 0 && (
                      <span className={`iris-passcode-item-level iris-passcode-item-level-${award.level}`}>
                        L{award.level}
                      </span>
                    )}{' '}
                    {item.name}
                    {award.count > 1 ? ` (${award.count})` : ''}
                    </span>
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
