import {h} from 'preact';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'preact/hooks';
import {IITC_IRIS_HOST_BACK} from './host-navigation';
import {
  AGENT_MENU_SHEET_REGISTRY,
  MAP_MENU_SHEET_REGISTRY,
  PRIMARY_MENU_REGISTRY,
  SELECTED_MENU_SHEET_REGISTRY,
  SYSTEM_MENU_SHEET_REGISTRY,
  type IitcIrisPrimaryMenuId,
  type IitcIrisSheetId,
} from './menu-registry';
import {IITC_IRIS_COMM_TABS} from '../comm/tabs';
import type {IitcIrisCommState, IitcIrisCommTab, IitcIrisMissionsState} from '../messages';

interface IitcIrisSheetTabBarProps {
  isPanelVisible: (sheet: IitcIrisSheetId) => boolean;
  activePrimaryMenu: IitcIrisPrimaryMenuId;
  togglePrimaryMenu: (id: IitcIrisPrimaryMenuId) => void;
  selectedPrimaryLabel: string;
  hasSelectedObject: boolean;
  activeSheet: IitcIrisSheetId;
  selectedKind: 'portal' | 'link' | 'field' | null;
  toggleSheet: (sheet: IitcIrisSheetId) => void;
  openSheet: (sheet: IitcIrisSheetId) => void;
  toggleMissionsSheet: (source: 'view' | 'portal') => void;
  missionsState: IitcIrisMissionsState;
  commState: IitcIrisCommState;
  selectCommTab: (tab: IitcIrisCommTab) => void;
  locate: () => void;
}

