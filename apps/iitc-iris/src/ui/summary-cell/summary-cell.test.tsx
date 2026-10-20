/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import {describe, expect, it} from 'vitest';
import {SummaryCell} from './summary-cell';

describe('SummaryCell', () => {
  it('preserves the <b> value and <small> label structure', () => {
    const vnode = SummaryCell({ value: '10', label: 'Items' });
    expect(vnode.type).toBe('span');
    
    const children = vnode.props.children;
    expect(children).toHaveLength(2);
    
    // First child should be <b>
    expect(children[0].type).toBe('b');
    expect(children[0].props.children).toBe('10');
    
    // Second child should be <small>
    expect(children[1].type).toBe('small');
    expect(children[1].props.children).toBe('Items');
  });

  it('applies default and extra className values correctly', () => {
    const defaultNode = SummaryCell({ value: '10', label: 'Items' });
    expect(defaultNode.props.className).toBe('iitc-iris-summary-cell');

    const vnode = SummaryCell({ value: '1', label: 'Item', className: 'extra-class' });
    expect(vnode.props.className).toBe('iitc-iris-summary-cell extra-class');
  });
});
