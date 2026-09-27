import {h, ComponentChildren, JSX} from 'preact';

export interface SegmentedButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  active?: boolean;
  children?: ComponentChildren;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function SegmentedButton({active, children, className, ...props}: SegmentedButtonProps): h.JSX.Element {
  const classes = ['iitc-iris-segmented-button', active ? 'is-active' : '', className || ''].filter(Boolean).join(' ');
  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
