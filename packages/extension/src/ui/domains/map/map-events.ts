export interface PortalClickDetail {
  id: string;
}

export interface SelectionInfoOpenDetail {
  reason: 'secondary-interaction';
}

export interface PortalClickEventLike {
  type: string;
  detail: PortalClickDetail;
}

export type PortalSelectionBridgeTarget = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export interface PortalSelectionBridgeWindow {
  postMessage: (message: { type: string; guid: string }, targetOrigin: string) => unknown;
}

export interface PortalSelectionBridgeDeps {
  target: PortalSelectionBridgeTarget;
  windowLike: PortalSelectionBridgeWindow;
  selectPortal: (id: string | null) => void;
  selectPlanningPortal?: (id: string) => void;
  isPlanningMode?: () => boolean;
}

export function createPortalClickEvent(id: string): Event | PortalClickEventLike {
  if (typeof CustomEvent === 'function') {
    return new CustomEvent('iris:portal:click', {detail: {id}});
  }

  return {type: 'iris:portal:click', detail: {id}};
}

export function emitPortalClick(
  target: { dispatchEvent: (event: Event) => boolean },
  id: string
): void {
  target.dispatchEvent(createPortalClickEvent(id) as Event);
}

export function createSelectionInfoOpenEvent(): Event {
  return new CustomEvent('iris:selection-info:open', {
    detail: {reason: 'secondary-interaction'} satisfies SelectionInfoOpenDetail,
  });
}

export function emitSelectionInfoOpen(target: { dispatchEvent: (event: Event) => boolean }): void {
  target.dispatchEvent(createSelectionInfoOpenEvent());
}

export function installPortalSelectionBridge({
  target,
  windowLike,
  selectPortal,
  selectPlanningPortal,
  isPlanningMode,
}: PortalSelectionBridgeDeps): () => void {
  const onPortalClick = (event: Event): void => {
    const detail = (event as unknown as PortalClickEventLike).detail;
    const id = detail?.id;
    if (!id) return;

    if (isPlanningMode?.() && selectPlanningPortal) {
      selectPlanningPortal(id);
      return;
    }

    selectPortal(id);
    windowLike.postMessage({type: 'IRIS_PORTAL_DETAILS_REQUEST', guid: id}, '*');
  };

  target.addEventListener('iris:portal:click', onPortalClick);

  return () => {
    target.removeEventListener('iris:portal:click', onPortalClick);
  };
}
