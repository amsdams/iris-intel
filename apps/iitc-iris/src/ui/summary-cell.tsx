import {h, ComponentChildren, JSX} from 'preact';

export interface SummaryCellProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'className'> {
  value: ComponentChildren;
  label: ComponentChildren;
  className?: string;
}

export function SummaryCell({value, label, className, ...props}: SummaryCellProps): h.JSX.Element {
  return (
    <span className={className} {...props}>
      <b>{value}</b><small>{label}</small>
    </span>
  );
}
