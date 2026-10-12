/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it} from 'vitest';
import {StatusText} from './status-text';

describe('StatusText', () => {
  it('renders a span with base class', () => {
    const vnode = StatusText({ children: 'Status' });
    expect(vnode.type).toBe('span');
    expect(vnode.props.className).toBe('iitc-iris-status');
    expect(vnode.props.children).toBe('Status');
  });

  it('composes extra className values without dropping the base class', () => {
    const vnode = StatusText({ className: 'extra-class' });
    expect(vnode.props.className).toBe('iitc-iris-status extra-class');
  });
});
