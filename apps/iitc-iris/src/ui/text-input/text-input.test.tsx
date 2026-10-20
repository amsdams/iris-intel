/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it, vi} from 'vitest';
import {TextInput} from './text-input';

describe('TextInput', () => {
  it('renders a text input with default type text', () => {
    const vnode = TextInput({});
    expect(vnode.type).toBe('input');
    expect(vnode.props.type).toBe('text');
    expect(vnode.props.className).toBe('iitc-iris-control iitc-iris-text-input');
  });

  it('composes the provided className with the base class', () => {
    const vnode = TextInput({ className: 'custom-class' });
    expect(vnode.props.className).toBe('iitc-iris-control iitc-iris-text-input custom-class');
  });

  it('can render as a search input', () => {
    const vnode = TextInput({ type: 'search' });
    expect(vnode.props.type).toBe('search');
  });

  it('forwards value and defaultValue', () => {
    const vnode = TextInput({ value: 'controlled', defaultValue: 'uncontrolled' });
    expect(vnode.props.value).toBe('controlled');
    expect(vnode.props.defaultValue).toBe('uncontrolled');
  });

  it('forwards disabled, placeholder, title, aria-label, autoFocus', () => {
    const vnode = TextInput({
      disabled: true,
      placeholder: 'ph',
      title: 'tit',
      'aria-label': 'al',
      autoFocus: true
    });
    expect(vnode.props.disabled).toBe(true);
    expect(vnode.props.placeholder).toBe('ph');
    expect(vnode.props.title).toBe('tit');
    expect(vnode.props['aria-label']).toBe('al');
    expect(vnode.props.autoFocus).toBe(true);
  });

  it('forwards event handlers', () => {
    const onInput = vi.fn();
    const onBlur = vi.fn();
    const onKeyDown = vi.fn();

    const vnode = TextInput({ onInput, onBlur, onKeyDown });
    
    expect(vnode.props.onInput).toBe(onInput);
    expect(vnode.props.onBlur).toBe(onBlur);
    expect(vnode.props.onKeyDown).toBe(onKeyDown);
  });
});
