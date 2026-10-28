import {h, render} from 'preact';
import {act} from 'preact/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage} from '../messages';
import type {locateBrowserPositionAction} from './location-actions';
import {useLocationWorkflow} from './location-workflow';

interface HostProps {cameraZoom?: number}
type GetCurrentPosition = Parameters<typeof locateBrowserPositionAction>[1];

describe('Location workflow lifecycle', () => {
  let root: Element;
  let location: ReturnType<typeof useLocationWorkflow>;
  const setMapView = vi.fn();
  const postMessage = vi.fn<(message: IitcIrisMessage) => void>();

  function Host({cameraZoom = 12}: HostProps): null {
    location = useLocationWorkflow({cameraZoom, setMapView, postMessage});
    return null;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('document', {});
    vi.stubGlobal('window', {setTimeout});
    vi.stubGlobal('navigator', {});
    root = {firstChild: null, childNodes: []} as unknown as Element;
  });

  afterEach(async () => {
    await act(() => render(null, root));
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uses current view input and zoom and retains the success/error status durations', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => location.setViewInput('52.3, 4.9'));
    await act(() => render(h<HostProps>(Host, {cameraZoom: 16}), root));
    await act(() => location.jumpToViewInput());
    expect(setMapView).toHaveBeenLastCalledWith(52.3, 4.9, 16);
    expect(location.viewInputStatus).toBe('jumped');
    await act(() => { vi.advanceTimersByTime(1199); });
    expect(location.viewInputStatus).toBe('jumped');
    await act(() => { vi.advanceTimersByTime(1); });
    expect(location.viewInputStatus).toBe('');
    await act(() => location.setViewInput('bad coordinates'));
    setMapView.mockClear();
    await act(() => location.jumpToViewInput());
    expect(location.viewInputStatus).toBe('bad view');
    expect(setMapView).not.toHaveBeenCalled();
    await act(() => { vi.advanceTimersByTime(1600); });
    expect(location.viewInputStatus).toBe('');
  });

  it('keeps a browser location request alive across renders and posts its accuracy before centering', async () => {
    const getCurrentPosition = vi.fn<GetCurrentPosition>();
    vi.stubGlobal('navigator', {geolocation: {getCurrentPosition}});
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => location.locateBrowserPosition());
    expect(location.geolocationStatus).toBe('locating...');
    expect(getCurrentPosition.mock.calls[0][2]).toEqual({enableHighAccuracy: true, maximumAge: 60000, timeout: 10000});
    await act(() => render(h<HostProps>(Host, {cameraZoom: 17}), root));
    await act(() => getCurrentPosition.mock.calls[0][0]({coords: {latitude: 52.3, longitude: 4.9, accuracy: 15.4}}));
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({
      type: IITC_IRIS_MESSAGES.setUserLocation, userLat: 52.3, userLng: 4.9, userAccuracy: 15.4,
    });
    expect(postMessage.mock.invocationCallOrder[0]).toBeLessThan(setMapView.mock.invocationCallOrder[0]);
    expect(setMapView).toHaveBeenCalledExactlyOnceWith(52.3, 4.9, 13);
    expect(location.geolocationStatus).toBe('located +/- 15m');
    await act(() => { vi.advanceTimersByTime(2200); });
    expect(location.geolocationStatus).toBe('');
  });

  it('shows unavailable and permission errors without moving the map', async () => {
    await act(() => render(h<HostProps>(Host, {}), root));
    await act(() => location.locateBrowserPosition());
    expect(location.geolocationStatus).toBe('unavailable');
    await act(() => { vi.advanceTimersByTime(1800); });
    expect(location.geolocationStatus).toBe('');
    const getCurrentPosition = vi.fn<GetCurrentPosition>();
    vi.stubGlobal('navigator', {geolocation: {getCurrentPosition}});
    await act(() => location.locateBrowserPosition());
    await act(() => getCurrentPosition.mock.calls[0][1]({code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2}));
    expect(location.geolocationStatus).toBe('permission denied');
    expect(setMapView).not.toHaveBeenCalled();
    expect(postMessage).not.toHaveBeenCalled();
    await act(() => { vi.advanceTimersByTime(2200); });
    expect(location.geolocationStatus).toBe('');
  });
});