export function IitcIrisSheetTabBar({
  isPanelVisible,
  activePrimaryMenu,
  togglePrimaryMenu,
  selectedPrimaryLabel,
  hasSelectedObject,
  activeSheet,
  selectedKind,
  toggleSheet,
  openSheet,
  toggleMissionsSheet,
  missionsState,
  commState,
  selectCommTab,
  locate,
}: IitcIrisSheetTabBarProps): h.JSX.Element {
  const [group, setGroup] = useState<'analysis' | 'draw' | null>(null);
  const choicesRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({start: false, end: false});
  const groupButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeGroup = useCallback((): void => {setGroup(null); groupButtonRef.current?.focus();}, []);
  // Closing a sheet may restore the selected-portal menu; an open chooser still belongs to Map.
  const displayedPrimaryMenu = group && activeSheet === 'map' ? 'map' : activePrimaryMenu;
  useEffect(() => {if (activeSheet !== 'map') setGroup(null);}, [activeSheet]);
  useEffect(() => {if (group) choicesRef.current?.querySelector('button')?.focus();}, [group]);
  useLayoutEffect(() => {
    if (!group) return undefined;
    const close = (event: Event): void => {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeGroup();
    };
    const onKeyDown = (event: KeyboardEvent): void => {if (event.key === 'Escape') close(event);};
    window.addEventListener(IITC_IRIS_HOST_BACK, close, true);
    window.addEventListener('keydown', onKeyDown, true);
    return (): void => {
      window.removeEventListener(IITC_IRIS_HOST_BACK, close, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [group, closeGroup]);
  useEffect(() => {
    const row = secondaryRef.current;
    if (!row) return undefined;
    const update = (): void => {
      const start = row.scrollLeft > 1;
      const end = row.scrollWidth - row.clientWidth - row.scrollLeft > 1;
      setOverflow(current => current.start === start && current.end === end ? current : {start, end});
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);
    for (const child of row.children) observer.observe(child);
    row.addEventListener('scroll', update, {passive: true});
    return (): void => {observer.disconnect(); row.removeEventListener('scroll', update);};
  }, [displayedPrimaryMenu, selectedKind, isPanelVisible]);
  const groups = {
    analysis: {label: 'Analysis', sheets: ['portalCounts', 'portalsList', 'scoreboard']},
    draw: {label: 'Draw tools', sheets: ['drawLinks', 'drawMarkers']},
  } as const;
  const renderSheetTab = (
    sheet: IitcIrisSheetId,
    label: string,
    onClick?: () => void,
    overrideActive?: boolean
  ): h.JSX.Element => {
    const active = overrideActive ?? activeSheet === sheet;
    return (
      <button
        className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${active ? 'is-active' : ''}`}
        type="button"
        onClick={() => {setGroup(null); (onClick ?? ((): void => toggleSheet(sheet)))();}}
        aria-pressed={active}
        key={sheet}
      >
        {label}
      </button>
    );
  };

  const renderPrimaryMenuTab = (menu: typeof PRIMARY_MENU_REGISTRY[number]): h.JSX.Element => {
    const label = menu.id === 'selected' ? selectedPrimaryLabel : menu.label;
    return (
      <button
        className={`iitc-iris-sheet-tab ${displayedPrimaryMenu === menu.id ? 'is-active' : ''}`}
        type="button"
        onClick={() => {
          if (menu.id === 'map' && group) closeGroup();
          else {setGroup(null); togglePrimaryMenu(menu.id);}
        }}
        disabled={menu.id === 'selected' && !hasSelectedObject}
        aria-pressed={displayedPrimaryMenu === menu.id}
        title={`${label} menu (${menu.shortcut})`}
        key={menu.id}
      >
        {label}
      </button>
    );
  };

  const renderSelectedSheetTab = (
    entry: typeof SELECTED_MENU_SHEET_REGISTRY[number]
  ): h.JSX.Element | null => {
    if (!entry.selectedKind || selectedKind !== entry.selectedKind) return null;
    const openSelectedSheet =
      entry.id === 'selectedLink' || entry.id === 'selectedField'
        ? (): void => openSheet(entry.id)
        : undefined;
    return renderSheetTab(entry.id, entry.label, openSelectedSheet);
  };

  return (
    <nav className="iitc-iris-sheet-tabbar" aria-label="Panels">
      {displayedPrimaryMenu === 'map' && group && <div ref={choicesRef} className="iitc-iris-menu-choices" role="group" aria-label={groups[group].label}>
        <button className="iitc-iris-sheet-tab" type="button" onClick={closeGroup}>Back to Map menu</button>
        {MAP_MENU_SHEET_REGISTRY.filter(entry => (groups[group].sheets as readonly string[]).includes(entry.id) && isPanelVisible(entry.id))
          .map(entry => renderSheetTab(entry.id, entry.label, () => {setGroup(null); toggleSheet(entry.id);} ))}
      </div>}
      <div className="iitc-iris-sheet-tabbar-primary">
        {PRIMARY_MENU_REGISTRY.map(renderPrimaryMenuTab)}
      </div>
      <div className="iitc-iris-sheet-tabbar-secondary-wrap">
      {overflow.start && <span className="iitc-iris-menu-scroll-hint is-start" aria-hidden="true">‹</span>}
      <div className="iitc-iris-sheet-tabbar-secondary" ref={secondaryRef}>
        {displayedPrimaryMenu === 'map' && (
          <>
            {renderSheetTab('search', 'Search')}
            {renderSheetTab('missions', 'Missions', () => toggleMissionsSheet('view'), activeSheet === 'missions' && missionsState.source !== 'portal')}
            {renderSheetTab('scores', 'Regional scores')}
            {renderSheetTab('layers', 'Layers')}
            <button className="iitc-iris-sheet-tab iitc-iris-sheet-subtab" type="button" onClick={() => {setGroup(null); openSheet('map'); locate();}}>Locate</button>
            {(['analysis', 'draw'] as const).filter(id => groups[id].sheets.some(sheet => isPanelVisible(sheet))).map(id =>
              <button key={id} className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${(groups[id].sheets as readonly string[]).includes(activeSheet) ? 'is-active' : ''}`}
                type="button" aria-expanded={group === id} onClick={event => {
                  groupButtonRef.current = event.currentTarget;
                  if (group === id) closeGroup();
                  else {openSheet('map'); setGroup(id);}
                }}>{groups[id].label}</button>)}
            {renderSheetTab('view', 'Controls')}
          </>
        )}
        {displayedPrimaryMenu === 'selected' && (
          <>
            {SELECTED_MENU_SHEET_REGISTRY.map(renderSelectedSheetTab)}
            {selectedKind === 'portal' && (
              <button
                className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${
                  activeSheet === 'missions' && missionsState.source === 'portal' ? 'is-active' : ''
                }`}
                type="button"
                onClick={() => toggleMissionsSheet('portal')}
                aria-pressed={activeSheet === 'missions' && missionsState.source === 'portal'}
              >
                Missions
              </button>
            )}
          </>
        )}
        {displayedPrimaryMenu === 'agent' && (
          <>
            {AGENT_MENU_SHEET_REGISTRY.map((entry) => renderSheetTab(entry.id, entry.label))}
          </>
        )}
        {displayedPrimaryMenu === 'comm' && (
          <>
            {IITC_IRIS_COMM_TABS.map((tab) => (
              <button
                className={`iitc-iris-sheet-tab iitc-iris-sheet-subtab ${
                  activeSheet === 'comm' && commState.tab === tab.id ? 'is-active' : ''
                }`}
                type="button"
                onClick={() => selectCommTab(tab.id)}
                disabled={commState.status === 'loading' && commState.tab === tab.id}
                aria-pressed={activeSheet === 'comm' && commState.tab === tab.id}
                key={tab.id}
              >
                {tab.label}
              </button>
            ))}
          </>
        )}
        {displayedPrimaryMenu === 'system' && (
          <>
            {SYSTEM_MENU_SHEET_REGISTRY.map((entry) => renderSheetTab(entry.id, entry.label))}
          </>
        )}
      </div>
      {overflow.end && <span className="iitc-iris-menu-scroll-hint is-end" aria-hidden="true">›</span>}
      </div>
    </nav>
  );
}
