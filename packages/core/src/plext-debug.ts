import type {Plext} from './store';
import {extractPlextPortalRefreshHints} from './plext-refresh-hints';

export interface PlextDebugSnapshot {
  capturedAt: string;
  raw: string;
  parsed: string;
}

export interface BuildPlextDebugSnapshotOptions {
  title: string;
  maxAgeMs: number;
  maxRawChars?: number;
  capturedAt?: string;
}

function truncateDebugText(value: string, maxChars: number | undefined): string {
  if (maxChars === undefined || value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n... truncated ${value.length - maxChars} chars`;
}

function formatPlextForDebug(plext: Plext, index: number): string {
  const timestamp = Number.isFinite(plext.time) ? new Date(plext.time).toLocaleTimeString() : String(plext.time);
  const markup = plext.markup
    .map(([kind, value]) => {
      const label = value.name ?? value.plain ?? value.team ?? '-';
      const coords = typeof value.latE6 === 'number' && typeof value.lngE6 === 'number'
        ? ` @ ${value.latE6},${value.lngE6}`
        : '';
      const address = value.address ? ` (${value.address})` : '';
      return `${kind}:${label}${coords}${address}`;
    })
    .join(' | ');

  return [
    `${index + 1}. ${timestamp} ${plext.type} team=${plext.team} categories=${plext.categories} id=${plext.id}`,
    `text: ${plext.text}`,
    `markup: ${markup || '-'}`,
  ].join('\n');
}

export function buildPlextDebugSnapshot(
  data: unknown,
  params: unknown,
  plexts: Plext[],
  options: BuildPlextDebugSnapshotOptions,
): PlextDebugSnapshot {
  const capturedAt = options.capturedAt ?? new Date().toLocaleTimeString();
  const hints = extractPlextPortalRefreshHints(plexts, {maxAgeMs: options.maxAgeMs});
  const raw = truncateDebugText(JSON.stringify({capturedAt, params, data}, null, 2), options.maxRawChars);
  const parsedLines = [
    `${options.title} @ ${capturedAt}`,
    `plexts ${plexts.length}`,
    `refreshHints ${hints.length}`,
    ...hints.map((hint, index) => `hint ${index + 1}: ${hint.name ?? '-'} @ ${hint.latE6},${hint.lngE6} reason=${hint.reason} plext=${hint.plextId}`),
    '',
    ...plexts.map(formatPlextForDebug),
  ];
  return {capturedAt, raw, parsed: parsedLines.join('\n')};
}
