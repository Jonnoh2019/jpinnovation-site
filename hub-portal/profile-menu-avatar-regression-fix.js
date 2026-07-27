/* JP Innovation Hub profile menu single-owner fix.
   This is intentionally loaded before the legacy profile-menu scripts. It owns profile,
   notification and sign-out taps first, then prevents later stale handlers from freezing the UI. */
(() => {
  "use strict";

  const VERSION = "profile-menu-avatar-regression-fix-20260727-single-owner";
  if (window.__jpProfileMenuSingleOwner === VERSION) return;
  window.__jpProfileMenuSingleOwner = VERSION;
  document.documentElement.dataset.jpProfileMenuSingleOwner = VERSION;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const ACTION_VIEWS = { "my-posts": "boards", "my-quotes": "quotes" };
  let busy = false;
  let lastTapAt = 0;
  let lastTapTarget = null;

  function clearLocks() {
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
    ].forEach((name) => document.body?.classList.remove(name));
    $$(".profile-menu-backdrop,.member-profile-backdrop,.notification-backdrop,.jp-stale-overlay,.jp-account-actions-popover")
      .forEach((node) => node.remove());
    $("#dashboardSidebar")?.classList.remove("open");
    $("#appShell")?.classList.remove("mobile-menu-open");
    $("#mobileMenuBackdrop")?.classList.remove("open");
    $("#mobileMenuButton")?.setAttribute("aria-expanded", "false");
  }

  function closeProfileMenu() {
    const menu = $("#memberProfileMenu");
    const button = $("#memberProfileButton");
    if (menu) {
      menu.classList.remove("open", "is-opening", "is-closing");
      menu.setAttribute("aria-hidden", "true");
      menu.scrollTop = 0;
      menu.style.height = "";
      menu.style.maxHeight = "";
      menu.style.transform = "";
      menu.style.pointerEvents = "";
    }
    button?.setAttribute("aria-expanded", "false");
  }

  function closeNotifications() {
    const popover = $("#notificationPopover");
    const bell = $("#topNotificationBell");
    popover?.classList.remove("open", "is-opening", "is-closing");
    popover?.setAttribute("aria-hidden", "true");
    bell?.setAttribute("aria-expanded", "false");
  }

  function fitMenu(menu) {
    if (!menu) return;
    const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720;
    const top = Math.max(10, menu.getBoundingClientRect().top || 90);
    menu.scrollTop = 0;
    menu.style.transform = "none";
    menu.style.height = "";
    menu.style.maxHeight = `${Math.max(220, Math.floor(viewportHeight - top - 18))}px`;
    menu.style.overflowY = "auto";
    menu.style.overflowX = "hidden";
    menu.style.pointerEvents = "auto";
  }

  function openProfileMenu() {
    const menu = $("#memberProfileMenu");
    const button = $("#memberProfileButton");
    if (!menu || !button) return;
    clearLocks();
    closeNotifications();
    menu.classList.add("open");
    menu.classList.remove("is-opening", "is-closing");
    menu.setAttribute("aria-hidden", "false");
    button.setAttribute("aria-expanded", "true");
    document.body?.classList.add("member-profile-menu-open");
    fitMenu(menu);
  }

  function setProfileOpen(open) {
    if (open) openProfileMenu();
    else {
      closeProfileMenu();
      clearLocks();
    }
  }

  function openNotificationPopover() {
    const popover = $("#notificationPopover");
    const bell = $("#topNotificationBell");
    if (!popover || !bell) return;
    clearLocks();
    closeProfileMenu();
    try { if (typeof window.renderNotifications === "function") window.renderNotifications(); } catch (error) { console.warn(`[${VERSION}] renderNotifications failed`, error); }
    popover.classList.add("open");
    popover.setAttribute("aria-hidden", "false");
    popover.scrollTop = 0;
    bell.setAttribute("aria-expanded", "true");
  }

  function setNotificationsOpen(open) {
    if (open) openNotificationPopover();
    else {
      closeNotifications();
      clearLocks();
    }
  }

  function safeRenderView(view) {
    if (!view) return;
    try {
      if (typeof window.renderView === "function") window.renderView(view);
      const url = new URL(window.location.href);
      url.searchParams.set("entry", "hub");
      url.searchParams.set("view", view);
      window.history?.replaceState?.({ view }, "", url.toString());
      window.scrollTo?.({ top: 0, left: 0, behavior: "auto" });
    } catch (error) {
      console.error(`[${VERSION}] failed to open ${view}`, error);
      try { window.showErrorToast?.("That section could not be opened.", "Please try again."); } catch (_) {}
    }
  }

  function navigate(view) {
    if (busy || !view) return;
    busy = true;
    closeProfileMenu();
    closeNotifications();
    clearLocks();
    window.setTimeout(() => {
      try { safeRenderView(view); }
      finally {
        closeProfileMenu();
        closeNotifications();
        clearLocks();
        window.setTimeout(() => { busy = false; }, 220);
      }
    }, 0);
  }

  function consume(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }

  function duplicateGesture(event, target) {
    const now = Date.now();
    const duplicate = target === lastTapTarget && now - lastTapAt < 450 && event.type !== "pointerdown";
    if (!duplicate) {
      lastTapTarget = target;
      lastTapAt = now;
    }
    return duplicate;
  }

  function handle(event) {
    const target = event.target;
    if (!target?.closest) return;

    const profileButton = target.closest("#memberProfileButton");
    const profileView = target.closest("#memberProfileMenu [data-profile-view]");
    const profileAction = target.closest("#memberProfileMenu [data-profile-action]");
    const profileBell = target.closest("#memberProfileMenu #notificationBell");
    const topBell = target.closest("#topNotificationBell");
    const closeBell = target.closest("#closeNotifications");
    const notificationShortcut = target.closest("#notificationPopover .notification-shortcut,[data-notification-view]");
    const messages = target.closest("#memberProfileMenu #messageInboxButton");
    const signout = target.closest("#memberProfileMenu #logoutButton");
    const handled = profileButton || profileView || profileAction || profileBell || topBell || closeBell || notificationShortcut || messages || signout;
    if (!handled) return;

    consume(event);
    if (duplicateGesture(event, handled)) return;

    if (profileButton) return setProfileOpen(!$("#memberProfileMenu")?.classList.contains("open"));
    if (profileBell || topBell) return setNotificationsOpen(!$("#notificationPopover")?.classList.contains("open"));
    if (closeBell) return setNotificationsOpen(false);
    if (messages) return navigate("messages");
    if (signout) {
      closeProfileMenu();
      closeNotifications();
      clearLocks();
      try {
        const result = window.signOut?.();
        if (result?.catch) result.catch((error) => console.error(`[${VERSION}] sign out failed`, error));
      } catch (error) {
        console.error(`[${VERSION}] sign out failed`, error);
      }
      return;
    }
    if (notificationShortcut) {
      const text = String(notificationShortcut.textContent || "").toLowerCase();
      const fallback = /photo|approval|registration|account|member/.test(text) ? "admin" : "notifications";
      return navigate(notificationShortcut.dataset.notificationView || notificationShortcut.dataset.view || notificationShortcut.dataset.viewLink || fallback);
    }
    if (profileView) return navigate(profileView.dataset.profileView);
    if (profileAction) return navigate(ACTION_VIEWS[profileAction.dataset.profileAction] || profileAction.dataset.profileAction || "profile");
  }

  function outsideClick(event) {
    const target = event.target;
    if (!target?.closest) return;
    if (target.closest("#memberProfileMenu,#memberProfileButton,#notificationPopover,#topNotificationBell,.jp-account-actions-popover")) return;
    if ($("#memberProfileMenu")?.classList.contains("open") || $("#notificationPopover")?.classList.contains("open")) {
      closeProfileMenu();
      closeNotifications();
      clearLocks();
    }
  }

  function installStyles() {
    if ($("#jpProfileSingleOwnerStyles")) return;
    const style = document.createElement("style");
    style.id = "jpProfileSingleOwnerStyles";
    style.textContent = `
      #memberProfileMenu:not(.open),#notificationPopover:not(.open){display:none!important;pointer-events:none!important}
      #memberProfileMenu.open,#notificationPopover.open{pointer-events:auto!important;z-index:2147483400!important}
      @media(max-width:760px){
        #memberProfileMenu.open{position:fixed!important;left:14px!important;right:14px!important;bottom:auto!important;width:auto!important;box-sizing:border-box!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important}
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    installStyles();
    clearLocks();
    ["pointerdown", "click", "touchend"].forEach((type) => window.addEventListener(type, handle, true));
    document.addEventListener("click", outsideClick, false);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeProfileMenu(); closeNotifications(); clearLocks(); } }, true);
    window.addEventListener("pageshow", clearLocks, true);
    window.addEventListener("pagehide", clearLocks, true);
    window.addEventListener("popstate", clearLocks, true);
    window.visualViewport?.addEventListener("resize", () => { if ($("#memberProfileMenu")?.classList.contains("open")) fitMenu($("#memberProfileMenu")); });
    window.jpProfileMenuSingleOwner = { version: VERSION, clearLocks, closeProfileMenu, closeNotifications, navigate };
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();