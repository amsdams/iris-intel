import {h} from 'preact';
import {OPTIONAL_PANEL_REGISTRY, type IitcIrisSheetId} from '../../shell/menu-registry';
import {ActionButton} from '../../ui/action-button';
import {ClearButton} from '../../ui/clear-button';
import {ControlRow} from '../../ui/control-row';
import {LayerChoice} from '../../ui/layer-choice';
import {Panel, PanelBody, PanelFooter, PanelHeader, PanelTitle} from '../../ui/panel';
import {Section} from '../../ui/section';

interface PanelsPanelProps {
  isPanelVisible: (sheet: IitcIrisSheetId) => boolean;
  togglePanel: (sheet: IitcIrisSheetId) => void;
  restoreDefaults: () => void;
  closePanels: () => void;
}

export function PanelsPanel({isPanelVisible, togglePanel, restoreDefaults, closePanels}: PanelsPanelProps): h.JSX.Element {
  return (
    <Panel aria-label="Panel settings">
      <PanelHeader>
        <PanelTitle>Panels</PanelTitle>
        <span className="iitc-iris-panel-header-actions">
          <ClearButton onClick={closePanels} title="Close panels" aria-label="Close panels" />
        </span>
      </PanelHeader>
      <PanelBody>
        <Section>
          <p>Choose which additional panels appear in the Map menu. All panels are shown by default.</p>
        </Section>
        <Section titleHeading="Map panels">
          <ControlRow role="group" aria-label="Optional Map panels">
            {OPTIONAL_PANEL_REGISTRY.map(entry => (
              <LayerChoice key={entry.id} type="checkbox" label={entry.label} title={entry.title}
                checked={isPanelVisible(entry.id)} onChange={() => togglePanel(entry.id)} />
            ))}
          </ControlRow>
          <p>Hiding a panel keeps your drawings and map layer settings.</p>
        </Section>
      </PanelBody>
      <PanelFooter>
        <ActionButton onClick={restoreDefaults} disabled={OPTIONAL_PANEL_REGISTRY.every(entry => isPanelVisible(entry.id))}>Restore defaults</ActionButton>
      </PanelFooter>
    </Panel>
  );
}
