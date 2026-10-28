import {h} from 'preact';
import {Button} from '../../ui/button';
import {ClearButton} from '../../ui/clear-button';
import {Panel, PanelHeader, PanelTitle, PanelBody} from '../../ui/panel';
import {ControlRow} from '../../ui/control-row';
import {Section} from '../../ui/section';
import {type UiThemePreference} from '../../shell/ui-theme';
import type {IitcIrisBaseLayerId} from '../../messages';
import '../../ui/shared/layer-toggle.css';

const BASE_LAYER_OPTIONS: {id: IitcIrisBaseLayerId; label: string; title: string}[] = [
  {id: 'openfreemap-dark', label: 'OpenFreeMap Dark', title: 'OpenFreeMap Dark'},
  {id: 'openfreemap-positron', label: 'OpenFreeMap Light', title: 'OpenFreeMap Positron'},
  {id: 'osm', label: 'OpenStreetMap', title: 'OpenStreetMap'},
];

export function AppearancePanel({uiTheme, setUiTheme, baseLayerId, selectBaseLayer, closeAppearance}: {
  uiTheme: UiThemePreference;
  setUiTheme: (theme: UiThemePreference) => void;
  baseLayerId: IitcIrisBaseLayerId;
  selectBaseLayer: (id: IitcIrisBaseLayerId) => void;
  closeAppearance: () => void;
}): h.JSX.Element {
  return (
    <Panel aria-label="Appearance">
      <PanelHeader>
        <PanelTitle>Appearance</PanelTitle>
        <span className="iitc-iris-panel-header-actions">
          <ClearButton onClick={closeAppearance} title="Close appearance" aria-label="Close appearance" />
        </span>
      </PanelHeader>
      <PanelBody>
        <Section titleHeading="Interface theme">
          <ControlRow>
            {(['system', 'dark', 'light'] as const).map(theme => (
              <Button key={theme}
                className={`iitc-iris-layer-toggle ${uiTheme === theme ? 'iitc-iris-layer-toggle-active' : ''}`}
                aria-pressed={uiTheme === theme}
                onClick={() => setUiTheme(theme)}
              >{theme[0].toUpperCase() + theme.slice(1)}</Button>
            ))}
          </ControlRow>
          <p>System follows your device’s appearance.</p>
        </Section>
        <Section titleHeading="Base map">
          <ControlRow>
            {BASE_LAYER_OPTIONS.map(option => (
              <Button key={option.id}
                className={`iitc-iris-layer-toggle iitc-iris-base-toggle ${baseLayerId === option.id ? 'iitc-iris-layer-toggle-active' : ''}`}
                onClick={() => selectBaseLayer(option.id)}
                title={option.title}
                aria-pressed={baseLayerId === option.id}
              >{option.label}</Button>
            ))}
          </ControlRow>
          <p>Map style is independent of the interface theme.</p>
        </Section>
      </PanelBody>
    </Panel>
  );
}
