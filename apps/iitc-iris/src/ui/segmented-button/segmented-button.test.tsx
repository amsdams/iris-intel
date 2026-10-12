/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it, vi} from 'vitest';
import {SegmentedButton} from './segmented-button';

describe('SegmentedButton', () => {
  it('renders type="button" and base class', () => {
    const vnode = SegmentedButton({ children: 'Tab' });
    expect(vnode.type).toBe('button');
    expect(vnode.props.type).toBe('button');
    expect(vnode.props.className).toBe('iitc-iris-segmented-button');
    expect(vnode.props.children).toBe('Tab');
  });

  it('adds is-active class when active is true', () => {
    const vnode = SegmentedButton({ active: true, children: 'Tab' });
    expect(vnode.props.className).toBe('iitc-iris-segmented-button is-active');
  });

  it('composes extra className values without dropping the base class', () => {
    const vnode = SegmentedButton({ className: 'extra-class' });
    expect(vnode.props.className).toBe('iitc-iris-segmented-button extra-class');
  });

  it('forwards disabled, title, aria-*, and event props', () => {
    const onClick = vi.fn();
    const vnode = SegmentedButton({
      disabled: true,
      title: 'Tooltip',
      'aria-label': 'Label',
      onClick
    });
    
    expect(vnode.props.disabled).toBe(true);
    expect(vnode.props.title).toBe('Tooltip');
    expect(vnode.props['aria-label']).toBe('Label');
    expect(vnode.props.onClick).toBe(onClick);
  });
});
