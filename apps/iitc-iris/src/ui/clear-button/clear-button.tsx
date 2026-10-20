import {h} from 'preact';
import {Button, type ButtonProps} from '../button';
import './clear-button.css';

export type ClearButtonProps = Omit<ButtonProps, 'type'>;

export function ClearButton({children, className, ...props}: ClearButtonProps): h.JSX.Element {
  return (
    <Button className={`iitc-iris-clear-selection ${className || ''}`.trim()} {...props}>
      {children || 'X'}
    </Button>
  );
}
