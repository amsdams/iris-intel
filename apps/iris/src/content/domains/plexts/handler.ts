import { useStore, PlextParser, PlextData, type Plext } from '@iris/core';
import { reportDomainError } from '../report-domain-error';

export function handlePlexts(data: PlextData, options: {replace?: boolean} = {}): Plext[] {
  const plexts = PlextParser.parse(data, {
    onError: (error) => reportDomainError('plexts', error, `messages: ${data.result?.length ?? 0}`),
  });
  if (options.replace) {
    useStore.getState().replacePlexts(plexts);
  } else if (plexts.length > 0) {
    useStore.getState().updatePlexts(plexts);
  }
  return plexts;
}
