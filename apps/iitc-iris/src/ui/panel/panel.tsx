import {createContext, h, toChildArray, ComponentChildren, type HTMLAttributes} from 'preact';
import {useContext, useState} from 'preact/hooks';
import {ActionButton} from '../action-button';
import '../shared/section-summary.css';
import './panel.css';

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function Panel({children, className, ...props}: PanelProps): h.JSX.Element {
  const classes = ['iitc-iris-request-side-panel', className || ''].filter(Boolean).join(' ');
  return <PanelFrame className={classes} {...props}>{children}</PanelFrame>;
}

const PanelSize = createContext<{expanded: boolean; toggle: () => void} | null>(null);

export function PanelFrame({children, className, ...props}: PanelProps): h.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  return (
    <aside className={`${className ?? ''} ${expanded ? 'is-expanded' : ''}`} {...props}>
      <PanelSize.Provider value={{expanded, toggle: () => setExpanded(!expanded)}}>{children}</PanelSize.Provider>
    </aside>
  );
}

export function PanelSizeButton(): h.JSX.Element | null {
  const size = useContext(PanelSize);
  return size && <ActionButton className="iitc-iris-panel-size" aria-expanded={size.expanded}
    aria-label={size.expanded ? 'Reduce' : 'Expand'}
    title={size.expanded ? 'Reduce panel height' : 'Expand panel height'} onClick={size.toggle}>
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
      <path d={size.expanded ? 'M3 8h5V3m4 14v-5h5M8 8 3 3m9 9 5 5' : 'M3 8V3h5m4 14h5v-5M3 3l5 5m4 4 5 5'} />
    </svg>
  </ActionButton>;
}

export interface PanelHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
  description?: ComponentChildren;
}

export function PanelHeader({children, className, description, ...props}: PanelHeaderProps): h.JSX.Element {
  const classes = ['iitc-iris-request-panel-header', className || ''].filter(Boolean).join(' ');
  const [title, ...actions] = toChildArray(children);
  return (
    <div className={classes} {...props}>
      <div className="iitc-iris-panel-heading">
        {title}
        {description && <div className="iitc-iris-panel-description">{description}</div>}
      </div>
      <span className="iitc-iris-panel-header-actions"><PanelSizeButton />{actions}</span>
    </div>
  );
}

export interface PanelTitleProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'className'> {
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

export interface PanelBodyProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
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

export interface PanelFooterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
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
