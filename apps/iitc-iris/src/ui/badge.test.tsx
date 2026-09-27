/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it} from 'vitest';
import {Badge} from './badge';

describe('Badge', () => {
  it('renders a span by default', () => {
    const vnode = Badge({ children: 'Hello', className: 'test' });
    expect(vnode.type).toBe('span');
    expect(vnode.props.className).toBe('test');
    expect(vnode.props.children).toBe('Hello');
  });

  it('renders a b tag when as is provided', () => {
    const vnode = Badge({ as: 'b', children: 'Bold', style: { color: 'red' } });
    expect(vnode.type).toBe('b');
    expect(vnode.props.style.color).toBe('red');
    expect(vnode.props.children).toBe('Bold');
  });
});
