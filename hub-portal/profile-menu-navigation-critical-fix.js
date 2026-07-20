/* Legacy entrypoint kept for cache compatibility. The final menu/navigation fix is loaded once here. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260720d";

  function loadScript(id, src) {
    const base = src.split("?")[0];
    const existing = document.getElementById(id);
    if (existing && existing.src.includes(src)) return;
    if (document.querySelector(`script[src*="${base}"][src*="${src.split("?")[1] || ""}"]`)) return;
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function install() {
    document.documentElement.dataset.jpProfileCriticalNav = VERSION;
    loadScript("jpAdminRouteStabilityFixScript", "admin-route-stability-fix.js?v=admin-route-stability-fix-20260719a");
    loadScript("jpProfileMenuFinalFixScript", "profile-menu-final-fix.js?v=profile-menu-final-fix-20260720c");
    loadScript("jpProfileMenuCompactOverrideScript", "profile-menu-compact-override.js?v=profile-menu-compact-override-20260720d");
    console.info(`[${VERSION}] compatibility loader installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
