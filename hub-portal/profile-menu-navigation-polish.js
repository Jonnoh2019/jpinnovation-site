/* JP Innovation Hub profile menu polish: removes temporary admin notice, repairs menu reopening, supports back navigation. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-polish-20260722-a";
  if (window.__jpProfileMenuNavigationPolish === VERSION) return;
  window.__jpProfileMenuNavigationPolish = VERSION;
  document.documentElement.dataset.jpProfileMenuNavigationPolish = VERSION;

  const VALID = new Set(["dashboard", "admin", "metrics", "profile", "clientwork", "boards", "projects", "quotes", "directory", "resources", "events", "messages", "notifications", "settings", "rewards"]);
  let wasOpen = false;

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function visibleViewportHeight() {
    return Math.max(420, Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720));
  }

  function visibleViewportOffsetTop() {
    return Math.max(0, Math.floor(window.visualViewport?.offsetTop || 0));
  }

  function isOpen(menu) {
    if (!menu) return false;
    const trigger = q("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]");
    return menu.classList.contains("open") ||
      menu.getAttribute("aria-hidden") === "false" ||
      document.body.classList.contains("member-profile-menu-open") ||
      document.body.classList.contains("profile-menu-open") ||
      trigger?.getAttribute("aria-expanded") === "true";
  }

  function closeMenuHard() {
    const menu = q("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu");
    if (!menu) return;
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
      overflow: "hidden"
    });
    qa(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,[data-profile-backdrop]").forEach((node) => node.remove());
    document.body.classList.remove("member-profile-menu-open", "profile-menu-open", "jp-menu-hard-lock", "menu-scroll-locked");
    document.documentElement.classList.remove("member-profile-menu-open", "profile-menu-open", "jp-menu-hard-lock", "menu-scroll-locked");
    [document.body, document.documentElement].forEach((node) => {
      node.style.removeProperty("overflow");
      node.style.removeProperty("pointer-events");
      node.style.removeProperty("touch-action");
    });
    const trigger = q("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]");
    trigger?.setAttribute("aria-expanded", "false");
    if (document.activeElement?.closest?.("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu")) {
      try { document.activeElement.blur(); } catch (_) {}
    }
    wasOpen = false;
  }

  function repairOpenMenu() {
    const menu = q("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu");
    if (!menu) return;
    const open = isOpen(menu);
    if (!open) {
      if (!menu.hidden || menu.getAttribute("aria-hidden") === "false") closeMenuHard();
      wasOpen = false;
      return;
    }

    const mobile = window.innerWidth <= 760;
    const top = mobile ? Math.max(88, visibleViewportOffsetTop() + 92) : Math.max(82, Math.min(112, Math.round(window.innerHeight * 0.14)));
    const bottomGap = 14;
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
      row.style.display = row.classList.contains("profile-menu-link") ? "grid" : "";
      row.style.visibility = "visible";
      row.style.opacity = "1";
      row.style.pointerEvents = "auto";
      row.style.transform = "none";
      row.style.maxHeight = "none";
      if (row.classList.contains("profile-menu-link")) row.style.minHeight = "50px";
    });

    document.body.classList.remove("jp-menu-hard-lock");
    document.documentElement.classList.remove("jp-menu-hard-lock");

    if (!wasOpen) {
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

  function getViewFromUrl() {
    const params = new URLSearchParams(location.search || "");
    const view = params.get("view") || "dashboard";
    return VALID.has(view) ? view : "dashboard";
  }

  function renderUrlView() {
    const view = getViewFromUrl();
    closeMenuHard();
    if (typeof window.renderView === "function") {
      try { window.renderView(view); } catch (error) { console.error(`[${VERSION}] back navigation render failed`, error); }
    }
    removeRecoveredAdminCard();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function install() {
    history.scrollRestoration = "manual";
    removeRecoveredAdminCard();
    repairOpenMenu();

    document.addEventListener("click", (event) => {
      if (event.target?.closest?.("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]")) {
        setTimeout(repairOpenMenu, 0);
        setTimeout(repairOpenMenu, 80);
        setTimeout(repairOpenMenu, 220);
        return;
      }
      if (event.target?.closest?.("#memberProfileMenu [data-profile-view],#memberProfileMenu [data-profile-action],#profileMenu [data-profile-view],#profileMenu [data-profile-action]")) {
        setTimeout(() => {
          closeMenuHard();
          removeRecoveredAdminCard();
        }, 80);
        setTimeout(removeRecoveredAdminCard, 350);
        return;
      }
      setTimeout(repairOpenMenu, 80);
    }, true);

    window.addEventListener("popstate", () => setTimeout(renderUrlView, 0), true);
    window.visualViewport?.addEventListener("resize", repairOpenMenu);
    window.visualViewport?.addEventListener("scroll", repairOpenMenu);
    window.addEventListener("resize", repairOpenMenu);

    new MutationObserver(() => {
      removeRecoveredAdminCard();
      repairOpenMenu();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-hidden", "hidden", "style"] });

    setInterval(() => {
      removeRecoveredAdminCard();
      repairOpenMenu();
    }, 300);

    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
