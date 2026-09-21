import {useCallback, useEffect, useState} from 'preact/hooks';
import {copyIitcIrisText} from './content-feedback';
import {getDrawToolsTargetFromContext} from './content-map-context';
import {
  filterAndSerializeDrawToolsItems,
  getDrawToolsLinkEndpointLabelsByStorageIndex,
  getDrawToolsMarkerPortalInfoByStorageIndex,
  mergeDrawToolsMarkerPortalInfoCache,
  sortDrawToolsItemsByDistance,
  type DrawToolsLinkEndpointLabels,
  type DrawToolsMarkerPortalInfoCache,
  type DrawToolsMarkerPortalInfo,
  type DrawToolsTarget,
} from './content-draw-tools';
import {
  addDrawToolsLinkPointAction,
  addDrawToolsMarkerAction,
  centerDrawToolsItemAction,
  clearDrawToolsItemsAction,
  deleteDrawToolsAtContextAction,
  deleteDrawToolsItemAction,
  importDrawToolsItemsAction,
  renameDrawToolsMarkerAction,
  undoDrawToolsItemAction,
} from './content-draw-tools-panel-actions';
import {IITC_IRIS_MESSAGES, type IitcIrisDrawToolsItem, type IitcIrisDrawToolsLatLng, type IitcIrisMessage} from './messages';
import type {IitcIrisPortalAnalysis} from './messages';

type StateSetter<T> = (value: T | ((current: T) => T)) => void;

export interface UseDrawToolsWorkflowParams {
  drawToolsItems: IitcIrisDrawToolsItem[];
  selectedPortal: {latE6: number; lngE6: number; title?: string; guid: string} | null;
  mapContext: {lat: number; lng: number} | null;
  cameraCenter: IitcIrisDrawToolsLatLng;
  cameraZoom: number;
  portalAnalysis: IitcIrisPortalAnalysis | null;
  setMapView: (lat: number, lng: number, zoom?: number) => void;
  setStatus: (status: string) => void;
}

export interface DrawToolsWorkflowDerivedState {
  drawToolsTarget: DrawToolsTarget | null;
  drawToolsTargetDefaultLabel: string;
  drawToolsLinkItems: Extract<IitcIrisDrawToolsItem, {type: 'polyline'}>[];
  drawToolsLinkEndpointLabelsByStorageIndex: Record<number, DrawToolsLinkEndpointLabels>;
  drawToolsMarkerItems: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>[];
  drawToolsMarkerPortalInfoByStorageIndex: Record<number, DrawToolsMarkerPortalInfo>;
}

export interface UseDrawToolsWorkflowResult {
  drawToolsLinkStart: IitcIrisDrawToolsLatLng | null;
  drawToolsImportText: string;
  drawToolsImportMerge: boolean;
  drawToolsImportStatus: string;
  drawToolsClearConfirm: 'polyline' | 'marker' | null;
  drawToolsMarkerLabel: string;
  editingDrawToolsMarkerIndex: number | null;
  drawToolsTarget: DrawToolsTarget | null;
  drawToolsLinkItems: Extract<IitcIrisDrawToolsItem, {type: 'polyline'}>[];
  drawToolsLinkEndpointLabelsByStorageIndex: Record<number, DrawToolsLinkEndpointLabels>;
  drawToolsMarkerItems: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>[];
  drawToolsMarkerPortalInfoByStorageIndex: Record<number, DrawToolsMarkerPortalInfo>;
  setDrawToolsLinkStart: StateSetter<IitcIrisDrawToolsLatLng | null>;
  setDrawToolsImportText: StateSetter<string>;
  setDrawToolsImportMerge: StateSetter<boolean>;
  setDrawToolsImportStatus: StateSetter<string>;
  setDrawToolsMarkerLabel: StateSetter<string>;
  setEditingDrawToolsMarkerIndex: StateSetter<number | null>;
  addDrawToolsMarker: (color: string) => void;
  saveDrawToolsMarkerLabel: (item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>, label: string) => void;
  addDrawToolsLinkPoint: () => void;
  deleteDrawToolsAtContext: (itemType?: 'polyline' | 'marker') => void;
  deleteDrawToolsItem: (item: IitcIrisDrawToolsItem) => void;
  undoDrawToolsItem: (itemType?: 'polyline' | 'marker') => void;
  clearDrawToolsItems: (itemType?: 'polyline' | 'marker') => void;
  centerDrawToolsItem: (item: IitcIrisDrawToolsItem) => void;
  copyDrawToolsItems: (itemType?: 'polyline' | 'marker') => void;
  importDrawToolsItems: () => void;
}

