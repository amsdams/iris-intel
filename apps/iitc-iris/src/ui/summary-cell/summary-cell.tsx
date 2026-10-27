import {h, ComponentChildren, type HTMLAttributes} from 'preact';
import './summary-cell.css';

export interface SummaryCellProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
  value: ComponentChildren;
  label: ComponentChildren;
  className?: string;
  children?: ComponentChildren;
}

export function SummaryCell({value, label, className, children, ...props}: SummaryCellProps): h.JSX.Element {
  const classes = ['iitc-iris-summary-cell', className || ''].filter(Boolean).join(' ');
  return (
    <span className={classes} {...props}>
      <b>{value}</b><small>{label}</small>
      {children}
    </span>
  );
}
