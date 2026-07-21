/* Disabled compact profile-menu override.
   This file previously recalculated menu dimensions after navigation and could leave the lower menu cut off.
   The single stability guard now handles menu scroll reset and viewport-safe sizing. */
(() => {
  "use strict";
  document.documentElement.dataset.jpProfileMenuCompactOverride = "disabled-20260721-stability";
  console.info("[JP Hub stability] legacy profile-menu-compact-override disabled");
})();
