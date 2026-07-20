/* Legacy compatibility shim. The shared role/avatar system now lives in profile-menu-final-fix.js. */
(() => {
  "use strict";
  const VERSION = "profile-menu-avatar-regression-fix-20260720j";

  function cleanupLegacyBadges() {
    document.documentElement.dataset.jpProfileMenuRegressionFix = VERSION;
    document.querySelectorAll("#memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton,#memberStatusStarInline").forEach((node) => {
      node.classList.add("hidden");
      node.setAttribute("aria-hidden", "true");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cleanupLegacyBadges, { once: true });
  } else {
    cleanupLegacyBadges();
  }
  window.addEventListener("jp:view-rendered", cleanupLegacyBadges);
})();
