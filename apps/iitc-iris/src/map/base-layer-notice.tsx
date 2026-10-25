import {h} from 'preact';
import {ClearButton} from '../ui/clear-button';
import './base-layer-notice.css';

export function BaseLayerNotice({message, dismiss}: {message: string; dismiss: () => void}): h.JSX.Element | null {
  if (!message) return null;
  return <div className="iitc-iris-base-layer-notice" role="status">
    <span>{message} You can choose a map again in System → Appearance.</span>
    <ClearButton onClick={dismiss} title="Dismiss map notice" aria-label="Dismiss map notice" />
  </div>;
}
