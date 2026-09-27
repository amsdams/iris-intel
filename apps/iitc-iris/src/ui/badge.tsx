import {h} from 'preact';

export interface BadgeProps extends h.JSX.HTMLAttributes<HTMLElement> {
  as?: 'span' | 'b';
}

export function Badge({as = 'span', ...props}: BadgeProps): h.JSX.Element {
  const Component = as;
  return <Component {...props} />;
}
