import {h} from 'preact';
import {
  DRAW_TOOLS_DEFAULT_COLOR,
  DRAW_TOOLS_MARKER_PRESETS,
  getDrawToolsItemDetail,
  getDrawToolsItemLabel,
  type DrawToolsTarget,
} from './content-draw-tools';
import type {IitcIrisDrawToolsItem, IitcIrisDrawToolsLatLng} from './messages';

type DrawToolsItemType = 'polyline' | 'marker';

export interface IitcIrisDrawToolsPanelProps {
  allItemsCount: number;
  clearConfirm: DrawToolsItemType | null;
  editingMarkerIndex: number | null;
  importMerge: boolean;
  importStatus: string;
  importText: string;
  linkItems: Extract<IitcIrisDrawToolsItem, {type: 'polyline'}>[];
  linkStart: IitcIrisDrawToolsLatLng | null;
  markerItems: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>[];
  markerLabel: string;
  mode: 'links' | 'markers';
  target: DrawToolsTarget | null;
  addMarker: (color: string) => void;
  addLinkPoint: () => void;
  centerItem: (item: IitcIrisDrawToolsItem) => void;
  clearItems: (itemType?: DrawToolsItemType) => void;
  copyItems: (itemType?: DrawToolsItemType) => void;
  deleteAtContext: (itemType?: DrawToolsItemType) => void;
  deleteItem: (item: IitcIrisDrawToolsItem) => void;
  importItems: () => void;
  saveMarkerLabel: (item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>, label: string) => void;
  setEditingMarkerIndex: (index: number | null) => void;
  setImportMerge: (value: boolean) => void;
  setImportText: (value: string) => void;
  setLinkStart: (value: IitcIrisDrawToolsLatLng | null) => void;
  setMarkerLabel: (value: string) => void;
  undoItem: (itemType?: DrawToolsItemType) => void;
}

function IitcIrisDrawToolsImport(props: Pick<IitcIrisDrawToolsPanelProps, 'importMerge' | 'importStatus' | 'importText' | 'importItems' | 'setImportMerge' | 'setImportText'>): h.JSX.Element {
  return <div className="iitc-iris-draw-tools-import">
    <span className="iitc-iris-draw-tools-interop">IITC Draw Tools JSON: links and markers</span>
    <textarea
      className="iitc-iris-draw-tools-import-input"
      value={props.importText}
      placeholder="Paste IITC Draw Tools JSON"
      rows={3}
      onInput={(event) => props.setImportText(event.currentTarget.value)}
    />
    <div className="iitc-iris-map-context-row">
      <label className="iitc-iris-draw-tools-import-merge">
        <input type="checkbox" checked={props.importMerge} onChange={(event) => props.setImportMerge(event.currentTarget.checked)} />
        Merge
      </label>
      <button className="iitc-iris-portal-action" type="button" onClick={props.importItems} disabled={!props.importText.trim()} title="Import supported links and markers">Import</button>
      {props.importStatus && <span className="iitc-iris-map-control-status">{props.importStatus}</span>}
    </div>
  </div>;
}

