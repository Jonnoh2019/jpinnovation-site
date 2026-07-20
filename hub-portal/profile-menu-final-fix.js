/* JP Innovation final profile menu + shared role avatar system. */
(() => {
  "use strict";

  const VERSION = "profile-menu-final-fix-20260720e";
  const MENU = "#memberProfileMenu";
  const PROFILE_BUTTON = "#memberProfileButton";
  const PROFILE_LINK = "#memberProfileMenu .profile-menu-link";
  let busy = false;
  let roleQueued = false;
  let previousBody = null;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));
  const escapeText = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);

  function safeCurrentUser() {
    try { return typeof currentUser === "function" ? currentUser() : null; } catch { return null; }
  }

  function roleFor(user) {
    const rawRole = String(user?.role || user?.account_type || user?.accountType || user?.level || "").toLowerCase();
    const status = String(user?.membershipStatus || user?.membership_status || "").toLowerCase();
    if (user?.isAdmin || rawRole.includes("admin")) return "admin";
    if (rawRole.includes("hub") || rawRole === "member" || ["active", "approved", "paid"].includes(status)) return "hub";
    return "client";
  }

  function currentRole() {
    const user = safeCurrentUser();
    if (user) return roleFor(user);
    const adminLink = $("#profileAdminLink");
    return adminLink && !adminLink.classList.contains("hidden") ? "admin" : "client";
  }

  function initialsFor(user) {
    const source = String(user?.name || user?.full_name || user?.email || $("#memberName")?.textContent || "JP").trim();
    const parts = source.split(/[\s._-]+/).filter(Boolean);
    if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }

  function roleLabel(role) {
    if (role === "admin") return "Admin";
    if (role === "hub") return "Hub Member";
    return "Client Portal";
  }

  function roleDescription(role) {
    if (role === "admin") return "Administrator account with full Hub moderation and access controls.";
    if (role === "hub") return "Approved Innovation Hub member.";
    return "Free Client Portal account.";
  }

  function unlockPage() {
    document.body.classList.remove("member-profile-menu-open", "mobile-dashboard-menu-open", "jp-menu-hard-lock", "jp-profile-menu-open", "jp-profile-regression-lock");
    $("#appShell")?.classList.remove("mobile-menu-open");
    $("#mobileMenuBackdrop")?.classList.remove("open");
    $("#mobileMenuBackdrop")?.setAttribute("aria-hidden", "true");
    $("#notificationPopover")?.classList.remove("open");
    $("#topNotificationBell")?.setAttribute("aria-expanded", "false");
    if (previousBody) {
      document.documentElement.style.overflow = previousBody.htmlOverflow || "";
      document.body.style.overflow = previousBody.overflow || "";
      document.body.style.touchAction = previousBody.touchAction || "";
      previousBody = null;
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    document.body.style.pointerEvents = "";
  }

  function lockPage() {
    if (!previousBody) {
      previousBody = {
        htmlOverflow: document.documentElement.style.overflow,
        overflow: document.body.style.overflow,
        touchAction: document.body.style.touchAction
      };
    }
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    document.body.classList.add("member-profile-menu-open", "jp-profile-menu-open");
  }

  function viewport() {
    const vv = window.visualViewport;
    return {
      height: Math.max(420, Math.floor(vv?.height || window.innerHeight || document.documentElement.clientHeight || 720)),
      offsetTop: Math.max(0, Math.floor(vv?.offsetTop || 0))
    };
  }

  function menuTop() {
    const button = $(PROFILE_BUTTON);
    const bar = $(".workspace-header-actions") || $(".workspace-header") || button;
    const rect = bar?.getBoundingClientRect?.();
    const vv = viewport();
    return Math.max(72, Math.ceil((rect?.bottom || 156) + vv.offsetTop + 8));
  }

  function resetMenuBox() {
    const menu = $(MENU);
    if (!menu) return;
    const mobile = matchMedia("(max-width: 760px)").matches;
    const top = menuTop();
    const vv = viewport();
    const bottom = 12;
    const maxHeight = Math.max(260, vv.height + vv.offsetTop - top - bottom);
    Object.assign(menu.style, {
      position: mobile ? "fixed" : "",
      top: mobile ? `${top}px` : "",
      left: mobile ? "12px" : "",
      right: mobile ? "12px" : "",
      bottom: mobile ? `${bottom}px` : "",
      width: mobile ? "auto" : "",
      maxHeight: mobile ? `${maxHeight}px` : "",
      overflowY: "auto",
      overflowX: "hidden",
      transform: "",
      translate: ""
    });
    menu.scrollTop = 0;
  }

  function setMenuOpen(open) {
    const menu = $(MENU);
    const button = $(PROFILE_BUTTON);
    if (!menu || !button) return;
    if (open) {
      unlockPage();
      orderMenu();
      resetMenuBox();
      lockPage();
      menu.classList.add("open");
      menu.setAttribute("aria-hidden", "false");
      button.setAttribute("aria-expanded", "true");
      queueRoleSystem();
      requestAnimationFrame(resetMenuBox);
      return;
    }
    menu.classList.remove("open", "is-opening", "is-closing");
    menu.setAttribute("aria-hidden", "true");
    button.setAttribute("aria-expanded", "false");
    menu.scrollTop = 0;
    ["top", "left", "right", "bottom", "width", "maxHeight", "transform", "translate"].forEach((prop) => { menu.style[prop] = ""; });
    unlockPage();
  }

  function setBusy(button, value) {
    busy = value;
    $$(PROFILE_LINK).forEach((link) => {
      link.disabled = value;
      link.classList.toggle("is-loading", value && link === button);
      link.setAttribute("aria-busy", String(value && link === button));
    });
  }

  function destinationFor(button) {
    if (!button) return "";
    if (button.id === "logoutButton") return "logout";
    if (button.dataset.profileView) return button.dataset.profileView;
    if (button.dataset.profileAction === "my-posts") return "boards";
    if (button.dataset.profileAction === "my-quotes") return "quotes";
    if (button.id === "messageInboxButton") return "messages";
    if (button.id === "notificationBell") return "notifications";
    return "";
  }

  function resetPersonalModes(destination, sourceButton) {
    try {
      if (typeof personalBoardMode !== "undefined") personalBoardMode = sourceButton?.dataset.profileAction === "my-posts";
      if (typeof personalQuotesMode !== "undefined") personalQuotesMode = sourceButton?.dataset.profileAction === "my-quotes";
      if (!["boards", "quotes"].includes(destination)) {
        if (typeof personalBoardMode !== "undefined") personalBoardMode = false;
        if (typeof personalQuotesMode !== "undefined") personalQuotesMode = false;
      }
      if (typeof activeBoardPostId !== "undefined" && destination !== "boards") activeBoardPostId = "";
      if (typeof activeBoardCategory !== "undefined" && destination !== "boards") activeBoardCategory = "";
      if (typeof activeMessageConversationKey !== "undefined" && destination === "messages") activeMessageConversationKey = "";
    } catch (error) {
      console.warn(`[${VERSION}] route flag reset failed`, error);
    }
  }

  function renderRouteError(destination, error) {
    console.error(`[${VERSION}] route failed`, { destination, error });
    const title = $("#viewTitle");
    const mount = $("#viewMount");
    if (title) title.textContent = destination === "admin" ? "Admin Review" : "Section unavailable";
    if (!mount) return;
    mount.dataset.view = "route-error";
    mount.innerHTML = `
      <section class="section-card section-blue jp-route-error">
        <p class="eyebrow">Navigation recovered</p>
        <h2>${escapeText(destination === "admin" ? "Admin Review could not open." : "This section could not open.")}</h2>
        <p class="muted">The menu has been closed safely. Please retry, or return to the dashboard.</p>
        <div class="button-row">
          <button id="jpRouteRetry" class="primary-button" type="button">Retry</button>
          <button id="jpRouteDashboard" class="secondary-button" type="button">Back to Dashboard</button>
        </div>
      </section>`;
    $("#jpRouteRetry")?.addEventListener("click", () => navigateTo(destination));
    $("#jpRouteDashboard")?.addEventListener("click", () => navigateTo("dashboard"));
  }

  function navigateTo(destination, sourceButton = null) {
    if (!destination || busy) return;
    if (destination === "logout") {
      doLogout(sourceButton);
      return;
    }
    setBusy(sourceButton, true);
    resetPersonalModes(destination, sourceButton);
    setMenuOpen(false);
    try {
      unlockPage();
      if (destination === "admin" && currentRole() !== "admin") throw new Error("Current user is not authorised for Admin Review");
      if (typeof renderView !== "function") throw new Error("renderView is not available");
      renderView(destination);
      const mount = $("#viewMount");
      if (!mount || !mount.innerHTML.trim()) throw new Error(`Route "${destination}" rendered empty content`);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      queueRoleSystem();
    } catch (error) {
      renderRouteError(destination, error);
    } finally {
      setBusy(sourceButton, false);
      unlockPage();
    }
  }

  function doLogout(sourceButton) {
    setBusy(sourceButton, true);
    setMenuOpen(false);
    Promise.resolve()
      .then(() => {
        if (typeof signOut === "function") return signOut();
        window.location.assign("index.html?entry=hub&signin=1");
        return null;
      })
      .catch((error) => renderRouteError("dashboard", error))
      .finally(() => {
        setBusy(sourceButton, false);
        unlockPage();
      });
  }

  function orderMenu() {
    const header = $(`${MENU} .profile-menu-header`);
    const admin = $("#profileAdminLink");
    const metrics = $("#profileMetricsLink");
    if (!header) return;
    [metrics, admin].reverse().forEach((node) => {
      if (node && node.previousElementSibling !== header) header.insertAdjacentElement("afterend", node);
    });
  }

  function patchProfilePage(role, user) {
    const mount = $("#viewMount");
    if (mount?.dataset.view !== "profile") return;
    const heading = mount.querySelector(".profile-reputation-card .profile-reputation-heading");
    if (!heading || heading.dataset.jpFinalProfileHeader === VERSION) return;
    heading.dataset.jpFinalProfileHeader = VERSION;
    heading.innerHTML = `
      <div class="jp-shared-profile-head">
        <span class="jp-role-avatar jp-role-avatar-${role}" aria-hidden="true">${escapeText(initialsFor(user))}</span>
        <span class="jp-shared-profile-copy">
          <strong>${escapeText(user?.name || "Jonathan Hotard")}</strong>
          <small>${escapeText(user?.business || "JP Innovation Ltd")}</small>
          <span class="jp-role-pill jp-role-pill-${role}">${escapeText(roleLabel(role))}</span>
        </span>
      </div>
      <p class="jp-profile-role-detail">${escapeText(roleDescription(role))}</p>
      <p class="eyebrow">Member reputation</p>`;
  }

  function applyRoleSystem() {
    roleQueued = false;
    const user = safeCurrentUser() || {};
    const role = currentRole();
    const initials = initialsFor(user);
    orderMenu();
    const targets = [$(PROFILE_BUTTON), $("#memberInitials"), $("#profileMenuAvatar")].filter(Boolean);
    targets.forEach((node) => {
      node.classList.remove("jp-role-avatar-admin", "jp-role-avatar-hub", "jp-role-avatar-client", "jp-role-avatar-hubMember", "admin", "hub", "client", "gold", "blue");
      node.classList.add(`jp-role-avatar-${role}`);
    });
    $(PROFILE_BUTTON)?.classList.add("member-chip", "jp-profile-control-final");
    $(PROFILE_BUTTON)?.querySelectorAll("#memberAvatarRoleBadge,.avatar-role-badge,.member-status-star-inline").forEach((node) => node.remove());
    const headerInitials = $("#memberInitials");
    const menuAvatar = $("#profileMenuAvatar");
    if (headerInitials) {
      headerInitials.classList.remove("has-photo");
      headerInitials.textContent = initials;
    }
    if (menuAvatar) {
      menuAvatar.classList.remove("has-photo");
      menuAvatar.textContent = initials;
    }
    const menuName = $("#memberName");
    const menuRole = $("#memberRole");
    if (menuName) menuName.textContent = user.name || "Jonathan Hotard";
    if (menuRole) menuRole.textContent = roleLabel(role);
    $("#memberStatusStarInline")?.classList.add("hidden");
    $("#reputationStatusButton")?.classList.add("hidden");
    $$(".profile-avatar,.profile-photo-large,.profile-menu-avatar,.feature-ui-avatar,.message-avatar,.comment-avatar,.post-avatar,.notification-avatar,.jp-role-avatar").forEach((node) => {
      const inferred = node.closest(".role-admin,[data-role='admin']") ? "admin" : node.closest(".role-hub,.role-member,[data-role='member']") ? "hub" : node.closest(".role-client,[data-role='client']") ? "client" : role;
      node.classList.remove("jp-role-avatar-admin", "jp-role-avatar-hub", "jp-role-avatar-client", "jp-role-avatar-hubMember");
      node.classList.add(`jp-role-avatar-${inferred}`);
    });
    patchProfilePage(role, user);
  }

  function queueRoleSystem() {
    if (roleQueued) return;
    roleQueued = true;
    requestAnimationFrame(applyRoleSystem);
  }

  function addStyles() {
    if ($("#jpProfileMenuFinalFixStyles")) return;
    const style = document.createElement("style");
    style.id = "jpProfileMenuFinalFixStyles";
    style.textContent = `
      :root{--jp-premium-blue:#0b4fb3;--jp-premium-blue-mid:#116fe8;--jp-premium-blue-dark:#041b4c;--jp-ring-blue:#168bff;--jp-gold-hi:#d8bd67;--jp-gold:#a77b28;--jp-gold-dark:#5f430d;--jp-gold-gradient:radial-gradient(circle at 34% 28%,#f5dc89 0 9%,var(--jp-gold-hi) 18%,#c09a3f 38%,var(--jp-gold) 62%,var(--jp-gold-dark) 100%);--jp-blue-gradient:radial-gradient(circle at 34% 26%,#237fec 0 12%,var(--jp-premium-blue-mid) 36%,var(--jp-premium-blue) 66%,var(--jp-premium-blue-dark) 100%)}
      #memberProfileButton.jp-profile-control-final{position:relative!important;display:grid!important;place-items:center!important;box-sizing:border-box!important;width:54px!important;height:54px!important;min-width:54px!important;max-width:54px!important;min-height:54px!important;max-height:54px!important;aspect-ratio:1/1!important;padding:0!important;border-radius:50%!important;background:transparent!important;overflow:visible!important;pointer-events:auto!important;touch-action:manipulation!important;z-index:760!important;cursor:pointer!important}
      #memberInitials,#profileMenuAvatar,.profile-avatar,.profile-photo-large,.feature-ui-avatar,.message-avatar,.comment-avatar,.post-avatar,.notification-avatar,.jp-role-avatar{box-sizing:border-box!important;display:inline-grid!important;place-items:center!important;aspect-ratio:1/1!important;border-radius:50%!important;line-height:1!important;text-align:center!important;font-weight:950!important;letter-spacing:.01em!important;color:#fff!important;-webkit-text-fill-color:#fff!important;overflow:hidden!important;transform:none!important;translate:none!important}
      #memberProfileButton #memberInitials{width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;font-size:16px!important}
      #profileMenuAvatar{width:54px!important;height:54px!important;min-width:54px!important;min-height:54px!important;font-size:16px!important}
      .jp-role-avatar-admin,#memberProfileButton.jp-role-avatar-admin #memberInitials,#memberInitials.jp-role-avatar-admin,#profileMenuAvatar.jp-role-avatar-admin{background:var(--jp-gold-gradient)!important;border:2px solid var(--jp-ring-blue)!important;outline:1px solid rgba(22,139,255,.72)!important;outline-offset:1px!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.42),inset 0 -4px 6px rgba(44,29,0,.34),0 0 0 1px rgba(22,139,255,.24),0 10px 24px rgba(0,0,0,.38)!important}
      .jp-role-avatar-hub,#memberProfileButton.jp-role-avatar-hub #memberInitials,#memberInitials.jp-role-avatar-hub,#profileMenuAvatar.jp-role-avatar-hub{background:var(--jp-blue-gradient)!important;border:2px solid var(--jp-gold-hi)!important;outline:1px solid rgba(216,189,103,.38)!important;outline-offset:1px!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.18),0 10px 24px rgba(0,0,0,.34)!important}
      .jp-role-avatar-client,#memberProfileButton.jp-role-avatar-client #memberInitials,#memberInitials.jp-role-avatar-client,#profileMenuAvatar.jp-role-avatar-client{background:var(--jp-blue-gradient)!important;border:2px solid rgba(255,255,255,.92)!important;outline:1px solid rgba(255,255,255,.16)!important;outline-offset:1px!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.18),0 10px 24px rgba(0,0,0,.32)!important}
      #memberProfileButton::before,#memberProfileButton::after,#memberInitials::before,#memberInitials::after,#profileMenuAvatar::before,#profileMenuAvatar::after,.jp-role-avatar::before,.jp-role-avatar::after,.profile-avatar::before,.profile-avatar::after,.profile-photo-large::before,.profile-photo-large::after{display:none!important;content:none!important}
      #memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton,#memberStatusStarInline,.member-status-star-inline{display:none!important;pointer-events:none!important}
      .jp-role-pill{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:max-content!important;min-height:22px!important;padding:4px 9px!important;border-radius:999px!important;font-size:10px!important;font-weight:950!important;letter-spacing:.08em!important;text-transform:uppercase!important;line-height:1!important}
      .jp-role-pill-admin{background:linear-gradient(135deg,rgba(216,189,103,.22),rgba(22,139,255,.1))!important;border:1px solid rgba(22,139,255,.58)!important;color:#f8e5a0!important}
      .jp-role-pill-hub{background:rgba(216,189,103,.14)!important;border:1px solid rgba(216,189,103,.5)!important;color:#f4d98a!important}
      .jp-role-pill-client{background:rgba(22,139,255,.13)!important;border:1px solid rgba(255,255,255,.35)!important;color:#dcecff!important}
      #memberProfileMenu{z-index:900!important;box-sizing:border-box!important;pointer-events:none!important;overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important}
      #memberProfileMenu.open{pointer-events:auto!important;visibility:visible!important;opacity:1!important;transform:none!important;translate:none!important}
      #memberProfileMenu .profile-menu-link{min-height:46px!important;position:relative!important;z-index:2!important;pointer-events:auto!important;touch-action:manipulation!important}
      #memberProfileMenu .profile-menu-link.is-loading{opacity:.72!important}
      #memberProfileMenu .profile-menu-link:disabled{opacity:.58!important;pointer-events:none!important}
      body.member-profile-menu-open #mobileMenuBackdrop,body.member-profile-menu-open .mobile-menu-backdrop{display:none!important;pointer-events:none!important}
      body.jp-profile-menu-open{overscroll-behavior:none!important}
      .jp-shared-profile-head{display:grid!important;grid-template-columns:54px minmax(0,1fr)!important;align-items:center!important;gap:12px!important;margin:0 0 10px!important}
      .jp-shared-profile-head .jp-role-avatar{width:54px!important;height:54px!important;min-width:54px!important;font-size:16px!important}
      .jp-shared-profile-copy{display:grid!important;gap:3px!important;min-width:0!important}
      .jp-shared-profile-copy strong{display:block!important;margin:0!important;color:#f7fbff!important;font-size:clamp(21px,5.2vw,28px)!important;line-height:1.05!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .jp-shared-profile-copy small{display:block!important;color:#aeb8c6!important;font-size:13px!important;line-height:1.2!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .jp-profile-role-detail{margin:0 0 10px!important;color:#dce7f5!important;font-size:14px!important;line-height:1.38!important}
      .profile-reputation-card .profile-reputation-heading{display:block!important}
      .profile-reputation-card .profile-reputation-heading .reputation-badge,.profile-reputation-card .profile-reputation-heading svg{display:none!important}
      @media(max-width:760px){#memberProfileMenu.open{left:12px!important;right:12px!important;border-radius:22px!important;padding:8px!important;gap:4px!important;background:linear-gradient(180deg,rgba(8,15,24,.99),rgba(5,10,16,.99))!important}#memberProfileButton.jp-profile-control-final{width:52px!important;height:52px!important;min-width:52px!important;max-width:52px!important;min-height:52px!important;max-height:52px!important}#memberProfileMenu .profile-menu-header{min-height:50px!important;padding:6px!important;margin-bottom:4px!important}#memberProfileMenu .profile-menu-link{height:38px!important;min-height:38px!important;max-height:38px!important;padding:4px 8px!important;border-radius:12px!important;margin:0!important}#memberProfileMenu .profile-menu-icon{width:26px!important;height:26px!important;min-width:26px!important}#memberProfileMenu .profile-menu-link small,#memberProfileMenu .profile-chat-notifications{display:none!important}}
      @media(max-width:390px){#memberProfileButton.jp-profile-control-final{width:48px!important;height:48px!important;min-width:48px!important;max-width:48px!important;min-height:48px!important;max-height:48px!important}#profileMenuAvatar{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important}.jp-shared-profile-head{grid-template-columns:48px minmax(0,1fr)!important}.jp-shared-profile-head .jp-role-avatar{width:48px!important;height:48px!important;min-width:48px!important}}
    `;
    document.head.appendChild(style);
  }

  function interceptClick(event) {
    const profileButton = event.target.closest?.(PROFILE_BUTTON);
    const profileLink = event.target.closest?.(PROFILE_LINK);
    const menu = $(MENU);
    if (profileButton) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!busy) setMenuOpen(!menu?.classList.contains("open"));
      return;
    }
    if (profileLink) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (!busy) navigateTo(destinationFor(profileLink), profileLink);
      return;
    }
    if (menu?.classList.contains("open") && !event.target.closest?.(MENU)) {
      event.preventDefault();
      setMenuOpen(false);
    }
  }

  function wrapRenderView() {
    if (typeof renderView !== "function" || renderView.jpProfileFinalWrapped) return;
    const base = renderView;
    window.renderView = renderView = function renderViewProfileFinal() {
      const result = base.apply(this, arguments);
      queueRoleSystem();
      return result;
    };
    renderView.jpProfileFinalWrapped = true;
  }

  function install() {
    if (document.documentElement.dataset.jpProfileMenuFinalFix === VERSION) return;
    document.documentElement.dataset.jpProfileMenuFinalFix = VERSION;
    addStyles();
    wrapRenderView();
    unlockPage();
    queueRoleSystem();
    window.addEventListener("click", interceptClick, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && $(MENU)?.classList.contains("open")) {
        event.preventDefault();
        setMenuOpen(false);
      }
    }, true);
    window.addEventListener("pageshow", () => { unlockPage(); queueRoleSystem(); });
    window.addEventListener("popstate", () => { setMenuOpen(false); unlockPage(); });
    window.addEventListener("resize", () => { if ($(MENU)?.classList.contains("open")) resetMenuBox(); }, { passive: true });
    window.visualViewport?.addEventListener("resize", () => { if ($(MENU)?.classList.contains("open")) resetMenuBox(); }, { passive: true });
    window.addEventListener("jp:view-rendered", queueRoleSystem);
    const mount = $("#viewMount");
    if (mount) new MutationObserver(queueRoleSystem).observe(mount, { childList: true });
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
