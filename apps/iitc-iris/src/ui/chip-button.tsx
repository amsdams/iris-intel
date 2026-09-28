import {h, ComponentChildren, JSX} from 'preact';

/**
 * Button styled like the diagnostics chip.
 * It combines the `.iitc-iris-diagnostics-chip` base class with the
 * `.iitc-iris-chip-button` modifier used in the legacy UI.
 */
export interface ChipButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function ChipButton({children, className, ...props}: ChipButtonProps): h.JSX.Element {
  return (
    <button
      type="button"
      className={`iitc-iris-diagnostics-chip iitc-iris-chip-button ${className || ''}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
