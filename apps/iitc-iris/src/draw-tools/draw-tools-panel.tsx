import {h} from 'preact';
import {
  DRAW_TOOLS_DEFAULT_COLOR,
  DRAW_TOOLS_MARKER_PRESETS,
  getDrawToolsItemDetail,
  getDrawToolsItemLabel,
  type DrawToolsLinkEndpointLabels,
  type DrawToolsMarkerPortalInfo,
  type DrawToolsTarget,
} from './content-draw-tools';
import {formatTeamClass, formatTeamShortLabel, getPortalCountsLevelColor} from '../portal-analysis/content-portal-analysis';
import type {IitcIrisDrawToolsItem, IitcIrisDrawToolsLatLng} from '../messages';
import {Badge} from '../ui/badge';
import {TextInput} from '../ui/text-input';
import {ActionButton} from '../ui/action-button';
import {Section} from '../ui/section';

type DrawToolsItemType = 'polyline' | 'marker';

export interface IitcIrisDrawToolsPanelProps {
  allItemsCount: number;
  clearConfirm: DrawToolsItemType | null;
  editingMarkerIndex: number | null;
  importMerge: boolean;
  importStatus: string;
  importText: string;
  linkItems: Extract<IitcIrisDrawToolsItem, {type: 'polyline'}>[];
  linkEndpointLabelsByStorageIndex: Record<number, DrawToolsLinkEndpointLabels>;
  linkStart: IitcIrisDrawToolsLatLng | null;
  markerItems: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>[];
  markerLabel: string;
  markerPortalInfoByStorageIndex: Record<number, DrawToolsMarkerPortalInfo>;
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
      <ActionButton onClick={props.importItems} disabled={!props.importText.trim()} title="Import supported links and markers">Import</ActionButton>
      {props.importStatus && <span className="iitc-iris-map-control-status">{props.importStatus}</span>}
    </div>
  </div>;
}

function getLevelChipTextColor(level: number): string {
  return level === 0 || level >= 4 ? '#ffffff' : '#111111';
}

