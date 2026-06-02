import type {IitcIrisInventoryState} from './messages';

export function formatSubscriptionLabel(subscription: IitcIrisInventoryState['subscription']): string {
  if (!subscription || subscription.status === 'unknown') return 'C.O.R.E. unknown';
  if (subscription.status === 'loading') return 'checking C.O.R.E.';
  if (subscription.status === 'active') return 'C.O.R.E. active';
  if (subscription.status === 'inactive') return 'C.O.R.E. inactive';
  if (subscription.status === 'auth') return 'C.O.R.E. auth';
  return 'C.O.R.E. error';
}

export function formatSubscriptionBadge(subscription: IitcIrisInventoryState['subscription']): string {
  if (!subscription || subscription.status === 'unknown') return 'C.O.R.E. ?';
  if (subscription.status === 'loading') return 'C.O.R.E. ...';
  if (subscription.status === 'active') return 'C.O.R.E.';
  if (subscription.status === 'inactive') return 'no C.O.R.E.';
  return 'C.O.R.E. !';
}

export function getSubscriptionStatusClass(subscription: IitcIrisInventoryState['subscription']): string {
  if (!subscription || subscription.status === 'unknown') return 'is-unknown';
  if (subscription.status === 'active') return 'is-active';
  if (subscription.status === 'loading') return 'is-loading';
  return 'is-inactive';
}

export function getPanelStatusClass(status: string | undefined): string {
  if (status === 'loading') return 'is-loading';
  if (status === 'ready') return 'is-ready';
  if (status === 'empty' || status === 'idle' || status === 'waiting') return 'is-muted';
  if (status === 'error' || status === 'auth') return 'is-warning';
  return '';
}

export function getAuthErrorMessage(status?: string, error?: string): string {
  if (status === 'auth' || /missing csrftoken|missing Intel version|waiting for Intel version|login html/i.test(error ?? '')) {
    return 'Intel login required.';
  }
  return error ?? '';
}
