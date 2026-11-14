import {h} from 'preact';
import '../../../ui/shared/section-summary.css';
import '../../item-list.css';
import './inventory-panel.css';
import '../../../ui/shared/scroll-region.css';
import '../../../ui/shared/list-item.css';
import {formatIitcColorVars, getIitcItemColor, getIitcLevelColor, getIitcRarityColor} from '../../../iitc-colors';
import type {IitcIrisInventoryState} from '../../../messages';
import {formatSubscriptionLabel, getAuthErrorMessage, getSubscriptionStatusClass} from '../../../ui-status';
import {ActionButton} from '../../../ui/action-button';
import {Badge} from '../../../ui/badge';
import {ControlRow} from '../../../ui/control-row';
import {PanelBody} from '../../../ui/panel';
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
  const hasInventory = inventoryState.rawItems !== undefined || inventoryState.status === 'ready' || inventoryState.status === 'empty';
  const selectedKeys = inventoryState.portalKeysForSelectedPortal ?? (hasInventory
    ? {total: 0, loose: 0, capsule: 0, capsules: {}}
    : null);
  return <PanelBody>
    {hasInventory ? <SummaryGrid className="iitc-iris-inventory-summary" aria-label="Inventory totals">
      <SummaryCell value={`${formatInteger(inventoryState.items)} / 2500`} label="items" />
      <SummaryCell value={formatInteger(inventoryState.keys)} label="keys" />
      <SummaryCell value={formatInteger(inventoryState.capsules)} label="capsules" />
    </SummaryGrid> : <StatusText>{inventoryState.status === 'loading' ? 'Loading inventory…' : 'Inventory has not been loaded.'}</StatusText>}
    {inventoryState.selectedPortalGuid && <section className="iitc-iris-inventory-selected-keys" aria-label="Selected portal keys">
      <b>{inventoryState.selectedPortalTitle || inventoryState.selectedPortalGuid}</b>
      <span><strong>{selectedKeys?.total ?? 'Unknown'}</strong> selected keys</span>
      {selectedKeys && <details>
        <summary className="iitc-iris-section-summary">Key breakdown</summary>
        <StatusText>{formatInteger(selectedKeys.loose)} loose · {formatInteger(selectedKeys.capsule)} in capsules</StatusText>
        {Object.keys(selectedKeys.capsules).length > 0 && <div className="iitc-iris-agent-item-list">
          {Object.entries(selectedKeys.capsules).map(([capsule, count]) => (
            <div className="iitc-iris-list-item iitc-iris-agent-item-row" key={capsule}>
              <span>{capsule}</span><b>{count}</b>
            </div>
          ))}
        </div>}
      </details>}
    </section>}
    <ControlRow>
      <ActionButton onClick={refresh} disabled={inventoryState.status === 'loading'} title="Refresh inventory">
        {inventoryState.status === 'loading' ? 'Loading' : 'Refresh'}
      </ActionButton>
      <StatusText className={getSubscriptionStatusClass(inventoryState.subscription)}>
        {formatSubscriptionLabel(inventoryState.subscription)}
      </StatusText>
    </ControlRow>
    {inventoryState.status === 'empty' && (
      <StatusText role="status">
        Intel returned no inventory items. Requests may be limited. Wait a few minutes before refreshing.
        {inventoryState.subscription?.status === 'inactive' && ' Inventory access requires an active C.O.R.E. subscription.'}
      </StatusText>
    )}
    {inventoryState.error && (
      <StatusText role={inventoryState.status === 'loading' ? 'status' : 'alert'} className="iitc-iris-warning">
        {inventoryState.status === 'auth'
          ? 'Inventory requires an authenticated Intel session.'
          : getAuthErrorMessage(inventoryState.status, inventoryState.error)}
        {inventoryState.rawItems !== undefined && inventoryState.rawItems > 0 && ' Showing previously loaded inventory.'}
      </StatusText>
    )}
    <div className="iitc-iris-scroll-region iitc-iris-inventory-scroll">
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
          <StatusText>Top keys · {formatInteger(inventoryState.portalsWithKeys)} portals</StatusText>
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
  </PanelBody>;
}
