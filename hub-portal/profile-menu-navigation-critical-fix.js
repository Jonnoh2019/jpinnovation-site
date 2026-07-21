/* Legacy entrypoint kept for cache compatibility. Also protects Hub login/session recovery. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260721-login-recovery2";
  const AVATAR_SRC = "profile-menu-avatar-regression-fix.js?v=profile-menu-avatar-regression-fix-20260720k";
  const FINAL_SRC = "profile-menu-final-fix.js?v=profile-menu-final-fix-20260720-safe1";
  const VALID_VIEWS = new Set([
    "dashboard",
    "clientwork",
    "onboarding",
    "boards",
    "projects",
    "quotes",
    "directory",
    "resources",
    "events",
    "messages",
    "notifications",
    "rewards",
    "profile",
    "settings",
    "admin",
    "metrics",
  ]);
  let recoveryTimerIds = [];

  function currentParams() {
    return new URLSearchParams(window.location.search);
  }

  function requestedView() {
    const params = currentParams();
    const view = params.get("view") || "dashboard";
    return VALID_VIEWS.has(view) ? view : "dashboard";
  }

  function revealPortal() {
    document.documentElement.classList.remove("restoring-portal-session");
    document.documentElement.classList.remove("profile-menu-open", "mobile-menu-open");
    if (document.body) {
      document.body.style.removeProperty("pointer-events");
      document.body.style.removeProperty("overflow");
      document.body.classList.remove("profile-menu-open", "mobile-menu-open", "modal-open", "no-scroll");
    }
    if (currentParams().get("entry") === "hub") {
      document.querySelector("#appShell")?.classList.remove("hidden");
    }
  }

  function cleanupStaleLayers() {
    document.querySelector("#memberProfileMenu")?.classList.remove("open", "is-open", "closing", "opening");
    document.querySelector("#memberProfileMenu")?.setAttribute("aria-hidden", "true");
    document.querySelector("#appShell")?.classList.remove("profile-menu-open", "mobile-menu-open");
    document.querySelector("#mobileMenuBackdrop")?.classList.remove("open", "is-open");
    document.querySelectorAll(".profile-menu-backdrop, .menu-backdrop, .drawer-backdrop").forEach((node) => {
      node.classList.remove("open", "is-open");
      node.setAttribute("aria-hidden", "true");
    });
    document.querySelectorAll(".auth-dialog.open").forEach((dialog) => {
      if (!dialog.matches("#confirmDialog")) {
        dialog.classList.remove("open");
        dialog.setAttribute("aria-hidden", "true");
      }
    });
  }

  function rewriteHubLandingUrl(url) {
    const value = String(url || "");
    if (!value.includes("../hub/index.html") && !value.includes("/hub/index.html")) return url;
    if (!value.includes("signin=1") && !value.endsWith("hub/index.html")) return url;
    return "../hub/signin.html?signin=1&v=stale-hub-redirect-rewrite-20260721";
  }

  function installNavigationRewrite() {
    if (window.__jpHubNavigationRewriteInstalled) return;
    window.__jpHubNavigationRewriteInstalled = VERSION;
    try {
      const nativeAssign = Location.prototype.assign;
      const nativeReplace = Location.prototype.replace;
      Location.prototype.assign = function patchedAssign(url) {
        return nativeAssign.call(this, rewriteHubLandingUrl(url));
      };
      Location.prototype.replace = function patchedReplace(url) {
        return nativeReplace.call(this, rewriteHubLandingUrl(url));
      };
    } catch (error) {
      console.warn(`[${VERSION}] navigation rewrite could not be installed`, error);
    }
  }

  function renderRequestedView() {
    try {
      if (currentParams().get("entry") !== "hub") return false;
      if (typeof window.renderView !== "function") return false;
      revealPortal();
      cleanupStaleLayers();
      window.renderView(requestedView());
      return true;
    } catch (error) {
      console.warn(`[${VERSION}] requested Hub view recovery failed`, error);
      return false;
    }
  }

  function showRecoveryFallback() {
    try {
      if (currentParams().get("entry") !== "hub") return;
      const mount = document.querySelector("#viewMount");
      const appShell = document.querySelector("#appShell");
      if (!mount || !appShell || mount.children.length) return;
      revealPortal();
      appShell.classList.remove("hidden");
      mount.innerHTML = `
        <section class="empty-state recovery-state">
          <h2>Opening your Hub dashboard...</h2>
          <p>The Hub did not finish loading cleanly. Use Retry to reopen it without closing the app.</p>
          <div class="section-actions">
            <a class="primary-button" href="index.html?entry=hub&view=${requestedView()}&v=${VERSION}">Retry</a>
            <a class="secondary-button" href="../hub/signin.html?signin=1&v=${VERSION}">Back to sign in</a>
          </div>
        </section>`;
    } catch (error) {
      console.warn(`[${VERSION}] fallback render failed`, error);
    }
  }

  function redirectDirectHubEntry() {
    try {
      const params = currentParams();
      const directHubEntry = params.get("entry") === "hub" && !params.has("view") && !params.has("signin");
      if (!directHubEntry) return false;
      window.location.replace("../hub/signin.html?signin=1&v=hub-entry-recovery-20260721");
      return true;
    } catch (error) {
      console.warn("Hub direct-entry recovery failed.", error);
      return false;
    }
  }

  function forceScript(id, src) {
    const base = src.split("?")[0];
    const expectedKey = src.split("?")[1] || "";
    const existing = document.getElementById(id) || document.querySelector(`script[src*="${base}"]`);
    if (existing) {
      if (expectedKey && !existing.src.includes(expectedKey)) existing.src = src;
      existing.id = id;
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function scheduleRecovery() {
    recoveryTimerIds.forEach((timerId) => window.clearTimeout(timerId));
    recoveryTimerIds = [250, 800, 1600, 3200, 6500].map((delay) => window.setTimeout(() => {
      revealPortal();
      if (delay >= 1600) renderRequestedView();
      if (delay === 6500) showRecoveryFallback();
    }, delay));
  }

  function install() {
    document.documentElement.dataset.jpProfileCriticalNav = VERSION;
    installNavigationRewrite();
    revealPortal();
    cleanupStaleLayers();
    if (redirectDirectHubEntry()) return;
    scheduleRecovery();
    window.addEventListener("pageshow", () => {
      revealPortal();
      cleanupStaleLayers();
      renderRequestedView();
    }, { passive: true });
    window.addEventListener("error", () => {
      revealPortal();
      showRecoveryFallback();
    }, { passive: true });
    window.addEventListener("unhandledrejection", () => {
      revealPortal();
      showRecoveryFallback();
    }, { passive: true });
    forceScript("jpProfileAvatarSafeScript", AVATAR_SRC);
    forceScript("jpAdminRouteStabilityFixScript", "admin-route-stability-fix.js?v=admin-route-stability-fix-20260719a");
    forceScript("jpProfileMenuFinalFixScript", FINAL_SRC);
    console.info(`[${VERSION}] safe compatibility and Hub login recovery installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();