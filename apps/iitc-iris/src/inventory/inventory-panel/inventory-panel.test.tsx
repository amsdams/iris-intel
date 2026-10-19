import {isValidElement, toChildArray, type ComponentChildren, type VNode} from 'preact';
import {describe, expect, it, vi} from 'vitest';
import {Badge} from '../../ui/badge';
import {formatIitcColorVars, getIitcLevelColor, getIitcRarityColor} from '../../iitc-colors';
import {IitcIrisInventoryPanel} from './inventory-panel';

type TestNode = VNode<{
  children?: ComponentChildren;
  className?: string;
  style?: string;
  'aria-label'?: string;
}>;

function elements(children: ComponentChildren): TestNode[] {
  return toChildArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const node = child as TestNode;
    return [node, ...elements(node.props.children)];
  });
}

describe('Inventory item badges', () => {
  it.each([
    ['COMMON', 'C', getIitcRarityColor('COMMON')],
    [undefined, '?', '#91a6b7'],
  ] as const)('keeps rarity %s independent of an L8 item color', (rarity, badge, color) => {
    const panel = IitcIrisInventoryPanel({
      inventoryState: {
        status: 'ready', requestState: 'ready', items: 12, keys: 0, portalsWithKeys: 0, capsules: 0,
        portalKeysForSelectedPortal: null,
        topItems: [{type: 'EMITTER_A', label: 'Resonator 8', level: 8, rarity, count: 12}],
      },
      refresh: vi.fn(), zoomToAndShowPortal: vi.fn(),
    });
    const row = elements(panel).find((node) => node.props.className?.includes('iitc-iris-inventory-item-row'));
    expect(row).toBeDefined();
    const badges = elements(row).filter((node) => node.type === Badge);
    expect(badges).toHaveLength(2);
    expect(badges[0].props).toMatchObject({children: badge, style: formatIitcColorVars(color)});
    expect(badges[1].props).toMatchObject({
      'aria-label': 'Level 8', style: formatIitcColorVars(getIitcLevelColor(8)),
    });
    const text = elements(row).find((node) => node.type === 'span');
    expect(toChildArray(text?.props.children).filter((child) => typeof child === 'string')).toEqual(['Resonator']);
  });
});
