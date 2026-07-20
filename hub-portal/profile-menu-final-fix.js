/* JP Innovation profile menu final fix - emergency safe mode.
   The previous override caused black-screen regressions on mobile/PWA.
   Keep this file intentionally minimal so existing app.js/admin scripts can render normally. */
(() => {
  "use strict";
  const VERSION = "profile-menu-final-fix-20260720-safe1";

  function clearStaleMenuLocks() {
    document.documentElement.dataset.jpProfileMenuFinalFix = VERSION;
    document.documentElement.classList.remove("profile-menu-open", "member-profile-menu-open", "jp-profile-menu-open");
    document.body.classList.remove("profile-menu-open", "member-profile-menu-open", "jp-profile-menu-open", "menu-scroll-locked");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("position");
    document.body.style.removeProperty("top");
    document.body.style.removeProperty("width");
    document.body.style.removeProperty("pointer-events");
    document.querySelectorAll(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop").forEach((node) => node.remove());
  }

  function ensureMenuCanClose() {
    const menu = document.getElementById("memberProfileMenu");
    const button = document.getElementById("memberProfileButton");
    if (!menu || !button || button.dataset.jpSafeMenuBound === "1") return;
    button.dataset.jpSafeMenuBound = "1";
    button.addEventListener("click", () => {
      clearStaleMenuLocks();
      const isOpen = menu.getAttribute("aria-hidden") === "false" || menu.classList.contains("open") || menu.classList.contains("is-open");
      button.setAttribute("aria-expanded", isOpen ? "false" : "true");
      menu.setAttribute("aria-hidden", isOpen ? "true" : "false");
      menu.classList.toggle("open", !isOpen);
      menu.classList.toggle("is-open", !isOpen);
      if (!isOpen) menu.scrollTop = 0;
    }, { capture: true });
  }

  function install() {
    clearStaleMenuLocks();
    ensureMenuCanClose();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
  window.addEventListener("pageshow", install);
  window.addEventListener("popstate", clearStaleMenuLocks);
})();