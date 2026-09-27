import {h, ComponentChildren, JSX} from 'preact';
import {StatusText} from './status-text';

export interface SectionProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'className' | 'title'> {
  titleHeading?: ComponentChildren;
  title?: string;
  children?: ComponentChildren;
  className?: string;
}

export function Section({titleHeading, title, children, className, ...props}: SectionProps): h.JSX.Element {
  return (
    <div className={`iitc-iris-map-controls-section ${className || ''}`.trim()} title={title} {...props}>
      {titleHeading && <StatusText>{titleHeading}</StatusText>}
      {children}
    </div>
  );
}
