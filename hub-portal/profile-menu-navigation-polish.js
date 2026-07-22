/* JP Innovation Hub profile menu polish: removes temporary admin notice, repairs menu reopening, supports native back cleanup. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-polish-20260722-b";
  if (window.__jpProfileMenuNavigationPolish === VERSION) return;
  window.__jpProfileMenuNavigationPolish = VERSION;
  document.documentElement.dataset.jpProfileMenuNavigationPolish = VERSION;

  let wasOpen = false;
  let closingHard = false;
  let lastRepair = 0;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function visibleViewportHeight() {
    return Math.max(420, Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720));
  }

  function visibleViewportOffsetTop() {
    return Math.max(0, Math.floor(window.visualViewport?.offsetTop || 0));
  }

  function profileMenu() {
    return q("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu");
  }

  function profileTrigger() {
    return q("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]");
  }

  function isOpen(menu) {
    if (!menu) return false;
    const trigger = profileTrigger();
    return menu.classList.contains("open") ||
      menu.getAttribute("aria-hidden") === "false" ||
      document.body.classList.contains("member-profile-menu-open") ||
      document.body.classList.contains("profile-menu-open") ||
      trigger?.getAttribute("aria-expanded") === "true";
  }

  function restorePageInteraction() {
    document.body.classList.remove("member-profile-menu-open", "profile-menu-open", "jp-menu-hard-lock", "menu-scroll-locked");
    document.documentElement.classList.remove("member-profile-menu-open", "profile-menu-open", "jp-menu-hard-lock", "menu-scroll-locked");
    [document.body, document.documentElement].forEach((node) => {
      node.style.removeProperty("overflow");
      node.style.removeProperty("pointer-events");
      node.style.removeProperty("touch-action");
    });
  }

  function closeMenuHard() {
    const menu = profileMenu();
    closingHard = true;
    try {
      if (menu) {
        menu.classList.remove("open", "active", "show", "visible", "is-open", "is-opening", "is-closing");
        menu.setAttribute("aria-hidden", "true");
        menu.hidden = true;
        Object.assign(menu.style, {
          display: "none",
          visibility: "hidden",
          opacity: "0",
          pointerEvents: "none",
          height: "0px",
          maxHeight: "0px",
          overflow: "hidden",
          transform: "none",
          translate: "none",
          clipPath: "none"
        });
        try { menu.scrollTop = 0; } catch (_) {}
      }
      qa(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,[data-profile-backdrop]").forEach((node) => node.remove());
      restorePageInteraction();
      profileTrigger()?.setAttribute("aria-expanded", "false");
      if (document.activeElement?.closest?.("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu")) {
        try { document.activeElement.blur(); } catch (_) {}
      }
      wasOpen = false;
    } finally {
      setTimeout(() => { closingHard = false; }, 40);
    }
  }

  function repairOpenMenu(force = false) {
    const now = Date.now();
    if (!force && now - lastRepair < 80) return;
    lastRepair = now;
    const menu = profileMenu();
    if (!menu || closingHard) return;
    const open = isOpen(menu);
    if (!open) {
      wasOpen = false;
      return;
    }

    const mobile = window.innerWidth <= 760;
    const top = mobile ? Math.max(82, visibleViewportOffsetTop() + 82) : Math.max(82, Math.min(112, Math.round(window.innerHeight * 0.14)));
    const bottomGap = Math.max(12, parseInt(getComputedStyle(document.documentElement).getPropertyValue("--safe-area-bottom") || "0", 10) + 12 || 12);
    const height = Math.max(300, visibleViewportHeight() - top - bottomGap);

    menu.hidden = false;
    menu.removeAttribute("hidden");
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
    Object.assign(menu.style, {
      position: "fixed",
      top: `${top}px`,
      bottom: `${bottomGap}px`,
      left: mobile ? "14px" : "auto",
      right: "14px",
      width: mobile ? "auto" : "min(420px, calc(100vw - 28px))",
      maxWidth: "calc(100vw - 28px)",
      height: `${height}px`,
      minHeight: "0",
      maxHeight: `${height}px`,
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      gap: "6px",
      overflowX: "hidden",
      overflowY: "auto",
      overscrollBehavior: "contain",
      WebkitOverflowScrolling: "touch",
      transform: "none",
      translate: "none",
      visibility: "visible",
      opacity: "1",
      pointerEvents: "auto",
      zIndex: "99999",
      clipPath: "none",
      contain: "none"
    });

    qa(".profile-menu-header,.profile-menu-link,#profileChatNotifications", menu).forEach((row) => {
      row.hidden = false;
      row.removeAttribute("hidden");
      if (row.classList.contains("profile-menu-link")) row.style.display = "grid";
      row.style.visibility = "visible";
      row.style.opacity = "1";
      row.style.pointerEvents = "auto";
      row.style.transform = "none";
      row.style.maxHeight = "none";
      if (row.classList.contains("profile-menu-link")) row.style.minHeight = "50px";
    });

    restorePageInteraction();

    if (!wasOpen || force) {
      try { menu.scrollTop = 0; } catch (_) {}
      wasOpen = true;
    }
  }

  function removeRecoveredAdminCard() {
    qa("#viewMount .section-card, #viewMount section").forEach((card) => {
      const heading = q("h2", card)?.textContent?.trim().toLowerCase() || "";
      if (heading === "admin page recovered") card.remove();
    });
  }

  function install() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    removeRecoveredAdminCard();
    repairOpenMenu(true);

    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]")) {
        setTimeout(() => repairOpenMenu(true), 0);
        setTimeout(() => repairOpenMenu(true), 120);
        return;
      }
      if (event.target?.closest?.("#memberProfileMenu [data-profile-view],#memberProfileMenu [data-profile-action],#memberProfileMenu .profile-menu-link,#profileMenu [data-profile-view],#profileMenu [data-profile-action],#profileMenu .profile-menu-link")) {
        setTimeout(() => {
          closeMenuHard();
          removeRecoveredAdminCard();
        }, 40);
        setTimeout(removeRecoveredAdminCard, 250);
      }
    }, true);

    window.addEventListener("popstate", () => {
      closeMenuHard();
      setTimeout(removeRecoveredAdminCard, 0);
      setTimeout(removeRecoveredAdminCard, 250);
    }, true);
    window.visualViewport?.addEventListener("resize", () => repairOpenMenu(true));
    window.visualViewport?.addEventListener("scroll", () => repairOpenMenu(true));
    window.addEventListener("resize", () => repairOpenMenu(true));

    new MutationObserver(() => {
      removeRecoveredAdminCard();
      repairOpenMenu(false);
    }).observe(document.body, { childList: true, subtree: true });

    setInterval(() => {
      removeRecoveredAdminCard();
      repairOpenMenu(false);
    }, 1000);

    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
