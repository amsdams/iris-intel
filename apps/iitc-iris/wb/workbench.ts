/// <reference types="vite/client" />
import { render, h } from 'preact';
import type { ComponentChildren, ComponentType } from 'preact';
import { useEffect, useErrorBoundary, useState } from 'preact/hooks';

import '../src/styles/tokens.css';
import '../src/styles/theme.css';
import '../src/styles/team-colors.css';
import '../src/styles/team-text-colors.css';

// Keep discovery automatic; previews still receive only generic props.
const modules = import.meta.glob<Record<string, unknown>>([
  '../src/ui/**/*.tsx',
  '!../src/ui/**/*.test.tsx',
], { eager: true });

const registry = new Map<string, ComponentType<Record<string, unknown>>>();
for (const [filePath, mod] of Object.entries(modules)) {
  for (const [exportName, exported] of Object.entries(mod)) {
    if (typeof exported !== 'function') continue;
    const name = exportName === 'default'
      ? filePath.split('/').pop()?.replace('.tsx', '') ?? filePath
      : exportName;
    // Preserve both entries if two modules use the same export name.
    const label = registry.has(name) ? `${name} (${filePath})` : name;
    registry.set(label, exported as ComponentType<Record<string, unknown>>);
  }
}
const componentNames = [...registry.keys()].sort((a, b) => a.localeCompare(b));

function selectionFromUrl(): string {
  const name = new URL(window.location.href).searchParams.get('component');
  return name && registry.has(name) ? name : componentNames[0] ?? '';
}

interface PreviewProps {
  selected: string;
  disabled: boolean;
  sampleText: string;
}

function Preview({ selected, disabled, sampleText }: PreviewProps): ComponentChildren {
  const boundary = useErrorBoundary();
  const error: unknown = boundary[0];
  const resetError = boundary[1];
  if (error) {
    return h('div', { class: 'wb-error', role: 'alert' },
      h('strong', {}, 'This component could not render.'),
      h('p', {}, 'It may need props that this automatic preview does not provide.'),
      h('pre', {}, error instanceof Error ? error.message : String(error)),
      h('button', { type: 'button', class: 'wb-button', onClick: resetError }, 'Retry preview'),
    );
  }

  const SelectedComponent = registry.get(selected);
  return SelectedComponent
    ? h(SelectedComponent, {
      title: `${selected} Preview`,
      placeholder: `Type into ${selected}...`,
      disabled,
      onClick: () => window.alert(`${selected} clicked!`),
    }, sampleText)
    : h('p', {}, 'No UI components found.');
}

function DynamicWorkbench(): ComponentChildren {
  const [selected, setSelected] = useState(selectionFromUrl);
  const [disabled, setDisabled] = useState(false);
  const [sampleText, setSampleText] = useState('Sample Label');
  const [narrow, setNarrow] = useState(false);

  useEffect((): (() => void) => {
    const onPopState = (): void => setSelected(selectionFromUrl());
    window.addEventListener('popstate', onPopState);
    // Give the initial/default selection a shareable URL too.
    const url = new URL(window.location.href);
    const initialSelection = selectionFromUrl();
    if (initialSelection) url.searchParams.set('component', initialSelection);
    window.history.replaceState(null, '', url);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function selectComponent(name: string): void {
    if (name === selected) return;
    const url = new URL(window.location.href);
    url.searchParams.set('component', name);
    window.history.pushState(null, '', url);
    setSelected(name);
  }

  return h('div', { class: 'wb-shell' },
    h('aside', { class: 'wb-sidebar' },
      h('h1', { class: 'wb-heading' }, `UI Components (${componentNames.length})`),
      h('nav', { class: 'wb-navigation', 'aria-label': 'UI components' },
        h('ul', { class: 'wb-list' }, componentNames.map((name) =>
          h('li', { key: name },
            h('button', {
              type: 'button',
              class: 'wb-component-button',
              'aria-current': selected === name ? 'page' : undefined,
              onClick: () => selectComponent(name),
            }, name),
          ),
        )),
      ),
    ),
    h('main', { class: 'wb-main' },
      h('header', { class: 'wb-toolbar' },
        h('h2', { class: 'wb-title' }, selected || 'Component preview'),
        h('label', { class: 'wb-control-label' },
          h('input', {
            type: 'checkbox',
            checked: disabled,
            onChange: (event: Event) => setDisabled((event.currentTarget as HTMLInputElement).checked),
          }),
          'Disabled',
        ),
        h('label', { class: 'wb-control-label' }, 'Sample text',
          h('input', {
            class: 'wb-text-input',
            type: 'text',
            value: sampleText,
            onInput: (event: Event) => setSampleText((event.currentTarget as HTMLInputElement).value),
          }),
        ),
        h('button', {
          type: 'button',
          class: 'wb-button',
          'aria-pressed': narrow,
          onClick: () => setNarrow(!narrow),
        }, narrow ? 'Width: narrow (360px)' : 'Width: wide'),
      ),
      h('p', { class: 'wb-note' }, 'Automatic previews use generic props. Some components need app context or specific data.'),
      h('div', { class: 'wb-stage' },
        h('section', {
          class: `wb-preview${narrow ? ' wb-preview-narrow' : ''}`,
          'aria-label': `${selected || 'Component'} preview`,
        }, h(Preview, { key: selected, selected, disabled, sampleText })),
      ),
    ),
  );
}

const target = document.getElementById('render-target');
if (!target) throw new Error('Workbench mount element is missing.');
render(h(DynamicWorkbench, {}), target);
