import {useCallback, useEffect, useRef, useState, type Dispatch, type StateUpdater} from 'preact/hooks';
import type {IitcIrisMessage} from '../messages';
import {isSidePanelId, type IitcIrisSheetId, type IitcIrisSidePanelId} from './menu-registry';
import {closeSheetToMapCommand, openSheetCommand, toggleSheetCommand} from './sheet-navigation-actions';
import {loadStoredActiveSheet, storeActiveSheet, storeSidePanelId} from './storage-settings';

interface ShellNavigation {
  activeSheet: IitcIrisSheetId;
  activeSidePanel: IitcIrisSidePanelId | null;
  portalImageOpen: boolean;
  // The message adapter retains its existing selection/navigation update ordering.
  setActiveSheet: Dispatch<StateUpdater<IitcIrisSheetId>>;
  setActiveSidePanel: Dispatch<StateUpdater<IitcIrisSidePanelId | null>>;
  setPortalImageOpen: Dispatch<StateUpdater<boolean>>;
  openSheet: (sheet: IitcIrisSheetId) => void;
  toggleSheet: (sheet: IitcIrisSheetId) => void;
  closeSheetToMap: () => void;
  closeSheets: () => void;
  openSearch: () => void;
  isPanelVisible: (sheet: IitcIrisSheetId) => boolean;
  cancelSearchFocus: () => void;
}

/** Page-owned navigation state; feature-specific requests remain with their workflows. */
export function useShellNavigation(
  postMessage: (message: IitcIrisMessage) => void,
  isPanelVisible: (sheet: IitcIrisSheetId) => boolean,
): ShellNavigation {
  const [portalImageOpen, setPortalImageOpen] = useState(false);
  const [activeSheet, updateActiveSheet] = useState<IitcIrisSheetId>(() => loadStoredActiveSheet());
  const [activeSidePanel, setActiveSidePanel] = useState<IitcIrisSidePanelId | null>(() => {
    const sheet = loadStoredActiveSheet();
    return isSidePanelId(sheet) ? sheet : null;
  });
  const searchFocusFrame = useRef<number | undefined>(undefined);
  const cancelSearchFocus = useCallback((): void => {
    if (searchFocusFrame.current !== undefined) window.cancelAnimationFrame(searchFocusFrame.current);
    searchFocusFrame.current = undefined;
  }, []);
  const setActiveSheet: Dispatch<StateUpdater<IitcIrisSheetId>> = useCallback((action) => {
    cancelSearchFocus();
    updateActiveSheet(action);
  }, [cancelSearchFocus]);
  const closeSheetToMap = useCallback((): void => {
    closeSheetToMapCommand(activeSheet, activeSidePanel, postMessage,
      {setActiveSheet, setActiveSidePanel, storeActiveSheet, storeSidePanelId});
  }, [activeSheet, activeSidePanel, postMessage, setActiveSheet]);
  const openSheet = useCallback((sheet: IitcIrisSheetId): void => {
    if (!isPanelVisible(sheet)) return;
    openSheetCommand(sheet, activeSheet, activeSidePanel, postMessage,
      {setActiveSheet, setActiveSidePanel, storeActiveSheet, storeSidePanelId});
  }, [activeSheet, activeSidePanel, postMessage, isPanelVisible, setActiveSheet]);
  const toggleSheet = useCallback((sheet: IitcIrisSheetId): void => {
    if (!isPanelVisible(sheet)) return;
    toggleSheetCommand(sheet, activeSheet, activeSidePanel, postMessage,
      {setActiveSheet, setActiveSidePanel, storeActiveSheet, storeSidePanelId});
  }, [activeSheet, activeSidePanel, postMessage, isPanelVisible, setActiveSheet]);
  const closeSheets = useCallback((): void => {
    setPortalImageOpen(false);
    openSheet('map');
  }, [openSheet]);
  const openSearch = useCallback((): void => {
    openSheet('search');
    // Search may mount on this render; focus after Preact has updated the DOM.
    searchFocusFrame.current = window.requestAnimationFrame(() => {
      searchFocusFrame.current = undefined;
      document.querySelector<HTMLInputElement>('.iitc-iris-search-input')?.focus();
    });
  }, [openSheet]);

  return {activeSheet, activeSidePanel, portalImageOpen, setActiveSheet, setActiveSidePanel, setPortalImageOpen,
    openSheet, toggleSheet, closeSheetToMap, closeSheets, openSearch, isPanelVisible, cancelSearchFocus};
}

/** Keep registration at the former App effect position. Menu visibility does not control feature activation. */
export function useShellNavigationEffects(navigation: ShellNavigation): void {
  const {activeSheet, isPanelVisible, closeSheetToMap, cancelSearchFocus} = navigation;
  useEffect(() => {
    if (!isPanelVisible(activeSheet)) closeSheetToMap();
  }, [activeSheet, isPanelVisible, closeSheetToMap]);
  useEffect(() => cancelSearchFocus, [cancelSearchFocus]);
}
