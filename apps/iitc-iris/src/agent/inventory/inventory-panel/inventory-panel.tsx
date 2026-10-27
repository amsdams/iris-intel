import {h} from 'preact';
import '../../../ui/shared/selection-summary.css';
import '../../item-list.css';
import './inventory-panel.css';
import '../../../ui/shared/scroll-region.css';
import '../../../ui/shared/list-item.css';
import {formatIitcColorVars, getIitcItemColor, getIitcLevelColor, getIitcRarityColor} from '../../../iitc-colors';
import type {IitcIrisInventoryState} from '../../../messages';
import {formatElapsedSeconds, formatSubscriptionLabel, getAuthErrorMessage, getSubscriptionStatusClass} from '../../../ui-status';
import {ActionButton} from '../../../ui/action-button';
import {Badge} from '../../../ui/badge';
import {ControlRow} from '../../../ui/control-row';
import {DiagnosticsChip} from '../../../ui/diagnostics-chip';
import {PanelBody, PanelFooter} from '../../../ui/panel';
import {StatusText} from '../../../ui/status-text';
import {SummaryCell} from '../../../ui/summary-cell';
import {SummaryGrid} from '../../../ui/summary-grid';
import {formatInventoryItemLabel, formatInventoryRarity} from './inventory-item-display';

export interface IitcIrisInventoryPanelProps {
  inventoryState: IitcIrisInventoryState;
  refresh: () => void;
  zoomToAndShowPortal: (portalGuid?: string, latE6?: number, lngE6?: number, zoom?: number) => void;
}

function formatInteger(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : value.toLocaleString();
}

export function IitcIrisInventoryPanel({inventoryState, refresh, zoomToAndShowPortal}: IitcIrisInventoryPanelProps): h.JSX.Element {
  return <PanelBody>
    <ControlRow>
      <ActionButton onClick={refresh} disabled={inventoryState.status === 'loading'} title="Fetch Intel inventory with lastQueryTimestamp 0">
        {inventoryState.status === 'loading' ? 'Loading' : 'Refresh'}
      </ActionButton>
      <StatusText className={inventoryState.status === 'error' || inventoryState.status === 'auth' ? 'iitc-iris-warning' : ''}>
        {inventoryState.status}
      </StatusText>
      <StatusText className={getSubscriptionStatusClass(inventoryState.subscription)}>
        {formatSubscriptionLabel(inventoryState.subscription)}
      </StatusText>
    </ControlRow>
    <SummaryGrid>
      <SummaryCell value={`${formatInteger(inventoryState.items)} / 2500`} label="items" />
      <SummaryCell value={formatInteger(inventoryState.keys)} label={`${formatInteger(inventoryState.portalsWithKeys)} portals`} />
      <SummaryCell value={formatInteger(inventoryState.capsules)} label="capsules" />
      <SummaryCell value={inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.total : '-'} label="selected keys" />
      <SummaryCell value={inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.loose : '-'} label="loose" />
      <SummaryCell value={inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.capsule : '-'} label="capsule" />
    </SummaryGrid>
    {inventoryState.selectedPortalTitle && (
      <div className="iitc-iris-inventory-selected" title={inventoryState.selectedPortalGuid}>
        <StatusText>selected</StatusText>
        <b>{inventoryState.selectedPortalTitle}</b>
      </div>
    )}
    <div className="iitc-iris-scroll-region iitc-iris-inventory-scroll">
      {inventoryState.portalKeysForSelectedPortal && Object.keys(inventoryState.portalKeysForSelectedPortal.capsules).length > 0 && (
        <div className="iitc-iris-inventory-section">
          <StatusText>Selected key capsules</StatusText>
          <div className="iitc-iris-agent-item-list">
            {Object.entries(inventoryState.portalKeysForSelectedPortal.capsules).map(([capsule, count]) => (
              <div className="iitc-iris-list-item iitc-iris-agent-item-row" key={capsule}>
                <span>{capsule}</span>
                <b>{count}</b>
              </div>
            ))}
          </div>
        </div>
      )}
      {inventoryState.topItems && inventoryState.topItems.length > 0 && (
        <div className="iitc-iris-inventory-section">
          <StatusText>Top items</StatusText>
          <div className="iitc-iris-agent-item-list">
            {inventoryState.topItems.map((item) => {
              const rarity = formatInventoryRarity(item.rarity);
              return <div
                className="iitc-iris-list-item iitc-iris-agent-item-row iitc-iris-inventory-item-row"
                key={`${item.type}-${item.level ?? ''}-${item.rarity ?? ''}-${item.label}`}
                style={formatIitcColorVars(getIitcItemColor(item))}
              >
                <span>
                  <Badge
                    as="b" className="iitc-iris-agent-item-badge" role="img" aria-label={rarity.label} title={rarity.label}
                    style={formatIitcColorVars(getIitcRarityColor(item.rarity) ?? '#91a6b7')}
                  >{rarity.badge}</Badge>
                  {item.level !== undefined && Number.isFinite(item.level) && (
                    <Badge
                      as="b" className="iitc-iris-agent-item-badge" role="img" aria-label={`Level ${item.level}`} title={`Level ${item.level}`}
                      style={formatIitcColorVars(getIitcLevelColor(item.level))}
                    >L{item.level}</Badge>
                  )}
                  {formatInventoryItemLabel(item)}
                </span>
                <b>{item.count}</b>
              </div>;
            })}
          </div>
        </div>
      )}
      {inventoryState.topKeys && inventoryState.topKeys.length > 0 && (
        <div className="iitc-iris-inventory-section">
          <StatusText>Top keys</StatusText>
          <div className="iitc-iris-agent-item-list">
            {inventoryState.topKeys.map((key) => (
              <button className="iitc-iris-list-item iitc-iris-agent-item-row iitc-iris-inventory-key-row" type="button" key={key.portalGuid} title={key.portalGuid} onClick={() => zoomToAndShowPortal(key.portalGuid, undefined, undefined)}>
                <span>{key.portalTitle || key.portalGuid}</span>
                <b>{key.count}</b>
                {key.capsule > 0 && <small>{key.capsule} capsule</small>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    <PanelFooter>
      <DiagnosticsChip
        title={[
          'request: /r/getInventory lastQueryTimestamp=0',
          'subscription request: /r/getHasActiveSubscription',
          `subscription: ${formatSubscriptionLabel(inventoryState.subscription)}`,
          `raw: ${formatInteger(inventoryState.rawItems)}`,
          `selected portal: ${inventoryState.selectedPortalGuid ?? '-'}`,
        ].join('\n')}
      >
        {inventoryState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(inventoryState.elapsedMs)}s` : 'request'}
      </DiagnosticsChip>
      {inventoryState.subscription?.elapsedMs !== undefined && (
        <DiagnosticsChip
          title="request: /r/getHasActiveSubscription"
        >
          core {formatElapsedSeconds(inventoryState.subscription.elapsedMs)}s
        </DiagnosticsChip>
      )}
      {inventoryState.error && (
        <StatusText className="iitc-iris-warning" title={inventoryState.error}>
          {inventoryState.status === 'auth'
            ? 'Inventory requires an authenticated Intel session.'
            : getAuthErrorMessage(inventoryState.status, inventoryState.error)}
        </StatusText>
      )}
    </PanelFooter>
  </PanelBody>;
}
