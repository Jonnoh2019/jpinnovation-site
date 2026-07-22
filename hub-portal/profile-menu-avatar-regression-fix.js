/* JP Innovation shared role avatar styling + emergency profile menu owner.
   This file loads before the later profile-menu patches, so it owns the trigger first
   and stops stale handlers from freezing or swallowing profile-menu taps. */
(() => {
  "use strict";
  const VERSION = "profile-menu-avatar-regression-fix-20260722-emergency-open";
  if (window.__jpProfileAvatarEmergencyFix === VERSION) return;
  window.__jpProfileAvatarEmergencyFix = VERSION;
  document.documentElement.dataset.jpProfileAvatarEmergencyFix = VERSION;

  const VALID_VIEWS = new Set([
    "dashboard", "admin", "metrics", "profile", "clientwork", "client-work", "boards",
    "projects", "quotes", "directory", "resources", "events", "messages", "notifications",
    "settings", "rewards"
  ]);

  let queued = false;
  let navigating = false;
  let lastTap = 0;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const menu = () => $("#memberProfileMenu.member-profile-menu");
  const button = () => $("#memberProfileButton");
  const viewMount = () => $("#viewMount") || $("[data-view-mount]");

  function addStyles() {
    let style = document.getElementById("jpSharedRoleAvatarStyles");
    if (!style) {
      style = document.createElement("style");
      style.id = "jpSharedRoleAvatarStyles";
      document.head.appendChild(style);
    }
    style.textContent = `
      :root{
        --jp-avatar-blue-edge:#03163f;
        --jp-avatar-blue-mid:#064ba8;
        --jp-avatar-blue-hi:#147ee8;
        --jp-avatar-gold-edge:#6c4b0c;
        --jp-avatar-gold-mid:#b78922;
        --jp-avatar-gold-hi:#eed16c;
        --jp-avatar-ring-blue:#168bff;
        --jp-avatar-ring-gold:#c89b2c;
      }
      .jp-role-avatar,#memberInitials,#profileMenuAvatar,.profile-avatar{
        box-sizing:border-box!important;display:inline-grid!important;place-items:center!important;
        aspect-ratio:1/1!important;border-radius:999px!important;line-height:1!important;
        text-align:center!important;font-weight:950!important;letter-spacing:-.02em!important;
        overflow:hidden!important;flex:0 0 auto!important;color:#fff!important;
        text-shadow:0 1px 2px rgba(0,0,0,.45)!important;
      }
      #memberProfileButton{
        pointer-events:auto!important;cursor:pointer!important;touch-action:manipulation!important;
      }
      #memberProfileButton *,#memberInitials{pointer-events:auto!important;touch-action:manipulation!important}
      #memberProfileButton.member-chip{
        box-sizing:border-box!important;display:grid!important;place-items:center!important;
        width:50px!important;height:50px!important;min-width:50px!important;max-width:50px!important;
        min-height:50px!important;max-height:50px!important;aspect-ratio:1/1!important;
        padding:4px!important;border-radius:999px!important;overflow:visible!important;
      }
      #memberInitials,#profileMenuAvatar{
        width:42px!important;height:42px!important;min-width:42px!important;font-size:15px!important;
      }
      .profile-avatar{width:44px;height:44px;min-width:44px;font-size:16px}
      .jp-role-avatar-admin,#memberInitials.jp-role-avatar-admin,#profileMenuAvatar.jp-role-avatar-admin,.profile-avatar.jp-role-avatar-admin{
        background:radial-gradient(circle at 34% 28%,var(--jp-avatar-gold-hi) 0 13%,var(--jp-avatar-gold-mid) 40%,var(--jp-avatar-gold-edge) 100%)!important;
        border:3px solid var(--jp-avatar-ring-blue)!important;
        box-shadow:inset 0 1px 3px rgba(255,255,255,.34),inset 0 -4px 9px rgba(50,31,2,.42),0 0 0 1px rgba(255,255,255,.08),0 6px 16px rgba(0,0,0,.35)!important;
      }
      .jp-role-avatar-hub,#memberInitials.jp-role-avatar-hub,#profileMenuAvatar.jp-role-avatar-hub,.profile-avatar.jp-role-avatar-hub{
        background:radial-gradient(circle at 34% 28%,var(--jp-avatar-blue-hi) 0 14%,var(--jp-avatar-blue-mid) 44%,var(--jp-avatar-blue-edge) 100%)!important;
        border:3px solid var(--jp-avatar-ring-gold)!important;
        box-shadow:inset 0 1px 3px rgba(255,255,255,.22),inset 0 -4px 8px rgba(0,14,48,.42),0 0 0 1px rgba(255,255,255,.07),0 6px 16px rgba(0,0,0,.32)!important;
      }
      .jp-role-avatar-client,#memberInitials.jp-role-avatar-client,#profileMenuAvatar.jp-role-avatar-client,.profile-avatar.jp-role-avatar-client{
        background:radial-gradient(circle at 34% 28%,var(--jp-avatar-blue-hi) 0 14%,var(--jp-avatar-blue-mid) 44%,var(--jp-avatar-blue-edge) 100%)!important;
        border:3px solid rgba(255,255,255,.92)!important;
        box-shadow:inset 0 1px 3px rgba(255,255,255,.2),inset 0 -4px 8px rgba(0,14,48,.42),0 0 0 1px rgba(255,255,255,.05),0 6px 16px rgba(0,0,0,.3)!important;
      }
      #memberInitials img,#profileMenuAvatar img,.profile-avatar img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:999px!important}
      #memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton,#memberStatusStarInline{display:none!important}

      #memberProfileMenu.member-profile-menu:not(.open),#memberProfileMenu.member-profile-menu[aria-hidden="true"]{
        display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;
        height:0!important;max-height:0!important;overflow:hidden!important;transform:none!important;translate:none!important;
      }
      #memberProfileMenu.member-profile-menu.open{
        position:fixed!important;top:var(--jp-profile-menu-top,96px)!important;
        left:max(12px,env(safe-area-inset-left))!important;right:max(12px,env(safe-area-inset-right))!important;
        bottom:calc(12px + env(safe-area-inset-bottom))!important;width:auto!important;
        max-width:calc(100vw - 24px)!important;height:auto!important;min-height:0!important;
        max-height:calc(var(--jp-visible-vh,100dvh) - var(--jp-profile-menu-top,96px) - 12px - env(safe-area-inset-bottom))!important;
        display:flex!important;flex-direction:column!important;gap:6px!important;padding:8px!important;
        box-sizing:border-box!important;overflow-x:hidden!important;overflow-y:auto!important;
        overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;
        transform:none!important;translate:none!important;visibility:visible!important;opacity:1!important;
        pointer-events:auto!important;z-index:2147483000!important;clip-path:none!important;contain:none!important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-header,
      #memberProfileMenu.member-profile-menu.open .profile-menu-link{
        flex:0 0 auto!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;
        transform:none!important;translate:none!important;margin:0!important;
      }
      #memberProfileMenu.member-profile-menu.open .profile-menu-header{display:grid!important;min-height:56px!important;margin-bottom:2px!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-link{display:grid!important;min-height:42px!important;max-height:none!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-link small{display:none!important}
      #memberProfileMenu.member-profile-menu.open .profile-menu-link[aria-busy="true"]{opacity:.62!important;pointer-events:none!important}
      body.jp-profile-menu-locked{overflow:hidden!important;touch-action:none!important}
      @media(min-width:761px){#memberProfileMenu.member-profile-menu.open{left:auto!important;right:18px!important;width:min(390px,calc(100vw - 36px))!important;max-width:calc(100vw - 36px)!important}}
      @media(max-width:390px){#memberProfileButton.member-chip{width:48px!important;height:48px!important;min-width:48px!important;max-width:48px!important;min-height:48px!important;max-height:48px!important}#memberInitials,#profileMenuAvatar{width:40px!important;height:40px!important;min-width:40px!important;font-size:14px!important}}
    `;
  }

  function currentUserSafe() {
    try { return typeof currentUser === "function" ? currentUser() : null; } catch { return null; }
  }

  function roleFor(user) {
    const role = String(user?.role || user?.account_type || "").toLowerCase();
    const level = String(user?.level || "").toLowerCase();
    const status = String(user?.membershipStatus || user?.membership_status || user?.status || "").toLowerCase();
    if (role === "admin" || level.includes("admin")) return "admin";
    if (role === "member" || role === "hub" || ["active", "approved", "paid"].includes(status)) return "hub";
    return "client";
  }

  function applyRole(node, role) {
    if (!node) return;
    node.classList.remove("jp-role-avatar", "jp-role-avatar-admin", "jp-role-avatar-hub", "jp-role-avatar-client", "admin", "hub", "client");
    node.classList.add("jp-role-avatar", `jp-role-avatar-${role}`);
  }

  function inferCardRole(card) {
    if (!card) return null;
    if (card.classList.contains("role-admin") || card.querySelector(".member-role-pill.admin")) return "admin";
    if (card.classList.contains("role-hub") || card.querySelector(".member-role-pill.hub")) return "hub";
    if (card.classList.contains("role-client") || card.querySelector(".member-role-pill.client")) return "client";
    const text = (card.textContent || "").toLowerCase();
    if (text.includes("admin")) return "admin";
    if (text.includes("hub member") || text.includes("paid innovation hub")) return "hub";
    if (text.includes("client portal")) return "client";
    return null;
  }

  function applyAvatars() {
    queued = false;
    addStyles();
    $$("#memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton,#memberStatusStarInline").forEach((node) => {
      node.classList.add("hidden"); node.setAttribute("aria-hidden", "true");
    });
    const userRole = roleFor(currentUserSafe());
    applyRole($("#memberInitials"), userRole);
    applyRole($("#profileMenuAvatar"), userRole);
    $$(".member-card .profile-avatar,.profile-summary-card .profile-avatar,.member-profile-card .profile-avatar").forEach((node) => {
      applyRole(node, inferCardRole(node.closest(".member-card,.profile-summary-card,.member-profile-card,.directory-account-section")) || userRole);
    });
  }

  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(applyAvatars);
  }

  function visibleVh() { return Math.max(420, Math.floor(window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720)); }
  function topOffset() {
    const header = $(".workspace-header") || $("header");
    const rect = header?.getBoundingClientRect?.();
    const bottom = rect ? Math.round(rect.bottom + 8) : 96;
    return Math.max(84, Math.min(bottom, visibleVh() - 280));
  }
  function setMenuVars() {
    document.documentElement.style.setProperty("--jp-visible-vh", `${visibleVh()}px`);
    document.documentElement.style.setProperty("--jp-profile-menu-top", `${topOffset()}px`);
  }

  function clearOverlays() {
    $$(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,[data-profile-backdrop]").forEach((n) => n.remove());
    [document.body, document.documentElement].forEach((node) => {
      node.classList.remove("profile-menu-open", "menu-scroll-locked", "jp-menu-hard-lock", "jp-profile-regression-lock");
      node.style.removeProperty("pointer-events");
      node.style.removeProperty("touch-action");
    });
  }

  function closeProfileMenu() {
    const m = menu();
    if (m) {
      m.classList.remove("open", "active", "show", "visible", "is-open", "is-opening", "is-closing", "stuck", "cut-off");
      m.setAttribute("aria-hidden", "true");
      m.hidden = true;
      ["display", "visibility", "opacity", "pointer-events", "height", "min-height", "max-height", "overflow", "transform", "translate", "top", "left", "right", "bottom", "width", "max-width", "position", "clip", "clip-path", "contain"].forEach((p) => m.style.removeProperty(p));
      try { m.scrollTop = 0; } catch (_) {}
      $$(".profile-menu-link", m).forEach((row) => {
        row.removeAttribute("aria-busy");
        row.classList.remove("is-loading", "selected", "active", "is-active");
        row.style.removeProperty("pointer-events");
      });
    }
    button()?.setAttribute("aria-expanded", "false");
    [document.body, document.documentElement].forEach((node) => {
      node.classList.remove("member-profile-menu-open", "jp-profile-menu-open", "jp-profile-menu-locked");
      node.style.removeProperty("overflow");
    });
    clearOverlays();
  }

  function openProfileMenu() {
    const m = menu();
    if (!m) return false;
    setMenuVars(); clearOverlays(); applyAvatars();
    m.hidden = false; m.removeAttribute("hidden");
    m.classList.add("open"); m.setAttribute("aria-hidden", "false");
    button()?.setAttribute("aria-expanded", "true");
    document.body.classList.add("member-profile-menu-open", "jp-profile-menu-open", "jp-profile-menu-locked");
    document.documentElement.classList.add("member-profile-menu-open", "jp-profile-menu-open");
    ["display", "height", "max-height", "transform", "translate", "clip-path"].forEach((p) => m.style.removeProperty(p));
    $$(".profile-menu-header,.profile-menu-link", m).forEach((row) => {
      row.hidden = false; row.removeAttribute("hidden"); row.removeAttribute("aria-busy");
      row.classList.remove("is-loading", "selected", "active", "is-active");
      ["display", "visibility", "opacity", "pointer-events", "transform", "max-height"].forEach((p) => row.style.removeProperty(p));
    });
    requestAnimationFrame(() => { try { m.scrollTop = 0; } catch (_) {} });
    return true;
  }

  function isOpen() {
    const m = menu();
    return !!m && !m.hidden && m.classList.contains("open") && m.getAttribute("aria-hidden") === "false";
  }

  function rowDestination(row) {
    if (!row) return "";
    const action = row.dataset.profileAction || row.dataset.action || "";
    if (action === "signout") return "signout";
    if (action === "my-posts") return "boards";
    if (action === "my-quotes") return "quotes";
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
    return VALID_VIEWS.has(view) ? view : "";
  }

  function updateUrl(view) {
    const params = new URLSearchParams(location.search || "");
    params.set("entry", "hub");
    params.set("view", view);
    params.delete("signin"); params.delete("register");
    const next = `${location.pathname}?${params.toString()}`;
    if (`${location.pathname}${location.search}` !== next) history.pushState({ entry: "hub", view }, "", next);
  }

  function renderDestination(view) {
    const target = view === "client-work" ? "clientwork" : view;
    if (!VALID_VIEWS.has(target)) return;
    updateUrl(target);
    try {
      if (typeof window.__jpOriginalRenderView === "function") window.__jpOriginalRenderView(target);
      else if (typeof window.renderView === "function") window.renderView(target);
      else throw new Error("Hub render function not available");
    } catch (error) {
      console.error(`[${VERSION}] profile navigation failed`, error);
      const mount = viewMount();
      if (mount) {
        mount.innerHTML = `<section class="section-card"><h2>This section could not load.</h2><p class="muted">Please retry or return to Dashboard.</p><div class="hero-actions"><button class="primary-button" data-view-link="${target}" type="button">Retry</button><button class="secondary-button" data-view-link="dashboard" type="button">Back to Dashboard</button></div></section>`;
      }
    } finally {
      closeProfileMenu();
      queueApply();
    }
  }

  function eat(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function handleProfileTap(event) {
    const target = event.target;
    const profileButton = target?.closest?.("#memberProfileButton");
    const profileRow = target?.closest?.("#memberProfileMenu .profile-menu-link");

    if (profileButton) {
      eat(event);
      const now = Date.now();
      if (now - lastTap < 120) return;
      lastTap = now;
      if (navigating) return;
      isOpen() ? closeProfileMenu() : openProfileMenu();
      return;
    }

    if (profileRow) {
      eat(event);
      if (navigating) return;
      const dest = rowDestination(profileRow);
      if (!dest) return;
      if (dest === "signout" || profileRow.id === "logoutButton") {
        closeProfileMenu();
        const logout = document.getElementById("logoutButton");
        if (logout && logout !== profileRow) logout.click();
        return;
      }
      navigating = true;
      profileRow.setAttribute("aria-busy", "true");
      closeProfileMenu();
      requestAnimationFrame(() => {
        try { renderDestination(dest); }
        finally { setTimeout(() => { navigating = false; }, 180); }
      });
      return;
    }

    if (isOpen() && !target?.closest?.("#memberProfileMenu")) closeProfileMenu();
  }

  function bindInlineRoutes() {
    $$("[data-view-link]").forEach((node) => {
      if (node.dataset.jpEmergencyRoute === VERSION) return;
      node.dataset.jpEmergencyRoute = VERSION;
      node.addEventListener("click", (event) => {
        const dest = node.dataset.viewLink;
        if (!VALID_VIEWS.has(dest)) return;
        eat(event);
        closeProfileMenu();
        renderDestination(dest);
      }, true);
    });
  }

  function install() {
    addStyles(); applyAvatars(); closeProfileMenu(); bindInlineRoutes();
    window.addEventListener("pointerup", handleProfileTap, true);
    window.addEventListener("click", handleProfileTap, true);
    window.addEventListener("keydown", (event) => { if (event.key === "Escape") closeProfileMenu(); }, true);
    window.addEventListener("popstate", () => { closeProfileMenu(); }, true);
    window.addEventListener("pageshow", () => { setMenuVars(); closeProfileMenu(); queueApply(); bindInlineRoutes(); });
    window.visualViewport?.addEventListener("resize", setMenuVars);
    window.visualViewport?.addEventListener("scroll", setMenuVars);
    window.addEventListener("resize", setMenuVars);
    window.addEventListener("jp:view-rendered", () => { queueApply(); bindInlineRoutes(); });
    new MutationObserver(() => { queueApply(); bindInlineRoutes(); }).observe(document.body, { childList: true, subtree: true });
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
