import {h, JSX} from 'preact';
import './table.css';

export interface TableProps extends Omit<JSX.TableHTMLAttributes<HTMLTableElement>, 'class' | 'className'> {
  className?: string;
  containerClassName?: string;
}

/** Styled native table; callers supply its structure, column layout, and scroll constraints. */
export function Table({children, className, containerClassName, ...props}: TableProps): h.JSX.Element {
  return (
    <div className={`iitc-iris-table-container ${containerClassName || ''}`.trim()}>
      <table className={`iitc-iris-table ${className || ''}`.trim()} {...props}>
        {children}
      </table>
    </div>
  );
}
