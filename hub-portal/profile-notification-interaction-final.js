(() => {
  "use strict";

  const VERSION = "profile-notification-interaction-final-20260726a";
  if (window.__jpProfileNotificationInteractionFinal === VERSION) return;
  window.__jpProfileNotificationInteractionFinal = VERSION;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let menuNavBusy = false;
  let lastHandledAt = 0;
  let lastHandledTarget = null;

  function callIfAvailable(name, ...args) {
    try {
      const fn = window[name] || (typeof globalThis !== "undefined" ? globalThis[name] : null);
      if (typeof fn === "function") return fn(...args);
    } catch (error) {
      console.warn(`[${VERSION}] ${name} failed`, error);
    }
    return undefined;
  }

  function unlockPage() {
    [document.documentElement, document.body].forEach((node) => {
      if (!node) return;
      node.style.overflow = "";
      node.style.pointerEvents = "";
      node.style.touchAction = "";
      node.style.position = "";
      node.style.height = "";
    });

    [
      "member-profile-menu-open",
      "profile-menu-open",
      "jp-profile-menu-open",
      "jp-profile-nav-lock",
      "jp-profile-regression-lock",
      "jp-menu-hard-lock",
      "mobile-dashboard-menu-open"
    ].forEach((className) => document.body?.classList.remove(className));

    $$(".profile-menu-backdrop,.member-profile-backdrop,.notification-backdrop,.jp-stale-overlay,.jp-account-actions-popover")
      .forEach((node) => node.remove());

    $("#dashboardSidebar")?.classList.remove("open");
    $("#appShell")?.classList.remove("mobile-menu-open");
    $("#mobileMenuBackdrop")?.classList.remove("open");
    $("#mobileMenuButton")?.setAttribute("aria-expanded", "false");
  }

  function closeNotificationPopover() {
    const popover = $("#notificationPopover");
    const bell = $("#topNotificationBell");
    popover?.classList.remove("open", "is-opening", "is-closing");
    popover?.setAttribute("aria-hidden", "true");
    bell?.setAttribute("aria-expanded", "false");
  }

  function closeProfileMenu() {
    const menu = $("#memberProfileMenu");
    const button = $("#memberProfileButton");
    if (menu) {
      menu.classList.remove("open", "is-opening", "is-closing");
      menu.setAttribute("aria-hidden", "true");
      menu.scrollTop = 0;
      menu.style.maxHeight = "";
      menu.style.height = "";
      menu.style.transform = "";
      menu.style.pointerEvents = "";
    }
    button?.setAttribute("aria-expanded", "false");
    document.body?.classList.remove("member-profile-menu-open", "profile-menu-open", "jp-profile-menu-open");
  }

  function fitProfileMenu() {
    const menu = $("#memberProfileMenu");
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const top = Math.max(12, rect.top || 90);
    const visibleHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720;
    menu.scrollTop = 0;
    menu.style.height = "";
    menu.style.transform = "none";
    menu.style.maxHeight = `${Math.max(220, Math.floor(visibleHeight - top - 20))}px`;
    menu.style.overflowY = "auto";
    menu.style.overflowX = "hidden";
    menu.style.pointerEvents = "auto";
  }

  function openProfileMenu() {
    const menu = $("#memberProfileMenu");
    const button = $("#memberProfileButton");
    if (!menu || !button) return;
    unlockPage();
    closeNotificationPopover();
    menu.classList.add("open");
    menu.classList.remove("is-opening", "is-closing");
    menu.setAttribute("aria-hidden", "false");
    button.setAttribute("aria-expanded", "true");
    document.body?.classList.add("member-profile-menu-open");
    fitProfileMenu();
  }

  function setProfileMenuOpen(open) {
    if (open) openProfileMenu();
    else {
      closeProfileMenu();
      unlockPage();
    }
  }

  function openNotifications() {
    const popover = $("#notificationPopover");
    const bell = $("#topNotificationBell");
    if (!popover || !bell) return;
    unlockPage();
    closeProfileMenu();
    popover.classList.add("open");
    popover.setAttribute("aria-hidden", "false");
    bell.setAttribute("aria-expanded", "true");
    popover.scrollTop = 0;
  }

  function setNotificationOpen(open) {
    if (open) openNotifications();
    else {
      closeNotificationPopover();
      unlockPage();
    }
  }

  function renderTarget(view) {
    if (!view) return;
    const previous = (() => {
      try { return (typeof state !== "undefined" && state?.activeView) || window.state?.activeView || ""; } catch (_) { return ""; }
    })();
    try {
      callIfAvailable("renderView", view);
      if (window.history?.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.set("entry", "hub");
        url.searchParams.set("view", view);
        window.history.replaceState({ view }, "", url.toString());
      }
    } catch (error) {
      console.error(`[${VERSION}] navigation to ${view} failed`, error);
      callIfAvailable("showErrorToast", "That section could not be opened.", "Please try again.");
      if (previous && previous !== view) {
        try { callIfAvailable("renderView", previous); } catch (_) {}
      }
    }
  }

  function navigateFromMenu(view) {
    if (menuNavBusy || !view) return;
    menuNavBusy = true;
    closeProfileMenu();
    closeNotificationPopover();
    unlockPage();
    window.setTimeout(() => {
      try {
        renderTarget(view);
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } finally {
        closeProfileMenu();
        closeNotificationPopover();
        unlockPage();
        window.setTimeout(() => { menuNavBusy = false; }, 220);
      }
    }, 0);
  }

  function consume(event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
  }

  function isDuplicateGesture(event, element) {
    const now = Date.now();
    const duplicate = lastHandledTarget === element && now - lastHandledAt < 420 && event.type !== "pointerdown";
    if (!duplicate) {
      lastHandledAt = now;
      lastHandledTarget = element;
    }
    return duplicate;
  }

  function handleProfileAction(action) {
    if (action === "my-posts") return navigateFromMenu("boards");
    if (action === "my-quotes") return navigateFromMenu("quotes");
    return navigateFromMenu(action || "profile");
  }

  function handleMenuClick(event) {
    const target = event.target;
    if (!target?.closest) return;

    const profileButton = target.closest("#memberProfileButton");
    const profileView = target.closest("#memberProfileMenu [data-profile-view]");
    const profileAction = target.closest("#memberProfileMenu [data-profile-action]");
    const messageButton = target.closest("#memberProfileMenu #messageInboxButton");
    const profileNotificationButton = target.closest("#memberProfileMenu #notificationBell");
    const signOutButton = target.closest("#memberProfileMenu #logoutButton");
    const topBell = target.closest("#topNotificationBell");
    const notificationClose = target.closest("#closeNotifications");
    const notificationShortcut = target.closest("#notificationPopover .notification-shortcut,[data-notification-view]");

    const handledElement = profileButton || profileView || profileAction || messageButton || profileNotificationButton || signOutButton || topBell || notificationClose || notificationShortcut;
    if (!handledElement) return;

    consume(event);
    if (isDuplicateGesture(event, handledElement)) return;

    if (profileButton) {
      setProfileMenuOpen(!$("#memberProfileMenu")?.classList.contains("open"));
      return;
    }

    if (topBell || profileNotificationButton) {
      setNotificationOpen(!$("#notificationPopover")?.classList.contains("open"));
      return;
    }

    if (notificationClose) {
      setNotificationOpen(false);
      return;
    }

    if (notificationShortcut) {
      const view = notificationShortcut.dataset.notificationView || notificationShortcut.dataset.view || notificationShortcut.dataset.viewLink || "notifications";
      closeNotificationPopover();
      navigateFromMenu(view);
      return;
    }

    if (signOutButton) {
      closeProfileMenu();
      closeNotificationPopover();
      unlockPage();
      const result = callIfAvailable("signOut");
      if (result && typeof result.catch === "function") result.catch((error) => console.error(`[${VERSION}] sign out failed`, error));
      return;
    }

    if (messageButton) {
      navigateFromMenu("messages");
      return;
    }

    if (profileView) {
      navigateFromMenu(profileView.dataset.profileView);
      return;
    }

    if (profileAction) {
      handleProfileAction(profileAction.dataset.profileAction);
    }
  }

  function handleOutsideClick(event) {
    const target = event.target;
    if (!target?.closest) return;
    if (target.closest("#memberProfileMenu,#memberProfileButton,#notificationPopover,#topNotificationBell,.jp-account-actions-popover")) return;
    if ($("#memberProfileMenu")?.classList.contains("open") || $("#notificationPopover")?.classList.contains("open")) {
      closeProfileMenu();
      closeNotificationPopover();
      unlockPage();
    }
  }

  function handleBackAndEscape(event) {
    if (event?.key && event.key !== "Escape") return;
    if ($("#memberProfileMenu")?.classList.contains("open") || $("#notificationPopover")?.classList.contains("open")) {
      closeProfileMenu();
      closeNotificationPopover();
      unlockPage();
    }
  }

  function installStyles() {
    if ($("#jpProfileNotificationInteractionFinalStyles")) return;
    const style = document.createElement("style");
    style.id = "jpProfileNotificationInteractionFinalStyles";
    style.textContent = `
      #memberProfileMenu:not(.open),
      #notificationPopover:not(.open){
        display:none!important;
        pointer-events:none!important;
      }
      #memberProfileMenu.open,
      #notificationPopover.open{
        pointer-events:auto!important;
        z-index:2147483400!important;
      }
      @media(max-width:760px){
        #memberProfileMenu.open{
          position:fixed!important;
          left:14px!important;
          right:14px!important;
          bottom:auto!important;
          width:auto!important;
          box-sizing:border-box!important;
          overscroll-behavior:contain!important;
          -webkit-overflow-scrolling:touch!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    unlockPage();
    ["pointerdown", "click", "touchend"].forEach((type) => {
      window.addEventListener(type, handleMenuClick, true);
    });
    document.addEventListener("click", handleOutsideClick, false);
    document.addEventListener("keydown", handleBackAndEscape, true);
    window.addEventListener("pagehide", unlockPage, true);
    window.addEventListener("pageshow", unlockPage, true);
    window.addEventListener("popstate", unlockPage, true);
    window.visualViewport?.addEventListener("resize", () => {
      if ($("#memberProfileMenu")?.classList.contains("open")) fitProfileMenu();
    });
    window.jpProfileNotificationInteractionFinal = { version: VERSION, unlockPage, closeProfileMenu, closeNotificationPopover, navigateFromMenu };
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();