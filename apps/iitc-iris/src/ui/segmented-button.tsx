import {h, ComponentChildren, JSX} from 'preact';

export interface SegmentedButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  active?: boolean;
  children?: ComponentChildren;
  className?: string;
  disabled?: boolean;
}

export function SegmentedButton({active, children, className, ...props}: SegmentedButtonProps): h.JSX.Element {
  const activeClass = active ? 'is-active' : '';
  return (
    <button type="button" className={`iitc-iris-segmented-button ${activeClass} ${className || ''}`.trim()} {...props}>
      {children}
    </button>
  );
}
