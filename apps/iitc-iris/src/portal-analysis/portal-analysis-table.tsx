import {h, type ComponentChildren} from 'preact';

type PortalAnalysisTableVariant = 'counts' | 'scoreboard' | 'portals-list';

const WRAPPER_CLASS_BY_VARIANT: Record<PortalAnalysisTableVariant, string> = {
  counts: 'iitc-iris-portal-counts-table-wrap',
  scoreboard: 'iitc-iris-portal-counts-table-wrap',
  'portals-list': 'iitc-iris-portals-list-table-wrap',
};

const TABLE_CLASS_BY_VARIANT: Record<PortalAnalysisTableVariant, string> = {
  counts: 'iitc-iris-portal-counts-table',
  scoreboard: 'iitc-iris-scoreboard-table',
  'portals-list': 'iitc-iris-portals-list-table',
};

export interface PortalAnalysisTableProps {
  children: ComponentChildren;
  variant: PortalAnalysisTableVariant;
}

export function PortalAnalysisTable({
  children,
  variant,
}: PortalAnalysisTableProps): h.JSX.Element {
  return (
    <div className={WRAPPER_CLASS_BY_VARIANT[variant]}>
      <table className={`iitc-iris-portal-analysis-table ${TABLE_CLASS_BY_VARIANT[variant]}`}>
        {children}
      </table>
    </div>
  );
}
