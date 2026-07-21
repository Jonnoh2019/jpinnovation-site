/* JP Innovation profile-menu viewport safety.
   The legacy compact override is disabled; this file now only keeps the menu inside the visible mobile viewport. */
(() => {
  "use strict";
  const VERSION = "profile-menu-compact-override-20260721-viewport-safe";
  document.documentElement.dataset.jpProfileMenuCompactOverride = VERSION;

  function installStyles() {
    if (document.getElementById("jpProfileMenuViewportSafeStyles")) return;
    const style = document.createElement("style");
    style.id = "jpProfileMenuViewportSafeStyles";
    style.textContent = `
      #memberProfileMenu,
      #profileMenu,
      .member-profile-menu,
      .profile-menu {
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
      }
      @media (max-width: 760px) {
        #memberProfileMenu.member-profile-menu,
        #profileMenu.profile-menu,
        .member-profile-menu.open,
        .profile-menu.open {
          position: fixed !important;
          top: clamp(82px, 14dvh, 112px) !important;
          left: max(14px, env(safe-area-inset-left)) !important;
          right: max(14px, env(safe-area-inset-right)) !important;
          bottom: calc(14px + env(safe-area-inset-bottom)) !important;
          width: auto !important;
          max-width: none !important;
          height: auto !important;
          max-height: none !important;
          overflow-y: auto !important;
          transform: none !important;
          z-index: 9999 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function clearStaleHardLock() {
    const menu = document.querySelector("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu");
    const visible = menu && !menu.hidden && getComputedStyle(menu).display !== "none";
    if (!visible) {
      document.body.classList.remove("jp-menu-hard-lock", "member-profile-menu-open", "profile-menu-open", "menu-scroll-locked");
      document.documentElement.classList.remove("jp-menu-hard-lock", "member-profile-menu-open", "profile-menu-open", "menu-scroll-locked");
      document.body.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("overflow");
    }
  }

  installStyles();
  document.addEventListener("click", () => setTimeout(clearStaleHardLock, 50), true);
  window.addEventListener("pageshow", clearStaleHardLock);
  console.info(`[${VERSION}] installed`);
})();
