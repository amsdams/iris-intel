import {Button} from '../ui/button';
import {h} from 'preact';
import './auth.css';

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
      <Button onClick={openIntelLogin} title="Open Intel login">
        Login
      </Button>
      <Button onClick={retryAuthRequest} title="Retry the latest affected request">
        Retry
      </Button>
    </div>
  );
}
