import {h, type ButtonHTMLAttributes} from 'preact';
import './button.css';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'class' | 'className' | 'type'> {
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

/** Native button with shared interaction defaults and radius; callers own its skin. */
export function Button({children, className, type = 'button', ...props}: ButtonProps): h.JSX.Element {
  return (
    <button type={type} className={`iitc-iris-button ${className || ''}`.trim()} {...props}>
      {children}
    </button>
  );
}
