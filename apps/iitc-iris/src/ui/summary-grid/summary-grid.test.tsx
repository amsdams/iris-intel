/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it} from 'vitest';
import {SummaryGrid} from './summary-grid';

describe('SummaryGrid', () => {
  it('renders a div with base class', () => {
    const vnode = SummaryGrid({ children: 'Content' });
    expect(vnode.type).toBe('div');
    expect(vnode.props.className).toBe('iitc-iris-panel-summary');
    expect(vnode.props.children).toBe('Content');
  });

  it('composes extra className values without dropping the base class', () => {
    const vnode = SummaryGrid({ className: 'extra-class' });
    expect(vnode.props.className).toBe('iitc-iris-panel-summary extra-class');
  });
});
