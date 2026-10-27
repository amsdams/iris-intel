import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createMapSettingsRuntime} from './map-settings-runtime';
import {DEFAULT_LAYER_SETTINGS} from './layers/layer-registry';
import type {IitcIrisRenderEntities} from '../messages';

type Options = Parameters<typeof createMapSettingsRuntime>[0];
describe('Map settings render coordination', () => {
  let entities: IitcIrisRenderEntities | undefined;
  let options: Options;
  let runtime: ReturnType<typeof createMapSettingsRuntime>;
  beforeEach(() => {
    entities = {generation: 1, portals: [], links: [], fields: []};
    options = {getEntities: (): IitcIrisRenderEntities | undefined => entities, renderEntities: vi.fn(), getSecondaryEntityRenderUpdate: vi.fn(),
      refreshPortalMarkerStylesForHighlighter: vi.fn(() => true), renderLatestTileDebug: vi.fn(),
      renderIitcDrawTools: vi.fn(), renderPlayerTracker: vi.fn(), schedulePlayerTrackerRefresh: vi.fn(),
      recordInteractionUpdateDiagnostics: vi.fn(), recordLayerUpdateTiming: vi.fn(), scheduleInteractionFrameDiagnostics: vi.fn()};
    runtime = createMapSettingsRuntime(options);
  });
  afterEach(() => vi.restoreAllMocks());

  it('updates settings before rendering and preserves previous settings, changed keys and mirrored paint timing', () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(20).mockReturnValueOnce(25);
    const next = {...DEFAULT_LAYER_SETTINGS, resistance: !DEFAULT_LAYER_SETTINGS.resistance};
    vi.mocked(options.renderEntities).mockImplementation(() => {expect(runtime.getLayerSettings()).toBe(next);});
    runtime.applyLayerSettings(next, 10);
    expect(options.renderEntities).toHaveBeenCalledWith(entities, {previousLayerSettings: DEFAULT_LAYER_SETTINGS,
      changedLayerKeys: ['resistance'], secondaryUpdate: undefined,
      timing: {changedKeys: ['resistance'], dispatchDelayMs: 10, totalMs: 5}});
    expect(options.recordInteractionUpdateDiagnostics).toHaveBeenCalledWith(expect.objectContaining({kind: 'layer', totalMs: 5}));
    const mirror = vi.mocked(options.recordLayerUpdateTiming).mock.calls[0][0];
    expect(vi.mocked(options.scheduleInteractionFrameDiagnostics).mock.calls[0][3]).toBe(mirror);
    expect(options.renderPlayerTracker).not.toHaveBeenCalled();
  });

  it('routes debug, draw and tracker overlays without a core entity render, in the original order', () => {
    const calls: string[] = [];
    for (const key of ['renderLatestTileDebug', 'renderIitcDrawTools', 'renderPlayerTracker', 'schedulePlayerTrackerRefresh'] as const) {
      vi.mocked(options[key]).mockImplementation(() => {calls.push(key);});
    }
    runtime.applyLayerSettings({...DEFAULT_LAYER_SETTINGS, tiles: !DEFAULT_LAYER_SETTINGS.tiles,
      drawnLinks: !DEFAULT_LAYER_SETTINGS.drawnLinks, playerTracker: !DEFAULT_LAYER_SETTINGS.playerTracker});
    expect(calls).toEqual(['renderLatestTileDebug', 'renderIitcDrawTools', 'renderPlayerTracker', 'schedulePlayerTrackerRefresh']);
    expect(options.renderEntities).not.toHaveBeenCalled();
  });

  it('retains settings when no entities exist and applies them to later updates', () => {
    entities = undefined;
    const next = {...DEFAULT_LAYER_SETTINGS, portals: false};
    runtime.applyLayerSettings(next);
    runtime.applyHighlighterSettings({active: 'history-visited'});
    expect(options.renderEntities).not.toHaveBeenCalled();
    expect(options.refreshPortalMarkerStylesForHighlighter).not.toHaveBeenCalled();
    expect(options.recordInteractionUpdateDiagnostics).toHaveBeenLastCalledWith(expect.objectContaining({renderPath: 'none'}));
    entities = {generation: 2, portals: [], links: [], fields: []};
    runtime.applyLayerSettings({...next, links: false});
    expect(options.renderEntities).toHaveBeenCalledWith(entities, expect.objectContaining({previousLayerSettings: next, changedLayerKeys: ['links']}));
    expect(runtime.getHighlighterSettings()).toEqual({active: 'history-visited'});
  });

  it('prefers highlighter style refresh and falls back to full render with the new active setting', () => {
    vi.mocked(options.refreshPortalMarkerStylesForHighlighter).mockImplementation(() => {
      expect(runtime.getHighlighterSettings().active).toBe('history-visited');
      return true;
    });
    runtime.applyHighlighterSettings({active: 'history-visited'}, 0);
    expect(options.renderEntities).not.toHaveBeenCalled();
    expect(options.recordInteractionUpdateDiagnostics).toHaveBeenLastCalledWith(expect.objectContaining({renderPath: 'style-refresh', activeHighlighter: 'history-visited'}));
    vi.mocked(options.refreshPortalMarkerStylesForHighlighter).mockReturnValue(false);
    runtime.applyHighlighterSettings({active: 'none'});
    expect(options.renderEntities).toHaveBeenCalledWith(entities);
    expect(options.recordInteractionUpdateDiagnostics).toHaveBeenLastCalledWith(expect.objectContaining({renderPath: 'full-render', activeHighlighter: 'none'}));
  });
});
