import {h} from 'preact';

/**
 * Renders a standard empty state container.
 * It simply wraps its children in a `<div>` with the legacy
 * `.iitc-iris-empty-state` class.
 */
export interface EmptyStateProps {
  children?: h.JSX.Element | string;
}

export function EmptyState({children}: EmptyStateProps): h.JSX.Element {
  return <div className="iitc-iris-empty-state">{children}</div>;
}
