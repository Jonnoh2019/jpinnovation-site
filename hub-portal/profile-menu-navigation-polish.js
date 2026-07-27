/* Legacy profile menu polish handler disabled.
   The single-owner handler in profile-menu-avatar-regression-fix.js now owns profile-menu taps. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-polish-20260727-disabled";
  window.__jpProfileMenuNavigationPolish = VERSION;
  document.documentElement.dataset.jpProfileMenuNavigationPolish = VERSION;
  console.info(`[${VERSION}] disabled legacy handler; single-owner menu active`);
})();