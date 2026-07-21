/* JP Innovation safety wrapper: prevents unload handlers from freezing the Hub. */
(() => {
  "use strict";
  const VERSION = "beforeunload-safety-20260721";
  if (window.__jpBeforeUnloadSafetyInstalled) return;
  window.__jpBeforeUnloadSafetyInstalled = VERSION;

  const nativeAddEventListener = window.addEventListener.bind(window);
  const nativeRemoveEventListener = window.removeEventListener.bind(window);
  const wrapped = new WeakMap();

  function wrapBeforeUnload(listener) {
    if (typeof listener !== "function") return listener;
    if (wrapped.has(listener)) return wrapped.get(listener);
    const safe = function jpSafeBeforeUnload(event) {
      try {
        return listener.call(this, event);
      } catch (error) {
        console.warn(`[${VERSION}] blocked unload handler error`, error);
        return undefined;
      }
    };
    wrapped.set(listener, safe);
    return safe;
  }

  window.addEventListener = function jpSafeAddEventListener(type, listener, options) {
    return nativeAddEventListener(type, type === "beforeunload" ? wrapBeforeUnload(listener) : listener, options);
  };

  window.removeEventListener = function jpSafeRemoveEventListener(type, listener, options) {
    return nativeRemoveEventListener(type, type === "beforeunload" && wrapped.has(listener) ? wrapped.get(listener) : listener, options);
  };

  document.documentElement.dataset.jpBeforeUnloadSafety = VERSION;
  console.info(`[${VERSION}] installed`);
})();
