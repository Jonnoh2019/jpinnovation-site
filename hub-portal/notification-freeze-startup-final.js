(() => {
  "use strict";

  const VERSION = "notification-freeze-startup-final-20260726b";
  if (window.__jpNotificationFreezeStartupFinal === VERSION) return;
  window.__jpNotificationFreezeStartupFinal = VERSION;

  const $ = (selector, root = document) => root.querySelector(selector);
  let navigating = false;
  let bellBusy = false;

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

  async function closeDuplicateVisiblePhoneNotifications() {
    try {
      if (!("serviceWorker" in navigator)) return;
      const registration = await navigator.serviceWorker.ready;
      if (!registration?.getNotifications) return;
      const notifications = await registration.getNotifications({ includeTriggered: true });
      const seen = new Set();
      notifications
        .slice()
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .forEach((notification) => {
          const url = notification.data?.url || "";
          const key = [notification.tag || "jp", notification.title || "", notification.body || "", url].join("|").toLowerCase();
          if (seen.has(key)) notification.close();
          else seen.add(key);
        });
    } catch (error) {
      console.warn(`[${VERSION}] duplicate notification cleanup failed`, error);
    }
  }

  // Critical: do not replay existing Hub notification rows into the Android bar when the app opens.
  // Real phone alerts should be delivered by push/service-worker events, not by renderNotifications().
  window.maybeShowLocalPhoneNotification = async function maybeShowLocalPhoneNotificationDisabledOnRender() {
    return undefined;
  };

  function safeRenderNotifications() {
    try {
      if (typeof window.renderNotifications === "function") window.renderNotifications();
    } catch (error) {
      console.warn(`[${VERSION}] renderNotifications failed`, error);
    }
  }

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
        window.setTimeout(() => { navigating = false; }, 250);
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
      if (bellBusy) return;
      bellBusy = true;
      const popover = $("#notificationPopover");
      const willOpen = !popover?.classList.contains("open");
      clearLocks();
      safeRenderNotifications();
      popover?.classList.toggle("open", willOpen);
      popover?.setAttribute("aria-hidden", willOpen ? "false" : "true");
      $("#topNotificationBell")?.setAttribute("aria-expanded", willOpen ? "true" : "false");
      closeDuplicateVisiblePhoneNotifications();
      window.setTimeout(() => { bellBusy = false; }, 200);
      return;
    }

    if (close) {
      clearLocks();
      return;
    }

    openShortcut(shortcut);
  }, true);

  window.addEventListener("pageshow", () => {
    clearLocks();
    closeDuplicateVisiblePhoneNotifications();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      clearLocks();
      closeDuplicateVisiblePhoneNotifications();
    }
  });

  closeDuplicateVisiblePhoneNotifications();
  console.info(`[${VERSION}] installed`);
})();