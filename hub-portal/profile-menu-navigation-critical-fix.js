/* Legacy entrypoint kept for cache compatibility. The final menu/navigation fix is loaded once here. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260720a";

  function loadScript(id, src) {
    if (document.getElementById(id) || document.querySelector(`script[src*="${src.split("?")[0]}"]`)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  function install() {
    document.documentElement.dataset.jpProfileCriticalNav = VERSION;
    loadScript("jpAdminRouteStabilityFixScript", "admin-route-stability-fix.js?v=admin-route-stability-fix-20260719a");
    loadScript("jpProfileMenuFinalFixScript", "profile-menu-final-fix.js?v=profile-menu-final-fix-20260720a");
    console.info(`[${VERSION}] compatibility loader installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();