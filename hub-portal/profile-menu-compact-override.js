/* JP Innovation profile-menu viewport safety.
   Keeps the profile menu inside the visible screen on desktop, mobile and PWA. */
(() => {
  "use strict";
  const VERSION = "profile-menu-compact-override-20260721-stable9-hidden-flag";
  document.documentElement.dataset.jpProfileMenuCompactOverride = VERSION;

  const TOP_DESKTOP = "clamp(82px, 14dvh, 112px)";
  const TOP_MOBILE = "96px";
  const BOTTOM = "calc(14px + env(safe-area-inset-bottom))";
  const HEIGHT_DESKTOP = "calc(100dvh - clamp(82px, 14dvh, 112px) - 14px - env(safe-area-inset-bottom))";
  const HEIGHT_MOBILE = "calc(100dvh - 110px - env(safe-area-inset-bottom))";

  function installStyles() {
    let style = document.getElementById("jpProfileMenuViewportSafeStyles");
    if (!style) {
      style = document.createElement("style");
      style.id = "jpProfileMenuViewportSafeStyles";
      document.head.appendChild(style);
    }
    style.textContent = `
      #memberProfileMenu.member-profile-menu,
      #profileMenu.profile-menu { box-sizing: border-box !important; }
      #memberProfileMenu.member-profile-menu.open,
      #profileMenu.profile-menu.open,
      body.member-profile-menu-open #memberProfileMenu.member-profile-menu,
      body.profile-menu-open #profileMenu.profile-menu {
        position: fixed !important;
        top: ${TOP_DESKTOP} !important;
        right: max(14px, env(safe-area-inset-right)) !important;
        left: auto !important;
        bottom: ${BOTTOM} !important;
        width: min(420px, calc(100vw - 28px)) !important;
        max-width: calc(100vw - 28px) !important;
        height: ${HEIGHT_DESKTOP} !important;
        min-height: 360px !important;
        max-height: ${HEIGHT_DESKTOP} !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 6px !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain !important;
        -webkit-overflow-scrolling: touch !important;
        transform: none !important;
        translate: none !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        z-index: 99999 !important;
        clip: auto !important;
        clip-path: none !important;
        contain: none !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-link,
      #profileMenu.profile-menu.open .profile-menu-link,
      body.member-profile-menu-open #memberProfileMenu.member-profile-menu .profile-menu-link,
      body.profile-menu-open #profileMenu.profile-menu .profile-menu-link {
        display: grid !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        flex: 0 0 auto !important;
        min-height: 50px !important;
        max-height: none !important;
        transform: none !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-header,
      #profileMenu.profile-menu.open .profile-menu-header,
      body.member-profile-menu-open #memberProfileMenu.member-profile-menu .profile-menu-header,
      body.profile-menu-open #profileMenu.profile-menu .profile-menu-header {
        flex: 0 0 auto !important;
        min-height: 66px !important;
      }
      @media (max-width: 760px) {
        #memberProfileMenu.member-profile-menu.open,
        #profileMenu.profile-menu.open,
        body.member-profile-menu-open #memberProfileMenu.member-profile-menu,
        body.profile-menu-open #profileMenu.profile-menu {
          top: ${TOP_MOBILE} !important;
          left: max(14px, env(safe-area-inset-left)) !important;
          right: max(14px, env(safe-area-inset-right)) !important;
          width: auto !important;
          height: ${HEIGHT_MOBILE} !important;
          min-height: 0 !important;
          max-height: ${HEIGHT_MOBILE} !important;
        }
      }
    `;
  }

  function shouldBeOpen(menu) {
    if (!menu) return false;
    const trigger = document.querySelector("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]");
    return menu.classList.contains("open") ||
      menu.getAttribute("aria-hidden") === "false" ||
      document.body.classList.contains("member-profile-menu-open") ||
      document.body.classList.contains("profile-menu-open") ||
      trigger?.getAttribute("aria-expanded") === "true";
  }

  function forceVisibleIfOpen() {
    const menu = document.querySelector("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu");
    if (!shouldBeOpen(menu)) return;
    const mobile = innerWidth <= 760;
    menu.hidden = false;
    menu.removeAttribute("hidden");
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
    menu.style.position = "fixed";
    menu.style.top = mobile ? "96px" : TOP_DESKTOP;
    menu.style.right = "max(14px, env(safe-area-inset-right))";
    menu.style.bottom = BOTTOM;
    menu.style.left = mobile ? "max(14px, env(safe-area-inset-left))" : "auto";
    menu.style.width = mobile ? "auto" : "min(420px, calc(100vw - 28px))";
    menu.style.maxWidth = "calc(100vw - 28px)";
    menu.style.height = mobile ? HEIGHT_MOBILE : HEIGHT_DESKTOP;
    menu.style.minHeight = mobile ? "0" : "360px";
    menu.style.maxHeight = menu.style.height;
    menu.style.display = "flex";
    menu.style.flexDirection = "column";
    menu.style.overflowY = "auto";
    menu.style.overflowX = "hidden";
    menu.style.transform = "none";
    menu.style.visibility = "visible";
    menu.style.opacity = "1";
    menu.style.pointerEvents = "auto";
    menu.querySelectorAll(".profile-menu-link").forEach((row) => {
      row.style.display = "grid";
      row.style.visibility = "visible";
      row.style.opacity = "1";
      row.style.pointerEvents = "auto";
      row.style.minHeight = "50px";
    });
    document.body.classList.remove("jp-menu-hard-lock");
    document.documentElement.classList.remove("jp-menu-hard-lock");
  }

  function clearStaleHardLock() {
    const menu = document.querySelector("#memberProfileMenu,#profileMenu,.member-profile-menu,.profile-menu");
    if (shouldBeOpen(menu)) {
      forceVisibleIfOpen();
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
  setInterval(forceVisibleIfOpen, 120);
  console.info(`[${VERSION}] installed`);
})();
