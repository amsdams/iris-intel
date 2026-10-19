import {h} from 'preact';
import {Button, type ButtonProps} from '../button';
import './segmented-button.css';

export interface SegmentedButtonProps extends Omit<ButtonProps, 'type'> {
  active?: boolean;
}

export function SegmentedButton({active, children, className, ...props}: SegmentedButtonProps): h.JSX.Element {
  const classes = ['iitc-iris-segmented-button', active ? 'is-active' : '', className || ''].filter(Boolean).join(' ');
  return (
    <Button className={classes} {...props}>
      {children}
    </Button>
  );
}
