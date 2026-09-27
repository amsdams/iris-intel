import { h } from 'preact';
import {ClearButton} from '../ui/clear-button';

export interface IitcIrisHelpPanelProps {
  closeHelp: () => void;
}

export function IitcIrisHelpPanel({ closeHelp }: IitcIrisHelpPanelProps): h.JSX.Element {
  return (
    <aside className="iitc-iris-request-side-panel iitc-iris-help-panel" aria-label="Shortcuts">
      <div className="iitc-iris-request-panel-header">
        <span className="iitc-iris-selected-title">Shortcuts</span>
        <span className="iitc-iris-panel-header-actions">
          <ClearButton onClick={closeHelp} title="Close shortcuts" aria-label="Close shortcuts" />
        </span>
      </div>
      <div className="iitc-iris-request-panel-body">
        <div className="iitc-iris-shortcut-grid">
          <span>Pan map</span><b>Arrow keys</b>
          <span>Zoom map</span><b>+ / -</b>
          <span>Toggle Search</span><b>/</b>
          <span>Close sheets</span><b>Esc</b>
          <span>Toggle Map</span><b>M</b>
          <span>Toggle Portal</span><b>P</b>
          <span>Toggle Agent</span><b>A</b>
          <span>Toggle COMM</span><b>C</b>
          <span>Toggle System</span><b>S</b>
          <span>Toggle Shortcuts</span><b>?</b>
          <span>Keyboard setting</span><b>System / Interaction</b>
          <span>Search result</span><b>Up / Down / Enter</b>
          <span>Zoom result</span><b>Shift+Enter</b>
        </div>
      </div>
    </aside>
  );
}
