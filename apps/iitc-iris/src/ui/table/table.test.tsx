/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {h} from 'preact';
import {describe, expect, it} from 'vitest';
import {Table} from './table';

describe('Table', () => {
  it('renders a container and native table without requiring feature props', () => {
    const vnode = Table({});
    expect(vnode.type).toBe('div');
    expect(vnode.props.className).toBe('iitc-iris-table-container');
    expect(vnode.props.children.type).toBe('table');
    expect(vnode.props.children.props.className).toBe('iitc-iris-table');
  });

  it('keeps container layout classes separate from native table attributes', () => {
    const vnode = Table({className: 'feature-columns', containerClassName: 'feature-scroll', id: 'results', 'aria-label': 'Results'});
    expect(vnode.props.className).toBe('iitc-iris-table-container feature-scroll');
    expect(vnode.props.id).toBeUndefined();
    expect(vnode.props.children.props).toMatchObject({className: 'iitc-iris-table feature-columns', id: 'results', 'aria-label': 'Results'});
    expect(vnode.props.children.props.containerClassName).toBeUndefined();
  });

  it('preserves caller-supplied captions, headers, and rows as native table content', () => {
    const children = [
      <caption key="caption">Results</caption>,
      <thead key="head"><tr><th scope="col">Name</th></tr></thead>,
      <tbody key="body"><tr><td>Portal</td></tr></tbody>,
    ];
    const vnode = Table({children});
    expect(vnode.props.children.props.children).toBe(children);
  });
});
