/* Disabled legacy profile-menu override.
   The Hub now uses profile-menu-navigation-critical-fix.js as the single menu/navigation guard.
   Keeping this file as a no-op prevents old script references from stacking duplicate overlays. */
(() => {
  "use strict";
  document.documentElement.dataset.jpProfileMenuFinalFix = "disabled-20260721-stability";
  console.info("[JP Hub stability] legacy profile-menu-final-fix disabled");
})();
