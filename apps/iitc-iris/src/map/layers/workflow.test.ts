import {h, render} from 'preact';
import {act} from 'preact/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {IITC_IRIS_MESSAGES, type IitcIrisMessage} from '../../messages';
import {
  BASE_LAYER_STORAGE_KEY,
  HIGHLIGHTER_SETTINGS_STORAGE_KEY,
  LAYER_SETTINGS_STORAGE_KEY,
} from '../../shell/storage-settings';
import {DEFAULT_LAYER_SETTINGS} from './layer-registry';
import {useLayerSettingsEffects, useLayerSettingsWorkflow} from './workflow';

describe('Layer settings workflow lifecycle', () => {
  let root: Element;
  let layers: ReturnType<typeof useLayerSettingsWorkflow>;
  let storage: Pick<Storage, 'getItem' | 'setItem'>;
  const postMessage = vi.fn<(message: IitcIrisMessage) => void>();

  function Host(): null {
    layers = useLayerSettingsWorkflow(postMessage);
    useLayerSettingsEffects(layers);
    return null;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    const values = new Map<string, string>();
    storage = {
      getItem: (key): string | null => values.get(key) ?? null,
      setItem: (key, value): void => { values.set(key, value); },
    };
    vi.stubGlobal('document', {});
    vi.stubGlobal('window', {localStorage: storage});
    root = {firstChild: null, childNodes: []} as unknown as Element;
  });

  afterEach(async () => {
    await act(() => render(null, root));
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads stored settings and persists/posts them once at startup', async () => {
    const settings = {...DEFAULT_LAYER_SETTINGS, links: false};
    storage.setItem(BASE_LAYER_STORAGE_KEY, 'osm');
    storage.setItem(LAYER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    storage.setItem(HIGHLIGHTER_SETTINGS_STORAGE_KEY, JSON.stringify({active: 'level-color'}));
    vi.spyOn(performance, 'now').mockReturnValue(100);
    await act(() => render(h(Host, {}), root));
    expect(layers.baseLayerId).toBe('osm');
    expect(layers.layerSettings).toEqual(settings);
    expect(layers.highlighterSettings).toEqual({active: 'level-color'});
    expect(postMessage.mock.calls.map(([message]) => message)).toEqual([
      {type: IITC_IRIS_MESSAGES.layerSettings, sentAt: 100, layerSettings: settings, baseLayerId: 'osm'},
      {type: IITC_IRIS_MESSAGES.layerSettings, sentAt: 100, highlighterSettings: {active: 'level-color'}},
    ]);
    expect(JSON.parse(storage.getItem(LAYER_SETTINGS_STORAGE_KEY) ?? 'null')).toEqual(settings);
    await act(() => render(h(Host, {}), root));
    expect(postMessage).toHaveBeenCalledTimes(2);
  });

  it('preserves separate user intent times and uses a fresh time for a subsequent base-layer change', async () => {
    const now = vi.spyOn(performance, 'now').mockReturnValue(0);
    await act(() => render(h(Host, {}), root));
    postMessage.mockClear();
    await act(() => {
      now.mockReturnValue(10);
      layers.toggleLayerSetting('links');
      now.mockReturnValue(20);
      layers.selectPortalHighlighter('needs-recharge');
      now.mockReturnValue(100);
    });
    expect(layers.layerSettings.links).toBe(false);
    expect(postMessage.mock.calls.map(([message]) => message.sentAt)).toEqual([10, 20]);
    expect(JSON.parse(storage.getItem(HIGHLIGHTER_SETTINGS_STORAGE_KEY) ?? 'null')).toEqual({active: 'needs-recharge'});
    postMessage.mockClear();
    now.mockReturnValue(200);
    await act(() => layers.setBaseLayerId('osm'));
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({
      type: IITC_IRIS_MESSAGES.layerSettings, sentAt: 200,
      baseLayerId: 'osm', layerSettings: layers.layerSettings,
    });
  });
});
