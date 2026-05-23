import { useStore, PlextParser, PlextData } from '@iris/core';
import { reportDomainError } from '../report-domain-error';

export function handlePlexts(data: PlextData, setLastPlextRequestTime: (time: number) => void): void {
  setLastPlextRequestTime(Date.now());
  const plexts = PlextParser.parse(data, {
    onError: (error) => reportDomainError('plexts', error, `messages: ${data.result?.length ?? 0}`),
  });
  if (plexts.length > 0) {
    useStore.getState().updatePlexts(plexts);
  }
}
