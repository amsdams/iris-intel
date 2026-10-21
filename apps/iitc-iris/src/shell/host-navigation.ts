import type {IitcIrisSheetId} from './menu-registry';

export const IITC_IRIS_HOST_BACK = 'IITC_IRIS_HOST_BACK';

interface HostBackOptions {
  portalImageOpen: boolean;
  activeSheet: IitcIrisSheetId;
  hasSelectedObject: boolean;
  closePortalImage: () => void;
  closeSheets: () => void;
  clearSelection: () => void;
}

/** Native hosts can request Back without synthesizing keyboard input or accessing UI state. */
export function installIitcIrisHostBack(options: HostBackOptions): () => void {
  const onBack = (event: Event): void => {
    if (options.portalImageOpen) options.closePortalImage();
    else if (options.activeSheet !== 'map') options.closeSheets();
    else if (options.hasSelectedObject) options.clearSelection();
    else return;
    event.preventDefault();
  };
  window.addEventListener(IITC_IRIS_HOST_BACK, onBack);
  return (): void => window.removeEventListener(IITC_IRIS_HOST_BACK, onBack);
}
