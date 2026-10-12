import {h} from 'preact';

export interface BadgeProps extends h.JSX.HTMLAttributes<HTMLElement> {
  as?: 'span' | 'b';
}

export function Badge({as = 'span', className, ...props}: BadgeProps): h.JSX.Element {
  const Component = as;
  const classes = ['iitc-iris-badge', className || ''].filter(Boolean).join(' ');
  return <Component className={classes} {...props} />;
}
