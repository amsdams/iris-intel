import {h} from 'preact';
import {
  AGENT_MENU_SHEET_REGISTRY,
  MAP_MENU_SHEET_REGISTRY,
  PRIMARY_MENU_REGISTRY,
  SELECTED_MENU_SHEET_REGISTRY,
  SYSTEM_MENU_SHEET_REGISTRY,
  type IitcIrisPrimaryMenuId,
  type IitcIrisSheetId,
} from './menu-registry';
import {IITC_IRIS_COMM_TABS} from './comm-panel-controls';
import type {IitcIrisCommState, IitcIrisCommTab, IitcIrisMissionsState} from './messages';

interface IitcIrisSheetTabBarProps {
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
}

export function IitcIrisSheetTabBar({
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
}: IitcIrisSheetTabBarProps): h.JSX.Element {
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
        onClick={onClick ?? ((): void => toggleSheet(sheet))}
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
        className={`iitc-iris-sheet-tab ${activePrimaryMenu === menu.id ? 'is-active' : ''}`}
        type="button"
        onClick={() => togglePrimaryMenu(menu.id)}
        disabled={menu.id === 'selected' && !hasSelectedObject}
        aria-pressed={activePrimaryMenu === menu.id}
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
      <div className="iitc-iris-sheet-tabbar-primary">
        {PRIMARY_MENU_REGISTRY.map(renderPrimaryMenuTab)}
      </div>
      <div className="iitc-iris-sheet-tabbar-secondary">
        {activePrimaryMenu === 'map' && (
          <>
            {MAP_MENU_SHEET_REGISTRY.map((entry) =>
              entry.id === 'missions'
                ? renderSheetTab(
                    entry.id,
                    entry.label,
                    () => toggleMissionsSheet('view'),
                    activeSheet === 'missions' && missionsState.source !== 'portal'
                  )
                : renderSheetTab(entry.id, entry.label)
            )}
          </>
        )}
        {activePrimaryMenu === 'selected' && (
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
        {activePrimaryMenu === 'agent' && (
          <>
            {AGENT_MENU_SHEET_REGISTRY.map((entry) => renderSheetTab(entry.id, entry.label))}
          </>
        )}
        {activePrimaryMenu === 'comm' && (
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
        {activePrimaryMenu === 'system' && (
          <>
            {SYSTEM_MENU_SHEET_REGISTRY.map((entry) => renderSheetTab(entry.id, entry.label))}
          </>
        )}
      </div>
    </nav>
  );
}
