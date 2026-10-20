/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it} from 'vitest';
import {EmptyState} from './empty-state';

describe('EmptyState', () => {
  it('renders a div with base class', () => {
    const vnode = EmptyState({ children: 'Nothing' });
    expect(vnode.type).toBe('div');
    expect(vnode.props.className).toBe('iitc-iris-empty-state');
    expect(vnode.props.children).toBe('Nothing');
  });
});

