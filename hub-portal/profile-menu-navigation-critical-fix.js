(() => {
  "use strict";

  const VERSION = "profile-menu-navigation-critical-fix-20260719b";
  let navigationBusy = false;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function cleanBodyLocks() {
    document.body.classList.remove(
      "member-profile-menu-open",
      "mobile-dashboard-menu-open",
      "jp-menu-hard-lock",
      "jp-profile-menu-open",
      "jp-profile-regression-lock"
    );
    document.documentElement.style.overflow = "";
    Object.assign(document.body.style, { top: "", overflow: "", pointerEvents: "", touchAction: "", position: "", inset: "", width: "" });
    $("#appShell")?.classList.remove("mobile-menu-open");
    $("#mobileMenuBackdrop")?.classList.remove("open");
    $("#mobileMenuBackdrop")?.setAttribute("aria-hidden", "true");
    $("#notificationPopover")?.classList.remove("open");
    $("#topNotificationBell")?.setAttribute("aria-expanded", "false");
  }

  function setProfileMenuOpen(open) {
    const menu = $("#memberProfileMenu");
    const button = $("#memberProfileButton");
    if (!menu || !button) return;
    if (open) {
      cleanBodyLocks();
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

  function targetView(button) {
    if (!button) return "";
    if (button.dataset.profileView) return button.dataset.profileView;
    if (button.dataset.profileAction === "my-posts") return "boards";
    if (button.dataset.profileAction === "my-quotes") return "quotes";
    if (button.id === "messageInboxButton") return "messages";
    if (button.id === "notificationBell") return "notifications";
    return "";
  }

  function currentUserIsAdmin() {
    try {
      const user = typeof currentUser === "function" ? currentUser() : null;
      if (user?.role === "admin" || user?.isAdmin) return true;
    } catch (error) { console.warn(`[${VERSION}] could not read current user`, error); }
    return !$("#profileAdminLink")?.classList.contains("hidden");
  }

  function renderFallback(view, error) {
    console.error(`[${VERSION}] profile menu route failed`, { view, error });
    const title = $("#viewTitle");
    const mount = $("#viewMount");
    if (title) title.textContent = view === "admin" ? "Admin Review" : "Section unavailable";
    if (!mount) return;
    mount.dataset.view = view || "error";
    mount.innerHTML = `<section class="section-card"><p class="eyebrow">Navigation issue</p><h2>${view === "admin" ? "Admin Review could not be opened." : "This section could not be opened."}</h2><p class="muted">The app recovered safely instead of freezing. Try again or return to the dashboard.</p><div class="button-row"><button class="primary-button" id="jpRetryProfileRoute" type="button">Retry</button><button class="secondary-button" id="jpBackDashboardRoute" type="button">Back to Dashboard</button></div></section>`;
    $("#jpRetryProfileRoute")?.addEventListener("click", () => navigateToView(view || "dashboard"));
    $("#jpBackDashboardRoute")?.addEventListener("click", () => navigateToView("dashboard"));
  }

  function setBusy(sourceButton, busy) {
    navigationBusy = busy;
    $$("#memberProfileMenu .profile-menu-link").forEach((button) => {
      button.disabled = busy;
      button.classList.toggle("is-loading", busy && button === sourceButton);
      button.setAttribute("aria-busy", String(busy && button === sourceButton));
    });
  }

  function navigateToView(view, sourceButton = null) {
    if (!view || navigationBusy) return;
    setBusy(sourceButton, true);
    setProfileMenuOpen(false);
    window.setTimeout(() => {
      try {
        cleanBodyLocks();
        if (view === "admin" && !currentUserIsAdmin()) throw new Error("Admin route requested by non-admin session");
        if (typeof renderView !== "function") throw new Error("renderView is not available");
        renderView(view);
        cleanBodyLocks();
        const mount = $("#viewMount");
        if (!mount || !mount.innerHTML.trim()) throw new Error("renderView returned an empty page");
      } catch (error) {
        cleanBodyLocks();
        renderFallback(view, error);
      } finally {
        setBusy(sourceButton, false);
        cleanBodyLocks();
      }
    }, 90);
  }

  async function performLogout(sourceButton = null) {
    if (navigationBusy) return;
    setBusy(sourceButton, true);
    setProfileMenuOpen(false);
    window.setTimeout(async () => {
      try {
        cleanBodyLocks();
        if (typeof signOut === "function") await signOut();
        else window.location.assign("index.html?entry=hub&signin=1");
      } catch (error) {
        renderFallback("dashboard", error);
      } finally {
        setBusy(sourceButton, false);
        cleanBodyLocks();
      }
    }, 90);
  }

  function intercept(event) {
    const profileButton = event.target.closest?.("#memberProfileButton");
    const profileMenuButton = event.target.closest?.("#memberProfileMenu .profile-menu-link");
    const profileMenu = $("#memberProfileMenu");
    if (profileButton) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (navigationBusy) return;
      setProfileMenuOpen(!profileMenu?.classList.contains("open"));
      return;
    }
    if (profileMenuButton) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (profileMenuButton.id === "logoutButton") { performLogout(profileMenuButton); return; }
      navigateToView(targetView(profileMenuButton), profileMenuButton);
      return;
    }
    if (profileMenu?.classList.contains("open") && !event.target.closest?.("#memberProfileMenu")) setProfileMenuOpen(false);
  }

  function loadStableAdminRoute() {
    if (document.querySelector('script[src*="admin-route-stability-fix.js"]')) return;
    const adminScript = document.createElement("script");
    adminScript.src = "admin-route-stability-fix.js?v=admin-route-stability-fix-20260719a";
    adminScript.defer = true;
    document.body.appendChild(adminScript);
  }

  function install() {
    if (document.documentElement.dataset.jpProfileCriticalNav === VERSION) return;
    document.documentElement.dataset.jpProfileCriticalNav = VERSION;
    loadStableAdminRoute();
    document.addEventListener("click", intercept, true);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") setProfileMenuOpen(false); }, true);
    window.addEventListener("pageshow", cleanBodyLocks);
    window.addEventListener("popstate", cleanBodyLocks);
    cleanBodyLocks();
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
