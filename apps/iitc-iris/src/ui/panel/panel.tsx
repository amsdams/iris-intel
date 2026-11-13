import {createContext, h, isValidElement, toChildArray, ComponentChildren, type HTMLAttributes, type VNode} from 'preact';
import {useContext, useState} from 'preact/hooks';
import {ActionButton} from '../action-button';
import {DiagnosticsChip, type DiagnosticsChipProps} from '../diagnostics-chip';
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
    title={size.expanded ? 'Reduce panel height' : 'Expand panel height'} onClick={size.toggle}>
    {size.expanded ? 'Reduce' : 'Expand'}
  </ActionButton>;
}

export interface PanelHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  children?: ComponentChildren;
  className?: string;
}

export function PanelHeader({children, className, ...props}: PanelHeaderProps): h.JSX.Element {
  const classes = ['iitc-iris-request-panel-header', className || ''].filter(Boolean).join(' ');
  const [title, ...actions] = toChildArray(children);
  return (
    <div className={classes} {...props}>
      {title}
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
  const items = toChildArray(children);
  const technical = items.filter((item): item is VNode<DiagnosticsChipProps> => isValidElement(item) && item.type === DiagnosticsChip);
  const visible = items.filter(item => !isValidElement(item) || item.type !== DiagnosticsChip);
  return (
    <div className={classes} {...props}>
      {visible}
      {technical.length > 0 && <details className="iitc-iris-technical-details">
        <summary className="iitc-iris-section-summary">Technical details</summary>
        {technical.map((item, index) => <div key={index}>{item}
          {item.props.title && <pre>{item.props.title}</pre>}
        </div>)}
      </details>}
    </div>
  );
}
