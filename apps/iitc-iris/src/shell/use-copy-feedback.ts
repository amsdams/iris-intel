import {useEffect, useMemo, useState} from 'preact/hooks';
import {createCopyFeedbackOwner, type CopyFeedbackUpdate} from './feedback';

/** Own one feedback area's operations and timer cleanup for its component lifetime. */
export function useCopyFeedbackStatus(): readonly [string, (status: CopyFeedbackUpdate) => void] {
  const [status, publish] = useState('');
  const owner = useMemo(() => createCopyFeedbackOwner(publish), [publish]);
  useEffect((): (() => void) => owner.dispose, [owner]);
  return [status, owner.setStatus];
}
