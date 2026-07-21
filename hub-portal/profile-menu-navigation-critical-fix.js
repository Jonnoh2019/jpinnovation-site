/* JP Innovation Hub profile/menu navigation stability guard.
   This replaces the old compatibility loader that force-loaded multiple menu overrides.
   Goal: keep one route action per tap, clean stale overlays, and recover blank Hub views. */
(() => {
  "use strict";

  const VERSION = "profile-menu-navigation-critical-fix-20260721-stable3";
  const VALID_VIEWS = new Set([
    "dashboard",
    "admin",
    "metrics",
    "profile",
    "client-work",
    "my-posts",
    "my-quotes",
    "notifications",
    "messages",
    "settings",
    "boards",
    "projects",
    "quotes",
    "directory",
    "resources",
    "events",
    "rewards"
  ]);

  let navigating = false;
  let lastView = "dashboard";

  const $ = (selector, root = document) => root.querySelector(selector);

  function getParams() {
    return new URLSearchParams(window.location.search || "");
  }

  function getRequestedView() {
    const params = getParams();
    const view = params.get("view") || lastView || "dashboard";
    return VALID_VIEWS.has(view) ? view : "dashboard";
  }

  function unlockPage() {
    document.documentElement.classList.remove(
      "profile-menu-open",
      "member-profile-menu-open",
      "jp-profile-menu-open",
      "hub-menu-open",
      "menu-open",
      "is-menu-open"
    );
    document.body.classList.remove(
      "profile-menu-open",
      "member-profile-menu-open",
      "jp-profile-menu-open",
      "hub-menu-open",
      "menu-open",
      "menu-scroll-locked",
      "modal-open",
      "is-menu-open"
    );
    [document.documentElement, document.body].forEach((node) => {
      node.style.removeProperty("overflow");
      node.style.removeProperty("position");
      node.style.removeProperty("top");
      node.style.removeProperty("width");
      node.style.removeProperty("height");
      node.style.removeProperty("pointer-events");
      node.style.removeProperty("touch-action");
    });
  }

  function cleanupOverlays() {
    unlockPage();
    document.querySelectorAll(
      ".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,.hub-menu-backdrop,.menu-backdrop,.drawer-backdrop,[data-profile-backdrop],[data-menu-backdrop]"
    ).forEach((node) => node.remove());

    document.querySelectorAll("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu").forEach((menu) => {
      if (menu.hasAttribute("hidden")) return;
      menu.classList.remove("is-opening", "is-closing", "stuck", "cut-off");
      menu.style.removeProperty("transform");
      menu.style.removeProperty("translate");
      menu.style.removeProperty("pointer-events");
      menu.style.removeProperty("height");
      menu.style.removeProperty("max-height");
      const scroller = menu.querySelector(".profile-menu-scroll,.profile-menu-list,.profile-menu-body") || menu;
      try { scroller.scrollTop = 0; } catch (_) {}
    });
  }

  function closeProfileMenu() {
    document.querySelectorAll("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu").forEach((menu) => {
      menu.classList.remove("open", "active", "is-open", "show", "visible");
      menu.setAttribute("aria-hidden", "true");
      menu.hidden = true;
      menu.style.removeProperty("display");
      menu.style.removeProperty("pointer-events");
    });
    cleanupOverlays();
  }

  function routeError(view, error) {
    console.error(`[${VERSION}] failed to render ${view}`, error);
    cleanupOverlays();
    const mount = $("#viewMount") || $("[data-view-mount]") || $("main");
    if (!mount) return;
    mount.innerHTML = `
      <section class="portal-card route-error-card" style="margin:16px; padding:18px; border:1px solid rgba(22,139,255,.45); border-radius:18px; background:rgba(4,12,24,.92); color:#fff;">
        <h2 style="margin:0 0 8px; font-size:1.35rem;">This section could not load.</h2>
        <p style="margin:0 0 14px; color:#b9c4d4;">Please retry, or return to the Dashboard.</p>
        <button type="button" data-route-retry="${view}" style="min-height:44px; padding:10px 14px; border-radius:12px; border:1px solid rgba(22,139,255,.55); background:#0878ff; color:#fff; font-weight:800;">Retry</button>
        <button type="button" data-route-dashboard style="min-height:44px; margin-left:8px; padding:10px 14px; border-radius:12px; border:1px solid rgba(255,255,255,.18); background:rgba(255,255,255,.06); color:#fff; font-weight:800;">Back to Dashboard</button>
      </section>`;
  }

  function updateUrl(view) {
    const params = getParams();
    params.set("entry", "hub");
    params.set("view", view);
    const next = `${window.location.pathname}?${params.toString()}`;
    if (`${window.location.pathname}${window.location.search}` !== next) {
      history.pushState({ entry: "hub", view }, "", next);
    }
  }

  function renderDirect(view, opts = {}) {
    const destination = VALID_VIEWS.has(view) ? view : "dashboard";
    lastView = destination;
    cleanupOverlays();
    try {
      if (!opts.fromPopState) updateUrl(destination);
      if (typeof window.renderView === "function") {
        window.renderView(destination);
      } else if (typeof window.renderHubView === "function") {
        window.renderHubView(destination);
      } else {
        throw new Error("Hub render function is not available yet.");
      }
      cleanupOverlays();
      const mount = $("#viewMount") || $("[data-view-mount]");
      if (mount && !mount.children.length && !mount.textContent.trim()) {
        throw new Error("Hub view rendered empty content.");
      }
    } catch (error) {
      routeError(destination, error);
    }
  }

  function menuTargetFrom(node) {
    if (!node) return "";
    const routeNode = node.closest("[data-profile-view],[data-view],[data-route-view],[href]");
    if (!routeNode) return "";
    let value = routeNode.dataset.profileView || routeNode.dataset.view || routeNode.dataset.routeView || "";
    const href = routeNode.getAttribute("href") || "";
    if (!value && href) {
      try { value = new URL(href, window.location.href).searchParams.get("view") || ""; } catch (_) {}
    }
    const text = (routeNode.textContent || "").trim().toLowerCase();
    if (!value) {
      if (text.includes("admin")) value = "admin";
      else if (text.includes("metric")) value = "metrics";
      else if (text.includes("profile")) value = "profile";
      else if (text.includes("client")) value = "client-work";
      else if (text.includes("post")) value = "my-posts";
      else if (text.includes("quote")) value = "my-quotes";
      else if (text.includes("notification")) value = "notifications";
      else if (text.includes("message")) value = "messages";
      else if (text.includes("setting")) value = "settings";
    }
    return VALID_VIEWS.has(value) ? value : "";
  }

  function handleProfileMenuClick(event) {
    const menu = event.target.closest("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu");
    if (!menu) return;
    const signOut = event.target.closest("#profileSignOut,[data-profile-action='signout'],[data-action='signout']");
    if (signOut) {
      cleanupOverlays();
      return;
    }
    const destination = menuTargetFrom(event.target);
    if (!destination) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (navigating) return;
    navigating = true;
    const row = event.target.closest("button,a,[role='button']");
    if (row) row.setAttribute("aria-busy", "true");
    closeProfileMenu();
    requestAnimationFrame(() => {
      try { renderDirect(destination); }
      finally {
        if (row) row.removeAttribute("aria-busy");
        setTimeout(() => { navigating = false; }, 220);
      }
    });
  }

  function patchMenuOpenReset() {
    const triggerSelectors = ["#memberProfileButton", "#profileMenuButton", ".profile-trigger", "[data-profile-menu-toggle]"];
    triggerSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((trigger) => {
        if (trigger.dataset.jpStableTrigger) return;
        trigger.dataset.jpStableTrigger = VERSION;
        trigger.addEventListener("click", () => {
          setTimeout(() => {
            document.querySelectorAll("#memberProfileMenu,#profileMenu,.profile-menu,.member-profile-menu").forEach((menu) => {
              const top = Math.max(10, Math.round((document.querySelector(".hub-mobile-header,.hub-topbar,.portal-header")?.getBoundingClientRect().bottom || 0) + 8));
              const max = Math.max(260, Math.round((window.visualViewport?.height || window.innerHeight || 720) - top - 16));
              menu.style.maxHeight = `${max}px`;
              menu.style.overflowY = "auto";
              try { menu.scrollTop = 0; } catch (_) {}
            });
          }, 0);
        }, { passive: true });
      });
    });
  }

  function patchRenderView() {
    if (typeof window.renderView !== "function" || window.renderView.__jpStableWrapped) return;
    const original = window.renderView;
    window.renderView = function jpStableRenderView(view, ...args) {
      const destination = VALID_VIEWS.has(view) ? view : getRequestedView();
      try {
        cleanupOverlays();
        lastView = destination;
        return original.call(this, destination, ...args);
      } catch (error) {
        routeError(destination, error);
        return undefined;
      } finally {
        cleanupOverlays();
      }
    };
    window.renderView.__jpStableWrapped = true;
  }

  function recoverBlankView() {
    const params = getParams();
    if (params.get("entry") !== "hub") return;
    const mount = $("#viewMount") || $("[data-view-mount]");
    const appShell = $("#appShell") || $(".hub-app") || $(".portal-app");
    if (appShell && getComputedStyle(appShell).display === "none") return;
    if (mount && !mount.children.length && !mount.textContent.trim()) renderDirect(getRequestedView(), { fromPopState: true });
  }

  function install() {
    document.documentElement.dataset.jpProfileCriticalNav = VERSION;
    document.addEventListener("click", handleProfileMenuClick, true);
    window.addEventListener("beforeunload", (event) => {
      cleanupOverlays();
      // Stop older beforeunload handlers that throw on Supabase thenables and can leave the PWA stuck.
      event.stopImmediatePropagation();
    }, true);
    window.addEventListener("popstate", () => {
      cleanupOverlays();
      setTimeout(() => renderDirect(getRequestedView(), { fromPopState: true }), 0);
    });
    window.addEventListener("pageshow", () => {
      cleanupOverlays();
      patchRenderView();
      patchMenuOpenReset();
      setTimeout(recoverBlankView, 250);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeProfileMenu();
    });
    document.addEventListener("click", (event) => {
      const retry = event.target.closest("[data-route-retry]");
      const dash = event.target.closest("[data-route-dashboard]");
      if (retry) renderDirect(retry.dataset.routeRetry || getRequestedView());
      if (dash) renderDirect("dashboard");
    });
    patchRenderView();
    patchMenuOpenReset();
    setTimeout(() => { patchRenderView(); patchMenuOpenReset(); recoverBlankView(); }, 700);
    setTimeout(() => { patchRenderView(); patchMenuOpenReset(); recoverBlankView(); }, 1800);
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
