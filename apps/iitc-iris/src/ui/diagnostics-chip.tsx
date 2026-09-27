import {h, ComponentChildren, JSX} from 'preact';

export interface DiagnosticsChipProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'className'> {
  value: ComponentChildren;
  label: ComponentChildren;
  className?: string;
}

export function DiagnosticsChip({value, label, className, ...props}: DiagnosticsChipProps): h.JSX.Element {
  return (
    <span className={`iitc-iris-diagnostics-chip ${className || ''}`.trim()} {...props}>
      <b>{value}</b><small>{label}</small>
    </span>
  );
}

export interface PlainDiagnosticsChipProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function PlainDiagnosticsChip({children, className, ...props}: PlainDiagnosticsChipProps): h.JSX.Element {
  return (
    <span className={`iitc-iris-diagnostics-chip ${className || ''}`.trim()} {...props}>
      {children}
    </span>
  );
}
