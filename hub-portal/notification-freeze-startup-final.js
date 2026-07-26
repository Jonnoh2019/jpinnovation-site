(() => {
  "use strict";

  const VERSION = "notification-freeze-startup-final-20260726d";
  if (window.__jpNotificationFreezeStartupFinal === VERSION) return;
  window.__jpNotificationFreezeStartupFinal = VERSION;

  const $ = (selector, root = document) => root.querySelector(selector);
  let navigating = false;
  let bellBusy = false;
  let suppressNextClickUntil = 0;

  function escapeValue(value = "") {
    if (typeof window.escapeHtml === "function") return window.escapeHtml(value);
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function clearLocks(options = {}) {
    const body = document.body;
    const root = document.documentElement;
    [body, root].forEach((node) => {
      if (!node) return;
      node.style.overflow = "";
      node.style.pointerEvents = "";
      node.style.touchAction = "";
      node.style.position = "";
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
    if (!options.keepNotifications) {
      $("#notificationPopover")?.classList.remove("open");
      $("#notificationPopover")?.setAttribute("aria-hidden", "true");
      $("#topNotificationBell")?.setAttribute("aria-expanded", "false");
    }
    $("#memberProfileMenu")?.classList.remove("open", "is-opening", "is-closing");
    $("#memberProfileMenu")?.setAttribute("aria-hidden", "true");
    $("#memberProfileButton")?.setAttribute("aria-expanded", "false");
    $("#dashboardSidebar")?.classList.remove("open");
    $("#appShell")?.classList.remove("mobile-menu-open");
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
          const key = [notification.tag || "jp", notification.title || "", notification.body || "", notification.data?.url || ""].join("|").toLowerCase();
          if (seen.has(key)) notification.close();
          else seen.add(key);
        });
    } catch (error) {
      console.warn(`[${VERSION}] duplicate notification cleanup failed`, error);
    }
  }

  // Do not replay in-app notifications into the Android bar. Push notifications are handled by the service worker.
  window.maybeShowLocalPhoneNotification = async function maybeShowLocalPhoneNotificationDisabledOnRender() {
    return undefined;
  };

  const originalRenderNotifications = window.renderNotifications;
  window.renderNotifications = function renderNotificationsWithoutPhoneReplay() {
    try {
      const user = typeof window.currentUser === "function" ? window.currentUser() : null;
      const items = typeof window.notificationItems === "function" ? window.notificationItems(user) : [];
      const unread = items.filter((item) => item.isNew).length;
      const countLabel = unread > 9 ? "9+" : String(unread);
      ["#notificationCount", "#notificationCountTop", "#profileAlertCount"].forEach((selector) => {
        const badge = $(selector);
        if (!badge) return;
        badge.textContent = countLabel;
        badge.classList.toggle("hidden", unread === 0);
      });
      const list = $("#notificationList");
      if (list) {
        list.innerHTML = items.length ? items.slice(0, 6).map((item) => `
          <button class="notification-item notification-shortcut ${item.isNew ? "new" : ""}" data-view-link="${escapeValue(item.view || "notifications")}" data-target-id="${escapeValue(item.targetId || "")}" data-post-id="${escapeValue(item.postId || "")}" data-reply-id="${escapeValue(item.replyId || "")}" type="button">
            <strong>${escapeValue(item.title)}</strong>
            <span>${escapeValue(item.detail)}</span>
          </button>
        `).join("") : `<div class="notification-item"><strong>Nothing new</strong><span>New approvals, messages and account updates will appear here.</span></div>`;
      }
      if (typeof window.renderProfileChatNotifications === "function") window.renderProfileChatNotifications(items);
    } catch (error) {
      console.warn(`[${VERSION}] safe renderNotifications failed`, error);
      try { originalRenderNotifications?.(); } catch (fallbackError) { console.warn(`[${VERSION}] original renderNotifications also failed`, fallbackError); }
    }
  };

  function setPopoverOpen(open) {
    const popover = $("#notificationPopover");
    const bell = $("#topNotificationBell");
    if (!popover || !bell) return;
    popover.classList.toggle("open", open);
    popover.setAttribute("aria-hidden", open ? "false" : "true");
    bell.setAttribute("aria-expanded", open ? "true" : "false");
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

  function handleBell(event) {
    if (bellBusy) return;
    bellBusy = true;
    suppressNextClickUntil = Date.now() + 650;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    const willOpen = !$("#notificationPopover")?.classList.contains("open");
    clearLocks();
    if (willOpen) {
      window.renderNotifications();
      setPopoverOpen(true);
      closeDuplicateVisiblePhoneNotifications();
    }
    window.setTimeout(() => { bellBusy = false; }, 220);
  }

  function handleNotificationEvent(event) {
    const target = event.target;
    const bell = target.closest?.("#topNotificationBell");
    const close = target.closest?.("#closeNotifications");
    const shortcut = target.closest?.("#notificationPopover .notification-shortcut");
    if (!bell && !close && !shortcut) return;
    if (event.type === "click" && Date.now() < suppressNextClickUntil && bell) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if (bell) return handleBell(event);
    if (close) return clearLocks();
    return openShortcut(shortcut);
  }

  ["pointerdown", "click", "touchend"].forEach((type) => {
    window.addEventListener(type, handleNotificationEvent, true);
    document.addEventListener(type, handleNotificationEvent, true);
  });

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

  function loadFinalProfileInteraction() {
    if (window.__jpProfileNotificationInteractionFinal) return;
    if (document.querySelector('script[src*="profile-notification-interaction-final.js"]')) return;
    const script = document.createElement("script");
    script.src = "profile-notification-interaction-final.js?v=profile-notification-interaction-final-20260726a";
    script.defer = true;
    script.onerror = () => console.error(`[${VERSION}] final profile/menu interaction guard failed to load`);
    document.body.appendChild(script);
  }

  closeDuplicateVisiblePhoneNotifications();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadFinalProfileInteraction, { once: true });
  else loadFinalProfileInteraction();
  console.info(`[${VERSION}] installed`);
})();