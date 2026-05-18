import { useStore } from '@iris/core';

export function reportDomainError(domain: string, error: unknown, detail?: string): void {
  const message = error instanceof Error ? error.message : String(error);
  useStore.getState().addDomainError({
    domain,
    message,
    detail,
  });
}
