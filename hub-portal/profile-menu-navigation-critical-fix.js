/* JP Innovation Hub profile/menu navigation stability guard. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260721-stable7-menu-visible-height";
  const VALID = new Set(["dashboard","admin","metrics","profile","clientwork","client-work","boards","projects","quotes","directory","resources","events","messages","notifications","settings","rewards","my-posts","my-quotes"]);
  let busy = false;
  const $ = (s, r = document) => r.querySelector(s);
  const TOP_DESKTOP = "clamp(82px, 14dvh, 112px)";
  const TOP_MOBILE = "96px";
  const BOTTOM = "calc(14px + env(safe-area-inset-bottom))";
  const HEIGHT_DESKTOP = "calc(100dvh - clamp(82px, 14dvh, 112px) - 14px - env(safe-area-inset-bottom))";
  const HEIGHT_MOBILE = "calc(100dvh - 110px - env(safe-area-inset-bottom))";

  function installViewportCss() {
    let style = document.getElementById("jpProfileMenuCriticalViewportCss");
    if (!style) {
      style = document.createElement("style");
      style.id = "jpProfileMenuCriticalViewportCss";
      document.head.appendChild(style);
    }
    style.textContent = `
      #memberProfileMenu.member-profile-menu.open,
      #profileMenu.profile-menu.open,
      body.member-profile-menu-open #memberProfileMenu.member-profile-menu,
      body.profile-menu-open #profileMenu.profile-menu {
        position: fixed !important;
        top: ${TOP_DESKTOP} !important;
        right: max(14px, env(safe-area-inset-right)) !important;
        left: auto !important;
        bottom: ${BOTTOM} !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 6px !important;
        width: min(420px, calc(100vw - 28px)) !important;
        max-width: calc(100vw - 28px) !important;
        height: ${HEIGHT_DESKTOP} !important;
        min-height: 360px !important;
        max-height: ${HEIGHT_DESKTOP} !important;
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
        box-sizing: border-box !important;
        clip: auto !important;
        clip-path: none !important;
        contain: none !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-header,
      #profileMenu.profile-menu.open .profile-menu-header,
      body.member-profile-menu-open #memberProfileMenu.member-profile-menu .profile-menu-header,
      body.profile-menu-open #profileMenu.profile-menu .profile-menu-header {
        flex: 0 0 auto !important;
        min-height: 66px !important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-link,
      #profileMenu.profile-menu.open .profile-menu-link,
      body.member-profile-menu-open #memberProfileMenu.member-profile-menu .profile-menu-link,
      body.profile-menu-open #profileMenu.profile-menu .profile-menu-link {
        display: grid !important;
        visibility: visible !important;
        opacity: 1 !important;
        flex: 0 0 auto !important;
        min-height: 50px !important;
        max-height: none !important;
        pointer-events: auto !important;
        transform: none !important;
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

  function cleanClasses() {
    const classes = ["profile-menu-open","member-profile-menu-open","jp-profile-menu-open","hub-menu-open","menu-open","menu-scroll-locked","modal-open","is-menu-open","jp-menu-hard-lock"];
    document.documentElement.classList.remove(...classes);
    document.body.classList.remove(...classes);
    [document.documentElement, document.body].forEach((node) => ["overflow","position","top","width","height","pointer-events","touch-action"].forEach((prop) => node.style.removeProperty(prop)));
  }

  function closeMenus() {
    cleanClasses();
    document.querySelectorAll(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,.hub-menu-backdrop,.menu-backdrop,[data-profile-backdrop],[data-menu-backdrop]").forEach((node) => node.remove());
    document.querySelectorAll("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu").forEach((menu) => {
      menu.classList.remove("open","active","is-open","show","visible","is-opening","is-closing","stuck","cut-off");
      menu.setAttribute("aria-hidden", "true");
      menu.hidden = true;
      ["display","transform","translate","pointer-events","height","min-height","max-height","top","left","right","bottom","width","max-width","position","visibility","opacity","clip","clip-path","contain"].forEach((prop) => menu.style.removeProperty(prop));
      try { menu.scrollTop = 0; } catch (_) {}
    });
    const trigger = $("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function isMenuOpen(menu) {
    const trigger = $("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]");
    return !!menu && !menu.hidden && (menu.classList.contains("open") || menu.getAttribute("aria-hidden") === "false" || trigger?.getAttribute("aria-expanded") === "true" || document.body.classList.contains("member-profile-menu-open") || document.body.classList.contains("profile-menu-open"));
  }

  function forceOpenMenuLayout(menu) {
    if (!menu) return;
    const mobile = innerWidth <= 760;
    menu.hidden = false;
    menu.setAttribute("aria-hidden", "false");
    menu.classList.add("open");
    menu.style.position = "fixed";
    menu.style.top = mobile ? "96px" : TOP_DESKTOP;
    menu.style.right = "max(14px, env(safe-area-inset-right))";
    menu.style.left = mobile ? "max(14px, env(safe-area-inset-left))" : "auto";
    menu.style.bottom = BOTTOM;
    menu.style.display = "flex";
    menu.style.flexDirection = "column";
    menu.style.alignItems = "stretch";
    menu.style.gap = "6px";
    menu.style.width = mobile ? "auto" : "min(420px, calc(100vw - 28px))";
    menu.style.maxWidth = "calc(100vw - 28px)";
    menu.style.height = mobile ? HEIGHT_MOBILE : HEIGHT_DESKTOP;
    menu.style.minHeight = mobile ? "0" : "360px";
    menu.style.maxHeight = menu.style.height;
    menu.style.overflowY = "auto";
    menu.style.overflowX = "hidden";
    menu.style.transform = "none";
    menu.style.visibility = "visible";
    menu.style.opacity = "1";
    menu.style.pointerEvents = "auto";
    menu.style.zIndex = "99999";
    menu.querySelectorAll(".profile-menu-link").forEach((row) => {
      row.style.display = "grid";
      row.style.visibility = "visible";
      row.style.opacity = "1";
      row.style.pointerEvents = "auto";
      row.style.minHeight = "50px";
      row.style.flex = "0 0 auto";
    });
    document.body.classList.remove("jp-menu-hard-lock");
    document.documentElement.classList.remove("jp-menu-hard-lock");
  }

  function fixOpenMenuState() {
    installViewportCss();
    const menu = $("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu");
    if (!menu) return;
    if (isMenuOpen(menu)) {
      forceOpenMenuLayout(menu);
      try { if (menu.scrollTop < 0) menu.scrollTop = 0; } catch (_) {}
    } else if (menu.hidden) cleanClasses();
  }

  function setUrl(view) { const p = new URLSearchParams(location.search || ""); p.set("entry", "hub"); p.set("view", view); p.delete("signin"); p.delete("register"); const next = `${location.pathname}?${p.toString()}`; if (`${location.pathname}${location.search}` !== next) history.pushState({ entry: "hub", view }, "", next); }
  function setTitle(view) { const title = ({admin:"Admin Review",metrics:"Website Metrics",profile:"My Profile",messages:"Messages",notifications:"Notifications",settings:"Settings",boards:"Engineering Discussions",projects:"Projects",quotes:"Quote Requests",directory:"Member Directory",resources:"Resources & Tools",events:"Events",rewards:"Rewards",clientwork:"My Client Work","client-work":"My Client Work",dashboard:"Dashboard"})[view] || "Dashboard"; const h = $("#viewTitle"); if (h) h.textContent = title; }
  function adminHtml() { return `<section class="section-card section-violet admin-control-hero"><p class="eyebrow">Private administration</p><h2>Admin control centre</h2><p class="muted">Core Hub management shortcuts loaded in safe mode so the profile menu cannot lock the app.</p><div class="metrics-grid compact-admin-metrics"><button class="admin-overview-stat jp-route" data-view-link="notifications" type="button"><strong>0</strong><span>Notifications</span><small>No new alerts</small></button><button class="admin-overview-stat jp-route" data-view-link="messages" type="button"><strong>0</strong><span>Messages</span><small>Inbox clear</small></button><button class="admin-overview-stat" type="button"><strong>0</strong><span>Pending approvals</span><small>No requests waiting</small></button><button class="admin-overview-stat jp-route" data-view-link="directory" type="button"><strong>1</strong><span>Members online</span><small>Active now</small></button></div></section><section class="section-card section-lime"><div class="list-title"><div><h2>Pending actions</h2><p>Approvals, moderation and access checks first.</p></div><span class="pill good">Clear</span></div><div class="admin-quick-actions"><button class="jp-route" data-view-link="directory" type="button"><span>◎</span>Manage members</button><button class="jp-route" data-view-link="boards" type="button"><span>💬</span>Moderate discussions</button><button class="jp-route" data-view-link="projects" type="button"><span>▦</span>Review projects</button><button class="jp-route" data-view-link="quotes" type="button"><span>£</span>Review quotes</button><button class="jp-route" data-view-link="metrics" type="button"><span>📈</span>Website metrics</button></div></section><section class="section-card"><h2>Admin page recovered</h2><p class="muted">The route now closes the profile menu, removes stale locks and avoids blank/stacked overlay screens.</p><button class="primary-button jp-route" data-view-link="dashboard" type="button">Back to dashboard</button></section>`; }

  function render(view, opts = {}) {
    const dest = VALID.has(view) ? (view === "client-work" ? "clientwork" : view) : "dashboard";
    closeMenus(); if (!opts.pop) setUrl(dest); setTitle(dest);
    const mount = $("#viewMount") || $("[data-view-mount]");
    if (dest === "admin") { if (mount) { mount.dataset.view = "admin"; mount.innerHTML = adminHtml(); bindRoutes(); } return; }
    try { if (typeof window.__jpOriginalRenderView === "function") window.__jpOriginalRenderView(dest); else if (typeof window.renderView === "function" && window.renderView !== render) window.renderView(dest); else throw new Error("Hub render function not available"); }
    catch (error) { console.error(`[${VERSION}] route failed`, error); if (mount) mount.innerHTML = `<section class="section-card"><h2>This section could not load.</h2><p class="muted">Please retry or return to Dashboard.</p><button class="primary-button jp-route" data-view-link="dashboard" type="button">Back to Dashboard</button></section>`; }
    finally { cleanClasses(); bindRoutes(); }
  }

  function targetFrom(node) {
    const row = node?.closest?.("[data-profile-view],[data-profile-action],[data-view],[data-route-view],[href]"); if (!row) return "";
    let v = row.dataset.profileView || row.dataset.view || row.dataset.routeView || ""; const action = row.dataset.profileAction || ""; if (action === "my-posts") v = "boards"; if (action === "my-quotes") v = "quotes";
    if (!v) { const text = (row.textContent || "").toLowerCase(); if (text.includes("admin")) v = "admin"; else if (text.includes("metric")) v = "metrics"; else if (text.includes("profile")) v = "profile"; else if (text.includes("client")) v = "clientwork"; else if (text.includes("post")) v = "boards"; else if (text.includes("quote")) v = "quotes"; else if (text.includes("notification")) v = "notifications"; else if (text.includes("message")) v = "messages"; else if (text.includes("setting")) v = "settings"; }
    return VALID.has(v) ? v : "";
  }
  function onMenuClick(event) { const menu = event.target.closest("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu"); if (!menu) return; if (event.target.closest("#profileSignOut,#logoutButton,[data-profile-action='signout'],[data-action='signout']")) { closeMenus(); return; } const dest = targetFrom(event.target); if (!dest) return; event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (busy) return; busy = true; const row = event.target.closest("button,a,[role='button']"); if (row) row.setAttribute("aria-busy", "true"); requestAnimationFrame(() => { try { render(dest); } finally { if (row) row.removeAttribute("aria-busy"); setTimeout(() => { busy = false; }, 180); } }); }
  function bindRoutes() { document.querySelectorAll(".jp-route,[data-view-link]").forEach((button) => { if (button.dataset.jpSafeBound) return; button.dataset.jpSafeBound = VERSION; button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); render(button.dataset.viewLink || "dashboard"); }, true); }); }
  function patchRender() { if (typeof window.renderView !== "function" || window.renderView.__jpStableWrapped) return; window.__jpOriginalRenderView = window.renderView; window.renderView = function jpStableRenderView(view, ...args) { const dest = VALID.has(view) ? view : "dashboard"; if (dest === "admin") return render("admin"); try { closeMenus(); return window.__jpOriginalRenderView.call(this, dest, ...args); } catch (error) { console.error(`[${VERSION}] renderView failed`, error); } finally { cleanClasses(); bindRoutes(); } }; window.renderView.__jpStableWrapped = true; }
  function install() { document.documentElement.dataset.jpProfileCriticalNav = VERSION; installViewportCss(); document.addEventListener("click", onMenuClick, true); document.addEventListener("click", (event) => { if (event.target.closest("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]")) setTimeout(fixOpenMenuState, 0); }, true); document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenus(); }); window.addEventListener("beforeunload", (event) => { closeMenus(); event.stopImmediatePropagation(); }, true); window.addEventListener("popstate", () => { cleanClasses(); const v = new URLSearchParams(location.search).get("view") || "dashboard"; setTimeout(() => render(v, { pop: true }), 0); }); window.addEventListener("pageshow", () => { patchRender(); cleanClasses(); bindRoutes(); installViewportCss(); }); patchRender(); cleanClasses(); bindRoutes(); setInterval(fixOpenMenuState, 120); console.info(`[${VERSION}] installed`); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
