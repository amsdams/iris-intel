import {h} from 'preact';
import {useState} from 'preact/hooks';
import {DEFAULT_IITC_COMM_FILTERS, normalizeIitcCommFilters, type IitcCommFilters} from '@iris/iitc-core';
import '../../ui/shared/input-surface.css';
import '../../ui/shared/section-summary.css';
import {ControlRow} from '../../ui/control-row';
import {StatusText} from '../../ui/status-text';
import {Badge} from '../../ui/badge';
import {Section} from '../../ui/section';
import {TextInput} from '../../ui/text-input';
import {ActionButton} from '../../ui/action-button';

const STORAGE_KEY = 'iitc-iris:comm-views:v1';
interface SavedView {name: string; filters: IitcCommFilters}
interface Preferences {filters: IitcCommFilters; saved: SavedView[]}
function loadPreferences(): Preferences {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as {filters?: unknown; saved?: unknown};
    const saved = Array.isArray(value.saved) ? value.saved.flatMap((item: unknown): SavedView[] => {
      if (!item || typeof item !== 'object') return [];
      const entry = item as {name?: unknown; filters?: unknown};
      return typeof entry.name === 'string' && entry.name.trim() ? [{name: entry.name.trim().slice(0, 40), filters: normalizeIitcCommFilters(entry.filters)}] : [];
    }).slice(0, 8) : [];
    return {filters: normalizeIitcCommFilters(value.filters), saved};
  } catch { return {filters: {...DEFAULT_IITC_COMM_FILTERS}, saved: []}; }
}

export function useCommFilters(): {
  filters: IitcCommFilters; saved: SavedView[];
  change: (next: IitcCommFilters) => void; save: (name: string) => void; remove: (name: string) => void;
} {
  const [preferences, setPreferences] = useState(loadPreferences);
  const updatePreferences = (update: (current: Preferences) => Preferences): void => setPreferences(current => {
    const next = update(current);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Storage is optional. */ }
    return next;
  });
  return {...preferences,
    change: (next): void => updatePreferences(current => ({...current, filters: normalizeIitcCommFilters(next)})),
    save: (name): void => {
      const clean = name.trim().slice(0, 40);
      if (clean) updatePreferences(current => ({...current, saved: [...current.saved.filter(view => view.name !== clean),
        {name: clean, filters: {...current.filters}}].slice(-8)}));
    },
    remove: name => updatePreferences(current => ({...current, saved: current.saved.filter(view => view.name !== name)})),
  };
}

export function CommFilters({filters, saved, change, save, remove, shown, total}: ReturnType<typeof useCommFilters> & {shown: number; total: number}): h.JSX.Element {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState('');
  const [feedback, setFeedback] = useState('');
  const active = Object.keys(DEFAULT_IITC_COMM_FILTERS).filter(key =>
    filters[key as keyof IitcCommFilters].trim() !== DEFAULT_IITC_COMM_FILTERS[key as keyof IitcCommFilters]).length;
  const advancedActive = Number(filters.action !== 'all') + Number(Boolean(filters.agent.trim())) + Number(Boolean(filters.portal.trim()));
  const update = (key: keyof IitcCommFilters, value: string): void => {
    setSelected('');
    setFeedback('');
    change(normalizeIitcCommFilters({...filters, [key]: value}));
  };
  return <details className="iitc-iris-comm-filters">
    <summary className="iitc-iris-section-summary">Filters <Badge>{shown} / {total}</Badge>{active > 0 && <span>· {active} active</span>}</summary>
    <Section className="iitc-iris-comm-filter-content">
      <p><StatusText>Search and filters use loaded messages only.</StatusText></p>
      <label className="iitc-iris-comm-filter-search">Search<TextInput className="iitc-iris-input-surface" type="search"
        aria-label="Search loaded COMM" placeholder="Search loaded messages…" value={filters.query}
        onInput={event => update('query', event.currentTarget.value)} /></label>
      <div className="iitc-iris-comm-filter-grid">
        <label>Show<select className="iitc-iris-control iitc-iris-input-surface" aria-label="COMM message kind" value={filters.kind} onChange={event => update('kind', event.currentTarget.value)}>
          <option value="all">All messages</option><option value="chat">Human chat</option><option value="activity">Activity</option>
        </select></label>
        <label>Faction<select className="iitc-iris-control iitc-iris-input-surface" aria-label="COMM faction" value={filters.team} onChange={event => update('team', event.currentTarget.value)}>
          <option value="all">All factions</option><option value="R">Resistance</option><option value="E">Enlightened</option><option value="M">Machina</option><option value="N">Unknown / neutral</option>
        </select></label>
      </div>
      <details className="iitc-iris-comm-filter-advanced">
        <summary className="iitc-iris-section-summary">More filters{advancedActive > 0 && <Badge>{advancedActive} active</Badge>}</summary>
        <div className="iitc-iris-comm-filter-grid">
          <label>Action<select className="iitc-iris-control iitc-iris-input-surface" aria-label="COMM action" value={filters.action} onChange={event => update('action', event.currentTarget.value)}>
            {Object.entries({all: 'All actions', chat: 'Chat', capture: 'Captures', deploy: 'Deployments', destroy: 'Destruction', link: 'Links', field: 'Fields', other: 'Other'})
              .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <label>Agent<TextInput className="iitc-iris-input-surface" aria-label="Filter COMM agent" value={filters.agent} onInput={event => update('agent', event.currentTarget.value)} /></label>
          <label className="iitc-iris-comm-filter-wide">Portal<TextInput className="iitc-iris-input-surface" aria-label="Filter COMM portal" value={filters.portal} onInput={event => update('portal', event.currentTarget.value)} /></label>
        </div>
      </details>
      <details className="iitc-iris-comm-saved-views">
        <summary className="iitc-iris-section-summary">Saved views <Badge>{saved.length} / 8</Badge></summary>
        <div className="iitc-iris-comm-filter-grid">
          <label className="iitc-iris-comm-filter-wide">Saved views<select className="iitc-iris-control iitc-iris-input-surface" aria-label="Saved COMM view" value={selected} onChange={event => {
            const name = event.currentTarget.value;
            setSelected(name);
            const view = saved.find(view => view.name === name);
            if (view) {change(view.filters); setFeedback(`Applied “${name}”.`);}
          }}><option value="">Choose a view</option>{saved.map(view => <option key={view.name} value={view.name}>{view.name}</option>)}</select></label>
          <label className="iitc-iris-comm-filter-wide">View name<TextInput className="iitc-iris-input-surface" aria-label="COMM view name" placeholder="Name these filters…" maxLength={40} value={name} onInput={event => setName(event.currentTarget.value)} /></label>
        </div>
        <ControlRow>
          <ActionButton disabled={!name.trim()} onClick={() => {
            const clean = name.trim().slice(0, 40);
            save(clean); setName(''); setSelected(clean); setFeedback(`Saved “${clean}”.`);
          }}>Save view</ActionButton>
          <ActionButton disabled={!saved.some(view => view.name === selected)} onClick={() => {
            remove(selected); setSelected(''); setFeedback(`Deleted “${selected}”.`);
          }}>Delete view</ActionButton>
        </ControlRow>
        <StatusText>Up to 8 views; saving a ninth replaces the oldest.</StatusText>
      </details>
      <ControlRow>
        <ActionButton disabled={active === 0} onClick={() => {
          change({...DEFAULT_IITC_COMM_FILTERS}); setSelected(''); setFeedback('Filters reset.');
        }}>Reset filters</ActionButton>
      </ControlRow>
      {feedback && <p><StatusText role="status">{feedback}</StatusText></p>}
    </Section>
  </details>;
}
