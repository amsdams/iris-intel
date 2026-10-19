import {h, JSX} from 'preact';
import './button.css';

export interface ButtonProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'class' | 'className' | 'type'> {
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

/** Native button with shared interaction defaults; callers own its visual style. */
export function Button({children, className, type = 'button', ...props}: ButtonProps): h.JSX.Element {
  return (
    <button type={type} className={`iitc-iris-button ${className || ''}`.trim()} {...props}>
      {children}
    </button>
  );
}
