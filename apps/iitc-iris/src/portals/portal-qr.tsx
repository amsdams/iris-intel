import {h} from 'preact';
import {useMemo} from 'preact/hooks';
import qrcode from 'qrcode-generator';

/** Encode locally; the four-module quiet zone is part of the rendered image. */
export function createPortalQr(payload: string): {size: number; path: string; qr: ReturnType<typeof qrcode>} {
  const qr = qrcode(0, 'M');
  qr.addData(payload);
  qr.make();
  const size = qr.getModuleCount();
  const cells: string[] = [];
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    if (qr.isDark(row, col)) cells.push(`M${col + 4} ${row + 4}h1v1h-1z`);
  }
  return {size: size + 8, path: cells.join(''), qr};
}

export function PortalQr({payload}: {payload: string}): h.JSX.Element {
  const code = useMemo(() => createPortalQr(payload), [payload]);
  return <figure className="iitc-iris-portal-qr">
    <svg viewBox={`0 0 ${code.size} ${code.size}`} role="img" aria-label="Portal location QR code" shape-rendering="crispEdges">
      <rect width={code.size} height={code.size} fill="white" />
      <path d={code.path} fill="black" />
    </svg>
    <figcaption>{payload}</figcaption>
  </figure>;
}
