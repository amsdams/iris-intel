import {useEffect} from 'preact/hooks';

/** Move sheets/navigation above the visual viewport's occluded area without resizing the map. */
export function useShellViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const update = (): void => {
      // Pinch zoom keeps the browser's own viewport translation.
      const unzoomed = !viewport || Math.abs(viewport.scale - 1) < 0.01;
      const height = unzoomed ? viewport?.height ?? window.innerHeight : window.innerHeight;
      const top = unzoomed ? viewport?.offsetTop ?? 0 : 0;
      root.style.setProperty('--iitc-iris-viewport-height', `${height}px`);
      root.style.setProperty('--iitc-iris-viewport-top', `${top}px`);
      root.style.setProperty('--iitc-iris-viewport-bottom', `${Math.max(0, window.innerHeight - height - top)}px`);
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const field = document.activeElement;
        if (!(field instanceof HTMLElement) || !field.matches('input, textarea, select') || !field.closest('.iitc-iris-shell')) return;
        const rect = field.getBoundingClientRect();
        if (rect.bottom > top + height - 8 || rect.top < top + 8) field.scrollIntoView({block: 'nearest', inline: 'nearest'});
      });
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    return (): void => {
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      root.style.removeProperty('--iitc-iris-viewport-height');
      root.style.removeProperty('--iitc-iris-viewport-top');
      root.style.removeProperty('--iitc-iris-viewport-bottom');
    };
  }, []);
}
