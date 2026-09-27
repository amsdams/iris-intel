/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it, vi} from 'vitest';
import {ActionButton} from './action-button';

describe('ActionButton', () => {
  it('renders type="button" and base class', () => {
    const vnode = ActionButton({ children: 'Test' });
    expect(vnode.type).toBe('button');
    expect(vnode.props.type).toBe('button');
    expect(vnode.props.className).toBe('iitc-iris-portal-action');
    expect(vnode.props.children).toBe('Test');
  });

  it('composes extra className values without dropping the base class', () => {
    const vnode = ActionButton({ className: 'extra-class' });
    expect(vnode.props.className).toBe('iitc-iris-portal-action extra-class');
  });

  it('forwards disabled, title, aria-*, and event props', () => {
    const onClick = vi.fn();
    const vnode = ActionButton({
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