function postDrawToolsAction(message: Omit<IitcIrisMessage, 'type'>): void {
  window.postMessage({
    type: IITC_IRIS_MESSAGES.drawTools,
    ...message,
  } satisfies IitcIrisMessage, '*');
}

export function getDrawToolsWorkflowDerivedState(
  drawToolsItems: IitcIrisDrawToolsItem[],
  selectedPortal: UseDrawToolsWorkflowParams['selectedPortal'],
  mapContext: UseDrawToolsWorkflowParams['mapContext'],
  cameraCenter: UseDrawToolsWorkflowParams['cameraCenter'],
  portalAnalysis: UseDrawToolsWorkflowParams['portalAnalysis'],
  portalInfoCache: DrawToolsMarkerPortalInfoCache = {},
): DrawToolsWorkflowDerivedState {
  const drawToolsTarget = getDrawToolsTargetFromContext(selectedPortal, mapContext);
  const linkItems = drawToolsItems.filter((item): item is Extract<IitcIrisDrawToolsItem, {type: 'polyline'}> => item.type === 'polyline');
  const markerItems = drawToolsItems.filter((item): item is Extract<IitcIrisDrawToolsItem, {type: 'marker'}> => item.type === 'marker');
  const sortedLinkItems = sortDrawToolsItemsByDistance(linkItems, cameraCenter);
  const sortedMarkerItems = sortDrawToolsItemsByDistance(markerItems, cameraCenter);
  return {
    drawToolsTarget,
    drawToolsTargetDefaultLabel: drawToolsTarget?.label ?? '',
    drawToolsLinkItems: sortedLinkItems,
    drawToolsLinkEndpointLabelsByStorageIndex: getDrawToolsLinkEndpointLabelsByStorageIndex(
      sortedLinkItems,
      portalAnalysis?.portalslist ?? [],
      portalInfoCache
    ),
    drawToolsMarkerItems: sortedMarkerItems,
    drawToolsMarkerPortalInfoByStorageIndex: getDrawToolsMarkerPortalInfoByStorageIndex(
      sortedMarkerItems,
      portalAnalysis?.portalslist ?? [],
      portalInfoCache
    ),
  };
}

