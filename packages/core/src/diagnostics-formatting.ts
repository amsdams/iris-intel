export interface DiagnosticsEnvironment {
  browser: string;
  platform: string;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  touchPoints?: number;
  pointer?: string;
  hover?: string;
}

export function formatDiagnosticMs(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value)}ms` : '-';
}

export function formatDiagnosticCount(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '-';
}

export function formatOptionalDiagnosticNumber(
  value: number | null | undefined,
  formatter: (value: number) => string,
): string {
  return typeof value === 'number' && Number.isFinite(value) ? formatter(value) : 'n/a';
}

export function formatOptionalDiagnosticMs(value: number | null | undefined): string {
  return formatOptionalDiagnosticNumber(value, formatDiagnosticMs);
}

export function getBrowserLabel(userAgent: string): string {
  const edge = userAgent.match(/Edg\/([\d.]+)/);
  if (edge) return `Edge ${edge[1]}`;
  const firefox = userAgent.match(/Firefox\/([\d.]+)/);
  if (firefox) return `Firefox/${firefox[1]}`;
  const chrome = userAgent.match(/Chrome\/([\d.]+)/);
  if (chrome) return `Chrome/${chrome[1]}`;
  const safari = userAgent.match(/Version\/([\d.]+).*Safari/);
  if (safari) return `Safari/${safari[1]}`;
  return 'Unknown';
}

export function buildDiagnosticsEnvironmentSummary(
  label: string,
  environment: DiagnosticsEnvironment,
  extras: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const parts = [
    label,
    `browser ${environment.browser}`,
    `platform ${environment.platform || '-'}`,
    `viewport ${environment.viewportWidth}x${environment.viewportHeight}`,
    `dpr ${Number.isFinite(environment.devicePixelRatio) ? environment.devicePixelRatio.toFixed(2) : '-'}`,
  ];

  if (typeof environment.touchPoints === 'number') parts.push(`touch ${environment.touchPoints}`);
  if (environment.pointer) parts.push(`pointer ${environment.pointer}`);
  if (environment.hover) parts.push(`hover ${environment.hover}`);

  Object.entries(extras).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') parts.push(`${key} ${String(value)}`);
  });

  return parts.join(' ');
}
