/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {describe, expect, it, vi} from 'vitest';
import {LayerChoice} from './layer-choice';

describe('LayerChoice', () => {
  it('renders a checkbox', () => {
    const vnode = LayerChoice({ type: 'checkbox', label: 'Check me', checked: true, title: 'Title' });
    expect(vnode.type).toBe('label');
    expect(vnode.props.className).toBe('iitc-iris-layer-choice is-checked');
    expect(vnode.props.title).toBe('Title');

    const input = vnode.props.children[0];
    expect(input.type).toBe('input');
    expect(input.props.type).toBe('checkbox');
    expect(input.props.checked).toBe(true);
    expect(input.props.title).toBeUndefined();

    const span = vnode.props.children[1];
    expect(span.type).toBe('span');
    expect(span.props.className).toBe('iitc-iris-layer-choice-label');
    expect(span.props.children).toBe('Check me');
  });

  it('renders a radio', () => {
    const vnode = LayerChoice({ type: 'radio', label: 'Radio me', checked: false, name: 'group' });
    expect(vnode.type).toBe('label');
    expect(vnode.props.className).toBe('iitc-iris-layer-choice ');

    const input = vnode.props.children[0];
    expect(input.type).toBe('input');
    expect(input.props.type).toBe('radio');
    expect(input.props.name).toBe('group');
  });

  it.each(['checkbox', 'radio'] as const)('preserves native %s state and change handling', (type) => {
    const onChange = vi.fn();
    const vnode = LayerChoice({ type, label: 'Layer', checked: true, disabled: true, 'aria-label': 'Layer control', onChange });
    const input = vnode.props.children[0];
    expect(input.props.checked).toBe(true);
    expect(input.props.disabled).toBe(true);
    expect(input.props['aria-label']).toBe('Layer control');
    expect(input.props.onChange).toBe(onChange);
  });
});
