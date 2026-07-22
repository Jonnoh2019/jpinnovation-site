/* JP Innovation Hub final profile menu/navigation stabiliser.
   Small, deterministic owner for profile-menu taps. No global render wrapping. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-polish-20260722-stable-final2";
  if (window.__jpProfileMenuNavigationPolish === VERSION) return;
  window.__jpProfileMenuNavigationPolish = VERSION;
  document.documentElement.dataset.jpProfileMenuNavigationPolish = VERSION;

  const VALID = new Set(["dashboard", "admin", "metrics", "profile", "clientwork", "client-work", "boards", "projects", "quotes", "directory", "resources", "events", "messages", "notifications", "settings", "rewards"]);
  const ACTIONS = { "my-posts": "boards", "my-quotes": "quotes", signout: "signout" };
  let navigating = false;
  let openedAt = 0;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const menu = () => $("#memberProfileMenu.member-profile-menu");
  const trigger = () => $("#memberProfileButton");
  const mount = () => $("#viewMount") || $("[data-view-mount]");

  function vh() { return Math.max(420, Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720)); }
  function topOffset() {
    const header = $(".workspace-header") || $("header");
    const rect = header?.getBoundingClientRect?.();
    const bottom = rect ? Math.round(rect.bottom + 8) : 96;
    return Math.max(84, Math.min(bottom, vh() - 280));
  }
  function setVars() {
    document.documentElement.style.setProperty("--jp-visible-vh", `${vh()}px`);
    document.documentElement.style.setProperty("--jp-profile-menu-top", `${topOffset()}px`);
  }

  function css() {
    let style = $("#jpStableFinalProfileMenuCss");
    if (!style) { style = document.createElement("style"); style.id = "jpStableFinalProfileMenuCss"; document.head.appendChild(style); }
    style.textContent = `
      #memberProfileMenu.member-profile-menu:not(.open),#memberProfileMenu.member-profile-menu[aria-hidden="true"]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;height:0!important;max-height:0!important;overflow:hidden!important;transform:none!important;translate:none!important;clip-path:none!important}
      #memberProfileMenu.member-profile-menu.open{position:fixed!important;top:var(--jp-profile-menu-top,96px)!important;left:max(12px,env(safe-area-inset-left))!important;right:max(12px,env(safe-area-inset-right))!important;bottom:calc(12px + env(safe-area-inset-bottom))!important;width:auto!important;max-width:calc(100vw - 24px)!important;height:auto!important;min-height:0!important;max-height:calc(var(--jp-visible-vh,100dvh) - var(--jp-profile-menu-top,96px) - 12px - env(safe-area-inset-bottom))!important;display:flex!important;flex-direction:column!important;gap:6px!important;padding:8px!important;box-sizing:border-box!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;transform:none!important;translate:none!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:99999!important;clip-path:none!important;contain:none!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-header,#memberProfileMenu.member-profile-menu.open .profile-menu-link{flex:0 0 auto!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;transform:none!important;translate:none!important;margin:0!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-header{display:grid!important;min-height:56px!important;margin-bottom:2px!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-link{display:grid!important;min-height:42px!important;max-height:none!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-link small{display:none!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-link[aria-busy="true"]{opacity:.62!important;pointer-events:none!important}
      body.jp-profile-menu-locked{overflow:hidden!important;touch-action:none!important}
      body.jp-profile-menu-locked #memberProfileMenu,body.jp-profile-menu-locked #memberProfileButton{touch-action:manipulation!important}
      @media(min-width:761px){#memberProfileMenu.member-profile-menu.open{left:auto!important;right:18px!important;width:min(390px,calc(100vw - 36px))!important;max-width:calc(100vw - 36px)!important}}
      @media(max-width:360px){#memberProfileMenu.member-profile-menu.open{left:8px!important;right:8px!important;max-width:calc(100vw - 16px)!important;gap:4px!important;padding:7px!important}#memberProfileMenu.member-profile-menu.open .profile-menu-link{min-height:39px!important}}
    `;
  }

  function removeOverlays() {
    $$(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,[data-profile-backdrop]").forEach((n) => n.remove());
    document.body.classList.remove("profile-menu-open", "menu-scroll-locked", "jp-menu-hard-lock", "jp-profile-regression-lock");
    document.documentElement.classList.remove("profile-menu-open", "menu-scroll-locked", "jp-menu-hard-lock", "jp-profile-regression-lock");
    [document.body, document.documentElement].forEach((n) => { n.style.removeProperty("pointer-events"); n.style.removeProperty("touch-action"); });
  }

  function closeMenu() {
    const m = menu();
    const b = trigger();
    if (m) {
      m.classList.remove("open", "active", "show", "visible", "is-open", "is-opening", "is-closing", "stuck", "cut-off");
      m.setAttribute("aria-hidden", "true");
      m.hidden = true;
      ["display", "visibility", "opacity", "pointer-events", "height", "min-height", "max-height", "overflow", "transform", "translate", "top", "left", "right", "bottom", "width", "max-width", "position", "clip", "clip-path", "contain"].forEach((p) => m.style.removeProperty(p));
      try { m.scrollTop = 0; } catch (_) {}
      $$(".profile-menu-link", m).forEach((row) => { row.removeAttribute("aria-busy"); row.classList.remove("is-loading", "selected", "active", "is-active"); row.style.removeProperty("pointer-events"); });
    }
    if (b) b.setAttribute("aria-expanded", "false");
    document.body.classList.remove("member-profile-menu-open", "jp-profile-menu-open", "jp-profile-menu-locked");
    document.documentElement.classList.remove("member-profile-menu-open", "jp-profile-menu-open");
    [document.body, document.documentElement].forEach((n) => n.style.removeProperty("overflow"));
    removeOverlays();
  }

  function openMenu() {
    const m = menu(); const b = trigger(); if (!m) return;
    setVars(); removeOverlays(); openedAt = Date.now();
    m.hidden = false; m.removeAttribute("hidden"); m.classList.add("open"); m.setAttribute("aria-hidden", "false");
    if (b) b.setAttribute("aria-expanded", "true");
    document.body.classList.add("member-profile-menu-open", "jp-profile-menu-open", "jp-profile-menu-locked");
    document.documentElement.classList.add("member-profile-menu-open", "jp-profile-menu-open");
    ["display", "height", "max-height", "transform", "translate", "clip-path"].forEach((p) => m.style.removeProperty(p));
    $$(".profile-menu-header,.profile-menu-link", m).forEach((row) => {
      row.hidden = false; row.removeAttribute("hidden"); row.removeAttribute("aria-busy");
      row.classList.remove("is-loading", "selected", "active", "is-active");
      ["display", "visibility", "opacity", "pointer-events", "transform", "max-height"].forEach((p) => row.style.removeProperty(p));
    });
    requestAnimationFrame(() => { try { m.scrollTop = 0; } catch (_) {} });
  }

  function isOpen() { const m = menu(); return !!m && !m.hidden && m.classList.contains("open") && m.getAttribute("aria-hidden") === "false"; }

  function destination(row) {
    if (!row) return "";
    const action = row.dataset.profileAction || row.dataset.action || "";
    if (ACTIONS[action]) return ACTIONS[action];
    let view = row.dataset.profileView || row.dataset.view || row.dataset.routeView || row.dataset.viewLink || "";
    if (!view) {
      const text = (row.textContent || "").toLowerCase();
      if (text.includes("admin")) view = "admin"; else if (text.includes("metric")) view = "metrics"; else if (text.includes("client")) view = "clientwork"; else if (text.includes("post")) view = "boards"; else if (text.includes("quote")) view = "quotes"; else if (text.includes("notification")) view = "notifications"; else if (text.includes("message")) view = "messages"; else if (text.includes("setting")) view = "settings"; else if (text.includes("profile")) view = "profile";
    }
    if (view === "client-work") view = "clientwork";
    return VALID.has(view) ? view : "";
  }

  function setUrl(view, replace = false) {
    const params = new URLSearchParams(location.search || "");
    params.set("entry", "hub"); params.set("view", view); params.delete("signin"); params.delete("register");
    const next = `${location.pathname}?${params.toString()}`;
    if (`${location.pathname}${location.search}` === next) return;
    const state = { entry: "hub", view };
    replace ? history.replaceState(state, "", next) : history.pushState(state, "", next);
  }

  function setTitle(view) {
    const titles = { dashboard:"Dashboard", admin:"Admin Review", metrics:"Website Metrics", profile:"My Profile", clientwork:"My Client Work", boards:"Engineering Discussions", projects:"Projects", quotes:"Quote Requests", directory:"Member Directory", resources:"Resources & Tools", events:"Events", messages:"Messages", notifications:"Notifications", settings:"Settings", rewards:"Rewards" };
    const h = $("#viewTitle"); if (h) h.textContent = titles[view] || "Dashboard";
  }

  function render(view, opts = {}) {
    const dest = VALID.has(view) ? (view === "client-work" ? "clientwork" : view) : "dashboard";
    setTitle(dest); if (!opts.pop) setUrl(dest, opts.replace);
    try {
      if (typeof window.__jpOriginalRenderView === "function") window.__jpOriginalRenderView(dest);
      else if (typeof window.renderView === "function") window.renderView(dest);
      else throw new Error("Hub render function not available");
    } catch (error) {
      console.error(`[${VERSION}] route failed`, error);
      const mnt = mount();
      if (mnt) mnt.innerHTML = `<section class="section-card"><h2>This section could not load.</h2><p class="muted">Please retry or return to Dashboard.</p><div class="hero-actions"><button class="primary-button" data-view-link="${dest}" type="button">Retry</button><button class="secondary-button" data-view-link="dashboard" type="button">Back to Dashboard</button></div></section>`;
    } finally { closeMenu(); bindRoutes(); }
  }

  function onWindowClick(event) {
    const t = event.target;
    if (t?.closest?.("#memberProfileButton")) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (navigating) return; isOpen() ? closeMenu() : openMenu(); return;
    }
    const row = t?.closest?.("#memberProfileMenu .profile-menu-link");
    if (row) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (navigating) return;
      const dest = destination(row); if (!dest) return;
      if (dest === "signout" || row.id === "logoutButton") { closeMenu(); return; }
      navigating = true; row.setAttribute("aria-busy", "true");
      closeMenu();
      requestAnimationFrame(() => { try { render(dest); } finally { setTimeout(() => { navigating = false; }, 150); } });
      return;
    }
    if (isOpen() && Date.now() - openedAt > 80 && !t?.closest?.("#memberProfileMenu")) closeMenu();
  }

  function bindRoutes() {
    $$("[data-view-link]").forEach((button) => {
      if (button.dataset.jpStableFinalRoute === VERSION) return;
      button.dataset.jpStableFinalRoute = VERSION;
      button.addEventListener("click", (event) => {
        const dest = button.dataset.viewLink; if (!VALID.has(dest)) return;
        event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); render(dest);
      }, true);
    });
  }

  function removeRecoveredCard() {
    $$("#viewMount .section-card, #viewMount section").forEach((card) => {
      if ((card.querySelector("h2")?.textContent || "").trim().toLowerCase() === "admin page recovered") card.remove();
    });
  }

  function install() {
    css(); setVars(); closeMenu(); bindRoutes(); removeRecoveredCard();
    if (history.state == null) { try { history.replaceState({ entry:"hub", view:new URLSearchParams(location.search).get("view") || "dashboard" }, "", location.href); } catch (_) {} }
    window.addEventListener("click", onWindowClick, true);
    window.addEventListener("pointerdown", (event) => { if (isOpen() && !event.target?.closest?.("#memberProfileMenu,#memberProfileButton")) closeMenu(); }, true);
    window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); }, true);
    window.addEventListener("popstate", () => { closeMenu(); setTimeout(() => render(new URLSearchParams(location.search).get("view") || "dashboard", { pop:true }), 0); }, true);
    window.visualViewport?.addEventListener("resize", () => { setVars(); });
    window.visualViewport?.addEventListener("scroll", () => { setVars(); });
    window.addEventListener("resize", () => { setVars(); });
    window.addEventListener("pageshow", () => { setVars(); closeMenu(); bindRoutes(); removeRecoveredCard(); });
    new MutationObserver(() => { removeRecoveredCard(); bindRoutes(); }).observe(document.body, { childList:true, subtree:true });
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once:true });
  else install();
})();
