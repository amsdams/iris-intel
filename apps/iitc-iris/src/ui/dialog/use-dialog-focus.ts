import type {RefObject} from 'preact';
import {useLayoutEffect} from 'preact/hooks';

/** Keep modal focus inside its controls and restore the connected trigger when it closes. */
export function useDialogFocus(ref: RefObject<HTMLDivElement>, enabled: boolean): void {
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!enabled || !dialog) return undefined;
    const previous = document.activeElement;
    const siblings = [...(dialog.parentElement?.children ?? [])]
      .filter((node): node is HTMLElement => node !== dialog && node instanceof HTMLElement)
      .map(node => ({node, inert: node.inert}));
    for (const {node} of siblings) node.inert = true;
    const controls = (): HTMLElement[] => [...dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
    )].filter(node => node.getClientRects().length > 0);
    const focusFirst = (): void => {(controls()[0] ?? dialog).focus({preventScroll: true});};
    const keepFocus = (event: FocusEvent): void => {if (!dialog.contains(event.target as Node)) focusFirst();};
    const tab = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length || (event.shiftKey ? document.activeElement === items[0] : document.activeElement === items.at(-1))) {
        event.preventDefault();
        (event.shiftKey ? items.at(-1) ?? dialog : items[0] ?? dialog).focus();
      }
    };
    focusFirst();
    dialog.addEventListener('keydown', tab);
    document.addEventListener('focusin', keepFocus);
    return (): void => {
      dialog.removeEventListener('keydown', tab);
      document.removeEventListener('focusin', keepFocus);
      for (const {node, inert} of siblings) node.inert = inert;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({preventScroll: true});
    };
  }, [ref, enabled]);
}