export function IitcIrisDrawToolsPanel(props: IitcIrisDrawToolsPanelProps): h.JSX.Element {
  if (props.mode === 'links') {
    return <div className="iitc-iris-map-controls-section">
      <span className="iitc-iris-status">Draw Links</span>
      <div className="iitc-iris-map-context-row">
        <span className="iitc-iris-map-context-coords">
          {props.target?.label ?? 'Select a portal or open a context point'}
        </span>
        <button className="iitc-iris-portal-action" type="button" onClick={props.addLinkPoint} disabled={!props.target} title={props.linkStart ? 'Finish drawn link at the current target' : 'Start drawn link at the current target'}>
          {props.linkStart ? 'To' : 'From'}
        </button>
        <button className="iitc-iris-portal-action" type="button" onClick={() => props.setLinkStart(null)} disabled={!props.linkStart} title="Reset pending drawn link">Reset</button>
        <button className="iitc-iris-portal-action" type="button" onClick={() => props.deleteAtContext('polyline')} disabled={!props.target} title="Delete nearest drawn link">Del</button>
      </div>
      {props.linkStart && <div className="iitc-iris-map-context-row">
        <span className="iitc-iris-map-context-coords">
          From {props.linkStart.lat.toFixed(6)}, {props.linkStart.lng.toFixed(6)}
        </span>
      </div>}
      <div className="iitc-iris-map-context-row">
        <span className="iitc-iris-map-context-coords">{props.linkItems.length.toLocaleString()} drawn links</span>
        <button className="iitc-iris-portal-action" type="button" onClick={() => props.undoItem('polyline')} disabled={props.linkItems.length === 0} title="Remove latest drawn link">Undo</button>
        <button className="iitc-iris-portal-action" type="button" onClick={() => props.copyItems('polyline')} disabled={props.linkItems.length === 0} title="Copy drawn links as IITC Draw Tools JSON">Copy</button>
        <button className="iitc-iris-portal-action" type="button" onClick={() => props.copyItems()} disabled={props.allItemsCount === 0} title="Export all supported Draw Tools items as IITC JSON">Export</button>
        <button className={`iitc-iris-portal-action ${props.clearConfirm === 'polyline' ? 'is-danger' : ''}`} type="button" onClick={() => props.clearItems('polyline')} disabled={props.linkItems.length === 0} title="Clear all drawn links">
          {props.clearConfirm === 'polyline' ? 'Confirm' : 'Clear'}
        </button>
      </div>
      {props.linkItems.length > 0 && <div className="iitc-iris-draw-tools-list" aria-label="Drawn links">
        {props.linkItems.map((item, index) => (
          <div className="iitc-iris-draw-tools-list-item" key={`link-${item.storageIndex}`}>
            <span className="iitc-iris-draw-tools-list-label">
              <b>{getDrawToolsItemLabel(item, index)}</b>
              <small>{getDrawToolsItemDetail(item)}</small>
            </span>
            <span className="iitc-iris-draw-tools-list-actions">
              <button className="iitc-iris-portal-action" type="button" onClick={() => props.centerItem(item)} title="Center this drawn link">Center</button>
              <button className="iitc-iris-portal-action" type="button" onClick={() => props.deleteItem(item)} title="Delete this drawn link">Del</button>
            </span>
          </div>
        ))}
      </div>}
      <IitcIrisDrawToolsImport {...props} />
    </div>;
  }

  return <div className="iitc-iris-map-controls-section">
    <span className="iitc-iris-status">Draw Markers</span>
    <div className="iitc-iris-map-context-row">
      <span className="iitc-iris-map-context-coords">
        {props.target?.label ?? 'Select a portal or open a context point'}
      </span>
    </div>
    <div className="iitc-iris-map-context-row iitc-iris-draw-tools-marker-create-row">
      <input
        className="iitc-iris-draw-tools-label-input"
        type="text"
        value={props.markerLabel}
        onInput={(event) => props.setMarkerLabel(event.currentTarget.value)}
        placeholder={props.target ? 'Marker label' : 'Select a marker target'}
        disabled={!props.target}
        aria-label="New marker label"
      />
      <span className="iitc-iris-draw-tools-marker-actions" aria-label="Add marker">
        {DRAW_TOOLS_MARKER_PRESETS.map((preset) => (
          <button
            className="iitc-iris-draw-tools-marker-swatch"
            key={preset.id}
            type="button"
            onClick={() => props.addMarker(preset.color)}
            disabled={!props.target}
            style={{background: preset.color}}
            title={preset.title}
            aria-label={preset.title}
          />
        ))}
      </span>
    </div>
    <div className="iitc-iris-map-context-row">
      <span className="iitc-iris-map-context-coords">{props.markerItems.length.toLocaleString()} drawn markers</span>
      <button className="iitc-iris-portal-action" type="button" onClick={() => props.deleteAtContext('marker')} disabled={!props.target} title="Delete nearest drawn marker">Del</button>
      <button className="iitc-iris-portal-action" type="button" onClick={() => props.undoItem('marker')} disabled={props.markerItems.length === 0} title="Remove latest drawn marker">Undo</button>
      <button className="iitc-iris-portal-action" type="button" onClick={() => props.copyItems('marker')} disabled={props.markerItems.length === 0} title="Copy drawn markers as IITC Draw Tools JSON">Copy</button>
      <button className="iitc-iris-portal-action" type="button" onClick={() => props.copyItems()} disabled={props.allItemsCount === 0} title="Export all supported Draw Tools items as IITC JSON">Export</button>
      <button className={`iitc-iris-portal-action ${props.clearConfirm === 'marker' ? 'is-danger' : ''}`} type="button" onClick={() => props.clearItems('marker')} disabled={props.markerItems.length === 0} title="Clear all drawn markers">
        {props.clearConfirm === 'marker' ? 'Confirm' : 'Clear'}
      </button>
    </div>
    {props.markerItems.length > 0 && <div className="iitc-iris-draw-tools-list" aria-label="Drawn markers">
      {props.markerItems.map((item, index) => (
        <div className="iitc-iris-draw-tools-list-item" key={`marker-${item.storageIndex}`}>
          <span className="iitc-iris-draw-tools-marker-dot" style={{background: item.color ?? DRAW_TOOLS_DEFAULT_COLOR}} />
          <span className="iitc-iris-draw-tools-list-label">
            {props.editingMarkerIndex === item.storageIndex ? (
              <input
                className="iitc-iris-draw-tools-label-input"
                type="text"
                defaultValue={item.label ?? ''}
                placeholder={getDrawToolsItemLabel(item, index)}
                aria-label={`Marker ${index + 1} label`}
                autoFocus
                onBlur={(event) => props.saveMarkerLabel(item, event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                  if (event.key === 'Escape') {
                    event.currentTarget.value = item.label ?? '';
                    props.setEditingMarkerIndex(null);
                  }
                }}
              />
            ) : (
              <b>{getDrawToolsItemLabel(item, index)}</b>
            )}
            <small>{getDrawToolsItemDetail(item)}</small>
          </span>
          <span className="iitc-iris-draw-tools-list-actions">
            <button className="iitc-iris-portal-action" type="button" onClick={() => props.setEditingMarkerIndex(item.storageIndex)} title="Edit this marker label">Edit</button>
            <button className="iitc-iris-portal-action" type="button" onClick={() => props.centerItem(item)} title="Center this drawn marker">Center</button>
            <button className="iitc-iris-portal-action" type="button" onClick={() => props.deleteItem(item)} title="Delete this drawn marker">Del</button>
          </span>
        </div>
      ))}
    </div>}
    <IitcIrisDrawToolsImport {...props} />
  </div>;
}
