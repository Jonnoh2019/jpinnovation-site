(() => {
  "use strict";

  const VERSION = "notification-freeze-startup-final-20260726a";
  if (window.__jpNotificationFreezeStartupFinal === VERSION) return;
  window.__jpNotificationFreezeStartupFinal = VERSION;

  const $ = (selector, root = document) => root.querySelector(selector);
  let navigating = false;

  function clearLocks() {
    const body = document.body;
    const root = document.documentElement;
    [body, root].forEach((node) => {
      if (!node) return;
      node.style.overflow = "";
      node.style.pointerEvents = "";
      node.style.touchAction = "";
    });
    [
      "member-profile-menu-open",
      "mobile-dashboard-menu-open",
      "jp-menu-hard-lock",
      "jp-profile-menu-open",
      "jp-profile-nav-lock",
      "jp-profile-regression-lock",
      "profile-menu-open"
    ].forEach((name) => body?.classList.remove(name));
    $("#notificationPopover")?.classList.remove("open");
    $("#notificationPopover")?.setAttribute("aria-hidden", "true");
    $("#topNotificationBell")?.setAttribute("aria-expanded", "false");
    $("#memberProfileMenu")?.classList.remove("open", "is-opening", "is-closing");
    $("#memberProfileMenu")?.setAttribute("aria-hidden", "true");
    $("#memberProfileButton")?.setAttribute("aria-expanded", "false");
    $("#dashboardSidebar")?.classList.remove("open");
    $("#mobileMenuBackdrop")?.classList.remove("open");
    $("#mobileMenuButton")?.setAttribute("aria-expanded", "false");
    document.querySelectorAll(".profile-menu-backdrop,.member-profile-backdrop,.notification-backdrop,.jp-account-actions-popover,.jp-stale-overlay").forEach((node) => node.remove());
  }

  function showError(title, detail = "") {
    if (typeof window.showErrorToast === "function") window.showErrorToast(title, detail);
    else console.warn(`[${VERSION}] ${title}`, detail);
  }

  // Critical: do not replay existing Hub notification rows into the Android bar when the app opens.
  // Real phone alerts should be delivered by push/service-worker events, not by renderNotifications().
  window.maybeShowLocalPhoneNotification = async function maybeShowLocalPhoneNotificationDisabledOnRender() {
    return undefined;
  };

  function openShortcut(shortcut) {
    if (!shortcut || navigating) return;
    navigating = true;
    const postId = shortcut.dataset.postId || "";
    const replyId = shortcut.dataset.replyId || "";
    const targetId = shortcut.dataset.targetId || "";
    const text = String(shortcut.textContent || "").toLowerCase();
    const fallbackView = /photo|approval|registration|account|member/.test(text) ? "admin" : "notifications";
    const view = shortcut.dataset.viewLink || shortcut.dataset.view || fallbackView;
    clearLocks();
    window.setTimeout(() => {
      try {
        if (postId && typeof window.openBoardNotification === "function") {
          window.openBoardNotification(postId, replyId);
        } else if (typeof window.renderView === "function") {
          window.renderView(view);
          if (targetId) {
            window.requestAnimationFrame(() => {
              const target = document.getElementById(targetId);
              if (target?.matches?.("details")) target.open = true;
              target?.scrollIntoView?.({ behavior: "smooth", block: "start" });
            });
          }
        }
      } catch (error) {
        console.error(`[${VERSION}] notification navigation failed`, error);
        showError("Notification could not be opened.", "Please try again.");
      } finally {
        clearLocks();
        window.setTimeout(() => { navigating = false; }, 200);
      }
    }, 0);
  }

  window.addEventListener("click", (event) => {
    const target = event.target;
    const bell = target.closest?.("#topNotificationBell");
    const close = target.closest?.("#closeNotifications");
    const shortcut = target.closest?.("#notificationPopover .notification-shortcut");
    if (!bell && !close && !shortcut) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (bell) {
      const willOpen = !$("#notificationPopover")?.classList.contains("open");
      clearLocks();
      try { if (typeof window.renderNotifications === "function") window.renderNotifications(); } catch (error) { console.warn(`[${VERSION}] renderNotifications failed`, error); }
      $("#notificationPopover")?.classList.toggle("open", willOpen);
      $("#notificationPopover")?.setAttribute("aria-hidden", willOpen ? "false" : "true");
      $("#topNotificationBell")?.setAttribute("aria-expanded", willOpen ? "true" : "false");
      return;
    }

    if (close) {
      clearLocks();
      return;
    }

    openShortcut(shortcut);
  }, true);

  window.addEventListener("pageshow", clearLocks);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) clearLocks();
  });

  console.info(`[${VERSION}] installed`);
})();
