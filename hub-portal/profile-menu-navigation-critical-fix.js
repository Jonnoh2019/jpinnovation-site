/* JP Innovation Hub legacy profile/menu guard.
   Passive guard plus viewport-root repair for the profile pop-out. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260722-body-root";
  document.documentElement.dataset.jpProfileCriticalNav = VERSION;

  function ensureMenuAtBodyRoot() {
    const menu = document.querySelector("#memberProfileMenu.member-profile-menu");
    if (menu && menu.parentElement !== document.body) {
      document.body.appendChild(menu);
      menu.dataset.jpBodyRoot = VERSION;
    }
    return menu;
  }

  function visibleVh() {
    return Math.max(420, Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720));
  }

  function setMenuVars() {
    const header = document.querySelector(".workspace-header") || document.querySelector("header");
    const rect = header?.getBoundingClientRect?.();
    const top = rect ? Math.round(rect.bottom + 8) : 96;
    const safeTop = Math.max(84, Math.min(top, visibleVh() - 280));
    document.documentElement.style.setProperty("--jp-visible-vh", `${visibleVh()}px`);
    document.documentElement.style.setProperty("--jp-profile-menu-top", `${safeTop}px`);
  }

  function installStyles() {
    let style = document.getElementById("jpProfileMenuBodyRootGuardStyles");
    if (!style) {
      style = document.createElement("style");
      style.id = "jpProfileMenuBodyRootGuardStyles";
      document.head.appendChild(style);
    }
    style.textContent = `
      #memberProfileMenu.member-profile-menu.open{
        position:fixed!important;
        top:var(--jp-profile-menu-top,96px)!important;
        bottom:calc(14px + env(safe-area-inset-bottom))!important;
        left:max(14px,env(safe-area-inset-left))!important;
        right:max(14px,env(safe-area-inset-right))!important;
        height:calc(var(--jp-visible-vh,100dvh) - var(--jp-profile-menu-top,96px) - 14px - env(safe-area-inset-bottom))!important;
        min-height:260px!important;
        max-height:calc(var(--jp-visible-vh,100dvh) - var(--jp-profile-menu-top,96px) - 14px - env(safe-area-inset-bottom))!important;
        overflow-y:auto!important;
        overflow-x:hidden!important;
        z-index:2147483000!important;
        transform:none!important;
        translate:none!important;
        clip-path:none!important;
        contain:none!important;
      }
      @media(min-width:761px){#memberProfileMenu.member-profile-menu.open{left:auto!important;right:18px!important;width:min(390px,calc(100vw - 36px))!important;max-width:calc(100vw - 36px)!important}}
    `;
  }

  function closeOnlyIfClearlyStale() {
    const menu = ensureMenuAtBodyRoot();
    const trigger = document.querySelector("#memberProfileButton");
    const open = !!menu && menu.classList.contains("open") && menu.getAttribute("aria-hidden") === "false";
    setMenuVars();
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
    installStyles();
    ensureMenuAtBodyRoot();
    closeOnlyIfClearlyStale();
    removeRecoveredAdminCard();
    window.addEventListener("pageshow", () => { ensureMenuAtBodyRoot(); closeOnlyIfClearlyStale(); removeRecoveredAdminCard(); }, true);
    window.addEventListener("popstate", () => { closeOnlyIfClearlyStale(); removeRecoveredAdminCard(); }, true);
    window.addEventListener("resize", setMenuVars, true);
    window.visualViewport?.addEventListener("resize", setMenuVars);
    window.visualViewport?.addEventListener("scroll", setMenuVars);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") closeOnlyIfClearlyStale();
    }, true);
    document.addEventListener("pointerup", () => { ensureMenuAtBodyRoot(); setMenuVars(); }, true);
    new MutationObserver(() => { ensureMenuAtBodyRoot(); removeRecoveredAdminCard(); }).observe(document.body, { childList: true, subtree: true });
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
