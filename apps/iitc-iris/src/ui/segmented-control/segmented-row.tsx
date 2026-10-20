import {h, ComponentChildren, type HTMLAttributes} from 'preact';
import './segmented-control.css';

export interface SegmentedRowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function SegmentedRow({children, className, ...props}: SegmentedRowProps): h.JSX.Element {
  return (
    <div className={`iitc-iris-segmented-row ${className || ''}`.trim()} {...props}>
      {children}
    </div>
  );
}
