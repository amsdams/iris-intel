import {describe, expect, it, vi} from 'vitest';
import type L from 'leaflet';
import {clearUnindexedLayers, createEntityLayerSync} from './entity-layer-sync';
import type {IitcIrisEntityLayerIndex} from '../map-layers';

const layer = (): L.Layer => ({remove: vi.fn()}) as unknown as L.Layer;
const row = (guid: string, value: number): {guid: string; value: number} => ({guid, value});
const equal = (a: ReturnType<typeof row>, b: ReturnType<typeof row>): boolean => a.value === b.value;

describe('retained entity layer reconciliation', () => {
  it('retains unchanged identity, replaces changed layers and removes deleted layers once', () => {
    const sync = createEntityLayerSync((layers, next) => {layers.push(next);});
    const layers: L.Layer[] = [], index: IitcIrisEntityLayerIndex = new Map();
    const before = [row('keep', 1), row('change', 2), row('remove', 3)];
    sync.syncEntityLayers(layers, index, [], before, equal, layer);
    const original = [...layers];
    const next = [row('keep', 1), row('change', 4), row('add', 5)];
    expect(sync.syncEntityLayers(layers, index, before, next, equal, layer))
      .toEqual({added: 1, removed: 1, replaced: 1, unchanged: 1});
    expect(index.get('keep')?.[0]).toBe(original[0]);
    expect(index.get('change')?.[0]).not.toBe(original[1]);
    expect(original[1].remove).toHaveBeenCalledOnce();
    expect(original[2].remove).toHaveBeenCalledOnce();
    expect(index.has('remove')).toBe(false);
    expect(layers).toHaveLength(3);
  });
  it('uses group membership for grouped layers and avoids indexing layers that were not attached', () => {
    const add = vi.fn((layers: L.Layer[], next: L.Layer): void => {layers.push(next);});
    const sync = createEntityLayerSync(add);
    const layers: L.Layer[] = [], index: IitcIrisEntityLayerIndex = new Map();
    const members = new Set<L.Layer>();
    const group = {addLayer: (next: L.Layer): void => {members.add(next);},
      removeLayer: (next: L.Layer): void => {members.delete(next);}} as unknown as L.LayerGroup;
    sync.syncEntityLayers(layers, index, [], [row('one', 1)], equal, layer, group);
    const original = layers[0];
    expect(members.has(original)).toBe(true);
    expect(add).not.toHaveBeenCalled();
    sync.syncEntityLayers(layers, index, [row('one', 1)], [], equal, layer, group);
    expect(members.size).toBe(0);
    expect(original.remove).not.toHaveBeenCalled();
    expect(layers).toEqual([]);
    const unattached = createEntityLayerSync(() => undefined);
    unattached.addEntityRenderedLayer(layers, index, 'absent', layer());
    expect(index.has('absent')).toBe(false);
  });
  it('keeps both label indexes attached and cleans leftovers after reference reset', () => {
    const level = layer(), key = layer(), orphan = layer();
    const layers = [level, key, orphan];
    const levelIndex: IitcIrisEntityLayerIndex = new Map([['portal', [level]]]);
    const keyIndex: IitcIrisEntityLayerIndex = new Map([['portal', [key]]]);
    const clear = (removed: L.Layer[]): void => {removed.forEach(item => item.remove());};
    clearUnindexedLayers(layers, [levelIndex, keyIndex], clear);
    expect(layers).toEqual([level, key]);
    expect(orphan.remove).toHaveBeenCalledOnce();
    expect(level.remove).not.toHaveBeenCalled();
    expect(key.remove).not.toHaveBeenCalled();
    levelIndex.clear(); keyIndex.clear();
    clearUnindexedLayers(layers, [levelIndex, keyIndex], clear);
    expect(layers).toEqual([]);
    expect(level.remove).toHaveBeenCalledOnce();
    expect(key.remove).toHaveBeenCalledOnce();
    const sync = createEntityLayerSync((attached, next) => {attached.push(next);});
    const portals = [row('portal', 1)];
    sync.syncEntityLayers(layers, levelIndex, [], portals, equal, layer);
    sync.syncEntityLayers(layers, keyIndex, [], portals, equal, layer);
    const recreated = [...layers];
    expect(recreated).toHaveLength(2);
    expect(recreated).not.toContain(level);
    expect(recreated).not.toContain(key);
    clearUnindexedLayers(layers, [levelIndex, keyIndex], clear);
    expect(layers).toEqual(recreated);
    recreated.forEach(item => expect(item.remove).not.toHaveBeenCalled());
    expect(level.remove).toHaveBeenCalledOnce();
    expect(key.remove).toHaveBeenCalledOnce();
  });
});
