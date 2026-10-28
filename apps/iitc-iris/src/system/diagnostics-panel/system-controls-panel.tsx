import {Button} from '../../ui/button';
import {h} from 'preact';
import '../../ui/panel/panel.css';
import '../../ui/shared/layer-toggle.css';
import '../../ui/shared/input-surface.css';
import './system-actions.css';
import '../system.css';
import type {IitcIrisLifecycleSettings} from '../../messages';
import {ActionButton} from '../../ui/action-button';
import {Section} from '../../ui/section';
import {ControlRow} from '../../ui/control-row';
import {StatusText} from '../../ui/status-text';
import {TextInput} from '../../ui/text-input';
interface IitcIrisSystemControlsPanelProps {
  shortcutsEnabled: boolean;
  setShortcutsEnabled: (action: (current: boolean) => boolean) => void;
  mapFocusMode: boolean;
  setMapFocusMode: (action: (current: boolean) => boolean) => void;
  copyDockText: () => void;
  copyIntelUrl: () => void;
  copyStatus: string;
  jumpToViewInput: () => void;
  viewInput: string;
  setViewInput: (value: string) => void;
  viewInputStatus: string;
  lifecycleSettings: IitcIrisLifecycleSettings;
  setLifecycleSettings: (action: (current: IitcIrisLifecycleSettings) => IitcIrisLifecycleSettings) => void;
  logoutIntel: () => void;
}
export function IitcIrisSystemControlsPanel({
  shortcutsEnabled,
  setShortcutsEnabled,
  mapFocusMode,
  setMapFocusMode,
  copyDockText,
  copyIntelUrl,
  copyStatus,
  jumpToViewInput,
  viewInput,
  setViewInput,
  viewInputStatus,
  lifecycleSettings,
  setLifecycleSettings,
  logoutIntel,
}: IitcIrisSystemControlsPanelProps): h.JSX.Element {
  const canJump = Boolean(viewInput.trim());

  return (
    <>
      <Section titleHeading="Account">
        <ControlRow>
          <ActionButton
            onClick={logoutIntel}
            title="Sign out of the current Intel session"
          >
            Logout
          </ActionButton>
        </ControlRow>
      </Section>
      <Section titleHeading="Interaction">
        <ControlRow>
          <Button
            className={`iitc-iris-layer-toggle ${shortcutsEnabled ? 'iitc-iris-layer-toggle-active' : ''}`}
            onClick={() => setShortcutsEnabled((current) => !current)}
            title="Enable plain keyboard shortcuts when focus is not in a text field"
            aria-pressed={shortcutsEnabled}
          >
            Shortcuts
          </Button>
          <Button
            className={`iitc-iris-layer-toggle ${mapFocusMode ? 'iitc-iris-layer-toggle-active' : ''}`}
            onClick={() => setMapFocusMode((current) => !current)}
            title="Auto-close panels after navigation actions that move the map"
            aria-pressed={mapFocusMode}
          >
            Map Focus
          </Button>
          <StatusText>{shortcutsEnabled ? 'keys on' : 'keys off'}</StatusText>
          <StatusText>{mapFocusMode ? 'auto close' : 'stay open'}</StatusText>
        </ControlRow>
      </Section>
      <Section titleHeading="Copy/export">
        <ControlRow>
          <ActionButton onClick={copyDockText} title="Copy JSON diagnostics">JSON</ActionButton>
          <ActionButton onClick={copyIntelUrl} title="Copy current view as an Intel URL">URL</ActionButton>
          {copyStatus && <StatusText>{copyStatus}</StatusText>}
        </ControlRow>
      </Section>
      <Section titleHeading="Go to location">
        <form
          className="iitc-iris-jump"
          onSubmit={(event) => {
            event.preventDefault();
            if (canJump) jumpToViewInput();
          }}
        >
          <TextInput
            className="iitc-iris-input-surface iitc-iris-jump-input"
            type="text"
            value={viewInput}
            onInput={(event) => setViewInput((event.currentTarget as HTMLInputElement).value)}
            placeholder="lat,lng,z or Intel URL"
            title="Paste lat,lng,z or an Intel URL with ll, pll, and optional z"
          />
          <ActionButton type="submit" disabled={!canJump}>Jump</ActionButton>
          {viewInputStatus && <StatusText>{viewInputStatus}</StatusText>}
        </form>
      </Section>
      <Section titleHeading="Lifecycle">
        <ControlRow>
          <Button
            className={`iitc-iris-layer-toggle iitc-iris-system-toggle ${lifecycleSettings.iitcMovementDelay ? 'iitc-iris-layer-toggle-active' : ''}`}
            onClick={() => setLifecycleSettings((current) => ({...current, iitcMovementDelay: !current.iitcMovementDelay}))}
            title="Compare current fast refresh with IITC-style map movement and download timing"
            aria-pressed={lifecycleSettings.iitcMovementDelay}
          >
            IITC Delay
          </Button>
          <StatusText>{lifecycleSettings.iitcMovementDelay ? 'IITC timing' : 'fast move'}</StatusText>
        </ControlRow>
      </Section>
    </>
  );
}
