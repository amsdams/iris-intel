import {h, ComponentChildren, JSX} from 'preact';
import './control-row.css';

export interface ControlRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function ControlRow({children, className, ...props}: ControlRowProps): h.JSX.Element {
  return (
    <div className={`iitc-iris-map-control-row ${className || ''}`.trim()} {...props}>
      {children}
    </div>
  );
}
