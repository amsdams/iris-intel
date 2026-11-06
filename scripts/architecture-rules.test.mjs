import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Linter} from 'eslint';
import tseslint from 'typescript-eslint';
import {importBoundaries} from './architecture-rules.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = 'apps/iitc-iris/src/';
const core = 'packages/iitc-core/src/';
const linter = new Linter();

function verify(filename, code) {
  return linter.verify(code, [{files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {parser: tseslint.parser},
    plugins: {architecture: {rules: {'import-boundaries': importBoundaries}}},
    rules: {'architecture/import-boundaries': 'error'},
  }], {filename: path.join(root, filename)});
}

test('core stays independent through imports, exports, dynamic imports, require and import types', () => {
  for (const code of [
    "import L from 'leaflet';", "export * from 'preact';", "void import('maplibre-gl');",
    "const app = require('../../../apps/iitc-iris/src/messages');",
    "type App = import('../../../apps/iitc-iris/src/messages').IitcIrisMessage;",
    "import App = require('../../../apps/iitc-iris/src/messages');",
  ]) {
    const errors = verify(`${core}example.ts`, code);
    assert.equal(errors.length, 1, code);
    assert.equal(errors[0].ruleId, 'architecture/import-boundaries', code);
  }
  assert.deepEqual(verify(`${core}example.ts`, "export * from './comm'; import type {IitcBounds} from '@iris/iitc-core';"), []);
  assert.deepEqual(verify(`${core}example.test.ts`, "import {it} from 'vitest';"), []);
  assert.equal(verify(`${core}example.test.ts`, "import L from 'leaflet';").length, 1);
});

test('shared UI primitives cannot reach feature or platform modules, even through re-exports', () => {
  for (const code of ["import {x} from '../../map/search/search-runtime';",
    "export {x} from '../../platform/storage';", "type X = import('../../messages').IitcIrisMessage;"]) {
    assert.equal(verify(`${app}ui/button/example.ts`, code)[0]?.ruleId, 'architecture/import-boundaries');
  }
  assert.deepEqual(verify(`${app}ui/button/example.tsx`, "import {h} from 'preact'; import {Button} from '../button';"), []);
  assert.deepEqual(verify(`${app}ui/button/example.test.tsx`, "import {it} from 'vitest'; import {act} from 'preact/test-utils';"), []);
});

test('runtime owners stay within their feature and explicit page composition', () => {
  const code = "import {createSearchRuntime} from './map/search/search-runtime';";
  assert.equal(verify(`${app}content.tsx`, code)[0]?.ruleId, 'architecture/import-boundaries');
  assert.deepEqual(verify(`${app}page-map-runtime.ts`, code), []);
  assert.deepEqual(verify(`${app}map/search/helper.ts`, "import {createSearchRuntime} from './search-runtime';"), []);
  assert.equal(verify(`${app}map/missions/helper.ts`, "export * from '../search/search-runtime';").length, 1);
  for (const module of ['entities/portal-label-overlays', 'map-refresh-session', 'map-entity-transport']) {
    assert.equal(verify(`${app}comm/helper.ts`, `void import('../map/${module}');`).length, 1);
  }
  assert.equal(verify(`${app}content.tsx`, "void import('./map/../page-map-runtime');").length, 1);
});

test('diagnostic/settings adapters have narrow type-only exceptions; tests may exercise owners', () => {
  for (const code of ["import type {createSearchRuntime} from './search/search-runtime';",
    "import {type createSearchRuntime} from './search/search-runtime';",
    "type Runtime = typeof import('./search/search-runtime').createSearchRuntime;"]) {
    assert.deepEqual(verify(`${app}map/map-diagnostics.ts`, code), []);
  }
  assert.equal(verify(`${app}map/map-diagnostics.ts`, "import {createSearchRuntime} from './search/search-runtime';").length, 1);
  assert.deepEqual(verify(`${app}page-map-runtime.test.ts`, "void import('./page-map-runtime');"), []);
  assert.deepEqual(verify(`${app}comm/helper.ts`, "import type {IitcIrisMapLifetime} from '../map/map-runtime-lifetime';"), []);
});
