import {h, render} from 'preact';
import {act} from 'preact/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage} from '../../messages';
import type {IitcIrisSidePanelId} from '../../shell/menu-registry';
import {useMissionsEffects, useMissionsWorkflow} from './workflow';

interface HostProps {activeSidePanel?: IitcIrisSidePanelId | null; selectedPortalGuid?: string}

describe('Missions workflow lifecycle', () => {
  let root: Element;
  let missions: ReturnType<typeof useMissionsWorkflow>;
  const postMessage = vi.fn<(message: IitcIrisMessage) => void>();

  function Host({activeSidePanel = null, selectedPortalGuid}: HostProps): null {
    missions = useMissionsWorkflow(postMessage);
    useMissionsEffects(missions, activeSidePanel, selectedPortalGuid);
    return null;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('document', {});
    root = {firstChild: null, childNodes: []} as unknown as Element;
  });

  afterEach(async () => {
    await act(() => render(null, root));
    vi.unstubAllGlobals();
  });

  it('refreshes the current source, initially view, with explicit source overrides', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    expect(postMessage).not.toHaveBeenCalled();
    missions.refreshMissions();
    expect(postMessage).toHaveBeenLastCalledWith({type: IITC_IRIS_MESSAGES.requestMissions, missionSource: 'view'});
    await act(() => missions.setMissionsState((state) => ({...state, source: 'portal'})));
    missions.refreshMissions();
    expect(postMessage).toHaveBeenLastCalledWith({type: IITC_IRIS_MESSAGES.requestMissions, missionSource: 'portal'});
    missions.refreshMissions('view');
    expect(postMessage).toHaveBeenLastCalledWith({type: IITC_IRIS_MESSAGES.requestMissions, missionSource: 'view'});
  });

  it('routes mission details and zoom actions without changing response state', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    const state = missions.missionsState;
    missions.requestMissionDetails('mission-abc');
    missions.zoomToMission();
    expect(postMessage.mock.calls.map(([message]) => message)).toEqual([
      {type: IITC_IRIS_MESSAGES.requestMissionDetails, missionGuid: 'mission-abc'},
      {type: IITC_IRIS_MESSAGES.missionZoom},
    ]);
    expect(missions.missionsState).toBe(state);
  });

  it('follows portal changes only when the Missions panel has portal-source results', async () => {
    await act(() => render(h<HostProps>(Host, {activeSidePanel: 'missions', selectedPortalGuid: 'one'}), root));
    expect(postMessage).not.toHaveBeenCalled();
    await act(() => missions.setMissionsState((state) => ({...state, source: 'portal', portalGuid: 'one', status: 'ready'})));
    expect(postMessage).not.toHaveBeenCalled();
    await act(() => render(h<HostProps>(Host, {activeSidePanel: 'missions', selectedPortalGuid: 'two'}), root));
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({type: IITC_IRIS_MESSAGES.requestMissions, missionSource: 'portal'});
    await act(() => missions.setMissionsState((state) => ({...state, portalGuid: 'two'})));
    postMessage.mockClear();
    await act(() => render(h<HostProps>(Host, {selectedPortalGuid: 'three'}), root));
    expect(postMessage).not.toHaveBeenCalled();
    await act(() => render(h<HostProps>(Host, {activeSidePanel: 'missions', selectedPortalGuid: 'three'}), root));
    expect(postMessage).toHaveBeenCalledOnce();
  });

  it('waits for loading to finish before following a changed portal and skips a cleared selection', async () => {
    await act(() => render(h<HostProps>(Host, {activeSidePanel: 'missions', selectedPortalGuid: 'one'}), root));
    await act(() => missions.setMissionsState((state) => ({...state, source: 'portal', portalGuid: 'one', status: 'loading'})));
    await act(() => render(h<HostProps>(Host, {activeSidePanel: 'missions', selectedPortalGuid: 'two'}), root));
    expect(postMessage).not.toHaveBeenCalled();
    await act(() => missions.setMissionsState((state) => ({...state, status: 'ready'})));
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({type: IITC_IRIS_MESSAGES.requestMissions, missionSource: 'portal'});
    postMessage.mockClear();
    await act(() => render(h<HostProps>(Host, {activeSidePanel: 'missions'}), root));
    expect(postMessage).not.toHaveBeenCalled();
  });
});
