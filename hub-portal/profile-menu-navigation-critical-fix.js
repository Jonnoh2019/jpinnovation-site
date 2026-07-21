/* JP Innovation Hub profile/menu navigation stability guard. */
(() => {
  "use strict";
  const VERSION = "profile-menu-navigation-critical-fix-20260721-stable6-viewport";
  const VALID = new Set(["dashboard","admin","metrics","profile","clientwork","client-work","boards","projects","quotes","directory","resources","events","messages","notifications","settings","rewards","my-posts","my-quotes"]);
  let busy = false;
  const $ = (s, r = document) => r.querySelector(s);

  function installViewportCss() {
    if (document.getElementById("jpProfileMenuCriticalViewportCss")) return;
    const style = document.createElement("style");
    style.id = "jpProfileMenuCriticalViewportCss";
    style.textContent = `
      @media (max-width: 760px) {
        #memberProfileMenu.member-profile-menu,
        #profileMenu.profile-menu,
        .member-profile-menu.open,
        .profile-menu.open {
          position: fixed !important;
          top: clamp(82px, 14dvh, 108px) !important;
          left: max(14px, env(safe-area-inset-left)) !important;
          right: max(14px, env(safe-area-inset-right)) !important;
          bottom: calc(14px + env(safe-area-inset-bottom)) !important;
          width: auto !important;
          max-width: none !important;
          height: auto !important;
          max-height: none !important;
          overflow-y: auto !important;
          overscroll-behavior: contain !important;
          -webkit-overflow-scrolling: touch !important;
          transform: none !important;
          z-index: 9999 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function cleanClasses() {
    const classes = ["profile-menu-open","member-profile-menu-open","jp-profile-menu-open","hub-menu-open","menu-open","menu-scroll-locked","modal-open","is-menu-open","jp-menu-hard-lock"];
    document.documentElement.classList.remove(...classes);
    document.body.classList.remove(...classes);
    [document.documentElement, document.body].forEach((node) => ["overflow","position","top","width","height","pointer-events","touch-action"].forEach((prop) => node.style.removeProperty(prop)));
  }

  function closeMenus() {
    cleanClasses();
    document.querySelectorAll(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,.hub-menu-backdrop,.menu-backdrop,.drawer-backdrop,[data-profile-backdrop],[data-menu-backdrop]").forEach((node) => node.remove());
    document.querySelectorAll("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu").forEach((menu) => {
      menu.classList.remove("open","active","is-open","show","visible","is-opening","is-closing","stuck","cut-off");
      menu.setAttribute("aria-hidden", "true");
      menu.hidden = true;
      ["display","transform","translate","pointer-events","height","max-height","top","left","right","bottom","width","max-width"].forEach((prop) => menu.style.removeProperty(prop));
      try { menu.scrollTop = 0; } catch (_) {}
    });
    const trigger = $("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function fixOpenMenuState() {
    installViewportCss();
    const menu = $("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu");
    const trigger = $("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]");
    const shouldBeOpen = document.body.classList.contains("member-profile-menu-open") || document.body.classList.contains("profile-menu-open") || trigger?.getAttribute("aria-expanded") === "true";
    if (!menu) return;
    if (shouldBeOpen) {
      menu.hidden = false;
      menu.setAttribute("aria-hidden", "false");
      menu.classList.add("open");
      document.body.classList.remove("jp-menu-hard-lock");
      document.documentElement.classList.remove("jp-menu-hard-lock");
      if (innerWidth <= 760) {
        menu.style.position = "fixed";
        menu.style.top = "clamp(82px, 14dvh, 108px)";
        menu.style.left = "max(14px, env(safe-area-inset-left))";
        menu.style.right = "max(14px, env(safe-area-inset-right))";
        menu.style.bottom = "calc(14px + env(safe-area-inset-bottom))";
        menu.style.width = "auto";
        menu.style.maxWidth = "none";
        menu.style.height = "auto";
        menu.style.maxHeight = "none";
        menu.style.overflowY = "auto";
        menu.style.transform = "none";
      }
      try { menu.scrollTop = 0; } catch (_) {}
    } else if (menu.hidden) cleanClasses();
  }

  function setUrl(view) {
    const p = new URLSearchParams(location.search || "");
    p.set("entry", "hub"); p.set("view", view); p.delete("signin"); p.delete("register");
    const next = `${location.pathname}?${p.toString()}`;
    if (`${location.pathname}${location.search}` !== next) history.pushState({ entry: "hub", view }, "", next);
  }

  function setTitle(view) {
    const title = ({admin:"Admin Review",metrics:"Website Metrics",profile:"My Profile",messages:"Messages",notifications:"Notifications",settings:"Settings",boards:"Engineering Discussions",projects:"Projects",quotes:"Quote Requests",directory:"Member Directory",resources:"Resources & Tools",events:"Events",rewards:"Rewards",clientwork:"My Client Work","client-work":"My Client Work",dashboard:"Dashboard"})[view] || "Dashboard";
    const h = $("#viewTitle"); if (h) h.textContent = title;
  }

  function adminHtml() {
    return `<section class="section-card section-violet admin-control-hero"><p class="eyebrow">Private administration</p><h2>Admin control centre</h2><p class="muted">Core Hub management shortcuts loaded in safe mode so the profile menu cannot lock the app.</p><div class="metrics-grid compact-admin-metrics"><button class="admin-overview-stat jp-route" data-view-link="notifications" type="button"><strong>0</strong><span>Notifications</span><small>No new alerts</small></button><button class="admin-overview-stat jp-route" data-view-link="messages" type="button"><strong>0</strong><span>Messages</span><small>Inbox clear</small></button><button class="admin-overview-stat" type="button"><strong>0</strong><span>Pending approvals</span><small>No requests waiting</small></button><button class="admin-overview-stat jp-route" data-view-link="directory" type="button"><strong>1</strong><span>Members online</span><small>Active now</small></button></div></section><section class="section-card section-lime"><div class="list-title"><div><h2>Pending actions</h2><p>Approvals, moderation and access checks first.</p></div><span class="pill good">Clear</span></div><div class="admin-quick-actions"><button class="jp-route" data-view-link="directory" type="button"><span>◎</span>Manage members</button><button class="jp-route" data-view-link="boards" type="button"><span>💬</span>Moderate discussions</button><button class="jp-route" data-view-link="projects" type="button"><span>▦</span>Review projects</button><button class="jp-route" data-view-link="quotes" type="button"><span>£</span>Review quotes</button><button class="jp-route" data-view-link="metrics" type="button"><span>📈</span>Website metrics</button></div></section><section class="section-card"><h2>Admin page recovered</h2><p class="muted">The route now closes the profile menu, removes stale locks and avoids blank/stacked overlay screens.</p><button class="primary-button jp-route" data-view-link="dashboard" type="button">Back to dashboard</button></section>`;
  }

  function render(view, opts = {}) {
    const dest = VALID.has(view) ? (view === "client-work" ? "clientwork" : view) : "dashboard";
    closeMenus(); if (!opts.pop) setUrl(dest); setTitle(dest);
    const mount = $("#viewMount") || $("[data-view-mount]");
    if (dest === "admin") { if (mount) { mount.dataset.view = "admin"; mount.innerHTML = adminHtml(); bindRoutes(); } return; }
    try {
      if (typeof window.__jpOriginalRenderView === "function") window.__jpOriginalRenderView(dest);
      else if (typeof window.renderView === "function" && window.renderView !== render) window.renderView(dest);
      else throw new Error("Hub render function not available");
    } catch (error) {
      console.error(`[${VERSION}] route failed`, error);
      if (mount) mount.innerHTML = `<section class="section-card"><h2>This section could not load.</h2><p class="muted">Please retry or return to Dashboard.</p><button class="primary-button jp-route" data-view-link="dashboard" type="button">Back to Dashboard</button></section>`;
    } finally { cleanClasses(); bindRoutes(); }
  }

  function targetFrom(node) {
    const row = node?.closest?.("[data-profile-view],[data-profile-action],[data-view],[data-route-view],[href]"); if (!row) return "";
    let v = row.dataset.profileView || row.dataset.view || row.dataset.routeView || "";
    const action = row.dataset.profileAction || ""; if (action === "my-posts") v = "boards"; if (action === "my-quotes") v = "quotes";
    if (!v) { const text = (row.textContent || "").toLowerCase(); if (text.includes("admin")) v = "admin"; else if (text.includes("metric")) v = "metrics"; else if (text.includes("profile")) v = "profile"; else if (text.includes("client")) v = "clientwork"; else if (text.includes("post")) v = "boards"; else if (text.includes("quote")) v = "quotes"; else if (text.includes("notification")) v = "notifications"; else if (text.includes("message")) v = "messages"; else if (text.includes("setting")) v = "settings"; }
    return VALID.has(v) ? v : "";
  }

  function onMenuClick(event) {
    const menu = event.target.closest("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu"); if (!menu) return;
    if (event.target.closest("#profileSignOut,#logoutButton,[data-profile-action='signout'],[data-action='signout']")) { closeMenus(); return; }
    const dest = targetFrom(event.target); if (!dest) return;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); if (busy) return; busy = true;
    const row = event.target.closest("button,a,[role='button']"); if (row) row.setAttribute("aria-busy", "true");
    requestAnimationFrame(() => { try { render(dest); } finally { if (row) row.removeAttribute("aria-busy"); setTimeout(() => { busy = false; }, 180); } });
  }

  function bindRoutes() {
    document.querySelectorAll(".jp-route,[data-view-link]").forEach((button) => {
      if (button.dataset.jpSafeBound) return; button.dataset.jpSafeBound = VERSION;
      button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); render(button.dataset.viewLink || "dashboard"); }, true);
    });
  }

  function patchRender() {
    if (typeof window.renderView !== "function" || window.renderView.__jpStableWrapped) return;
    window.__jpOriginalRenderView = window.renderView;
    window.renderView = function jpStableRenderView(view, ...args) {
      const dest = VALID.has(view) ? view : "dashboard"; if (dest === "admin") return render("admin");
      try { closeMenus(); return window.__jpOriginalRenderView.call(this, dest, ...args); }
      catch (error) { console.error(`[${VERSION}] renderView failed`, error); }
      finally { cleanClasses(); bindRoutes(); }
    };
    window.renderView.__jpStableWrapped = true;
  }

  function install() {
    document.documentElement.dataset.jpProfileCriticalNav = VERSION; installViewportCss();
    document.addEventListener("click", onMenuClick, true);
    document.addEventListener("click", (event) => { if (event.target.closest("#memberProfileButton,#profileMenuButton,[data-profile-menu-toggle]")) setTimeout(fixOpenMenuState, 0); }, true);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenus(); });
    window.addEventListener("beforeunload", (event) => { closeMenus(); event.stopImmediatePropagation(); }, true);
    window.addEventListener("popstate", () => { cleanClasses(); const v = new URLSearchParams(location.search).get("view") || "dashboard"; setTimeout(() => render(v, { pop: true }), 0); });
    window.addEventListener("pageshow", () => { patchRender(); cleanClasses(); bindRoutes(); installViewportCss(); });
    patchRender(); cleanClasses(); bindRoutes();
    setInterval(() => { if ((document.body.className || "").includes("jp-menu-hard-lock")) fixOpenMenuState(); }, 700);
    console.info(`[${VERSION}] installed`);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
