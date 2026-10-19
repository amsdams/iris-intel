import {h} from 'preact';
import {Button, type ButtonProps} from '../button';
import './action-button.css';

export type ActionButtonProps = ButtonProps;

export function ActionButton({children, className, ...props}: ActionButtonProps): h.JSX.Element {
  return (
    <Button className={`iitc-iris-portal-action ${className || ''}`.trim()} {...props}>
      {children}
    </Button>
  );
}
