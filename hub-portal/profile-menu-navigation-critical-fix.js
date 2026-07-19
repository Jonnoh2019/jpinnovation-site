(() => {
  "use strict";

  const VERSION = "profile-menu-navigation-critical-fix-20260719a";
  let navigationBusy = false;
  let outsideClickInstalled = false;

  function $(selector) {
    return document.querySelector(selector);
  }

  function all(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  function cleanBodyLocks() {
    document.body.classList.remove(
      "member-profile-menu-open",
      "mobile-dashboard-menu-open",
      "jp-menu-hard-lock",
      "jp-profile-menu-open",
      "jp-profile-regression-lock"
    );
    document.documentElement.style.overflow = "";
    Object.assign(document.body.style, {
      top: "",
      overflow: "",
      pointerEvents: "",
      touchAction: "",
      position: "",
      inset: "",
      width: ""
    });
    $("#appShell")?.classList.remove("mobile-menu-open");
    $("#mobileMenuBackdrop")?.classList.remove("open");
    $("#mobileMenuBackdrop")?.setAttribute("aria-hidden", "true");
    $("#notificationPopover")?.classList.remove("open");
    $("#topNotificationBell")?.setAttribute("aria-expanded", "false");
  }

  function setMenuOpen(open) {
    const menu = $("#memberProfileMenu");
    const button = $("#memberProfileButton");
    if (!menu || !button) return;
    if (open) {
      menu.classList.add("open");
      menu.setAttribute("aria-hidden", "false");
      button.setAttribute("aria-expanded", "true");
      document.body.classList.add("member-profile-menu-open");
    } else {
      menu.classList.remove("open");
      menu.setAttribute("aria-hidden", "true");
      button.setAttribute("aria-expanded", "false");
      cleanBodyLocks();
    }
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function openMenu() {
    if (navigationBusy) return;
    cleanBodyLocks();
    setMenuOpen(true);
  }

  function currentUserIsAdmin() {
    try {
      const user = typeof currentUser === "function" ? currentUser() : null;
      if (user?.role === "admin" || user?.isAdmin) return true;
    } catch (error) {
      console.warn(`[${VERSION}] could not read current user`, error);
    }
    return !$("#profileAdminLink")?.classList.contains("hidden");
  }

  function targetView(button) {
    if (!button) return "";
    if (button.dataset.profileView) return button.dataset.profileView;
    if (button.dataset.profileAction === "my-posts") return "boards";
    if (button.dataset.profileAction === "my-quotes") return "quotes";
    if (button.id === "messageInboxButton") return "messages";
    if (button.id === "notificationBell") return "notifications";
    return "";
  }

  function renderFallback(view, error) {
    console.error(`[${VERSION}] failed to open profile menu target`, { view, error });
    const mount = $("#viewMount");
    const title = $("#viewTitle");
    if (title) title.textContent = view === "admin" ? "Admin Review" : "Section unavailable";
    if (mount) {
      mount.dataset.view = view || "error";
      mount.innerHTML = `
        <section class="section-card">
          <p class="eyebrow">Navigation issue</p>
          <h2>${view === "admin" ? "Admin Review could not be opened." : "This section could not be opened."}</h2>
          <p class="muted">The page recovered safely instead of locking the app. Please retry or return to the dashboard.</p>
          <div class="button-row">
            <button class="primary-button" id="jpRetryProfileRoute" type="button">Retry</button>
            <button class="secondary-button" id="jpBackDashboardRoute" type="button">Back to Dashboard</button>
          </div>
        </section>
      `;
      $("#jpRetryProfileRoute")?.addEventListener("click", () => navigateToView(view || "dashboard"));
      $("#jpBackDashboardRoute")?.addEventListener("click", () => navigateToView("dashboard"));
    }
  }

  function setBusyState(button, busy) {
    navigationBusy = busy;
    all("#memberProfileMenu .profile-menu-link").forEach((item) => {
      item.disabled = busy;
      item.classList.toggle("is-loading", busy && item === button);
      item.setAttribute("aria-busy", String(busy && item === button));
    });
  }

  async function performLogout(sourceButton = null) {
    if (navigationBusy) return;
    setBusyState(sourceButton, true);
    closeMenu();
    window.setTimeout(async () => {
      try {
        cleanBodyLocks();
        if (typeof signOut === "function") {
          await signOut();
          return;
        }
        if (window.portalBackend?.auth?.signOut) await window.portalBackend.auth.signOut();
        try { window.localStorage.removeItem("jpActiveHubAccess"); } catch {}
        window.location.assign("index.html?entry=hub&signin=1");
      } catch (error) {
        cleanBodyLocks();
        renderFallback("dashboard", error);
      } finally {
        setBusyState(sourceButton, false);
        cleanBodyLocks();
      }
    }, 80);
  }

  function navigateToView(view, sourceButton = null) {
    if (!view || navigationBusy) return;
    setBusyState(sourceButton, true);
    closeMenu();

    window.setTimeout(() => {
      try {
        cleanBodyLocks();
        if (view === "admin" && !currentUserIsAdmin()) {
          throw new Error("Current user is not recognised as admin");
        }
        if (typeof renderView !== "function") {
          throw new Error("renderView is not available");
        }
        renderView(view);
        cleanBodyLocks();
        const mount = $("#viewMount");
        if (!mount || !mount.innerHTML.trim()) {
          throw new Error("renderView completed with an empty page");
        }
      } catch (error) {
        cleanBodyLocks();
        renderFallback(view, error);
      } finally {
        setBusyState(sourceButton, false);
        cleanBodyLocks();
      }
    }, 80);
  }

  function replaceNodeWithoutListeners(selector) {
    const node = $(selector);
    if (!node || node.dataset.jpCriticalNavCloned === VERSION) return $(selector);
    const clone = node.cloneNode(true);
    clone.dataset.jpCriticalNavCloned = VERSION;
    node.replaceWith(clone);
    return clone;
  }

  function install() {
    if (document.documentElement.dataset.jpProfileCriticalNav === VERSION) return;
    document.documentElement.dataset.jpProfileCriticalNav = VERSION;

    const profileButton = replaceNodeWithoutListeners("#memberProfileButton");
    const profileMenu = replaceNodeWithoutListeners("#memberProfileMenu");
    if (!profileButton || !profileMenu) return;

    profileButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (profileMenu.classList.contains("open")) closeMenu();
      else openMenu();
    });

    profileMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      const link = event.target.closest(".profile-menu-link");
      if (!link) return;
      event.preventDefault();
      if (link.id === "logoutButton") {
        performLogout(link);
        return;
      }
      const view = targetView(link);
      navigateToView(view, link);
    });

    if (!outsideClickInstalled) {
      outsideClickInstalled = true;
      document.addEventListener("click", (event) => {
        const menu = $("#memberProfileMenu");
        if (!menu?.classList.contains("open")) return;
        if (event.target.closest("#memberProfileMenu,#memberProfileButton")) return;
        closeMenu();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
      });
      window.addEventListener("pageshow", cleanBodyLocks);
      window.addEventListener("popstate", cleanBodyLocks);
    }

    cleanBodyLocks();
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