export function IitcIrisDrawToolsPanel(props: IitcIrisDrawToolsPanelProps): h.JSX.Element {
  if (props.mode === 'links') {
    return <Section titleHeading="Draw Links">
      <div className="iitc-iris-map-context-row">
        <span className="iitc-iris-map-context-coords">
          {props.target?.label ?? 'Select a portal or open a context point'}
        </span>
        <ActionButton onClick={props.addLinkPoint} disabled={!props.target} title={props.linkStart ? 'Finish drawn link at the current target' : 'Start drawn link at the current target'}>
          {props.linkStart ? 'To' : 'From'}
        </ActionButton>
        <ActionButton onClick={() => props.setLinkStart(null)} disabled={!props.linkStart} title="Reset pending drawn link">Reset</ActionButton>
        <ActionButton onClick={() => props.deleteAtContext('polyline')} disabled={!props.target} title="Delete nearest drawn link">Del</ActionButton>
      </div>
      {props.linkStart && <div className="iitc-iris-map-context-row">
        <span className="iitc-iris-map-context-coords">
          From {props.linkStart.lat.toFixed(6)}, {props.linkStart.lng.toFixed(6)}
        </span>
      </div>}
      <div className="iitc-iris-map-context-row">
        <span className="iitc-iris-map-context-coords">{props.linkItems.length.toLocaleString()} drawn links</span>
        <ActionButton onClick={() => props.undoItem('polyline')} disabled={props.linkItems.length === 0} title="Remove latest drawn link">Undo</ActionButton>
        <ActionButton onClick={() => props.copyItems('polyline')} disabled={props.linkItems.length === 0} title="Copy drawn links as IITC Draw Tools JSON">Copy</ActionButton>
        <ActionButton onClick={() => props.copyItems()} disabled={props.allItemsCount === 0} title="Export all supported Draw Tools items as IITC JSON">Export</ActionButton>
        <ActionButton className={props.clearConfirm === 'polyline' ? 'is-danger' : ''} onClick={() => props.clearItems('polyline')} disabled={props.linkItems.length === 0} title="Clear all drawn links">
          {props.clearConfirm === 'polyline' ? 'Confirm' : 'Clear'}
        </ActionButton>
      </div>
      {props.linkItems.length > 0 && <div className="iitc-iris-draw-tools-list" aria-label="Drawn links">
        {props.linkItems.map((item, index) => {
          const endpointLabels = props.linkEndpointLabelsByStorageIndex[item.storageIndex];
          const detail = endpointLabels
            ? `${endpointLabels.from} -> ${endpointLabels.to}`
            : getDrawToolsItemDetail(item);
          return (
            <div className="iitc-iris-draw-tools-list-item" key={`link-${item.storageIndex}`}>
              <span className="iitc-iris-draw-tools-list-label">
                <b>{getDrawToolsItemLabel(item, index)}</b>
                <small title={getDrawToolsItemDetail(item)}>{detail}</small>
              </span>
              <span className="iitc-iris-draw-tools-list-actions">
                <ActionButton onClick={() => props.centerItem(item)} title="Center this drawn link">Center</ActionButton>
                <ActionButton onClick={() => props.deleteItem(item)} title="Delete this drawn link">Del</ActionButton>
              </span>
            </div>
          );
        })}
      </div>}
      <IitcIrisDrawToolsImport {...props} />
    </Section>;
  }

  return <Section titleHeading="Draw Markers">
    <div className="iitc-iris-map-context-row">
      <span className="iitc-iris-map-context-coords">
        {props.target?.label ?? 'Select a portal or open a context point'}
      </span>
    </div>
    <div className="iitc-iris-map-context-row iitc-iris-draw-tools-marker-create-row">
      <TextInput
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
      <ActionButton onClick={() => props.deleteAtContext('marker')} disabled={!props.target} title="Delete nearest drawn marker">Del</ActionButton>
      <ActionButton onClick={() => props.undoItem('marker')} disabled={props.markerItems.length === 0} title="Remove latest drawn marker">Undo</ActionButton>
      <ActionButton onClick={() => props.copyItems('marker')} disabled={props.markerItems.length === 0} title="Copy drawn markers as IITC Draw Tools JSON">Copy</ActionButton>
      <ActionButton onClick={() => props.copyItems()} disabled={props.allItemsCount === 0} title="Export all supported Draw Tools items as IITC JSON">Export</ActionButton>
      <ActionButton className={props.clearConfirm === 'marker' ? 'is-danger' : ''} onClick={() => props.clearItems('marker')} disabled={props.markerItems.length === 0} title="Clear all drawn markers">
        {props.clearConfirm === 'marker' ? 'Confirm' : 'Clear'}
      </ActionButton>
    </div>
    {props.markerItems.length > 0 && <div className="iitc-iris-draw-tools-list" aria-label="Drawn markers">
      {props.markerItems.map((item, index) => {
        const portalInfo = props.markerPortalInfoByStorageIndex[item.storageIndex];
        return (
          <div className="iitc-iris-draw-tools-list-item" key={`marker-${item.storageIndex}`}>
            <span className="iitc-iris-draw-tools-marker-dot" style={{background: item.color ?? DRAW_TOOLS_DEFAULT_COLOR}} />
            <span className="iitc-iris-draw-tools-list-label">
              {props.editingMarkerIndex === item.storageIndex ? (
                <TextInput
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
                <b title={portalInfo?.title}>{getDrawToolsItemLabel(item, index)}</b>
              )}
              <small className="iitc-iris-draw-tools-marker-detail" title={portalInfo?.title}>
                <span className="iitc-iris-draw-tools-marker-coords">{getDrawToolsItemDetail(item)}</span>
                {portalInfo && (
                  <span className="iitc-iris-draw-tools-marker-chips" aria-label={`Portal ${portalInfo.title}, level ${portalInfo.level}, ${formatTeamShortLabel(portalInfo.team)}`}>
                    <Badge className="iitc-iris-draw-tools-level-chip" style={{background: getPortalCountsLevelColor(portalInfo.level), color: getLevelChipTextColor(portalInfo.level)}}>{`L${portalInfo.level}`}</Badge>
                    <Badge className={`iitc-iris-draw-tools-team-chip ${formatTeamClass(portalInfo.team)}`}>{formatTeamShortLabel(portalInfo.team)}</Badge>
                  </span>
                )}
              </small>
            </span>
            <span className="iitc-iris-draw-tools-list-actions">
              <ActionButton onClick={() => props.setEditingMarkerIndex(item.storageIndex)} title="Edit this marker label">Edit</ActionButton>
              <ActionButton onClick={() => props.centerItem(item)} title="Center this drawn marker">Center</ActionButton>
              <ActionButton onClick={() => props.deleteItem(item)} title="Delete this drawn marker">Del</ActionButton>
            </span>
          </div>
        );
      })}
    </div>}
    <IitcIrisDrawToolsImport {...props} />
  </Section>;
}
