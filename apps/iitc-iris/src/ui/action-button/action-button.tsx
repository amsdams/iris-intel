import {h, ComponentChildren, JSX} from 'preact';
import './action-button.css';

export interface ActionButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  children?: ComponentChildren;
  className?: string; // Optional extra classes
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function ActionButton({children, className, type = 'button', ...props}: ActionButtonProps): h.JSX.Element {
  return (
    <button type={type} className={`iitc-iris-button iitc-iris-portal-action ${className || ''}`.trim()} {...props}>
      {children}
    </button>
  );
}
