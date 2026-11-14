import {h} from 'preact';
import {useEffect, useState} from 'preact/hooks';
import {StatusText} from './status-text';

/** Display an existing timestamp; this component never requests data. */
export function DataFreshness({receivedAt, label = 'Updated'}: {receivedAt?: number; label?: string}): h.JSX.Element | null {
  const [now, setNow] = useState(Date.now);
  const valid = receivedAt !== undefined && Number.isFinite(receivedAt) && receivedAt > 0 && !Number.isNaN(new Date(receivedAt).getTime());
  useEffect(() => {
    if (!valid) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return (): void => window.clearInterval(timer);
  }, [valid, receivedAt]);
  if (!valid || receivedAt === undefined) return null;
  const minutes = Math.max(0, Math.floor((now - receivedAt) / 60_000));
  const age = minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago`
    : minutes < 1440 ? `${Math.floor(minutes / 60)} h ago` : `${Math.floor(minutes / 1440)} d ago`;
  return <StatusText><time dateTime={new Date(receivedAt).toISOString()} title={new Date(receivedAt).toLocaleString()}>{label} {age}</time></StatusText>;
}
