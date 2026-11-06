import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = 'apps/iitc-iris/src/';
const core = 'packages/iitc-core/src/';
const isTest = filename => /\.(test|spec)\.[jt]sx?$/.test(filename);
const isWithin = (filename, directory) => filename.startsWith(directory);
const withoutExtension = filename => filename.replace(/\.[cm]?[jt]sx?$/, '');

function violation(filename, specifier, typeOnly) {
  const source = path.relative(root, filename).split(path.sep).join('/');
  const target = specifier.startsWith('.') || path.isAbsolute(specifier)
    ? path.relative(root, path.resolve(path.dirname(filename), specifier)).split(path.sep).join('/')
    : undefined;
  if (isWithin(source, core)) {
    if (target ? !isWithin(target, core) : !(
      specifier === '@iris/iitc-core' || specifier.startsWith('@iris/iitc-core/') ||
      (isTest(source) && specifier === 'vitest')
    )) return 'Core depends only on core modules; app, UI and platform dependencies belong in the app.';
  }
  if (isWithin(source, `${app}ui/`)) {
    if (target ? !isWithin(target, `${app}ui/`) : !(
      specifier === 'preact' || specifier.startsWith('preact/') || (isTest(source) && specifier === 'vitest')
    )) return 'Shared UI primitives depend only on UI primitives and Preact; pass feature data through props.';
  }
  if (!target || !isWithin(target, app) || isTest(source)) return;
  const module = withoutExtension(target);
  if (!/(?:-runtime|\/map-request|\/map-refresh-session|\/map-entity-transport|\/map-renderer|\/portal-label-overlays|\/portal-decoration-overlays)$/.test(module)) return;
  if (source === `${app}page-map-runtime.ts`) return;
  if (module !== `${app}page-map-runtime` && path.posix.dirname(source) === path.posix.dirname(target)) return;
  // Diagnostics and map settings describe injected owners without importing them at runtime.
  if (typeOnly && [`${app}map/map-diagnostics.ts`, `${app}map/map-settings-runtime.ts`].includes(source)) return;
  return 'Runtime owners are private to their feature and page composition; communicate through typed contracts/callbacks.';
}

/** Local ESLint rule: resolve relative paths so ../ traversal cannot bypass a boundary. */
export const importBoundaries = {
  meta: {type: 'problem', schema: [], messages: {boundary: '{{reason}}'}},
  create(context) {
    const check = (node, source, typeOnly = false) => {
      if (!source || typeof source.value !== 'string') return;
      const reason = violation(context.filename, source.value, typeOnly);
      if (reason) context.report({node, messageId: 'boundary', data: {reason}});
    };
    const declaration = node => check(node, node.source,
      node.importKind === 'type' || node.exportKind === 'type' ||
      (node.specifiers?.length > 0 && node.specifiers.every(specifier => specifier.importKind === 'type' || specifier.exportKind === 'type')));
    return {
      ImportDeclaration: declaration,
      ExportNamedDeclaration: declaration,
      ExportAllDeclaration: declaration,
      ImportExpression: node => check(node, node.source),
      TSImportType: node => check(node, node.argument.type === 'TSLiteralType' ? node.argument.literal : node.argument, true),
      CallExpression: node => {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require') check(node, node.arguments[0]);
      },
      TSImportEqualsDeclaration: node => {
        if (node.moduleReference.type === 'TSExternalModuleReference') check(node, node.moduleReference.expression);
      },
    };
  },
};
