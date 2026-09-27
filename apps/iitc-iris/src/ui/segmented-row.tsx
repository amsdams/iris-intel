import {h, ComponentChildren, JSX} from 'preact';

export interface SegmentedRowProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'className'> {
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
