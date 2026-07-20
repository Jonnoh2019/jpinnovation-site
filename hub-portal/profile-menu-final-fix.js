/* JP Innovation final profile menu + shared role avatar system. */
(() => {
  "use strict";
  const VERSION = "profile-menu-final-fix-20260720a";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  let busy = false;
  let savedBody = null;

  function user() { try { return typeof currentUser === "function" ? currentUser() : null; } catch { return null; } }
  function roleFor(u) {
    const role = String(u?.role || u?.account_type || u?.accountType || u?.level || "").toLowerCase();
    const status = String(u?.membershipStatus || u?.membership_status || "").toLowerCase();
    if (u?.isAdmin || role.includes("admin")) return "admin";
    if (role === "member" || role.includes("hub") || ["active", "approved", "paid"].includes(status)) return "hub";
    return "client";
  }
  function currentRole() {
    const u = user();
    if (u) return roleFor(u);
    const adminLink = $("#profileAdminLink");
    return adminLink && !adminLink.classList.contains("hidden") ? "admin" : "client";
  }
  function initials(u) {
    const src = String(u?.name || u?.full_name || u?.email || $("#memberName")?.textContent || "JP").trim();
    const parts = src.split(/[\s._-]+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
  }
  function roleText(role) { return role === "admin" ? "Admin" : role === "hub" ? "Hub Member" : "Client Portal"; }
  function esc(v) { return String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[c]); }

  function removeLocks() {
    document.body.classList.remove("member-profile-menu-open", "mobile-dashboard-menu-open", "jp-menu-hard-lock", "jp-profile-menu-open", "jp-profile-regression-lock");
    document.documentElement.style.overflow = "";
    Object.assign(document.body.style, { top:"", left:"", right:"", bottom:"", position:"", inset:"", overflow:"", pointerEvents:"", touchAction:"", width:"" });
    $("#appShell")?.classList.remove("mobile-menu-open");
    $("#mobileMenuBackdrop")?.classList.remove("open");
    $("#mobileMenuBackdrop")?.setAttribute("aria-hidden", "true");
  }
  function lockBody() {
    if (!savedBody) savedBody = { htmlOverflow: document.documentElement.style.overflow, bodyOverflow: document.body.style.overflow, touchAction: document.body.style.touchAction };
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.classList.add("member-profile-menu-open", "jp-profile-menu-open");
  }
  function unlockBody() {
    if (savedBody) {
      document.documentElement.style.overflow = savedBody.htmlOverflow || "";
      document.body.style.overflow = savedBody.bodyOverflow || "";
      document.body.style.touchAction = savedBody.touchAction || "";
      savedBody = null;
    }
    removeLocks();
  }
  function viewport() {
    const vv = window.visualViewport;
    return { h: Math.max(420, Math.floor(vv?.height || window.innerHeight || 720)), top: Math.max(0, Math.floor(vv?.offsetTop || 0)) };
  }
  function menuTop() {
    const ref = $(".workspace-header-actions") || $("#memberProfileButton");
    const rect = ref?.getBoundingClientRect?.();
    return Math.max(76, Math.ceil((rect?.bottom || 168) + viewport().top + 8));
  }
  function resetMenuBox() {
    const menu = $("#memberProfileMenu");
    if (!menu) return;
    const mobile = matchMedia("(max-width:760px)").matches;
    const top = menuTop();
    const bottom = 12;
    const maxH = Math.max(260, viewport().h + viewport().top - top - bottom);
    Object.assign(menu.style, mobile ? {
      position:"fixed", top:`${top}px`, left:"12px", right:"12px", bottom:`${bottom}px`, width:"auto", height:"auto", maxHeight:`${maxH}px`, overflowY:"auto", overflowX:"hidden", transform:"", translate:"", overscrollBehavior:"contain"
    } : { height:"auto", maxHeight:"", overflowY:"auto", overflowX:"hidden", transform:"", translate:"" });
    menu.scrollTop = 0;
  }
  function menuOpen(open) {
    const menu = $("#memberProfileMenu");
    const button = $("#memberProfileButton");
    if (!menu || !button) return;
    if (open) {
      removeLocks();
      resetMenuBox();
      lockBody();
      menu.classList.add("open");
      menu.setAttribute("aria-hidden", "false");
      button.setAttribute("aria-expanded", "true");
      requestAnimationFrame(() => { resetMenuBox(); applyRoles(); });
    } else {
      menu.classList.remove("open", "is-opening", "is-closing");
      menu.setAttribute("aria-hidden", "true");
      button.setAttribute("aria-expanded", "false");
      menu.scrollTop = 0;
      ["top","left","right","bottom","width","height","maxHeight","transform","translate"].forEach((p) => menu.style[p] = "");
      unlockBody();
    }
  }
  function destination(button) {
    if (button.id === "logoutButton") return "logout";
    if (button.dataset.profileView) return button.dataset.profileView;
    if (button.dataset.profileAction === "my-posts") return "boards";
    if (button.dataset.profileAction === "my-quotes") return "quotes";
    if (button.id === "messageInboxButton") return "messages";
    if (button.id === "notificationBell") return "notifications";
    return "";
  }
  function setBusy(button, on) {
    busy = on;
    $$("#memberProfileMenu .profile-menu-link").forEach((b) => { b.disabled = on; b.classList.toggle("is-loading", on && b === button); });
  }
  function resetModes(dest, src) {
    try {
      if (typeof personalBoardMode !== "undefined") personalBoardMode = src?.dataset.profileAction === "my-posts";
      if (typeof personalQuotesMode !== "undefined") personalQuotesMode = src?.dataset.profileAction === "my-quotes";
      if (!["boards", "quotes"].includes(dest)) { if (typeof personalBoardMode !== "undefined") personalBoardMode = false; if (typeof personalQuotesMode !== "undefined") personalQuotesMode = false; }
      if (typeof activeBoardPostId !== "undefined" && dest !== "boards") activeBoardPostId = "";
      if (typeof activeBoardCategory !== "undefined" && dest !== "boards") activeBoardCategory = "";
      if (typeof activeMessageConversationKey !== "undefined" && dest === "messages") activeMessageConversationKey = "";
    } catch (e) { console.warn(`[${VERSION}] route flag reset failed`, e); }
  }
  function routeError(dest, err) {
    console.error(`[${VERSION}] route failed`, { dest, err });
    const title = $("#viewTitle"), mount = $("#viewMount");
    if (title) title.textContent = dest === "admin" ? "Admin Review" : "Section unavailable";
    if (!mount) return;
    mount.dataset.view = "route-error";
    mount.innerHTML = `<section class="section-card section-blue"><p class="eyebrow">Navigation recovered</p><h2>${dest === "admin" ? "Admin Review could not open." : "This section could not open."}</h2><p class="muted">The menu closed safely instead of freezing. Retry or go back to the dashboard.</p><div class="button-row"><button id="jpRouteRetry" class="primary-button" type="button">Retry</button><button id="jpRouteDashboard" class="secondary-button" type="button">Back to Dashboard</button></div></section>`;
    $("#jpRouteRetry")?.addEventListener("click", () => go(dest));
    $("#jpRouteDashboard")?.addEventListener("click", () => go("dashboard"));
  }
  function go(dest, src = null) {
    if (!dest || busy) return;
    if (dest === "logout") { logout(src); return; }
    setBusy(src, true); resetModes(dest, src); menuOpen(false);
    requestAnimationFrame(() => {
      try {
        removeLocks();
        if (dest === "admin" && currentRole() !== "admin") throw new Error("Not authorised for admin route");
        if (typeof renderView !== "function") throw new Error("renderView missing");
        renderView(dest);
        const mount = $("#viewMount");
        if (!mount || !mount.innerHTML.trim()) throw new Error(`Empty route: ${dest}`);
        scrollTo({ top:0, left:0, behavior:"auto" });
      } catch (err) { routeError(dest, err); }
      finally { setBusy(src, false); removeLocks(); applyRoles(); }
    });
  }
  function logout(src) {
    setBusy(src, true); menuOpen(false);
    requestAnimationFrame(async () => { try { removeLocks(); if (typeof signOut === "function") await signOut(); else location.assign("index.html?entry=hub&signin=1"); } catch (err) { routeError("dashboard", err); } finally { setBusy(src, false); removeLocks(); } });
  }
  function patchProfile() {
    const mount = $("#viewMount");
    if (mount?.dataset.view !== "profile") return;
    const heading = mount.querySelector(".profile-reputation-card .profile-reputation-heading");
    if (!heading || heading.dataset.jpProfileFinal === VERSION) return;
    const u = user() || {}; const r = currentRole();
    heading.dataset.jpProfileFinal = VERSION;
    heading.innerHTML = `<div class="jp-shared-profile-head"><span class="jp-role-avatar jp-role-avatar-${r}" aria-hidden="true">${esc(initials(u))}</span><span class="jp-shared-profile-copy"><strong>${esc(u.name || "Jonathan Hotard")}</strong><small>${esc(u.business || "JP Innovation Ltd")}</small><span class="jp-role-pill jp-role-pill-${r}">${esc(roleText(r))}</span></span></div><p class="jp-profile-role-detail">${r === "admin" ? "Administrator account with full Hub moderation and access controls." : r === "hub" ? "Approved Innovation Hub member." : "Free Client Portal account."}</p><p class="eyebrow">Member reputation</p>`;
  }
  function applyRoles() {
    const u = user() || {}; const r = currentRole(); const init = initials(u);
    const btn = $("#memberProfileButton"), ini = $("#memberInitials"), menuAv = $("#profileMenuAvatar");
    [btn, ini, menuAv].forEach((n) => { if (!n) return; n.classList.remove("jp-role-avatar-admin", "jp-role-avatar-hub", "jp-role-avatar-client", "jp-role-avatar-hubMember", "admin", "hub", "client"); n.classList.add(`jp-role-avatar-${r}`); });
    if (btn) { btn.classList.add("member-chip", "jp-profile-control-final"); btn.querySelectorAll("#memberAvatarRoleBadge,.avatar-role-badge,.member-status-star-inline").forEach((n) => n.remove()); }
    if (ini) { ini.textContent = init; ini.classList.remove("has-photo"); }
    if (menuAv) { menuAv.textContent = init; menuAv.classList.remove("has-photo"); }
    const name = $("#memberName"), role = $("#memberRole");
    if (name) name.textContent = u.name || "Jonathan Hotard";
    if (role) role.textContent = roleText(r);
    $("#memberStatusStarInline")?.classList.add("hidden");
    $("#reputationStatusButton")?.classList.add("hidden");
    patchProfile();
  }
  function styles() {
    if ($("#jpProfileMenuFinalFixStyles")) return;
    const s = document.createElement("style"); s.id = "jpProfileMenuFinalFixStyles";
    s.textContent = `:root{--jp-premium-blue:#0b4fb3;--jp-premium-blue-mid:#116fe8;--jp-premium-blue-dark:#041b4c;--jp-ring-blue:#168bff;--jp-gold-hi:#d8bd67;--jp-gold:#a77b28;--jp-gold-dark:#5f430d;--jp-gold-gradient:radial-gradient(circle at 34% 28%,#f5dc89 0 9%,var(--jp-gold-hi) 18%,#c09a3f 38%,var(--jp-gold) 62%,var(--jp-gold-dark) 100%);--jp-blue-gradient:radial-gradient(circle at 34% 26%,#237fec 0 12%,var(--jp-premium-blue-mid) 36%,var(--jp-premium-blue) 66%,var(--jp-premium-blue-dark) 100%)}#memberProfileButton.jp-profile-control-final{position:relative!important;display:grid!important;place-items:center!important;box-sizing:border-box!important;width:54px!important;height:54px!important;min-width:54px!important;max-width:54px!important;min-height:54px!important;max-height:54px!important;aspect-ratio:1/1!important;padding:0!important;border-radius:50%!important;background:transparent!important;overflow:visible!important;pointer-events:auto!important;touch-action:manipulation!important;z-index:760!important;cursor:pointer!important}#memberInitials,#profileMenuAvatar,.profile-avatar,.profile-photo-large,.feature-ui-avatar,.message-avatar,.comment-avatar,.post-avatar,.notification-avatar,.jp-role-avatar{box-sizing:border-box!important;display:inline-grid!important;place-items:center!important;aspect-ratio:1/1!important;border-radius:50%!important;line-height:1!important;text-align:center!important;font-weight:950!important;letter-spacing:.01em!important;color:#fff!important;-webkit-text-fill-color:#fff!important;overflow:hidden!important;transform:none!important;translate:none!important}#memberProfileButton #memberInitials{width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;font-size:16px!important}#profileMenuAvatar{width:54px!important;height:54px!important;min-width:54px!important;min-height:54px!important;font-size:16px!important}.jp-role-avatar-admin,#memberProfileButton.jp-role-avatar-admin #memberInitials,#memberInitials.jp-role-avatar-admin,#profileMenuAvatar.jp-role-avatar-admin{background:var(--jp-gold-gradient)!important;border:2px solid var(--jp-ring-blue)!important;outline:1px solid rgba(22,139,255,.72)!important;outline-offset:1px!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.42),inset 0 -4px 6px rgba(44,29,0,.34),0 0 0 1px rgba(22,139,255,.24),0 10px 24px rgba(0,0,0,.38)!important}.jp-role-avatar-hub,#memberProfileButton.jp-role-avatar-hub #memberInitials,#memberInitials.jp-role-avatar-hub,#profileMenuAvatar.jp-role-avatar-hub{background:var(--jp-blue-gradient)!important;border:2px solid var(--jp-gold-hi)!important;outline:1px solid rgba(216,189,103,.38)!important;outline-offset:1px!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.18),0 10px 24px rgba(0,0,0,.34)!important}.jp-role-avatar-client,#memberProfileButton.jp-role-avatar-client #memberInitials,#memberInitials.jp-role-avatar-client,#profileMenuAvatar.jp-role-avatar-client{background:var(--jp-blue-gradient)!important;border:2px solid rgba(255,255,255,.92)!important;outline:1px solid rgba(255,255,255,.16)!important;outline-offset:1px!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.18),0 10px 24px rgba(0,0,0,.32)!important}#memberProfileButton::before,#memberProfileButton::after,#memberInitials::before,#memberInitials::after,#profileMenuAvatar::before,#profileMenuAvatar::after,.jp-role-avatar::before,.jp-role-avatar::after,.profile-avatar::before,.profile-avatar::after,.profile-photo-large::before,.profile-photo-large::after{display:none!important;content:none!important}#memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton,#memberStatusStarInline,.member-status-star-inline{display:none!important;pointer-events:none!important}.jp-role-pill{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:max-content!important;min-height:22px!important;padding:4px 9px!important;border-radius:999px!important;font-size:10px!important;font-weight:950!important;letter-spacing:.08em!important;text-transform:uppercase!important;line-height:1!important}.jp-role-pill-admin{background:linear-gradient(135deg,rgba(216,189,103,.22),rgba(22,139,255,.1))!important;border:1px solid rgba(22,139,255,.58)!important;color:#f8e5a0!important}.jp-role-pill-hub{background:rgba(216,189,103,.14)!important;border:1px solid rgba(216,189,103,.5)!important;color:#f4d98a!important}.jp-role-pill-client{background:rgba(22,139,255,.13)!important;border:1px solid rgba(255,255,255,.35)!important;color:#dcecff!important}#memberProfileMenu{z-index:900!important;box-sizing:border-box!important;pointer-events:none!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important}#memberProfileMenu.open{pointer-events:auto!important;visibility:visible!important;opacity:1!important;transform:none!important;translate:none!important}#memberProfileMenu .profile-menu-link{min-height:48px!important;position:relative!important;z-index:2!important;pointer-events:auto!important;touch-action:manipulation!important}#memberProfileMenu .profile-menu-link:disabled{opacity:.58!important;pointer-events:none!important}body.member-profile-menu-open #mobileMenuBackdrop,body.member-profile-menu-open .mobile-menu-backdrop{display:none!important;pointer-events:none!important}body.jp-profile-menu-open{overscroll-behavior:none!important}.jp-shared-profile-head{display:grid!important;grid-template-columns:54px minmax(0,1fr)!important;align-items:center!important;gap:12px!important;margin:0 0 10px!important}.jp-shared-profile-head .jp-role-avatar{width:54px!important;height:54px!important;min-width:54px!important;font-size:16px!important}.jp-shared-profile-copy{display:grid!important;gap:3px!important;min-width:0!important}.jp-shared-profile-copy strong{display:block!important;margin:0!important;color:#f7fbff!important;font-size:clamp(21px,5.2vw,28px)!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.jp-shared-profile-copy small{display:block!important;color:#aeb8c6!important;font-size:13px!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.jp-profile-role-detail{margin:0 0 10px!important;color:#dce7f5!important;font-size:14px!important;line-height:1.38!important}.profile-reputation-card .profile-reputation-heading{display:block!important}.profile-reputation-card .profile-reputation-heading .reputation-badge,.profile-reputation-card .profile-reputation-heading svg{display:none!important}@media(max-width:760px){#memberProfileMenu.open{left:12px!important;right:12px!important;border-radius:22px!important;padding:10px!important;background:linear-gradient(180deg,rgba(8,15,24,.99),rgba(5,10,16,.99))!important}#memberProfileButton.jp-profile-control-final{width:52px!important;height:52px!important;min-width:52px!important;max-width:52px!important;min-height:52px!important;max-height:52px!important}#memberProfileMenu .profile-menu-link{min-height:45px!important;padding-top:6px!important;padding-bottom:6px!important;border-radius:14px!important}#memberProfileMenu .profile-menu-link small{display:none!important}}@media(max-width:390px){#memberProfileButton.jp-profile-control-final{width:48px!important;height:48px!important;min-width:48px!important;max-width:48px!important;min-height:48px!important;max-height:48px!important}#profileMenuAvatar{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important}.jp-shared-profile-head{grid-template-columns:48px minmax(0,1fr)!important}.jp-shared-profile-head .jp-role-avatar{width:48px!important;height:48px!important;min-width:48px!important}}`;
    document.head.appendChild(s);
  }
  function click(e) {
    const btn = e.target.closest?.("#memberProfileButton");
    const link = e.target.closest?.("#memberProfileMenu .profile-menu-link");
    const menu = $("#memberProfileMenu");
    if (btn) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); if (!busy) menuOpen(!menu?.classList.contains("open")); return; }
    if (link) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); if (!busy) go(destination(link), link); return; }
    if (menu?.classList.contains("open") && !e.target.closest?.("#memberProfileMenu")) { e.preventDefault(); menuOpen(false); }
  }
  function wrapRender() {
    if (typeof renderView !== "function" || renderView.jpProfileFinalWrapped) return;
    const base = renderView;
    window.renderView = renderView = function(view) { let out; try { out = base.apply(this, arguments); } catch (err) { routeError(view || "dashboard", err); return ""; } finally { requestAnimationFrame(applyRoles); } return out; };
    renderView.jpProfileFinalWrapped = true;
  }
  function install() {
    if (document.documentElement.dataset.jpProfileMenuFinalFix === VERSION) return;
    document.documentElement.dataset.jpProfileMenuFinalFix = VERSION;
    styles(); wrapRender(); removeLocks(); applyRoles();
    document.addEventListener("click", click, true);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#memberProfileMenu")?.classList.contains("open")) { e.preventDefault(); menuOpen(false); } }, true);
    window.addEventListener("pageshow", () => { removeLocks(); applyRoles(); });
    window.addEventListener("popstate", () => { menuOpen(false); removeLocks(); });
    window.visualViewport?.addEventListener("resize", () => { if ($("#memberProfileMenu")?.classList.contains("open")) resetMenuBox(); }, { passive:true });
    window.visualViewport?.addEventListener("scroll", () => { if ($("#memberProfileMenu")?.classList.contains("open")) resetMenuBox(); }, { passive:true });
    new MutationObserver(() => requestAnimationFrame(applyRoles)).observe(document.body, { childList:true, subtree:true });
    console.info(`[${VERSION}] installed`);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once:true }); else install();
})();