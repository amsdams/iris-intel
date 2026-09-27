import {h, ComponentChildren, JSX} from 'preact';

export interface ClearButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  children?: ComponentChildren;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function ClearButton({children, className, ...props}: ClearButtonProps): h.JSX.Element {
  return (
    <button type="button" className={`iitc-iris-clear-selection ${className || ''}`.trim()} {...props}>
      {children || 'X'}
    </button>
  );
}
