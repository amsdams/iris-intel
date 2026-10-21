import {h} from 'preact';
import {Button} from '../../ui/button';
import {Panel, PanelHeader, PanelTitle, PanelBody} from '../../ui/panel';
import {ControlRow} from '../../ui/control-row';
import {Section} from '../../ui/section';
import {type UiThemePreference} from '../../shell/ui-theme';
import '../../ui/shared/layer-toggle.css';

export function AppearancePanel({uiTheme, setUiTheme}: {
  uiTheme: UiThemePreference;
  setUiTheme: (theme: UiThemePreference) => void;
}): h.JSX.Element {
  return (
    <Panel aria-label="Appearance">
      <PanelHeader><PanelTitle>Appearance</PanelTitle></PanelHeader>
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
          <p>System follows your device’s appearance. Map style is selected separately in Map → Display.</p>
        </Section>
      </PanelBody>
    </Panel>
  );
}
