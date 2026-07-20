/* Legacy entrypoint kept for cache compatibility. The final menu/navigation fix is loaded once here. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260720-safe3";
  const AVATAR_SRC = "profile-menu-avatar-regression-fix.js?v=profile-menu-avatar-regression-fix-20260720k";
  const FINAL_SRC = "profile-menu-final-fix.js?v=profile-menu-final-fix-20260720-safe1";

  function revealPortal() {
    document.documentElement.classList.remove("restoring-portal-session");
    document.body && document.body.style.removeProperty("pointer-events");
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

  function install() {
    document.documentElement.dataset.jpProfileCriticalNav = VERSION;
    revealPortal();
    window.setTimeout(revealPortal, 1200);
    window.setTimeout(revealPortal, 3500);
    window.addEventListener("error", revealPortal, { passive: true });
    window.addEventListener("unhandledrejection", revealPortal, { passive: true });
    forceScript("jpProfileAvatarSafeScript", AVATAR_SRC);
    forceScript("jpAdminRouteStabilityFixScript", "admin-route-stability-fix.js?v=admin-route-stability-fix-20260719a");
    forceScript("jpProfileMenuFinalFixScript", FINAL_SRC);
    console.info(`[${VERSION}] safe compatibility loader installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();