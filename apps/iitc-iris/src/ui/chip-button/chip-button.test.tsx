/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it} from 'vitest';
import {ChipButton} from './chip-button';

describe('ChipButton', () => {
  it('renders a button with the diagnostics chip classes', () => {
    const vnode = ChipButton({ children: 'Clear' });
    expect(vnode.type).toBe('button');
    expect(vnode.props.className).toBe('iitc-iris-diagnostics-chip iitc-iris-chip-button');
    expect(vnode.props.children).toBe('Clear');
  });

  it('composes extra className values', () => {
    const vnode = ChipButton({ className: 'extra' });
    expect(vnode.props.className).toBe('iitc-iris-diagnostics-chip iitc-iris-chip-button extra');
  });
});

