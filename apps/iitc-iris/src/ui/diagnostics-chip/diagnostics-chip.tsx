import {h, ComponentChildren, JSX} from 'preact';
import './diagnostics-chip.css';

export type DiagnosticsChipProps = Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'className' | 'children' | 'value'> & {
  className?: string;
} & ({
  value: ComponentChildren;
  label: ComponentChildren;
  children?: never;
} | {
  children?: ComponentChildren;
  value?: never;
  label?: never;
});

export function DiagnosticsChip(props: DiagnosticsChipProps): h.JSX.Element {
  const {value, label, children, className, ...attributes} = props;
  return (
    <span className={`iitc-iris-diagnostics-chip ${className || ''}`.trim()} {...attributes}>
      {'value' in props ? [<b key="value">{value}</b>, <small key="label">{label}</small>] : children}
    </span>
  );
}
