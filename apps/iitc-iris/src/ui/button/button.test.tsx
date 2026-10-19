/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {h} from 'preact';
import {describe, expect, it, vi} from 'vitest';
import {Button, type ButtonProps} from './button';
import {ActionButton} from '../action-button';
import {ChipButton} from '../chip-button';
import {ClearButton} from '../clear-button';
import {SegmentedButton} from '../segmented-control';

describe('Button', () => {
  it('defaults to a native non-submitting button with the shared class', () => {
    const vnode = Button({});
    expect(vnode.type).toBe('button');
    expect(vnode.props.type).toBe('button');
    expect(vnode.props.className).toBe('iitc-iris-button');
  });

  it.each(['submit', 'reset'] as const)('preserves native type=%s and form attributes', (type) => {
    const vnode = Button({type, form: 'settings', name: 'action', value: 'save', formNoValidate: true});
    expect(vnode.props).toMatchObject({type, form: 'settings', name: 'action', value: 'save', formNoValidate: true});
  });

  it('forwards content, native attributes, ARIA, and event handlers', () => {
    const onClick = vi.fn();
    const onKeyDown = vi.fn();
    const children = <span>Save</span>;
    const vnode = Button({
      children, className: 'feature-action', disabled: true, title: 'Save settings',
      'aria-label': 'Save', 'aria-pressed': true, tabIndex: -1, onClick, onKeyDown,
    });
    expect(vnode.props).toMatchObject({
      children, className: 'iitc-iris-button feature-action', disabled: true, title: 'Save settings',
      'aria-label': 'Save', 'aria-pressed': true, tabIndex: -1, onClick, onKeyDown,
    });
  });

  it.each([
    [ActionButton({children: 'Go'}), 'iitc-iris-portal-action', 'Go'],
    [ChipButton({children: 'Clear'}), 'iitc-iris-diagnostics-chip iitc-iris-chip-button', 'Clear'],
    [ClearButton({}), 'iitc-iris-clear-selection', 'X'],
    [SegmentedButton({active: true, children: 'All'}), 'iitc-iris-segmented-button is-active', 'All'],
  ] as const)('preserves the final native output of the styled family %s', (styled, classes, children) => {
    expect(styled.type).toBe(Button);
    const native = Button(styled.props as ButtonProps);
    expect(native.type).toBe('button');
    expect(native.props).toMatchObject({type: 'button', className: `iitc-iris-button ${classes}`, children});
  });
});
