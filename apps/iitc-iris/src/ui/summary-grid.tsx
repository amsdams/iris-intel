import {h, ComponentChildren, JSX} from 'preact';

export interface SummaryGridProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function SummaryGrid({children, className, ...props}: SummaryGridProps): h.JSX.Element {
  const classes = ['iitc-iris-panel-summary', className || ''].filter(Boolean).join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
