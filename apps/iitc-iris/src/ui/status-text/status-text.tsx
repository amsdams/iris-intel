import {h, ComponentChildren, JSX} from 'preact';
import '../shared/warning.css';
import './status-text.css';

export interface StatusTextProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function StatusText({children, className, ...props}: StatusTextProps): h.JSX.Element {
  return (
    <span className={`iitc-iris-status ${className || ''}`.trim()} {...props}>
      {children}
    </span>
  );
}
