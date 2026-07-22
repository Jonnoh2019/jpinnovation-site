/* JP Innovation Hub legacy profile/menu guard.
   Passive only: final navigation ownership lives in profile-menu-navigation-polish.js. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260722-passive";
  document.documentElement.dataset.jpProfileCriticalNav = VERSION;

  function closeOnlyIfClearlyStale() {
    const menu = document.querySelector("#memberProfileMenu.member-profile-menu");
    const trigger = document.querySelector("#memberProfileButton");
    const open = !!menu && menu.classList.contains("open") && menu.getAttribute("aria-hidden") === "false";
    if (open) return;
    document.body.classList.remove("member-profile-menu-open", "profile-menu-open", "jp-profile-menu-open", "jp-menu-hard-lock", "menu-scroll-locked");
    document.documentElement.classList.remove("member-profile-menu-open", "profile-menu-open", "jp-profile-menu-open", "jp-menu-hard-lock", "menu-scroll-locked");
    [document.body, document.documentElement].forEach((node) => {
      node.style.removeProperty("overflow");
      node.style.removeProperty("pointer-events");
      node.style.removeProperty("touch-action");
    });
    if (menu) {
      menu.classList.remove("open", "active", "is-open", "show", "visible", "is-opening", "is-closing", "stuck", "cut-off");
      menu.setAttribute("aria-hidden", "true");
      menu.hidden = true;
      ["display", "visibility", "opacity", "pointer-events", "height", "min-height", "max-height", "overflow", "transform", "translate", "top", "left", "right", "bottom", "width", "max-width", "position", "clip", "clip-path", "contain"].forEach((prop) => menu.style.removeProperty(prop));
      try { menu.scrollTop = 0; } catch (_) {}
    }
    if (trigger) trigger.setAttribute("aria-expanded", "false");
    document.querySelectorAll(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,[data-profile-backdrop]").forEach((node) => node.remove());
  }

  function removeRecoveredAdminCard() {
    document.querySelectorAll("#viewMount .section-card, #viewMount section").forEach((card) => {
      const heading = card.querySelector("h2")?.textContent?.trim().toLowerCase() || "";
      if (heading === "admin page recovered") card.remove();
    });
  }

  function install() {
    closeOnlyIfClearlyStale();
    removeRecoveredAdminCard();
    window.addEventListener("pageshow", () => { closeOnlyIfClearlyStale(); removeRecoveredAdminCard(); }, true);
    window.addEventListener("popstate", () => { closeOnlyIfClearlyStale(); removeRecoveredAdminCard(); }, true);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") closeOnlyIfClearlyStale();
    }, true);
    new MutationObserver(removeRecoveredAdminCard).observe(document.body, { childList: true, subtree: true });
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
