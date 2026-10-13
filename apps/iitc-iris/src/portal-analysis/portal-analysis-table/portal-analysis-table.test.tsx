/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {describe, expect, it} from 'vitest';
import {PortalAnalysisTable} from './portal-analysis-table';

describe('PortalAnalysisTable', () => {
  it('renders the counts table class contract', () => {
    const vnode = PortalAnalysisTable({variant: 'counts', children: null});

    expect(vnode.props.className).toBe('iitc-iris-portal-counts-table-wrap');
    expect(vnode.props.children.type).toBe('table');
    expect(vnode.props.children.props.className).toBe('iitc-iris-portal-analysis-table iitc-iris-portal-counts-table');
  });

  it('renders the scoreboard table class contract', () => {
    const vnode = PortalAnalysisTable({variant: 'scoreboard', children: null});

    expect(vnode.props.className).toBe('iitc-iris-portal-counts-table-wrap');
    expect(vnode.props.children.props.className).toBe('iitc-iris-portal-analysis-table iitc-iris-scoreboard-table');
  });

  it('renders the portals list scroll wrapper class contract', () => {
    const vnode = PortalAnalysisTable({variant: 'portals-list', children: null});

    expect(vnode.props.className).toBe('iitc-iris-portals-list-table-wrap');
    expect(vnode.props.children.props.className).toBe('iitc-iris-portal-analysis-table iitc-iris-portals-list-table');
  });
});
