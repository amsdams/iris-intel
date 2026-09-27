import {h, ComponentChildren, JSX} from 'preact';

export interface ActionButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  children?: ComponentChildren;
  className?: string; // Optional extra classes
  disabled?: boolean;
  title?: string;
}

export function ActionButton({children, className, ...props}: ActionButtonProps): h.JSX.Element {
  return (
    <button type="button" className={`iitc-iris-portal-action ${className || ''}`.trim()} {...props}>
      {children}
    </button>
  );
}
