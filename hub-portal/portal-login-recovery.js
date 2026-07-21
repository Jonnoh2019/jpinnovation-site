(() => {
  "use strict";
  const VERSION = "portal-login-recovery-20260721a";
  const params = new URLSearchParams(window.location.search);
  const entry = params.get("entry") || "client";
  const requestedView = params.get("view") || "dashboard";
  const validViews = new Set(["dashboard", "clientwork", "onboarding", "boards", "projects", "quotes", "directory", "resources", "events", "messages", "notifications", "rewards", "profile", "settings", "admin", "metrics"]);
  const targetView = validViews.has(requestedView) ? requestedView : "dashboard";

  function reveal() {
    document.documentElement.classList.remove("restoring-portal-session");
    document.body && document.body.style.removeProperty("pointer-events");
    document.body && document.body.style.removeProperty("overflow");
    const appShell = document.querySelector("#appShell");
    if (appShell && entry === "hub") appShell.classList.remove("hidden");
  }

  function clearStaleMenus() {
    document.querySelector("#memberProfileMenu")?.classList.remove("open");
    document.querySelector("#appShell")?.classList.remove("profile-menu-open", "mobile-menu-open");
    document.querySelector("#mobileMenuBackdrop")?.classList.remove("open");
    document.querySelectorAll(".auth-dialog.open").forEach((dialog) => {
      if (!dialog.matches("#confirmDialog")) {
        dialog.classList.remove("open");
        dialog.setAttribute("aria-hidden", "true");
      }
    });
  }

  function renderRequestedView() {
    try {
      if (entry !== "hub") return false;
      if (typeof window.renderView !== "function") return false;
      reveal();
      clearStaleMenus();
      window.renderView(targetView);
      return true;
    } catch (error) {
      console.warn(`[${VERSION}] requested view recovery failed`, error);
      return false;
    }
  }

  function install() {
    window.__jpPortalLoginRecovery = VERSION;
    reveal();
    window.setTimeout(reveal, 600);
    window.setTimeout(() => {
      reveal();
      renderRequestedView();
    }, 1600);
    window.setTimeout(() => {
      reveal();
      if (!renderRequestedView()) {
        const mount = document.querySelector("#viewMount");
        const appShell = document.querySelector("#appShell");
        if (entry === "hub" && appShell && mount && !mount.children.length) {
          mount.innerHTML = `
            <section class="empty-state recovery-state">
              <h2>Opening your Hub dashboard...</h2>
              <p>If this does not continue, refresh once or return to the Hub sign-in page.</p>
              <div class="section-actions">
                <a class="primary-button" href="index.html?entry=hub&view=dashboard&v=${VERSION}">Retry dashboard</a>
                <a class="secondary-button" href="../hub/signin.html?signin=1&v=${VERSION}">Back to sign in</a>
              </div>
            </section>`;
        }
      }
    }, 3600);
    window.addEventListener("error", reveal, { passive: true });
    window.addEventListener("unhandledrejection", reveal, { passive: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
