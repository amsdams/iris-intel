import {h} from 'preact';

interface IitcIrisAuthRecoveryBannerProps {
  authRecoveryText: string | null;
  openIntelLogin: () => void;
  retryAuthRequest: () => void;
}

export function IitcIrisAuthRecoveryBanner({
  authRecoveryText,
  openIntelLogin,
  retryAuthRequest,
}: IitcIrisAuthRecoveryBannerProps): h.JSX.Element | null {
  if (!authRecoveryText) return null;

  return (
    <div className="iitc-iris-auth-recovery" role="status" aria-live="polite">
      <span>{authRecoveryText}</span>
      <button type="button" onClick={openIntelLogin} title="Open Intel login">
        Login
      </button>
      <button type="button" onClick={retryAuthRequest} title="Retry the latest affected request">
        Retry
      </button>
    </div>
  );
}
