import {useMemo, useState} from 'preact/hooks';
import {
  filterPortalsList,
  PortalsListLevelFilter,
  PortalsListSortField,
  PortalsListTeamFilter,
  SortOrder,
  sortPortalsList,
} from './portal-analysis';
import {calculateNextSortOrder} from './actions';
import type {IitcIrisPortalAnalysis} from '../../messages';
import {summarizeIitcPortalsList, type IitcPortalsListEntry, type IitcPortalsListSummary} from '@iris/iitc-core';

export interface UsePortalAnalysisWorkflowParams {
  portalAnalysis: IitcIrisPortalAnalysis | null | undefined;
}

export interface UsePortalAnalysisWorkflowResult {
  portalsListSortBy: PortalsListSortField;
  portalsListSortOrder: SortOrder;
  portalsListTeamFilter: PortalsListTeamFilter;
  portalsListLevelFilter: PortalsListLevelFilter;
  portalsListTextFilter: string;
  filteredPortalsList: IitcPortalsListEntry[];
  sortedPortalsList: IitcPortalsListEntry[];
  portalsListSummary: IitcPortalsListSummary;
  setPortalsListLevelFilter: (filter: PortalsListLevelFilter) => void;
  setPortalsListTeamFilter: (filter: PortalsListTeamFilter) => void;
  setPortalsListTextFilter: (text: string) => void;
  sortPortalsListBy: (field: PortalsListSortField) => void;
}

export function usePortalAnalysisWorkflow(params: UsePortalAnalysisWorkflowParams): UsePortalAnalysisWorkflowResult {
  const {portalAnalysis} = params;

  const [portalsListSortBy, setPortalsListSortBy] = useState<PortalsListSortField>('level');
  const [portalsListSortOrder, setPortalsListSortOrder] = useState<SortOrder>(-1);
  const [portalsListTeamFilter, setPortalsListTeamFilter] = useState<PortalsListTeamFilter>('all');
  const [portalsListLevelFilter, setPortalsListLevelFilter] = useState<PortalsListLevelFilter>('all');
  const [portalsListTextFilter, setPortalsListTextFilter] = useState('');

  const filteredPortalsList = useMemo(
    () => filterPortalsList(portalAnalysis?.portalslist ?? [], portalsListTeamFilter, portalsListLevelFilter, portalsListTextFilter),
    [portalAnalysis?.portalslist, portalsListTeamFilter, portalsListLevelFilter, portalsListTextFilter],
  );

  const sortedPortalsList = useMemo(
    () => sortPortalsList(filteredPortalsList, portalsListSortBy, portalsListSortOrder),
    [filteredPortalsList, portalsListSortBy, portalsListSortOrder],
  );

  const portalsListSummary = useMemo(() => summarizeIitcPortalsList(filteredPortalsList), [filteredPortalsList]);

  const sortPortalsListBy = (field: PortalsListSortField): void => {
    const {nextField, nextOrder} = calculateNextSortOrder(field, portalsListSortBy, portalsListSortOrder);
    setPortalsListSortBy(nextField);
    setPortalsListSortOrder(nextOrder);
  };

  return {
    portalsListSortBy,
    portalsListSortOrder,
    portalsListTeamFilter,
    portalsListLevelFilter,
    portalsListTextFilter,
    filteredPortalsList,
    sortedPortalsList,
    portalsListSummary,
    setPortalsListLevelFilter,
    setPortalsListTeamFilter,
    setPortalsListTextFilter,
    sortPortalsListBy,
  };
}
