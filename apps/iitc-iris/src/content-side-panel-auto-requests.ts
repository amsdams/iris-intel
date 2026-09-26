/**
 * Pure side-panel auto-request helpers for content.tsx.
 *
 * Each helper returns either null (no request should fire) or a typed object
 * describing the exact message to post and the retry delay schedule.
 *
 * No browser I/O, timers, storage, or Preact types are allowed here.
 * content.tsx owns useEffect, window.postMessage, setTimeout, and storage.
 */

import {IITC_IRIS_MESSAGES, type IitcIrisCommTab, type IitcIrisMessage} from './messages';
import {type IitcIrisSidePanelId} from './menu-registry';

export interface SidePanelAutoRequest {
  readonly message: IitcIrisMessage;
  readonly retryDelaysMs: readonly number[];
}

export function getCommAutoRequest(
  activeSidePanel: IitcIrisSidePanelId | null,
  commStatus: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth',
  commTab: IitcIrisCommTab,
): SidePanelAutoRequest | null {
  if (activeSidePanel !== 'comm' || commStatus !== 'idle') return null;
  // Intentionally omits commOlder — this is a fresh auto-request, not a
  // "load older" request. Do not add commOlder: false.
  return {
    message: {type: IITC_IRIS_MESSAGES.requestComm, commTab} satisfies IitcIrisMessage,
    retryDelaysMs: [500, 1500],
  };
}

export function getScoresAutoRequest(
  activeSidePanel: IitcIrisSidePanelId | null,
  scoresStatus: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth',
): SidePanelAutoRequest | null {
  if (activeSidePanel !== 'scores' || scoresStatus !== 'idle') return null;
  return {
    message: {type: IITC_IRIS_MESSAGES.requestScores} satisfies IitcIrisMessage,
    retryDelaysMs: [500],
  };
}

export function getInventoryAutoRequest(
  activeSidePanel: IitcIrisSidePanelId | null,
  inventoryStatus: 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'auth',
): SidePanelAutoRequest | null {
  if (activeSidePanel !== 'inventory' || inventoryStatus !== 'idle') return null;
  return {
    message: {type: IITC_IRIS_MESSAGES.requestInventory} satisfies IitcIrisMessage,
    retryDelaysMs: [500],
  };
}
