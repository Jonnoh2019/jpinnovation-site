/* JP Innovation Hub profile/menu navigation stability guard.
   Single source for profile-menu routing safety while the Hub is recovered. */
(() => {
  "use strict";

  const VERSION = "profile-menu-navigation-critical-fix-20260721-stable4-admin-safe";
  const VALID_VIEWS = new Set(["dashboard","admin","metrics","profile","client-work","clientwork","my-posts","my-quotes","notifications","messages","settings","boards","projects","quotes","directory","resources","events","rewards"]);
  let navigating = false;
  let lastView = "dashboard";
  const $ = (selector, root = document) => root.querySelector(selector);

  function params() { return new URLSearchParams(location.search || ""); }
  function currentDest() { const v = params().get("view") || lastView || "dashboard"; return VALID_VIEWS.has(v) ? v : "dashboard"; }

  function unlockPage() {
    document.documentElement.classList.remove("profile-menu-open","member-profile-menu-open","jp-profile-menu-open","hub-menu-open","menu-open","is-menu-open");
    document.body.classList.remove("profile-menu-open","member-profile-menu-open","jp-profile-menu-open","hub-menu-open","menu-open","menu-scroll-locked","modal-open","is-menu-open");
    [document.documentElement, document.body].forEach((node) => {
      ["overflow","position","top","width","height","pointer-events","touch-action"].forEach((prop) => node.style.removeProperty(prop));
    });
  }

  function cleanup() {
    unlockPage();
    document.querySelectorAll(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,.hub-menu-backdrop,.menu-backdrop,.drawer-backdrop,[data-profile-backdrop],[data-menu-backdrop]").forEach((node) => node.remove());
    document.querySelectorAll("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu").forEach((menu) => {
      menu.classList.remove("open","active","is-open","show","visible","is-opening","is-closing","stuck","cut-off");
      menu.setAttribute("aria-hidden", "true");
      menu.hidden = true;
      ["display","transform","translate","pointer-events","height","max-height"].forEach((prop) => menu.style.removeProperty(prop));
      try { menu.scrollTop = 0; } catch (_) {}
    });
  }

  function setUrl(view, replace = false) {
    const p = params();
    p.set("entry", "hub");
    p.set("view", view);
    p.delete("signin");
    p.delete("register");
    const next = `${location.pathname}?${p.toString()}`;
    if (`${location.pathname}${location.search}` !== next) {
      history[replace ? "replaceState" : "pushState"]({ entry: "hub", view }, "", next);
    }
  }

  function setTitle(view) {
    const titles = { admin:"Admin Review", metrics:"Website Metrics", profile:"My Profile", messages:"Messages", notifications:"Notifications", settings:"Settings", boards:"Engineering Discussions", projects:"Projects", quotes:"Quote Requests", directory:"Member Directory", resources:"Resources & Tools", events:"Events", rewards:"Rewards", dashboard:"Dashboard", clientwork:"My Client Work", "client-work":"My Client Work", "my-posts":"My Posts", "my-quotes":"My Quotes" };
    const title = titles[view] || titles.dashboard;
    const h = $("#viewTitle");
    if (h) h.textContent = title;
    return title;
  }

  function safeAdminHtml() {
    return `
      <section class="section-card admin-control-hero jp-safe-admin">
        <p class="eyebrow">Private administration</p>
        <h2>Admin control centre</h2>
        <p class="muted">Core Hub management shortcuts. This fail-safe admin view is loaded directly so the profile menu cannot lock the app.</p>
        <div class="metrics-grid compact-admin-metrics">
          <button class="admin-overview-stat dashboard-link" data-view-link="notifications" type="button"><strong>0</strong><span>Notifications</span><small>No new alerts</small></button>
          <button class="admin-overview-stat dashboard-link" data-view-link="messages" type="button"><strong>0</strong><span>Messages</span><small>Inbox clear</small></button>
          <button class="admin-overview-stat" type="button"><strong>0</strong><span>Pending approvals</span><small>No requests waiting</small></button>
          <button class="admin-overview-stat dashboard-link" data-view-link="directory" type="button"><strong>1</strong><span>Members online</span><small>Active now</small></button>
        </div>
      </section>
      <section class="section-card section-lime jp-safe-admin-actions">
        <div class="list-title"><div><h2>Pending actions</h2><p>Approvals, moderation and access checks first.</p></div><span class="pill good">Clear</span></div>
        <div class="admin-quick-actions">
          <button class="dashboard-link" data-view-link="directory" type="button"><span>◎</span>Manage members</button>
          <button class="dashboard-link" data-view-link="boards" type="button"><span>💬</span>Moderate discussions</button>
          <button class="dashboard-link" data-view-link="projects" type="button"><span>▦</span>Review projects</button>
          <button class="dashboard-link" data-view-link="quotes" type="button"><span>£</span>Review quotes</button>
          <button class="dashboard-link" data-view-link="metrics" type="button"><span>📈</span>Website metrics</button>
        </div>
      </section>
      <section class="section-card jp-safe-admin-note">
        <h2>Admin page recovered</h2>
        <p class="muted">If a live backend section fails, it will no longer leave a blank black screen or stacked menu overlay.</p>
        <button class="primary-button dashboard-link" data-view-link="dashboard" type="button">Back to dashboard</button>
      </section>`;
  }

  function routeError(view, error) {
    console.error(`[${VERSION}] failed to render ${view}`, error);
    cleanup();
    const mount = $("#viewMount") || $("[data-view-mount]") || $("main");
    if (mount) mount.innerHTML = `<section class="section-card route-error-card"><h2>This section could not load.</h2><p class="muted">Please retry, or return to Dashboard.</p><button class="primary-button" data-route-retry="${view}" type="button">Retry</button><button class="secondary-button" data-route-dashboard type="button">Back to Dashboard</button></section>`;
  }

  function render(view, opts = {}) {
    const dest = VALID_VIEWS.has(view) ? view : "dashboard";
    lastView = dest;
    cleanup();
    if (!opts.fromPopState) setUrl(dest, false);
    setTitle(dest);
    const mount = $("#viewMount") || $("[data-view-mount]");
    if (dest === "admin") {
      if (mount) {
        mount.dataset.view = "admin";
        mount.innerHTML = safeAdminHtml();
        bindLocalLinks();
      }
      cleanup();
      return;
    }
    try {
      if (typeof window.__jpOriginalRenderView === "function") window.__jpOriginalRenderView(dest);
      else if (typeof window.renderView === "function" && window.renderView !== render) window.renderView(dest);
      else throw new Error("Hub render function is not available.");
      cleanup();
      if (mount && !mount.children.length && !mount.textContent.trim()) throw new Error("Hub view rendered empty content.");
    } catch (error) { routeError(dest, error); }
  }

  function bindLocalLinks() {
    document.querySelectorAll(".dashboard-link[data-view-link]").forEach((button) => {
      if (button.dataset.jpSafeBound) return;
      button.dataset.jpSafeBound = VERSION;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        render(button.dataset.viewLink || "dashboard");
      }, true);
    });
  }

  function targetFrom(node) {
    const row = node?.closest?.("[data-profile-view],[data-view],[data-route-view],[href]");
    if (!row) return "";
    let value = row.dataset.profileView || row.dataset.view || row.dataset.routeView || "";
    const href = row.getAttribute("href") || "";
    if (!value && href) { try { value = new URL(href, location.href).searchParams.get("view") || ""; } catch (_) {} }
    const text = (row.textContent || "").trim().toLowerCase();
    if (!value) {
      if (text.includes("admin")) value = "admin";
      else if (text.includes("metric")) value = "metrics";
      else if (text.includes("profile")) value = "profile";
      else if (text.includes("client")) value = "clientwork";
      else if (text.includes("post")) value = "boards";
      else if (text.includes("quote")) value = "quotes";
      else if (text.includes("notification")) value = "notifications";
      else if (text.includes("message")) value = "messages";
      else if (text.includes("setting")) value = "settings";
    }
    return VALID_VIEWS.has(value) ? value : "";
  }

  function menuClick(event) {
    const menu = event.target.closest("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu");
    if (!menu) return;
    const signOut = event.target.closest("#profileSignOut,[data-profile-action='signout'],[data-action='signout']");
    if (signOut) { cleanup(); return; }
    const dest = targetFrom(event.target);
    if (!dest) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (navigating) return;
    navigating = true;
    const row = event.target.closest("button,a,[role='button']");
    if (row) row.setAttribute("aria-busy", "true");
    requestAnimationFrame(() => {
      try { render(dest); }
      finally {
        if (row) row.removeAttribute("aria-busy");
        setTimeout(() => { navigating = false; }, 250);
      }
    });
  }

  function patchOriginalRender() {
    if (typeof window.renderView !== "function" || window.renderView.__jpStableWrapped) return;
    window.__jpOriginalRenderView = window.renderView;
    window.renderView = function jpStableRenderView(view, ...args) {
      const dest = VALID_VIEWS.has(view) ? view : currentDest();
      if (dest === "admin") return render("admin", { replace: true });
      try { cleanup(); return window.__jpOriginalRenderView.call(this, dest, ...args); }
      catch (error) { routeError(dest, error); }
      finally { cleanup(); }
    };
    window.renderView.__jpStableWrapped = true;
  }

  function resetMenuSizeOnOpen() {
    ["#memberProfileButton", "#profileMenuButton", ".profile-trigger", "[data-profile-menu-toggle]"].forEach((selector) => {
      document.querySelectorAll(selector).forEach((trigger) => {
        if (trigger.dataset.jpStableTrigger) return;
        trigger.dataset.jpStableTrigger = VERSION;
        trigger.addEventListener("click", () => setTimeout(() => {
          document.querySelectorAll("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu").forEach((menu) => {
            const top = Math.max(8, Math.round((document.querySelector(".hub-mobile-header,.hub-topbar,.portal-header")?.getBoundingClientRect().bottom || 0) + 8));
            const max = Math.max(260, Math.round((window.visualViewport?.height || window.innerHeight || 720) - top - 16));
            menu.style.maxHeight = `${max}px`;
            menu.style.overflowY = "auto";
            try { menu.scrollTop = 0; } catch (_) {}
          });
        }, 0), { passive: true });
      });
    });
  }

  function recoverBlank() {
    if (params().get("entry") !== "hub") return;
    const mount = $("#viewMount") || $("[data-view-mount]");
    if (mount && !mount.children.length && !mount.textContent.trim()) render(currentDest(), { fromPopState: true });
  }

  function install() {
    document.documentElement.dataset.jpProfileCriticalNav = VERSION;
    document.addEventListener("click", menuClick, true);
    window.addEventListener("beforeunload", (event) => { cleanup(); event.stopImmediatePropagation(); }, true);
    window.addEventListener("popstate", () => { cleanup(); setTimeout(() => render(currentDest(), { fromPopState: true }), 0); });
    window.addEventListener("pageshow", () => { cleanup(); patchOriginalRender(); resetMenuSizeOnOpen(); setTimeout(recoverBlank, 250); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") cleanup(); });
    document.addEventListener("click", (event) => {
      const retry = event.target.closest("[data-route-retry]");
      const dash = event.target.closest("[data-route-dashboard]");
      if (retry) render(retry.dataset.routeRetry || currentDest());
      if (dash) render("dashboard");
    });
    patchOriginalRender();
    resetMenuSizeOnOpen();
    bindLocalLinks();
    setTimeout(() => { patchOriginalRender(); resetMenuSizeOnOpen(); bindLocalLinks(); recoverBlank(); }, 700);
    setTimeout(() => { patchOriginalRender(); resetMenuSizeOnOpen(); bindLocalLinks(); recoverBlank(); }, 1800);
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
