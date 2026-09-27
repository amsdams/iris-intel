import {h, ComponentChildren, JSX} from 'preact';

export interface PanelProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function Panel({children, className, ...props}: PanelProps): h.JSX.Element {
  const classes = ['iitc-iris-request-side-panel', className || ''].filter(Boolean).join(' ');
  return (
    <aside className={classes} {...props}>
      {children}
    </aside>
  );
}

export interface PanelHeaderProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function PanelHeader({children, className, ...props}: PanelHeaderProps): h.JSX.Element {
  const classes = ['iitc-iris-request-panel-header', className || ''].filter(Boolean).join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export interface PanelTitleProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function PanelTitle({children, className, ...props}: PanelTitleProps): h.JSX.Element {
  const classes = ['iitc-iris-selected-title', className || ''].filter(Boolean).join(' ');
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
}

export interface PanelBodyProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function PanelBody({children, className, ...props}: PanelBodyProps): h.JSX.Element {
  const classes = ['iitc-iris-request-panel-body', className || ''].filter(Boolean).join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export interface PanelFooterProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function PanelFooter({children, className, ...props}: PanelFooterProps): h.JSX.Element {
  const classes = ['iitc-iris-panel-footer', className || ''].filter(Boolean).join(' ');
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
