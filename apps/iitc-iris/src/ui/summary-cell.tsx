import {h, ComponentChildren, JSX} from 'preact';

export interface SummaryCellProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'className'> {
  value: ComponentChildren;
  label: ComponentChildren;
  className?: string;
}

export function SummaryCell({value, label, className, ...props}: SummaryCellProps): h.JSX.Element {
  const classes = ['iitc-iris-summary-cell', className || ''].filter(Boolean).join(' ');
  return (
    <span className={classes} {...props}>
      <b>{value}</b><small>{label}</small>
    </span>
  );
}
