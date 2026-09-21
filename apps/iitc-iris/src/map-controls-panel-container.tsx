import {h} from 'preact';
import {IitcIrisMapNavigationPanel, IitcIrisMapContextPanel} from './map-controls-panel';
import {IitcIrisDrawToolsPanel} from './draw-tools-panel';
import {IitcIrisPortalCountsPanel} from './portal-counts-panel';
import {IitcIrisPortalsListPanel} from './portals-list-panel';
import {IitcIrisScoreboardPanel} from './scoreboard-panel';
import {IitcIrisLayersPanel} from './layers-panel';
import {formatMapObjectDistance, formatTeamLabel} from './content-map-status';
import {type IitcIrisSheetId} from './menu-registry';
import {type IitcIrisPanDirection} from './content-keyboard-shortcuts';
import {type IitcIrisMapContextSelection} from './selection-lifecycle';
import {type IitcIrisBooleanLayerSettingKey} from './layer-registry';
import {type DrawToolsLinkEndpointLabels, type DrawToolsMarkerPortalInfo, type DrawToolsTarget} from './content-draw-tools';
import {
  type PortalAnalysisListSummary,
  type PortalsListLevelFilter,
  type PortalsListSortField,
  type PortalsListTeamFilter,
  type SortOrder,
} from './content-portal-analysis';
import {type IitcPortalsListEntry} from '@iris/iitc-core';
import {
  type IitcIrisBaseLayerId,
  type IitcIrisDrawToolsItem,
  type IitcIrisDrawToolsLatLng,
  type IitcIrisHighlighterSettings,
  type IitcIrisLayerSettings,
  type IitcIrisMapContextPortalAnchor,
  type IitcIrisPortalAnalysis,
  type IitcIrisPortalHighlighterId,
} from './messages';

export interface IitcIrisMapControlsPanelContainerProps {
  activeSheet: IitcIrisSheetId;
  closeSheets: () => void;

  canPan: boolean;
  geolocationStatus: string;
  locateBrowserPosition: () => void;
  panMap: (direction: IitcIrisPanDirection) => void;
  zoomMap: (delta: number) => void;

  mapContext: IitcIrisMapContextSelection | null;
  centerMapContext: () => void;
  copyMapContextGuid: () => void;
  copyMapContextLatLng: () => void;
  copyMapContextPortalGuids: () => void;
  copyMapContextUrl: () => void;
  selectMapContextAnchor: (anchor: IitcIrisMapContextPortalAnchor) => void;

  drawToolsItems: IitcIrisDrawToolsItem[];
  drawToolsClearConfirm: 'polyline' | 'marker' | null;
  editingDrawToolsMarkerIndex: number | null;
  drawToolsImportMerge: boolean;
  drawToolsImportStatus: string;
  drawToolsImportText: string;
  drawToolsLinkItems: Extract<IitcIrisDrawToolsItem, {type: 'polyline'}>[];
  drawToolsLinkEndpointLabelsByStorageIndex: Record<number, DrawToolsLinkEndpointLabels>;
  drawToolsLinkStart: IitcIrisDrawToolsLatLng | null;
  drawToolsMarkerItems: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>[];
  drawToolsMarkerLabel: string;
  drawToolsMarkerPortalInfoByStorageIndex: Record<number, DrawToolsMarkerPortalInfo>;
  drawToolsTarget: DrawToolsTarget | null;
  addDrawToolsLinkPoint: () => void;
  addDrawToolsMarker: (color: string) => void;
  centerDrawToolsItem: (item: IitcIrisDrawToolsItem) => void;
  clearDrawToolsItems: (itemType?: 'polyline' | 'marker') => void;
  copyDrawToolsItems: (itemType?: 'polyline' | 'marker') => void;
  deleteDrawToolsAtContext: (itemType?: 'polyline' | 'marker') => void;
  deleteDrawToolsItem: (item: IitcIrisDrawToolsItem) => void;
  importDrawToolsItems: () => void;
  saveDrawToolsMarkerLabel: (item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>, label: string) => void;
  setEditingMarkerIndex: (index: number | null) => void;
  setImportMerge: (value: boolean) => void;
  setImportText: (value: string) => void;
  setLinkStart: (value: IitcIrisDrawToolsLatLng | null) => void;
  setMarkerLabel: (value: string) => void;
  undoDrawToolsItem: (itemType?: 'polyline' | 'marker') => void;

  portalAnalysis: IitcIrisPortalAnalysis | null;
  cameraZoom: number;
  portalsListLevelFilter: PortalsListLevelFilter;
  portalsListSortBy: PortalsListSortField;
  portalsListSortOrder: SortOrder;
  portalsListSummary: PortalAnalysisListSummary;
  portalsListTeamFilter: PortalsListTeamFilter;
  portalsListTextFilter: string;
  sortedPortalsList: IitcPortalsListEntry[];
  setPortalsListLevelFilter: (filter: PortalsListLevelFilter) => void;
  setPortalsListTeamFilter: (filter: PortalsListTeamFilter) => void;
  setPortalsListTextFilter: (text: string) => void;
  sortPortalsListBy: (field: PortalsListSortField) => void;
  zoomToAndShowPortal: (portalGuid?: string, latE6?: number, lngE6?: number, zoom?: number) => void;

