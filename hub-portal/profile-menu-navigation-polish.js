/* JP Innovation Hub final profile menu/navigation stabiliser.
   Small, deterministic owner for profile-menu taps. No global render wrapping. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-polish-20260722-stable-final3";
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
    const bottom = rect ? Math.round(rect.bottom + 6) : 92;
    return Math.max(76, Math.min(bottom, vh() - 390));
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
      #memberProfileMenu.member-profile-menu.open{position:fixed!important;top:var(--jp-profile-menu-top,92px)!important;left:max(12px,env(safe-area-inset-left))!important;right:max(12px,env(safe-area-inset-right))!important;bottom:calc(10px + env(safe-area-inset-bottom))!important;width:auto!important;max-width:calc(100vw - 24px)!important;height:auto!important;min-height:0!important;max-height:calc(var(--jp-visible-vh,100dvh) - var(--jp-profile-menu-top,92px) - 10px - env(safe-area-inset-bottom))!important;display:flex!important;flex-direction:column!important;gap:4px!important;padding:7px!important;box-sizing:border-box!important;overflow-x:hidden!important;overflow-y:auto!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;transform:none!important;translate:none!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:99999!important;clip-path:none!important;contain:none!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-header,#memberProfileMenu.member-profile-menu.open .profile-menu-link{flex:0 0 auto!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;transform:none!important;translate:none!important;margin:0!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-header{display:grid!important;min-height:48px!important;margin-bottom:1px!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-link{display:grid!important;min-height:36px!important;max-height:none!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-link small{display:none!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-link[aria-busy="true"]{opacity:.62!important;pointer-events:none!important}
      body.jp-profile-menu-locked{overflow:hidden!important;touch-action:none!important}
      body.jp-profile-menu-locked #memberProfileMenu,body.jp-profile-menu-locked #memberProfileButton{touch-action:manipulation!important}
      @media(min-width:761px){#memberProfileMenu.member-profile-menu.open{left:auto!important;right:18px!important;width:min(390px,calc(100vw - 36px))!important;max-width:calc(100vw - 36px)!important}}
      @media(max-width:360px){#memberProfileMenu.member-profile-menu.open{left:8px!important;right:8px!important;max-width:calc(100vw - 16px)!important;gap:3px!important;padding:6px!important}#memberProfileMenu.member-profile-menu.open .profile-menu-header{min-height:44px!important}#memberProfileMenu.member-profile-menu.open .profile-menu-link{min-height:34px!important}}
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
    new MutationObserver(() => { removeRecoveredCard(); bindRoutes(); }).observe(mount() || document.body, { childList:true, subtree:true });
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once:true });
  else install();
})();

/* JP Innovation mobile-first Accounts + Member Profile redesign. */
(() => {
  "use strict";
  const VERSION = "accounts-profile-mobile-redesign-20260722-live2";
  if (window.__jpAccountsProfileMobileRedesign === VERSION) return;
  window.__jpAccountsProfileMobileRedesign = VERSION;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v = "") => String(v ?? "").replace(/[&<>'"]/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" }[c]));
  let runQueued = false;

  function addStyles() {
    let s = $("#jpAccountsProfileMobileRedesignCss");
    if (!s) { s = document.createElement("style"); s.id = "jpAccountsProfileMobileRedesignCss"; document.head.appendChild(s); }
    s.textContent = `
      :root{--jp-gold:#b78a26;--jp-gold-dark:#70500f;--jp-gold-hi:#e7c45e;--jp-blue:#0756bd;--jp-blue-dark:#031d49;--jp-ring-blue:#168bff;--jp-card:rgba(18,24,31,.86);--jp-card2:rgba(10,20,31,.92);--jp-border:rgba(255,255,255,.12)}
      .jp-tier-avatar{--sz:42px;width:var(--sz)!important;height:var(--sz)!important;min-width:var(--sz)!important;aspect-ratio:1/1!important;border-radius:50%!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;font-weight:950!important;letter-spacing:.01em!important;line-height:1!important;color:#fff!important;text-shadow:0 1px 3px rgba(0,0,0,.45)!important;overflow:hidden!important;flex:0 0 var(--sz)!important}
      .jp-tier-avatar.admin{background:radial-gradient(circle at 35% 28%,var(--jp-gold-hi) 0%,var(--jp-gold) 42%,var(--jp-gold-dark) 100%)!important;border:3px solid var(--jp-ring-blue)!important;box-shadow:inset 0 1px 4px rgba(255,255,255,.42),inset 0 -5px 9px rgba(45,31,5,.48),0 6px 15px rgba(22,139,255,.2)!important}
      .jp-tier-avatar.hub{background:radial-gradient(circle at 36% 25%,#168bff 0%,#0756bd 48%,#05285f 100%)!important;border:3px solid var(--jp-gold)!important;box-shadow:inset 0 1px 4px rgba(255,255,255,.28),0 0 0 1px rgba(255,255,255,.35),0 5px 12px rgba(0,0,0,.28)!important}
      .jp-tier-avatar.client{background:radial-gradient(circle at 36% 25%,#168bff 0%,#0756bd 48%,#05285f 100%)!important;border:3px solid rgba(255,255,255,.9)!important;box-shadow:inset 0 1px 4px rgba(255,255,255,.22),0 5px 12px rgba(0,0,0,.24)!important}
      .jp-role-pill{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;min-height:24px;padding:3px 10px;border-radius:999px;font-size:.72rem;font-weight:950;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap;line-height:1}
      .jp-role-pill.admin{color:#fff;background:linear-gradient(135deg,var(--jp-gold-dark),var(--jp-gold),var(--jp-gold-hi));border:1px solid var(--jp-ring-blue);box-shadow:0 0 0 1px rgba(22,139,255,.24)}
      .jp-role-pill.hub{color:#fff;background:linear-gradient(135deg,#08285a,#0a63d7);border:1px solid var(--jp-gold)}
      .jp-role-pill.client{color:#fff;background:linear-gradient(135deg,#092a60,#0a64d9);border:1px solid rgba(255,255,255,.75)}
      .jp-role-star{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;line-height:1;flex:0 0 24px}.jp-role-star.admin{background:radial-gradient(circle at 35% 28%,var(--jp-gold-hi),var(--jp-gold) 45%,var(--jp-gold-dark));color:#fff;border:2px solid var(--jp-ring-blue)}.jp-role-star.hub{background:linear-gradient(145deg,#0a63d7,#05285f);color:#fff;border:2px solid var(--jp-gold)}.jp-role-star.client{background:linear-gradient(145deg,#168bff,#0756bd);color:#fff;border:1px solid rgba(255,255,255,.8)}
      #memberProfileButton .avatar,#memberProfileButton .profile-initials,#memberProfileButton .member-avatar,#memberProfileButton .jp-tier-avatar{--sz:44px!important}.profile-menu-header .avatar,.profile-menu-header .profile-initials,.profile-menu-header .jp-tier-avatar{--sz:44px!important}
      #adminAccountManagement{overflow:visible!important}.admin-account-tools{display:grid;gap:10px;margin:12px 0}.admin-account-search{width:100%;min-height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.045);color:#fff;padding:0 14px;font-weight:750;box-sizing:border-box}.admin-account-filters{display:flex;gap:8px;overflow-x:auto;padding-bottom:2px}.admin-account-filter{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.055);color:#d8e6f6;border-radius:999px;min-height:34px;padding:0 12px;font-weight:900;white-space:nowrap}.admin-account-filter.active{background:linear-gradient(135deg,#075bd4,#0a84ff);color:white;border-color:#168bff}
      #adminAccountManagement details{border-radius:18px!important}#adminAccountManagement summary{min-height:54px!important}.admin-account-compact-row{position:relative;display:grid!important;grid-template-columns:46px minmax(0,1fr) auto auto!important;align-items:center!important;gap:10px!important;min-height:76px!important;padding:12px!important;border-radius:18px!important;border:1px solid rgba(255,255,255,.11)!important;background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(4,8,13,.68))!important;margin:10px 0!important;box-sizing:border-box!important;overflow:visible!important}.admin-account-compact-row .jp-tier-avatar{--sz:42px!important}.admin-account-main{min-width:0!important;display:grid;gap:3px}.admin-account-name{font-size:1rem!important;font-weight:950!important;color:#fff!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:1.12!important;margin:0!important}.admin-account-company,.admin-account-email{display:block;color:#aeb9c8!important;font-size:.82rem!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;line-height:1.15!important}.admin-account-email{font-size:.78rem!important;color:#8fa0b5!important}.admin-account-state{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#78f0ad;font-size:.66rem;font-weight:950;text-transform:uppercase;padding:5px 8px;white-space:nowrap}.admin-account-state.off{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.12);color:#aeb9c8}.admin-account-more{width:38px;height:38px;border-radius:13px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.055);color:#fff;font-size:22px;font-weight:950;display:inline-flex;align-items:center;justify-content:center}.admin-account-menu{display:none;position:absolute;right:10px;top:58px;z-index:30;width:min(250px,calc(100vw - 58px));padding:8px;border-radius:16px;border:1px solid rgba(255,255,255,.16);background:rgba(7,12,18,.98);box-shadow:0 18px 42px rgba(0,0,0,.42);grid-template-columns:1fr;gap:7px}.admin-account-compact-row.menu-open .admin-account-menu{display:grid!important}.admin-account-menu .admin-action{width:100%!important;min-height:40px!important;margin:0!important;border-radius:12px!important;font-size:.86rem!important}.admin-account-menu .admin-action.primary,.admin-account-menu .admin-action[data-action="upgrade"]{background:linear-gradient(135deg,#076bdc,#0a84ff)!important;color:#fff!important}.admin-account-compact-row[data-hidden="true"]{display:none!important}
      .premium-profile-card{padding:14px!important;border-radius:20px!important;background:linear-gradient(145deg,rgba(15,25,35,.96),rgba(5,9,14,.94))!important;border:1px solid rgba(255,255,255,.12)!important;box-shadow:0 18px 44px rgba(0,0,0,.28)!important}.premium-profile-card.admin{border-left:3px solid var(--jp-gold)!important}.premium-profile-card.hub{border-left:3px solid var(--jp-gold)!important}.premium-profile-card.client{border-left:3px solid var(--jp-ring-blue)!important}.premium-profile-back{display:inline-flex!important;align-items:center!important;gap:6px!important;width:auto!important;min-height:34px!important;padding:0 11px!important;border-radius:12px!important;margin:0 0 10px!important;font-size:.82rem!important}.premium-profile-hero{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;align-items:center;padding:13px;border-radius:18px;background:radial-gradient(circle at 15% 5%,rgba(22,139,255,.16),rgba(255,255,255,.035) 44%,rgba(0,0,0,.06));border:1px solid rgba(255,255,255,.11);margin-bottom:12px}.premium-profile-hero .jp-tier-avatar{--sz:58px!important;font-size:1.18rem!important}.premium-profile-avatar-wrap{position:relative;width:64px;height:64px;display:grid;place-items:center}.premium-online-dot{position:absolute;right:2px;bottom:4px;width:15px;height:15px;border-radius:50%;background:#31dc82;border:3px solid #071019;box-shadow:0 0 0 1px rgba(49,220,130,.4)}.premium-name-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.premium-profile-name{font-size:1.34rem!important;line-height:1.05!important;margin:4px 0 2px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.premium-profile-company{color:#b6c0cc;font-weight:800;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.premium-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0}.premium-info-card{min-height:66px;padding:10px;border-radius:15px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.105)}.premium-info-card b{display:block;color:#8fbaff;font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}.premium-info-card span{display:block;color:#fff;font-weight:900;font-size:.9rem;line-height:1.16}.premium-stars{letter-spacing:1px;color:#566272;font-size:.86rem}.premium-about{font-size:.94rem;line-height:1.42;color:#c7d0dc;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;margin:8px 0 12px}.premium-skill-tags{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 12px}.premium-skill-tag{font-size:.74rem;font-weight:900;color:#dbeeff;border:1px solid rgba(22,139,255,.24);background:rgba(22,139,255,.08);padding:6px 9px;border-radius:999px}.premium-profile-actions{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:7px}.premium-profile-actions button{min-height:40px!important;border-radius:12px!important;font-size:.8rem!important;padding:0 9px!important}.premium-profile-future{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}.premium-profile-future span{font-size:.7rem;color:#95a5b8;border:1px solid rgba(255,255,255,.11);border-radius:999px;padding:5px 8px}
      @media(max-width:390px){.admin-account-compact-row{grid-template-columns:42px minmax(0,1fr) auto!important;gap:8px!important}.admin-account-state{display:none!important}.admin-account-compact-row .jp-tier-avatar{--sz:38px!important}.premium-info-grid{grid-template-columns:1fr}.premium-profile-actions{grid-template-columns:1fr 1fr}.premium-profile-actions .report{grid-column:auto}}
      @media(min-width:760px){.admin-account-list,.admin-accounts-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.premium-info-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
    `;
  }

  function currentRoleType() {
    const p = window.state?.currentProfile || window.state?.signedInProfile || window.currentProfile || {};
    const role = String(p.account_type || p.role || "").toLowerCase();
    const membership = String(p.membership_status || p.membershipStatus || "").toLowerCase();
    if (role === "admin" || p.is_admin === true || p.isAdmin === true) return "admin";
    if (role === "hub" || role === "member" || role === "paid" || membership === "paid" || membership === "hub") return "hub";
    return "client";
  }
  function typeFromText(text) {
    const t = String(text || "").toLowerCase();
    if (t.includes("admin") || t.includes("jp admin")) return "admin";
    if (t.includes("hub") || t.includes("paid")) return "hub";
    return "client";
  }
  function roleLabel(type) { return type === "admin" ? "JP Admin" : type === "hub" ? "Hub Member" : "Client Portal"; }
  function initials(name, fallback = "JP") { return String(name || fallback).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || fallback; }
  function tierAvatar(type, text, cls = "") { return `<span class="jp-tier-avatar ${type} ${cls}" aria-hidden="true">${esc(text)}</span>`; }
  function rolePill(type) { return `<span class="jp-role-pill ${type}">${roleLabel(type)}</span>`; }
  function roleStar(type) { return `<span class="jp-role-star ${type}" aria-hidden="true">★</span>`; }

  function installAccountTools(section) {
    if (!section || section.querySelector(".admin-account-tools")) return;
    const tools = document.createElement("div");
    tools.className = "admin-account-tools";
    tools.innerHTML = `<input id="adminAccountSearch" class="admin-account-search" type="search" placeholder="Search accounts" autocomplete="off"><div class="admin-account-filters" role="list"><button class="admin-account-filter active" data-filter="all" type="button">All</button><button class="admin-account-filter" data-filter="admin" type="button">Admin</button><button class="admin-account-filter" data-filter="hub" type="button">Hub Members</button><button class="admin-account-filter" data-filter="client" type="button">Client Portal</button><button class="admin-account-filter" data-filter="suspended" type="button">Suspended</button></div>`;
    const firstDetails = section.querySelector(":scope > details") || section.querySelector("details");
    const ref = firstDetails && firstDetails.parentNode === section ? firstDetails : section.firstChild;
    try { section.insertBefore(tools, ref); } catch (error) { console.warn(`[${VERSION}] account tools insert recovered`, error); section.prepend(tools); }
  }

  function normaliseAccountRow(row) {
    if (!row || row.classList.contains("admin-account-compact-row")) return;
    if (!row.closest("#adminAccountManagement")) return;
    const oldIcon = $(".admin-stable-icon,.admin-row-icon,.admin-account-avatar", row);
    const title = ($("h3", row)?.textContent || $("strong", row)?.textContent || "Account").trim();
    const details = ($("p", row)?.textContent || row.textContent || "").replace(/\s+/g, " ").trim();
    const email = ($("[data-email]", row)?.dataset.email || (details.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [""])[0] || "").trim();
    const company = details.replace(title, "").replace(email, "").replace(/[·•]+/g, " ").replace(/\b(JP Admin|Hub Member|Client Portal|Admin|On|Offline)\b/gi, " ").replace(/\s+/g, " ").trim() || "Independent member";
    const type = typeFromText(`${oldIcon?.textContent || ""} ${details}`);
    const isOn = /\bon\b|online/i.test(details) && !/offline/i.test(details);
    const actions = $(".admin-stable-actions,.admin-account-actions", row) || document.createElement("div");
    actions.className = "admin-account-menu";
    const idText = initials(title, type === "admin" ? "A" : type === "hub" ? "H" : "C");
    row.className = `${row.className} admin-account-compact-row`;
    row.dataset.accountType = type;
    row.dataset.accountSearch = `${title} ${company} ${email} ${roleLabel(type)}`.toLowerCase();
    row.innerHTML = `${tierAvatar(type, idText)}<div class="admin-account-main"><h3 class="admin-account-name">${esc(title)}</h3><div>${rolePill(type)}</div><span class="admin-account-company">${esc(company)}</span><span class="admin-account-email">${esc(email || "Email not set")}</span></div><span class="admin-account-state ${isOn ? "" : "off"}">${isOn ? "Online" : "Offline"}</span><button class="admin-account-more" type="button" data-account-more aria-label="Manage ${esc(title)}">⋮</button>`;
    row.appendChild(actions);
  }

  function applyFilters() {
    const section = $("#adminAccountManagement"); if (!section) return;
    const q = ($("#adminAccountSearch", section)?.value || "").trim().toLowerCase();
    const f = ($(".admin-account-filter.active", section)?.dataset.filter || "all");
    $$(".admin-account-compact-row", section).forEach((row) => {
      const type = row.dataset.accountType || "client";
      const text = row.dataset.accountSearch || row.textContent.toLowerCase();
      const suspended = /suspended|archived|removed/i.test(row.closest("details")?.textContent || "");
      const okFilter = f === "all" || type === f || (f === "suspended" && suspended);
      row.dataset.hidden = okFilter && (!q || text.includes(q)) ? "false" : "true";
    });
  }

  function transformAccounts() {
    const section = $("#adminAccountManagement"); if (!section) return;
    installAccountTools(section);
    $$("#adminAccountManagement .admin-stable-row, #adminAccountManagement .admin-account-row").forEach(normaliseAccountRow);
    applyFilters();
  }

  function transformMemberProfile() {
    const viewMount = $("#viewMount");
    const card = $(".public-profile-card:not(.premium-profile-card)", viewMount || document); if (!card) return;
    const name = ($(".public-profile-name", card)?.textContent || $("h2,h3", card)?.textContent || "Member").trim();
    const roleText = ($(".compact-role-pill,.jp-role-pill,.role-pill", card)?.textContent || card.textContent || "").trim();
    const type = typeFromText(roleText);
    const company = ($(".public-profile-company,.muted", card)?.textContent || (type === "admin" ? "JP Innovation Ltd" : "Independent member")).trim();
    const info = $$(".public-profile-info,.profile-info-card,.info-card", card).map((el) => ({ label: (el.querySelector("b,strong,h4")?.textContent || "").trim(), value: (el.querySelector("span,p")?.textContent || el.textContent || "").replace(/^(Engineering Role|Location|Reputation|Availability)/i, "").trim() }));
    const find = (key, fallback) => (info.find((i) => i.label.toLowerCase().includes(key))?.value || fallback).trim();
    const role = find("engineering", "General Engineering");
    const location = find("location", "Location TBC");
    const reputation = find("reputation", "0 pts - No approved reviews yet");
    const availability = find("availability", "Availability TBC");
    const about = ($(".public-profile-about,.profile-about", card)?.textContent || Array.from(card.querySelectorAll("p")).map((p) => p.textContent.trim()).find((t) => t.length > 45) || "Innovation Hub member.").trim();
    const skills = ($$(".skill-chip,.premium-skill-tag,.tag", card).map((n) => n.textContent.trim()).filter(Boolean).slice(0, 8));
    if (!skills.length) skills.push(role);
    const email = $("[data-member-email]", card)?.dataset.memberEmail || "";
    card.className = `public-profile-card premium-profile-card ${type}`;
    card.innerHTML = `<button id="backToDirectory" class="secondary-button premium-profile-back" type="button">← Directory</button><div class="premium-profile-hero"><div class="premium-profile-avatar-wrap">${tierAvatar(type, initials(name), "premium-profile-avatar")}<span class="premium-online-dot" aria-hidden="true"></span></div><div class="premium-profile-main"><div class="premium-name-row">${rolePill(type)}${roleStar(type)}<span class="muted">Online</span></div><h2 class="premium-profile-name">${esc(name)}</h2><p class="premium-profile-company">${esc(company)}</p></div></div><div class="premium-info-grid"><div class="premium-info-card"><b>🛠 Engineering Role</b><span>${esc(role)}</span></div><div class="premium-info-card"><b>📍 Location</b><span>${esc(location)}</span></div><div class="premium-info-card"><b>⭐ Reputation</b><span>${esc(reputation.replace(/ - /g, " · "))}</span><div class="premium-stars">★★★★★</div></div><div class="premium-info-card"><b>✅ Availability</b><span>${esc(availability)}</span></div></div><h3>About</h3><p class="premium-about">${esc(about)}</p><h3>Skills</h3><div class="premium-skill-tags">${skills.map((x) => `<span class="premium-skill-tag">${esc(x)}</span>`).join("")}</div><div class="premium-profile-actions"><button class="secondary-button message-member-button" type="button" ${email ? `data-member-email="${esc(email)}"` : ""}>Message</button><button class="primary-button" type="button">Connect</button><button class="secondary-button" type="button">Invite</button><button class="secondary-button report" type="button" aria-label="More actions">⋮</button></div><div class="premium-profile-future"><span>Portfolio</span><span>Certifications</span><span>Experience</span><span>Recent Posts</span><span>Reviews</span><span>Projects</span></div>`;
    $("#backToDirectory", card)?.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); if (typeof window.renderView === "function") window.renderView("directory"); });
  }

  function patchHeaderAvatar() {
    const btn = $("#memberProfileButton"); if (!btn) return;
    const existing = $(".avatar,.profile-initials,.jp-tier-avatar", btn);
    const txt = (existing?.textContent || "JH").trim();
    const type = currentRoleType();
    if (!existing || !existing.classList.contains("jp-tier-avatar") || !existing.classList.contains(type)) {
      if (existing) existing.outerHTML = tierAvatar(type, txt);
    }
    const header = $("#memberProfileMenu .profile-menu-header");
    const hExisting = header && $(".avatar,.profile-initials,.jp-tier-avatar", header);
    if (hExisting && (!hExisting.classList.contains("jp-tier-avatar") || !hExisting.classList.contains(type))) hExisting.outerHTML = tierAvatar(type, hExisting.textContent.trim() || txt);
  }

  function bind() {
    if (document.documentElement.dataset.jpAccountProfileBind === VERSION) return;
    document.documentElement.dataset.jpAccountProfileBind = VERSION;
    document.addEventListener("click", (e) => {
      const more = e.target.closest?.("[data-account-more]");
      if (more) { e.preventDefault(); e.stopPropagation(); const row = more.closest(".admin-account-compact-row"); $$(".admin-account-compact-row.menu-open").forEach((r) => { if (r !== row) r.classList.remove("menu-open"); }); row?.classList.toggle("menu-open"); return; }
      if (!e.target.closest?.(".admin-account-menu")) $$(".admin-account-compact-row.menu-open").forEach((r) => r.classList.remove("menu-open"));
      const filter = e.target.closest?.(".admin-account-filter");
      if (filter) { e.preventDefault(); const root = filter.closest(".admin-account-tools"); $$(".admin-account-filter", root).forEach((b) => b.classList.toggle("active", b === filter)); applyFilters(); }
    }, true);
    document.addEventListener("input", (e) => { if (e.target?.id === "adminAccountSearch") applyFilters(); }, true);
  }

  function run() { addStyles(); patchHeaderAvatar(); transformAccounts(); transformMemberProfile(); }
  function scheduleRun() {
    if (runQueued) return;
    runQueued = true;
    requestAnimationFrame(() => { runQueued = false; run(); });
  }
  function install() {
    run(); bind();
    const target = $("#viewMount") || document.body;
    new MutationObserver(scheduleRun).observe(target, { childList:true, subtree:true });
    window.addEventListener("pageshow", run);
    console.info(`[${VERSION}] installed`);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once:true }); else install();
})();