/* JP Innovation Hub final profile menu/navigation stabiliser.
   Owns the profile-menu open/close/click flow so older fallback scripts cannot leave ghost overlays. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-polish-20260722-stable-final";
  if (window.__jpProfileMenuNavigationPolish === VERSION) return;
  window.__jpProfileMenuNavigationPolish = VERSION;
  document.documentElement.dataset.jpProfileMenuNavigationPolish = VERSION;

  const VALID = new Set(["dashboard", "admin", "metrics", "profile", "clientwork", "client-work", "boards", "projects", "quotes", "directory", "resources", "events", "messages", "notifications", "settings", "rewards"]);
  const PROFILE_ACTION_MAP = { "my-posts": "boards", "my-quotes": "quotes", signout: "signout" };
  let navigating = false;
  let ownedPointer = 0;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function menu() { return $("#memberProfileMenu.member-profile-menu"); }
  function trigger() { return $("#memberProfileButton"); }
  function viewMount() { return $("#viewMount") || $("[data-view-mount]"); }

  function currentView() {
    return new URLSearchParams(location.search || "").get("view") || "dashboard";
  }

  function visibleHeight() {
    return Math.max(420, Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720));
  }

  function headerBottom() {
    const header = $(".workspace-mobile-header") || $(".workspace-header") || $(".hub-shell-header") || $("header");
    const rect = header?.getBoundingClientRect?.();
    const raw = rect ? Math.round(rect.bottom + 8) : 96;
    return Math.max(84, Math.min(raw, Math.max(84, visibleHeight() - 280)));
  }

  function setViewportVars() {
    document.documentElement.style.setProperty("--jp-visible-vh", `${visibleHeight()}px`);
    document.documentElement.style.setProperty("--jp-profile-menu-top", `${headerBottom()}px`);
  }

  function installCss() {
    let style = $("#jpFinalProfileMenuNavigationCss");
    if (!style) {
      style = document.createElement("style");
      style.id = "jpFinalProfileMenuNavigationCss";
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
        clip: auto !important;
        clip-path: none !important;
      }
      #memberProfileMenu.member-profile-menu.open {
        position: fixed !important;
        top: var(--jp-profile-menu-top, 96px) !important;
        left: max(12px, env(safe-area-inset-left)) !important;
        right: max(12px, env(safe-area-inset-right)) !important;
        bottom: calc(12px + env(safe-area-inset-bottom)) !important;
        width: auto !important;
        max-width: calc(100vw - 24px) !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: calc(var(--jp-visible-vh, 100dvh) - var(--jp-profile-menu-top, 96px) - 12px - env(safe-area-inset-bottom)) !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 6px !important;
        padding: 8px !important;
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
      #memberProfileMenu.member-profile-menu.open .profile-menu-header,
      #memberProfileMenu.member-profile-menu.open .profile-menu-link {
        flex: 0 0 auto !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: none !important;
        translate: none !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-header {
        display: grid !important;
        min-height: 56px !important;
        margin: 0 0 2px !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-link {
        display: grid !important;
        min-height: 42px !important;
        max-height: none !important;
        margin: 0 !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-link small { display: none !important; }
      #memberProfileMenu.member-profile-menu.open .profile-menu-link[aria-busy="true"] { opacity: .62 !important; pointer-events: none !important; }
      body.jp-profile-menu-locked { overflow: hidden !important; touch-action: none !important; }
      body.jp-profile-menu-locked #memberProfileMenu,
      body.jp-profile-menu-locked #memberProfileButton { touch-action: manipulation !important; }
      @media (min-width: 761px) {
        #memberProfileMenu.member-profile-menu.open {
          left: auto !important;
          right: 18px !important;
          width: min(390px, calc(100vw - 36px)) !important;
          max-width: calc(100vw - 36px) !important;
        }
      }
      @media (max-width: 360px) {
        #memberProfileMenu.member-profile-menu.open { left: 8px !important; right: 8px !important; max-width: calc(100vw - 16px) !important; gap: 4px !important; padding: 7px !important; }
        #memberProfileMenu.member-profile-menu.open .profile-menu-link { min-height: 39px !important; }
      }
    `;
  }

  function removeGhostLayers() {
    $$(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,[data-profile-backdrop]").forEach((node) => node.remove());
    document.body.classList.remove("profile-menu-open", "menu-scroll-locked", "jp-menu-hard-lock", "jp-profile-regression-lock");
    document.documentElement.classList.remove("profile-menu-open", "menu-scroll-locked", "jp-menu-hard-lock", "jp-profile-regression-lock");
    [document.body, document.documentElement].forEach((node) => {
      node.style.removeProperty("pointer-events");
      node.style.removeProperty("touch-action");
    });
  }

  function hardCloseMenu() {
    const m = menu();
    const b = trigger();
    if (m) {
      m.classList.remove("open", "active", "show", "visible", "is-open", "is-opening", "is-closing", "stuck", "cut-off");
      m.setAttribute("aria-hidden", "true");
      m.hidden = true;
      ["display", "visibility", "opacity", "pointer-events", "height", "min-height", "max-height", "overflow", "transform", "translate", "top", "left", "right", "bottom", "width", "max-width", "position", "clip", "clip-path", "contain"].forEach((prop) => m.style.removeProperty(prop));
      try { m.scrollTop = 0; } catch (_) {}
      $$(".profile-menu-link", m).forEach((row) => {
        row.removeAttribute("aria-busy");
        row.classList.remove("is-loading", "selected", "active", "is-active");
        row.style.removeProperty("pointer-events");
      });
    }
    if (b) b.setAttribute("aria-expanded", "false");
    document.body.classList.remove("member-profile-menu-open", "jp-profile-menu-open", "jp-profile-menu-locked");
    document.documentElement.classList.remove("member-profile-menu-open", "jp-profile-menu-open", "jp-profile-menu-locked");
    [document.body, document.documentElement].forEach((node) => node.style.removeProperty("overflow"));
    removeGhostLayers();
    const active = document.activeElement;
    if (active?.closest?.("#memberProfileMenu")) {
      try { active.blur(); } catch (_) {}
    }
  }

  function openMenu() {
    const m = menu();
    const b = trigger();
    if (!m) return;
    setViewportVars();
    removeGhostLayers();
    m.hidden = false;
    m.removeAttribute("hidden");
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    if (b) b.setAttribute("aria-expanded", "true");
    document.body.classList.add("member-profile-menu-open", "jp-profile-menu-open", "jp-profile-menu-locked");
    document.documentElement.classList.add("member-profile-menu-open", "jp-profile-menu-open");
    m.style.removeProperty("display");
    m.style.removeProperty("height");
    m.style.removeProperty("max-height");
    m.style.removeProperty("transform");
    m.style.removeProperty("translate");
    m.style.removeProperty("clip-path");
    $$(".profile-menu-header,.profile-menu-link", m).forEach((row) => {
      row.hidden = false;
      row.removeAttribute("hidden");
      row.removeAttribute("aria-busy");
      row.classList.remove("is-loading", "selected", "active", "is-active");
      row.style.removeProperty("display");
      row.style.removeProperty("visibility");
      row.style.removeProperty("opacity");
      row.style.removeProperty("pointer-events");
      row.style.removeProperty("transform");
      row.style.removeProperty("max-height");
    });
    requestAnimationFrame(() => { try { m.scrollTop = 0; } catch (_) {} });
  }

  function isOpen() {
    const m = menu();
    return !!m && !m.hidden && m.classList.contains("open") && m.getAttribute("aria-hidden") === "false";
  }

  function targetFrom(row) {
    if (!row) return "";
    const action = row.dataset.profileAction || row.dataset.action || "";
    if (PROFILE_ACTION_MAP[action]) return PROFILE_ACTION_MAP[action];
    let view = row.dataset.profileView || row.dataset.view || row.dataset.routeView || row.dataset.viewLink || "";
    if (!view) {
      const text = (row.textContent || "").toLowerCase();
      if (text.includes("admin")) view = "admin";
      else if (text.includes("metric")) view = "metrics";
      else if (text.includes("client")) view = "clientwork";
      else if (text.includes("post")) view = "boards";
      else if (text.includes("quote")) view = "quotes";
      else if (text.includes("notification")) view = "notifications";
      else if (text.includes("message")) view = "messages";
      else if (text.includes("setting")) view = "settings";
      else if (text.includes("profile")) view = "profile";
    }
    if (view === "client-work") view = "clientwork";
    return VALID.has(view) ? view : "";
  }

  function setUrl(view, replace = false) {
    const params = new URLSearchParams(location.search || "");
    params.set("entry", "hub");
    params.set("view", view);
    params.delete("signin");
    params.delete("register");
    const next = `${location.pathname}?${params.toString()}`;
    const state = { entry: "hub", view };
    if (`${location.pathname}${location.search}` === next) return;
    if (replace) history.replaceState(state, "", next);
    else history.pushState(state, "", next);
  }

  function setTitle(view) {
    const titles = { dashboard: "Dashboard", admin: "Admin Review", metrics: "Website Metrics", profile: "My Profile", clientwork: "My Client Work", boards: "Engineering Discussions", projects: "Projects", quotes: "Quote Requests", directory: "Member Directory", resources: "Resources & Tools", events: "Events", messages: "Messages", notifications: "Notifications", settings: "Settings", rewards: "Rewards" };
    const title = titles[view] || "Dashboard";
    const h = $("#viewTitle");
    if (h) h.textContent = title;
  }

  function renderRoute(view, { replace = false, pop = false } = {}) {
    const dest = VALID.has(view) ? (view === "client-work" ? "clientwork" : view) : "dashboard";
    setTitle(dest);
    if (!pop) setUrl(dest, replace);
    const mount = viewMount();
    try {
      if (typeof window.__jpOriginalRenderView === "function") {
        window.__jpOriginalRenderView(dest);
      } else if (typeof window.renderView === "function" && !window.renderView.__jpDirectNavigation) {
        window.renderView(dest);
      } else if (mount) {
        mount.innerHTML = `<section class="section-card"><h2>${dest === "admin" ? "Admin Review" : "Section loading"}</h2><p class="muted">This section is loading. If it does not appear, use Back to Dashboard.</p><button class="primary-button" data-view-link="dashboard" type="button">Back to Dashboard</button></section>`;
      }
    } catch (error) {
      console.error(`[${VERSION}] route failed`, error);
      if (mount) {
        mount.innerHTML = `<section class="section-card"><h2>This section could not load.</h2><p class="muted">Please retry or return to Dashboard.</p><div class="hero-actions"><button class="primary-button" data-view-link="${dest}" type="button">Retry</button><button class="secondary-button" data-view-link="dashboard" type="button">Back to Dashboard</button></div></section>`;
      }
    } finally {
      hardCloseMenu();
      bindInternalRoutes();
    }
  }

  function menuClick(event) {
    const t = event.target;
    const m = menu();
    const b = trigger();
    if (t?.closest?.("#memberProfileButton")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (navigating) return;
      if (isOpen()) hardCloseMenu(); else openMenu();
      return;
    }
    if (m && isOpen() && !t?.closest?.("#memberProfileMenu") && !t?.closest?.("#memberProfileButton")) {
      hardCloseMenu();
      return;
    }
    const row = t?.closest?.("#memberProfileMenu .profile-menu-link");
    if (!row) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (navigating) return;
    const dest = targetFrom(row);
    if (!dest) return;
    if (dest === "signout" || row.id === "logoutButton") {
      hardCloseMenu();
      return;
    }
    navigating = true;
    row.setAttribute("aria-busy", "true");
    ownedPointer += 1;
    const token = ownedPointer;
    hardCloseMenu();
    requestAnimationFrame(() => {
      try { if (token === ownedPointer) renderRoute(dest); }
      finally { setTimeout(() => { if (token === ownedPointer) navigating = false; }, 120); }
    });
  }

  function bindInternalRoutes() {
    $$("[data-view-link]").forEach((button) => {
      if (button.dataset.jpPolishRouteBound === VERSION) return;
      button.dataset.jpPolishRouteBound = VERSION;
      button.addEventListener("click", (event) => {
        const dest = button.dataset.viewLink;
        if (!dest || !VALID.has(dest)) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        renderRoute(dest);
      }, true);
    });
  }

  function patchRenderView() {
    if (typeof window.renderView !== "function" || window.renderView.__jpDirectNavigation) return;
    if (!window.__jpOriginalRenderView && !window.renderView.__jpStableWrapped) window.__jpOriginalRenderView = window.renderView;
    const base = window.__jpOriginalRenderView || window.renderView;
    window.renderView = function jpDirectRenderView(view, ...args) {
      const dest = VALID.has(view) ? (view === "client-work" ? "clientwork" : view) : "dashboard";
      hardCloseMenu();
      setTitle(dest);
      try { return base.call(this, dest, ...args); }
      finally { bindInternalRoutes(); }
    };
    window.renderView.__jpDirectNavigation = true;
  }

  function removeRecoveredAdminCard() {
    $$("#viewMount .section-card, #viewMount section").forEach((card) => {
      const heading = $("h2", card)?.textContent?.trim().toLowerCase() || "";
      if (heading === "admin page recovered") card.remove();
    });
  }

  function installBackSupport() {
    if (history.state == null) {
      try { history.replaceState({ entry: "hub", view: currentView() }, "", location.href); } catch (_) {}
    }
    window.addEventListener("popstate", () => {
      hardCloseMenu();
      const dest = currentView();
      setTimeout(() => renderRoute(dest, { pop: true }), 0);
    }, true);
  }

  function install() {
    installCss();
    setViewportVars();
    patchRenderView();
    bindInternalRoutes();
    hardCloseMenu();
    removeRecoveredAdminCard();
    window.addEventListener("click", menuClick, true);
    window.addEventListener("pointerdown", (event) => {
      if (!isOpen()) return;
      if (event.target?.closest?.("#memberProfileMenu,#memberProfileButton")) return;
      hardCloseMenu();
    }, true);
    window.addEventListener("keydown", (event) => { if (event.key === "Escape") hardCloseMenu(); }, true);
    window.visualViewport?.addEventListener("resize", () => { setViewportVars(); if (isOpen()) openMenu(); });
    window.visualViewport?.addEventListener("scroll", () => { setViewportVars(); });
    window.addEventListener("resize", () => { setViewportVars(); if (isOpen()) openMenu(); });
    window.addEventListener("pageshow", () => { setViewportVars(); patchRenderView(); hardCloseMenu(); bindInternalRoutes(); removeRecoveredAdminCard(); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { setViewportVars(); hardCloseMenu(); } }, true);
    new MutationObserver(() => { removeRecoveredAdminCard(); bindInternalRoutes(); }).observe(document.body, { childList: true, subtree: true });
    installBackSupport();
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
