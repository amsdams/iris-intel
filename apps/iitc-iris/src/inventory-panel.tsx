import {h} from 'preact';
import {formatIitcColorVars, getIitcItemColor} from './iitc-colors';
import type {IitcIrisInventoryState} from './messages';
import {formatElapsedSeconds, formatSubscriptionLabel, getAuthErrorMessage, getSubscriptionStatusClass} from './ui-status';

export interface IitcIrisInventoryPanelProps {
  inventoryState: IitcIrisInventoryState;
  refresh: () => void;
  zoomToAndShowPortal: (portalGuid?: string, latE6?: number, lngE6?: number, zoom?: number) => void;
}

function formatInteger(value: number | undefined): string {
  return value === undefined || !Number.isFinite(value) ? '-' : value.toLocaleString();
}

function formatItemBadge(item: {level?: number; rarity?: string; type?: string}): string {
  if (item.level !== undefined) return `L${item.level}`;
  if (item.rarity === 'VERY_RARE') return 'VR';
  if (item.rarity === 'RARE') return 'R';
  if (item.rarity === 'COMMON') return 'C';
  if (item.type?.includes('CAPSULE')) return 'CAP';
  return 'IT';
}

export function IitcIrisInventoryPanel({inventoryState, refresh, zoomToAndShowPortal}: IitcIrisInventoryPanelProps): h.JSX.Element {
  return <div className="iitc-iris-request-panel-body">
    <div className="iitc-iris-map-control-row">
      <button className="iitc-iris-portal-action" type="button" onClick={refresh} disabled={inventoryState.status === 'loading'} title="Fetch Intel inventory with lastQueryTimestamp 0">
        {inventoryState.status === 'loading' ? 'Loading' : 'Refresh'}
      </button>
      <span className={`iitc-iris-status ${inventoryState.status === 'error' || inventoryState.status === 'auth' ? 'iitc-iris-warning' : ''}`}>
        {inventoryState.status}
      </span>
      <span className={`iitc-iris-status ${getSubscriptionStatusClass(inventoryState.subscription)}`}>
        {formatSubscriptionLabel(inventoryState.subscription)}
      </span>
    </div>
    <div className="iitc-iris-panel-summary">
      <span><b>{formatInteger(inventoryState.items)} / 2500</b><small>items</small></span>
      <span><b>{formatInteger(inventoryState.keys)}</b><small>{formatInteger(inventoryState.portalsWithKeys)} portals</small></span>
      <span><b>{formatInteger(inventoryState.capsules)}</b><small>capsules</small></span>
    </div>
    <div className="iitc-iris-panel-summary">
      <span>
        <b>{inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.total : '-'}</b>
        <small>selected keys</small>
      </span>
      <span>
        <b>{inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.loose : '-'}</b>
        <small>loose</small>
      </span>
      <span>
        <b>{inventoryState.portalKeysForSelectedPortal ? inventoryState.portalKeysForSelectedPortal.capsule : '-'}</b>
        <small>capsule</small>
      </span>
    </div>
    {inventoryState.selectedPortalTitle && (
      <div className="iitc-iris-inventory-selected" title={inventoryState.selectedPortalGuid}>
        <span className="iitc-iris-status">selected</span>
        <b>{inventoryState.selectedPortalTitle}</b>
      </div>
    )}
    <div className="iitc-iris-scroll-region iitc-iris-inventory-scroll">
      {inventoryState.portalKeysForSelectedPortal && Object.keys(inventoryState.portalKeysForSelectedPortal.capsules).length > 0 && (
        <div className="iitc-iris-inventory-section">
          <span className="iitc-iris-status">Selected key capsules</span>
          <div className="iitc-iris-inventory-list">
            {Object.entries(inventoryState.portalKeysForSelectedPortal.capsules).map(([capsule, count]) => (
              <div className="iitc-iris-inventory-row" key={capsule}>
                <span>{capsule}</span>
                <b>{count}</b>
              </div>
            ))}
          </div>
        </div>
      )}
      {inventoryState.topItems && inventoryState.topItems.length > 0 && (
        <div className="iitc-iris-inventory-section">
          <span className="iitc-iris-status">Top items</span>
          <div className="iitc-iris-inventory-list">
            {inventoryState.topItems.map((item) => (
              <div
                className="iitc-iris-inventory-row"
                key={`${item.type}-${item.level ?? ''}-${item.rarity ?? ''}-${item.label}`}
                style={formatIitcColorVars(getIitcItemColor(item))}
              >
                <span><b className="iitc-iris-item-badge">{formatItemBadge(item)}</b>{item.label}{item.level ? ` L${item.level}` : ''}</span>
                <b>{item.count}</b>
                {item.rarity && <small>{item.rarity.replace(/_/g, ' ')}</small>}
              </div>
            ))}
          </div>
        </div>
      )}
      {inventoryState.topKeys && inventoryState.topKeys.length > 0 && (
        <div className="iitc-iris-inventory-section">
          <span className="iitc-iris-status">Top keys</span>
          <div className="iitc-iris-inventory-list">
            {inventoryState.topKeys.map((key) => (
              <button className="iitc-iris-inventory-row iitc-iris-inventory-key-row" type="button" key={key.portalGuid} title={key.portalGuid} onClick={() => zoomToAndShowPortal(key.portalGuid, undefined, undefined)}>
                <span>{key.portalTitle || key.portalGuid}</span>
                <b>{key.count}</b>
                {key.capsule > 0 && <small>{key.capsule} capsule</small>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    <div className="iitc-iris-panel-footer">
      <span
        className="iitc-iris-diagnostics-chip"
        title={[
          'request: /r/getInventory lastQueryTimestamp=0',
          'subscription request: /r/getHasActiveSubscription',
          `subscription: ${formatSubscriptionLabel(inventoryState.subscription)}`,
          `raw: ${formatInteger(inventoryState.rawItems)}`,
          `selected portal: ${inventoryState.selectedPortalGuid ?? '-'}`,
        ].join('\n')}
      >
        {inventoryState.elapsedMs !== undefined ? `request ${formatElapsedSeconds(inventoryState.elapsedMs)}s` : 'request'}
      </span>
      {inventoryState.subscription?.elapsedMs !== undefined && (
        <span
          className="iitc-iris-diagnostics-chip"
          title="request: /r/getHasActiveSubscription"
        >
          core {formatElapsedSeconds(inventoryState.subscription.elapsedMs)}s
        </span>
      )}
      {inventoryState.error && (
        <span className="iitc-iris-warning" title={inventoryState.error}>
          {inventoryState.status === 'auth'
            ? 'Inventory requires an authenticated Intel session.'
            : getAuthErrorMessage(inventoryState.status, inventoryState.error)}
        </span>
      )}
    </div>
  </div>;
}
