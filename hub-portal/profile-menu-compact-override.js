/* JP Innovation profile-menu viewport safety.
   Stable shim: final navigation ownership lives in profile-menu-navigation-polish.js. */
(() => {
  "use strict";
  const VERSION = "profile-menu-compact-override-20260722-passive";
  document.documentElement.dataset.jpProfileMenuCompactOverride = VERSION;

  function installStyles() {
    let style = document.getElementById("jpProfileMenuViewportSafeStyles");
    if (!style) {
      style = document.createElement("style");
      style.id = "jpProfileMenuViewportSafeStyles";
      document.head.appendChild(style);
    }
    style.textContent = `
      #memberProfileMenu.member-profile-menu:not(.open),
      #memberProfileMenu.member-profile-menu[aria-hidden="true"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        height: 0 !important;
        max-height: 0 !important;
        overflow: hidden !important;
        transform: none !important;
        translate: none !important;
        clip-path: none !important;
      }
      #memberProfileMenu.member-profile-menu.open {
        box-sizing: border-box !important;
        position: fixed !important;
        left: max(14px, env(safe-area-inset-left)) !important;
        right: max(14px, env(safe-area-inset-right)) !important;
        top: var(--jp-profile-menu-top, 96px) !important;
        bottom: calc(14px + env(safe-area-inset-bottom)) !important;
        width: auto !important;
        max-width: calc(100vw - 28px) !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: calc(var(--jp-visible-vh, 100dvh) - var(--jp-profile-menu-top, 96px) - 14px - env(safe-area-inset-bottom)) !important;
        display: flex !important;
        flex-direction: column !important;
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
        clip-path: none !important;
        contain: none !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-header,
      #memberProfileMenu.member-profile-menu.open .profile-menu-link {
        flex: 0 0 auto !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: none !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-link {
        display: grid !important;
        min-height: 44px !important;
        max-height: none !important;
      }
      @media (max-width: 430px) {
        #memberProfileMenu.member-profile-menu.open .profile-menu-link { min-height: 42px !important; }
        #memberProfileMenu.member-profile-menu.open .profile-menu-link small { display: none !important; }
      }
    `;
  }

  function cleanClosedState() {
    const menu = document.querySelector("#memberProfileMenu.member-profile-menu");
    const trigger = document.querySelector("#memberProfileButton");
    const open = !!menu && menu.classList.contains("open") && menu.getAttribute("aria-hidden") === "false";
    if (open) return;
    document.body.classList.remove("member-profile-menu-open", "profile-menu-open", "jp-profile-menu-open", "jp-menu-hard-lock", "menu-scroll-locked");
    document.documentElement.classList.remove("member-profile-menu-open", "profile-menu-open", "jp-profile-menu-open", "jp-menu-hard-lock", "menu-scroll-locked");
    [document.body, document.documentElement].forEach((node) => {
      node.style.removeProperty("overflow");
      node.style.removeProperty("pointer-events");
      node.style.removeProperty("touch-action");
    });
    if (menu) {
      menu.classList.remove("open", "active", "is-open", "show", "visible", "is-opening", "is-closing");
      menu.setAttribute("aria-hidden", "true");
      menu.hidden = true;
      ["display", "visibility", "opacity", "pointer-events", "height", "max-height", "overflow", "transform", "translate", "top", "left", "right", "bottom", "width", "position"].forEach((prop) => menu.style.removeProperty(prop));
      try { menu.scrollTop = 0; } catch (_) {}
    }
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  installStyles();
  window.addEventListener("pageshow", cleanClosedState, true);
  window.addEventListener("popstate", cleanClosedState, true);
  document.addEventListener("visibilitychange", cleanClosedState, true);
  console.info(`[${VERSION}] installed`);
})();
