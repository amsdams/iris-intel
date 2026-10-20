import {h} from 'preact';
import {Button, type ButtonProps} from '../button';
import '../diagnostics-chip/diagnostics-chip.css';
import './chip-button.css';

export type ChipButtonProps = ButtonProps;

/** Compact action sharing the diagnostics chip skin. */
export function ChipButton({children, className, ...props}: ChipButtonProps): h.JSX.Element {
  return (
    <Button className={`iitc-iris-diagnostics-chip iitc-iris-chip-button ${className || ''}`.trim()} {...props}>
      {children}
    </Button>
  );
}
