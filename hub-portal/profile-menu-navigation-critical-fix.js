/* Legacy profile menu navigation guard disabled.
   The single-owner handler in profile-menu-avatar-regression-fix.js now owns profile-menu navigation. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260727-disabled";
  window.__jpProfileCriticalNavDisabled = VERSION;
  document.documentElement.dataset.jpProfileCriticalNav = VERSION;
  console.info(`[${VERSION}] disabled legacy handler; single-owner menu active`);
})();