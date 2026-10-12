/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it} from 'vitest';
import {Panel, PanelHeader, PanelTitle, PanelBody, PanelFooter} from './panel';

describe('Panel Components', () => {
  it('Panel renders aside with class', () => {
    const vnode = Panel({ children: 'Content', className: 'extra' });
    expect(vnode.type).toBe('aside');
    expect(vnode.props.className).toBe('iitc-iris-request-side-panel extra');
  });

  it('PanelHeader renders div with class', () => {
    const vnode = PanelHeader({ children: 'Header', className: 'extra' });
    expect(vnode.type).toBe('div');
    expect(vnode.props.className).toBe('iitc-iris-request-panel-header extra');
  });

  it('PanelTitle renders span with class', () => {
    const vnode = PanelTitle({ children: 'Title', className: 'extra' });
    expect(vnode.type).toBe('span');
    expect(vnode.props.className).toBe('iitc-iris-selected-title extra');
  });

  it('PanelBody renders div with class', () => {
    const vnode = PanelBody({ children: 'Body', className: 'extra' });
    expect(vnode.type).toBe('div');
    expect(vnode.props.className).toBe('iitc-iris-request-panel-body extra');
  });

  it('PanelFooter renders div with class', () => {
    const vnode = PanelFooter({ children: 'Footer', className: 'extra' });
    expect(vnode.type).toBe('div');
    expect(vnode.props.className).toBe('iitc-iris-panel-footer extra');
  });
});
