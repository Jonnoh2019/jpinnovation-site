/* JP Innovation profile-menu viewport safety.
   Keeps the profile menu inside the visible screen on desktop, mobile and PWA. */
(() => {
  "use strict";
  const VERSION = "profile-menu-compact-override-20260721-fixed-visible";
  document.documentElement.dataset.jpProfileMenuCompactOverride = VERSION;

  function installStyles() {
    if (document.getElementById("jpProfileMenuViewportSafeStyles")) return;
    const style = document.createElement("style");
    style.id = "jpProfileMenuViewportSafeStyles";
    style.textContent = `
      #memberProfileMenu.member-profile-menu,
      #profileMenu.profile-menu,
      .member-profile-menu.open,
      .profile-menu.open {
        position: fixed !important;
        top: clamp(82px, 14dvh, 112px) !important;
        right: max(14px, env(safe-area-inset-right)) !important;
        left: auto !important;
        bottom: calc(14px + env(safe-area-inset-bottom)) !important;
        width: min(420px, calc(100vw - 28px)) !important;
        max-width: calc(100vw - 28px) !important;
        height: auto !important;
        max-height: none !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
        transform: none !important;
        z-index: 9999 !important;
        box-sizing: border-box !important;
      }
      @media (max-width: 760px) {
        #memberProfileMenu.member-profile-menu,
        #profileMenu.profile-menu,
        .member-profile-menu.open,
        .profile-menu.open {
          left: max(14px, env(safe-area-inset-left)) !important;
          right: max(14px, env(safe-area-inset-right)) !important;
          width: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function forceVisibleIfOpen() {
    const menu = document.querySelector("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu");
    if (!menu || menu.hidden || getComputedStyle(menu).display === "none") return;
    menu.style.position = "fixed";
    menu.style.top = "clamp(82px, 14dvh, 112px)";
    menu.style.right = "max(14px, env(safe-area-inset-right))";
    menu.style.bottom = "calc(14px + env(safe-area-inset-bottom))";
    menu.style.left = innerWidth <= 760 ? "max(14px, env(safe-area-inset-left))" : "auto";
    menu.style.width = innerWidth <= 760 ? "auto" : "min(420px, calc(100vw - 28px))";
    menu.style.maxWidth = "calc(100vw - 28px)";
    menu.style.height = "auto";
    menu.style.maxHeight = "none";
    menu.style.overflowY = "auto";
    menu.style.transform = "none";
  }

  function clearStaleHardLock() {
    const menu = document.querySelector("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu");
    const visible = menu && !menu.hidden && getComputedStyle(menu).display !== "none";
    if (visible) {
      forceVisibleIfOpen();
      document.body.classList.remove("jp-menu-hard-lock");
      document.documentElement.classList.remove("jp-menu-hard-lock");
      return;
    }
    document.body.classList.remove("jp-menu-hard-lock", "member-profile-menu-open", "profile-menu-open", "menu-scroll-locked");
    document.documentElement.classList.remove("jp-menu-hard-lock", "member-profile-menu-open", "profile-menu-open", "menu-scroll-locked");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }

  installStyles();
  document.addEventListener("click", () => setTimeout(clearStaleHardLock, 50), true);
  window.addEventListener("pageshow", clearStaleHardLock);
  window.addEventListener("resize", forceVisibleIfOpen);
  console.info(`[${VERSION}] installed`);
})();