  baseLayerId: IitcIrisBaseLayerId;
  highlighterSettings: IitcIrisHighlighterSettings;
  layerSettings: IitcIrisLayerSettings;
  selectBaseLayer: (id: IitcIrisBaseLayerId) => void;
  selectPortalHighlighter: (active: IitcIrisPortalHighlighterId) => void;
  toggleLayerSetting: (key: IitcIrisBooleanLayerSettingKey) => void;
}

export function getMapControlsPanelTitle(sheet: IitcIrisSheetId): string {
  switch (sheet) {
    case 'view':
      return 'Controls';
    case 'selectedLink':
      return 'Link';
    case 'selectedField':
      return 'Field';
    case 'layers':
      return 'Display';
    case 'drawLinks':
      return 'Draw Links';
    case 'drawMarkers':
      return 'Draw Markers';
    case 'portalCounts':
      return 'Portal Counts';
    case 'portalsList':
      return 'Portals List';
    case 'scoreboard':
      return 'Scoreboard';
    default:
      return '';
  }
}

export function IitcIrisMapControlsPanelContainer(props: IitcIrisMapControlsPanelContainerProps): h.JSX.Element {
  const {
    activeSheet,
    closeSheets,
    canPan,
    geolocationStatus,
    locateBrowserPosition,
    panMap,
    zoomMap,
    mapContext,
    centerMapContext,
    copyMapContextGuid,
    copyMapContextLatLng,
    copyMapContextPortalGuids,
    copyMapContextUrl,
    selectMapContextAnchor,
    drawToolsItems,
    drawToolsClearConfirm,
    editingDrawToolsMarkerIndex,
    drawToolsImportMerge,
    drawToolsImportStatus,
    drawToolsImportText,
    drawToolsLinkItems,
    drawToolsLinkEndpointLabelsByStorageIndex,
    drawToolsLinkStart,
    drawToolsMarkerItems,
    drawToolsMarkerLabel,
    drawToolsMarkerPortalInfoByStorageIndex,
    drawToolsTarget,
    addDrawToolsLinkPoint,
    addDrawToolsMarker,
    centerDrawToolsItem,
    clearDrawToolsItems,
    copyDrawToolsItems,
    deleteDrawToolsAtContext,
    deleteDrawToolsItem,
    importDrawToolsItems,
    saveDrawToolsMarkerLabel,
    setEditingMarkerIndex,
    setImportMerge,
    setImportText,
    setLinkStart,
    setMarkerLabel,
    undoDrawToolsItem,
    portalAnalysis,
    cameraZoom,
    portalsListLevelFilter,
    portalsListSortBy,
    portalsListSortOrder,
    portalsListSummary,
    portalsListTeamFilter,
    portalsListTextFilter,
    sortedPortalsList,
    setPortalsListLevelFilter,
    setPortalsListTeamFilter,
    setPortalsListTextFilter,
    sortPortalsListBy,
    zoomToAndShowPortal,
    baseLayerId,
    highlighterSettings,
    layerSettings,
    selectBaseLayer,
    selectPortalHighlighter,
    toggleLayerSetting,
  } = props;

  const showTopBar = activeSheet === 'view' ||
    activeSheet === 'layers' ||
    activeSheet === 'drawLinks' ||
    activeSheet === 'drawMarkers' ||
    activeSheet === 'portalCounts' ||
    activeSheet === 'portalsList' ||
    activeSheet === 'scoreboard' ||
    activeSheet === 'selectedLink' ||
    activeSheet === 'selectedField';

  return (
    <aside className="iitc-iris-map-controls" aria-label="Map controls">
      {showTopBar && (
        <div className="iitc-iris-panel-topbar">
          <span className="iitc-iris-selected-title">
            {getMapControlsPanelTitle(activeSheet)}
          </span>
          <span className="iitc-iris-panel-header-actions">
            <button
              className="iitc-iris-clear-selection"
              type="button"
              onClick={closeSheets}
              title={`Close ${activeSheet}`}
              aria-label={`Close ${activeSheet}`}
            >
              X
            </button>
          </span>
        </div>
      )}
      {activeSheet === 'view' && (
        <IitcIrisMapNavigationPanel
          canPan={canPan}
          geolocationStatus={geolocationStatus}
          locateBrowserPosition={locateBrowserPosition}
          panMap={panMap}
          zoomMap={zoomMap}
        />
      )}
      {mapContext && (
        (activeSheet === 'view' && mapContext.target === 'map') ||
        (activeSheet === 'selectedLink' && mapContext.target === 'link') ||
        (activeSheet === 'selectedField' && mapContext.target === 'field')
      ) && (
        <IitcIrisMapContextPanel
          centerMapContext={centerMapContext}
          copyMapContextGuid={copyMapContextGuid}
          copyMapContextLatLng={copyMapContextLatLng}
          copyMapContextPortalGuids={copyMapContextPortalGuids}
          copyMapContextUrl={copyMapContextUrl}
          formatMapObjectDistance={formatMapObjectDistance}
          formatTeamLabel={formatTeamLabel}
          mapContext={mapContext}
          selectMapContextAnchor={selectMapContextAnchor}
        />
      )}
      {activeSheet === 'drawLinks' && (
        <IitcIrisDrawToolsPanel
          allItemsCount={drawToolsItems.length}
          clearConfirm={drawToolsClearConfirm}
          editingMarkerIndex={editingDrawToolsMarkerIndex}
          importMerge={drawToolsImportMerge}
          importStatus={drawToolsImportStatus}
          importText={drawToolsImportText}
          linkItems={drawToolsLinkItems}
          linkEndpointLabelsByStorageIndex={drawToolsLinkEndpointLabelsByStorageIndex}
          linkStart={drawToolsLinkStart}
          markerItems={drawToolsMarkerItems}
          markerLabel={drawToolsMarkerLabel}
          markerPortalInfoByStorageIndex={drawToolsMarkerPortalInfoByStorageIndex}
          mode="links"
          target={drawToolsTarget}
          addLinkPoint={addDrawToolsLinkPoint}
          addMarker={addDrawToolsMarker}
          centerItem={centerDrawToolsItem}
          clearItems={clearDrawToolsItems}
          copyItems={copyDrawToolsItems}
          deleteAtContext={deleteDrawToolsAtContext}
          deleteItem={deleteDrawToolsItem}
          importItems={importDrawToolsItems}
          saveMarkerLabel={saveDrawToolsMarkerLabel}
          setEditingMarkerIndex={setEditingMarkerIndex}
          setImportMerge={setImportMerge}
          setImportText={setImportText}
          setLinkStart={setLinkStart}
          setMarkerLabel={setMarkerLabel}
          undoItem={undoDrawToolsItem}
        />
      )}
      {activeSheet === 'drawMarkers' && (
        <IitcIrisDrawToolsPanel
          allItemsCount={drawToolsItems.length}
          clearConfirm={drawToolsClearConfirm}
          editingMarkerIndex={editingDrawToolsMarkerIndex}
          importMerge={drawToolsImportMerge}
          importStatus={drawToolsImportStatus}
          importText={drawToolsImportText}
          linkItems={drawToolsLinkItems}
          linkEndpointLabelsByStorageIndex={drawToolsLinkEndpointLabelsByStorageIndex}
          linkStart={drawToolsLinkStart}
          markerItems={drawToolsMarkerItems}
          markerLabel={drawToolsMarkerLabel}
          markerPortalInfoByStorageIndex={drawToolsMarkerPortalInfoByStorageIndex}
          mode="markers"
          target={drawToolsTarget}
          addLinkPoint={addDrawToolsLinkPoint}
          addMarker={addDrawToolsMarker}
          centerItem={centerDrawToolsItem}
          clearItems={clearDrawToolsItems}
          copyItems={copyDrawToolsItems}
          deleteAtContext={deleteDrawToolsAtContext}
          deleteItem={deleteDrawToolsItem}
          importItems={importDrawToolsItems}
          saveMarkerLabel={saveDrawToolsMarkerLabel}
          setEditingMarkerIndex={setEditingMarkerIndex}
          setImportMerge={setImportMerge}
          setImportText={setImportText}
          setLinkStart={setLinkStart}
          setMarkerLabel={setMarkerLabel}
          undoItem={undoDrawToolsItem}
        />
      )}
      {activeSheet === 'portalCounts' && (
        <IitcIrisPortalCountsPanel portalAnalysis={portalAnalysis} />
      )}
      {activeSheet === 'portalsList' && (
        <IitcIrisPortalsListPanel
          cameraZoom={cameraZoom}
          portalAnalysis={portalAnalysis}
          portalsListLevelFilter={portalsListLevelFilter}
          portalsListSortBy={portalsListSortBy}
          portalsListSortOrder={portalsListSortOrder}
          portalsListSummary={portalsListSummary}
          portalsListTeamFilter={portalsListTeamFilter}
          portalsListTextFilter={portalsListTextFilter}
          sortedPortalsList={sortedPortalsList}
          setPortalsListLevelFilter={setPortalsListLevelFilter}
          setPortalsListTeamFilter={setPortalsListTeamFilter}
          setPortalsListTextFilter={setPortalsListTextFilter}
          sortPortalsListBy={sortPortalsListBy}
          zoomToAndShowPortal={zoomToAndShowPortal}
        />
      )}
      {activeSheet === 'scoreboard' && (
        <IitcIrisScoreboardPanel portalAnalysis={portalAnalysis} />
      )}
      {activeSheet === 'layers' && (
        <IitcIrisLayersPanel
          baseLayerId={baseLayerId}
          highlighterSettings={highlighterSettings}
          layerSettings={layerSettings}
          selectBaseLayer={selectBaseLayer}
          selectPortalHighlighter={selectPortalHighlighter}
          toggleLayerSetting={toggleLayerSetting}
        />
      )}
    </aside>
  );
}
