/**
 * Injector content script — runs at document_start in isolated world.
 * Injects interceptor.js into the page's main world via a script tag,
 * since Firefox does not support content_scripts world: MAIN.
 */
(function () {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('src/content/interceptor.js');
    script.type = 'text/javascript';
    (document.head || document.documentElement).appendChild(script);
    script.addEventListener('load', () => script.remove());
})();