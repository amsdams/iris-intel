/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it, vi} from 'vitest';
import {ClearButton} from './clear-button';

describe('ClearButton', () => {
  it('renders type="button" and base class', () => {
    const vnode = ClearButton({ children: 'Clear' });
    expect(vnode.type).toBe('button');
    expect(vnode.props.type).toBe('button');
    expect(vnode.props.className).toBe('iitc-iris-clear-selection');
    expect(vnode.props.children).toBe('Clear');
  });

  it('renders default text "X" when no children provided', () => {
    const vnode = ClearButton({});
    expect(vnode.props.children).toBe('X');
  });

  it('composes extra className values without dropping the base class', () => {
    const vnode = ClearButton({ className: 'extra-class' });
    expect(vnode.props.className).toBe('iitc-iris-clear-selection extra-class');
  });

  it('forwards disabled, title, aria-*, and event props', () => {
    const onClick = vi.fn();
    const vnode = ClearButton({
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