export function useDrawToolsWorkflow(params: UseDrawToolsWorkflowParams): UseDrawToolsWorkflowResult {
  const {drawToolsItems, selectedPortal, mapContext, cameraCenter, cameraZoom, portalAnalysis, setMapView, setStatus} = params;

  const [drawToolsLinkStart, setDrawToolsLinkStart] = useState<IitcIrisDrawToolsLatLng | null>(null);
  const [drawToolsImportText, setDrawToolsImportText] = useState('');
  const [drawToolsImportMerge, setDrawToolsImportMerge] = useState(true);
  const [drawToolsImportStatus, setDrawToolsImportStatus] = useState('');
  const [drawToolsClearConfirm, setDrawToolsClearConfirm] = useState<'polyline' | 'marker' | null>(null);
  const [drawToolsMarkerLabel, setDrawToolsMarkerLabel] = useState('');
  const [editingDrawToolsMarkerIndex, setEditingDrawToolsMarkerIndex] = useState<number | null>(null);
  const [drawToolsMarkerPortalInfoCache, setDrawToolsMarkerPortalInfoCache] = useState<DrawToolsMarkerPortalInfoCache>({});

  const {
    drawToolsTarget,
    drawToolsTargetDefaultLabel,
    drawToolsLinkItems,
    drawToolsLinkEndpointLabelsByStorageIndex,
    drawToolsMarkerItems,
    drawToolsMarkerPortalInfoByStorageIndex,
  } = getDrawToolsWorkflowDerivedState(
    drawToolsItems,
    selectedPortal,
    mapContext,
    cameraCenter,
    portalAnalysis,
    drawToolsMarkerPortalInfoCache
  );

  useEffect(() => {
    setDrawToolsMarkerLabel(drawToolsTargetDefaultLabel);
  }, [drawToolsTargetDefaultLabel]);

  useEffect(() => {
    if (!portalAnalysis?.portalslist.length) return;
    setDrawToolsMarkerPortalInfoCache((current) => mergeDrawToolsMarkerPortalInfoCache(current, portalAnalysis.portalslist));
  }, [portalAnalysis]);

  const getTargetLatLng = useCallback((): IitcIrisDrawToolsLatLng | null => {
    if (!drawToolsTarget) return null;
    return {lat: drawToolsTarget.lat, lng: drawToolsTarget.lng};
  }, [drawToolsTarget]);

  const addDrawToolsMarker = useCallback((color: string): void => {
    addDrawToolsMarkerAction(drawToolsTarget, drawToolsMarkerLabel, color, setDrawToolsClearConfirm, postDrawToolsAction, setStatus);
  }, [drawToolsMarkerLabel, drawToolsTarget, setStatus]);

  const renameDrawToolsMarker = useCallback((item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>, label: string): void => {
    renameDrawToolsMarkerAction(item, label, postDrawToolsAction, setStatus);
  }, [setStatus]);

  const saveDrawToolsMarkerLabel = useCallback((item: Extract<IitcIrisDrawToolsItem, {type: 'marker'}>, label: string): void => {
    renameDrawToolsMarker(item, label);
    setEditingDrawToolsMarkerIndex(null);
  }, [renameDrawToolsMarker]);

  const addDrawToolsLinkPoint = useCallback((): void => {
    addDrawToolsLinkPointAction(getTargetLatLng(), drawToolsLinkStart, setDrawToolsLinkStart, setDrawToolsClearConfirm, postDrawToolsAction, setStatus);
  }, [drawToolsLinkStart, getTargetLatLng, setStatus]);

  const deleteDrawToolsAtContext = useCallback((itemType?: 'polyline' | 'marker'): void => {
    deleteDrawToolsAtContextAction(getTargetLatLng(), itemType, setDrawToolsClearConfirm, postDrawToolsAction, setStatus);
  }, [getTargetLatLng, setStatus]);

  const deleteDrawToolsItem = useCallback((item: IitcIrisDrawToolsItem): void => {
    deleteDrawToolsItemAction(item, setDrawToolsClearConfirm, postDrawToolsAction, setStatus);
  }, [setStatus]);

  const undoDrawToolsItem = useCallback((itemType?: 'polyline' | 'marker'): void => {
    undoDrawToolsItemAction(itemType, setDrawToolsClearConfirm, postDrawToolsAction, setStatus);
  }, [setStatus]);

  const clearDrawToolsItems = useCallback((itemType?: 'polyline' | 'marker'): void => {
    clearDrawToolsItemsAction(itemType, drawToolsClearConfirm, setDrawToolsClearConfirm, setDrawToolsLinkStart, postDrawToolsAction, setStatus);
  }, [drawToolsClearConfirm, setStatus]);

  const centerDrawToolsItem = useCallback((item: IitcIrisDrawToolsItem): void => {
    centerDrawToolsItemAction(item, cameraZoom, setMapView, postDrawToolsAction);
  }, [cameraZoom, setMapView]);

  const copyDrawToolsItems = useCallback((itemType?: 'polyline' | 'marker'): void => {
    copyIitcIrisText(filterAndSerializeDrawToolsItems(drawToolsItems, itemType), {
      setStatus: setDrawToolsImportStatus,
      successStatus: itemType === 'polyline' ? 'links copied' : itemType === 'marker' ? 'markers copied' : 'draw tools JSON copied',
      successTimeoutMs: 1400,
      failureTimeoutMs: 1800,
    });
  }, [drawToolsItems]);

  const importDrawToolsItems = useCallback((): void => {
    importDrawToolsItemsAction(drawToolsImportText, drawToolsImportMerge, setDrawToolsClearConfirm, postDrawToolsAction, setDrawToolsImportStatus);
  }, [drawToolsImportMerge, drawToolsImportText]);

  return {
    drawToolsLinkStart,
    drawToolsImportText,
    drawToolsImportMerge,
    drawToolsImportStatus,
    drawToolsClearConfirm,
    drawToolsMarkerLabel,
    editingDrawToolsMarkerIndex,
    drawToolsTarget,
    drawToolsLinkItems,
    drawToolsLinkEndpointLabelsByStorageIndex,
    drawToolsMarkerItems,
    drawToolsMarkerPortalInfoByStorageIndex,
    setDrawToolsLinkStart,
    setDrawToolsImportText,
    setDrawToolsImportMerge,
    setDrawToolsImportStatus,
    setDrawToolsMarkerLabel,
    setEditingDrawToolsMarkerIndex,
    addDrawToolsMarker,
    saveDrawToolsMarkerLabel,
    addDrawToolsLinkPoint,
    deleteDrawToolsAtContext,
    deleteDrawToolsItem,
    undoDrawToolsItem,
    clearDrawToolsItems,
    centerDrawToolsItem,
    copyDrawToolsItems,
    importDrawToolsItems,
  };
}
