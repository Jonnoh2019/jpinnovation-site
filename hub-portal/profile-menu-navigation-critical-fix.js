/* Legacy entrypoint kept for cache compatibility. The final menu/navigation fix is loaded once here. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260720e";

  function loadScript(id, src) {
    const base = src.split("?")[0];
    const expectedKey = src.split("?")[1] || "";
    const existing = document.getElementById(id);
    if (existing) {
      if (expectedKey && !existing.src.includes(expectedKey)) existing.src = src;
      return;
    }
    const already = document.querySelector(`script[src*="${base}"]`);
    if (already) {
      if (expectedKey && !already.src.includes(expectedKey)) already.src = src;
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
    loadScript("jpAdminRouteStabilityFixScript", "admin-route-stability-fix.js?v=admin-route-stability-fix-20260719a");
    loadScript("jpProfileMenuFinalFixScript", "profile-menu-final-fix.js?v=profile-menu-final-fix-20260720e");
    console.info(`[${VERSION}] compatibility loader installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();