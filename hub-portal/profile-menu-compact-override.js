/* JP Innovation profile-menu viewport safety.
   This keeps the profile menu out of clipped/transformed header containers. */
(() => {
  "use strict";
  const VERSION = "profile-menu-compact-override-20260722-ring-clean-inline";
  document.documentElement.dataset.jpProfileMenuCompactOverride = VERSION;

  function installStyles() {
    let style = document.getElementById("jpProfileMenuViewportSafeStyles");
    if (!style) {
      style = document.createElement("style");
      style.id = "jpProfileMenuViewportSafeStyles";
      document.head.appendChild(style);
    }
    style.textContent = `
      #memberProfileButton,#memberProfileButton *{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important}
      #memberProfileButton.member-chip {
        border: 1px solid rgba(22,139,255,.46) !important;
        outline: none !important;
        box-shadow: 0 0 0 1px rgba(22,139,255,.14), 0 10px 26px rgba(0,0,0,.34) !important;
      }
      #memberProfileButton.member-chip::before,
      #memberProfileButton.member-chip::after,
      #memberInitials::before,
      #memberInitials::after {
        content: none !important;
        display: none !important;
      }
      #memberProfileButton.member-chip #memberInitials,
      #memberInitials.jp-role-avatar,
      #memberInitials.jp-role-avatar-admin {
        box-sizing: border-box !important;
        aspect-ratio: 1 / 1 !important;
        border-radius: 999px !important;
        border: 3px solid #168bff !important;
        outline: none !important;
        color: #ffffff !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        line-height: 1 !important;
        box-shadow:
          inset 0 1px 3px rgba(255,255,255,.30),
          inset 0 -4px 9px rgba(50,31,2,.42),
          0 6px 16px rgba(0,0,0,.35) !important;
      }
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
        height: calc(var(--jp-visible-vh, 100dvh) - var(--jp-profile-menu-top, 96px) - 14px - env(safe-area-inset-bottom)) !important;
        min-height: 260px !important;
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
        z-index: 2147483000 !important;
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
        translate: none !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-link {
        display: grid !important;
        min-height: 44px !important;
        max-height: none !important;
      }
      @media (min-width: 761px) {
        #memberProfileMenu.member-profile-menu.open {
          left: auto !important;
          right: 18px !important;
          width: min(390px, calc(100vw - 36px)) !important;
          max-width: calc(100vw - 36px) !important;
        }
      }
      @media (max-width: 430px) {
        #memberProfileMenu.member-profile-menu.open .profile-menu-link { min-height: 42px !important; }
        #memberProfileMenu.member-profile-menu.open .profile-menu-link small { display: none !important; }
      }
    `;
  }

  function applyAvatarRingClean() {
    const trigger = document.querySelector("#memberProfileButton.member-chip");
    const avatar = document.querySelector("#memberInitials");
    if (trigger) {
      trigger.style.setProperty("border", "1px solid rgba(22,139,255,.46)", "important");
      trigger.style.setProperty("outline", "none", "important");
      trigger.style.setProperty("box-shadow", "0 0 0 1px rgba(22,139,255,.14), 0 10px 26px rgba(0,0,0,.34)", "important");
    }
    if (avatar) {
      avatar.style.setProperty("border", "3px solid #168bff", "important");
      avatar.style.setProperty("outline", "none", "important");
      avatar.style.setProperty("border-radius", "999px", "important");
      avatar.style.setProperty("aspect-ratio", "1 / 1", "important");
      avatar.style.setProperty("box-shadow", "inset 0 1px 3px rgba(255,255,255,.30), inset 0 -4px 9px rgba(50,31,2,.42), 0 6px 16px rgba(0,0,0,.35)", "important");
    }
  }

  function ensureBodyRoot() {
    const menu = document.querySelector("#memberProfileMenu.member-profile-menu");
    if (menu && menu.parentElement !== document.body) {
      document.body.appendChild(menu);
      menu.dataset.jpBodyRoot = VERSION;
    }
    applyAvatarRingClean();
    return menu;
  }

  function visibleVh() {
    return Math.max(420, Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720));
  }

  function setMenuVars() {
    const header = document.querySelector(".workspace-header") || document.querySelector("header");
    const rect = header?.getBoundingClientRect?.();
    const top = rect ? Math.round(rect.bottom + 8) : 96;
    const safeTop = Math.max(84, Math.min(top, visibleVh() - 280));
    document.documentElement.style.setProperty("--jp-visible-vh", `${visibleVh()}px`);
    document.documentElement.style.setProperty("--jp-profile-menu-top", `${safeTop}px`);
  }

  function cleanClosedState() {
    const menu = ensureBodyRoot();
    const trigger = document.querySelector("#memberProfileButton");
    const open = !!menu && menu.classList.contains("open") && menu.getAttribute("aria-hidden") === "false";
    setMenuVars();
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
    applyAvatarRingClean();
  }

  installStyles();
  ensureBodyRoot();
  setMenuVars();
  applyAvatarRingClean();
  window.addEventListener("pageshow", cleanClosedState, true);
  window.addEventListener("popstate", cleanClosedState, true);
  window.addEventListener("resize", () => { setMenuVars(); applyAvatarRingClean(); }, true);
  window.visualViewport?.addEventListener("resize", setMenuVars);
  window.visualViewport?.addEventListener("scroll", setMenuVars);
  document.addEventListener("visibilitychange", cleanClosedState, true);
  document.addEventListener("pointerup", () => { ensureBodyRoot(); setMenuVars(); applyAvatarRingClean(); }, true);
  new MutationObserver(() => { ensureBodyRoot(); applyAvatarRingClean(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });
  console.info(`[${VERSION}] installed`);
})();
