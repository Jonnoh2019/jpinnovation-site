(() => {
  "use strict";

  const VERSION = "profile-menu-avatar-regression-fix-20260719c";
  let avatarUpdateQueued = false;

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { return fallback; }
  }

  function roleFor(user) {
    const role = String(user?.role || user?.account_type || "").toLowerCase();
    const status = String(user?.membershipStatus || user?.membership_status || "").toLowerCase();
    if (role === "admin") return "admin";
    if (role === "member" || status === "active") return "hubMember";
    return "client";
  }

  function currentRole() {
    const user = typeof currentUser === "function" ? currentUser() : null;
    return roleFor(user || {});
  }

  function starRoleFromText(text) {
    const value = String(text || "").toLowerCase();
    if (value.includes("admin")) return "admin";
    if (value.includes("gold") || value.includes("hub") || value.includes("verified") || value.includes("member")) return "hubMember";
    return "client";
  }

  function setVariant(node, prefix, variant) {
    if (!node) return;
    [`${prefix}-admin`, `${prefix}-hubMember`, `${prefix}-client`, `${prefix}-member`, "admin", "hub", "client", "gold", "blue", "role-admin", "role-member", "role-client", "avatar-admin", "avatar-member", "avatar-client"].forEach((className) => {
      if (node.classList.contains(className)) node.classList.remove(className);
    });
    node.classList.add(`${prefix}-${variant}`);
  }

  function unlockPage() {
    document.body.classList.remove("jp-profile-menu-open", "jp-profile-regression-lock", "jp-menu-hard-lock");
    document.body.style.top = "";
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function closeProfileMenu() {
    const menu = document.getElementById("memberProfileMenu");
    const button = document.getElementById("memberProfileButton");
    if (typeof setMemberProfileMenuOpen === "function") {
      setMemberProfileMenuOpen(false);
    }
    menu?.classList.remove("open");
    menu?.setAttribute("aria-hidden", "true");
    button?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("member-profile-menu-open");
    unlockPage();
  }

  function openProfileMenu() {
    const menu = document.getElementById("memberProfileMenu");
    const button = document.getElementById("memberProfileButton");
    if (typeof setNotificationsOpen === "function") setNotificationsOpen(false);
    if (typeof setMobileDashboardMenuOpen === "function") setMobileDashboardMenuOpen(false);
    if (typeof setMemberProfileMenuOpen === "function") {
      setMemberProfileMenuOpen(true);
    }
    menu?.classList.add("open");
    menu?.setAttribute("aria-hidden", "false");
    button?.setAttribute("aria-expanded", "true");
    document.body.classList.add("member-profile-menu-open", "jp-profile-menu-open");
    document.body.classList.remove("jp-menu-hard-lock");
  }

  function toggleProfileMenu() {
    const menu = document.getElementById("memberProfileMenu");
    if (menu?.classList.contains("open")) closeProfileMenu();
    else openProfileMenu();
  }

  function applyAvatarRolesNow() {
    const role = currentRole();
    const headerButton = document.getElementById("memberProfileButton");
    const headerInitials = document.getElementById("memberInitials");
    const menuAvatar = document.getElementById("profileMenuAvatar");
    [headerButton, headerInitials, menuAvatar].forEach((node) => setVariant(node, "jp-role-avatar", role));
    headerButton?.classList.add("member-chip");
    headerButton?.querySelector("#memberAvatarRoleBadge")?.remove();
    document.querySelectorAll("#memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton,#memberStatusStarInline").forEach((node) => {
      node.classList.add("hidden");
      node.setAttribute("aria-hidden", "true");
    });

    document.querySelectorAll(".profile-avatar,.feature-ui-avatar,.message-avatar,.comment-avatar,.post-avatar,.notification-avatar").forEach((avatar) => {
      const text = avatar.getAttribute("data-role") || avatar.getAttribute("aria-label") || avatar.closest("[data-role]")?.getAttribute("data-role") || avatar.textContent;
      setVariant(avatar, "jp-role-avatar", starRoleFromText(text));
    });

    document.querySelectorAll(".member-role-star,.compact-role-star,.member-status-star,.member-status-star-inline,.reputation-badge").forEach((star) => {
      const text = star.getAttribute("title") || star.getAttribute("aria-label") || star.className || star.textContent;
      setVariant(star, "jp-role-star", starRoleFromText(text));
    });
  }

  function queueAvatarRoleUpdate() {
    if (avatarUpdateQueued) return;
    avatarUpdateQueued = true;
    requestAnimationFrame(() => {
      avatarUpdateQueued = false;
      applyAvatarRolesNow();
    });
  }

  function routeProfileMenuItem(button) {
    const view = button.dataset.profileView;
    const action = button.dataset.profileAction;
    if (view && typeof renderView === "function") {
      safe(() => { personalBoardMode = false; personalQuotesMode = false; });
      renderView(view);
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return true;
    }
    if (action && typeof renderView === "function") {
      safe(() => {
        personalBoardMode = action === "my-posts";
        personalQuotesMode = action === "my-quotes";
        activeBoardCategory = "";
        activeBoardPostId = "";
      });
      renderView(action === "my-posts" ? "boards" : "quotes");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return true;
    }
    if (button.id === "messageInboxButton" && typeof renderView === "function") {
      safe(() => { activeMessageConversationKey = ""; personalBoardMode = false; personalQuotesMode = false; });
      renderView("messages");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return true;
    }
    if (button.id === "notificationBell" && typeof renderView === "function") {
      safe(() => { personalBoardMode = false; personalQuotesMode = false; });
      renderView("notifications");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return true;
    }
    return false;
  }

  function addStyles() {
    if (document.getElementById("profileMenuAvatarRegressionFixStyles")) return;
    const style = document.createElement("style");
    style.id = "profileMenuAvatarRegressionFixStyles";
    style.textContent = `
      :root{
        --jp-role-blue:#0677f4;
        --jp-role-blue-deep:#034ba8;
        --jp-role-electric:#138cff;
        --jp-role-gold-hi:#fff2a8;
        --jp-role-gold:#d9a427;
        --jp-role-gold-mid:#b98210;
        --jp-role-gold-low:#6d4406;
        --jp-role-gold-gradient:radial-gradient(circle at 30% 22%,var(--jp-role-gold-hi) 0 12%,#f3cf65 22%,var(--jp-role-gold) 48%,var(--jp-role-gold-mid) 72%,var(--jp-role-gold-low) 100%);
        --jp-role-blue-gradient:linear-gradient(145deg,#0789ff 0%,var(--jp-role-blue) 45%,var(--jp-role-blue-deep) 100%);
      }
      #memberProfileButton.member-chip{box-sizing:border-box!important;position:relative!important;display:grid!important;place-items:center!important;width:54px!important;height:54px!important;min-width:54px!important;max-width:54px!important;min-height:54px!important;max-height:54px!important;aspect-ratio:1/1!important;padding:0!important;border-radius:50%!important;overflow:visible!important;pointer-events:auto!important;touch-action:manipulation!important;z-index:640!important;cursor:pointer!important;background:transparent!important;}
      #memberProfileButton.member-chip #memberInitials,#profileMenuAvatar,.profile-avatar,.feature-ui-avatar,.message-avatar,.comment-avatar,.post-avatar,.notification-avatar{box-sizing:border-box!important;display:inline-grid!important;place-items:center!important;border-radius:50%!important;aspect-ratio:1/1!important;line-height:1!important;text-align:center!important;font-weight:950!important;color:#fff!important;background:var(--jp-role-blue-gradient)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.22),0 10px 24px rgba(0,0,0,.26)!important;overflow:hidden!important;}
      #memberProfileButton.member-chip #memberInitials{width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;font-size:16px!important;letter-spacing:.01em!important;}
      #profileMenuAvatar{width:44px!important;height:44px!important;min-width:44px!important;font-size:14px!important;}
      .jp-role-avatar-admin,#memberProfileButton.member-chip.jp-role-avatar-admin #memberInitials{background:var(--jp-role-gold-gradient)!important;color:#fff!important;border:2px solid var(--jp-role-electric)!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.48),inset 0 -3px 5px rgba(72,42,0,.28),0 0 0 1px rgba(19,140,255,.28),0 10px 26px rgba(0,0,0,.32)!important;}
      .jp-role-avatar-hubMember,#memberProfileButton.member-chip.jp-role-avatar-hubMember #memberInitials{background:var(--jp-role-blue-gradient)!important;color:#fff!important;border:2px solid var(--jp-role-gold)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.24),0 0 0 1px rgba(255,242,168,.18),0 10px 26px rgba(0,0,0,.28)!important;}
      .jp-role-avatar-client,#memberProfileButton.member-chip.jp-role-avatar-client #memberInitials{background:var(--jp-role-blue-gradient)!important;color:#fff!important;border:2px solid rgba(255,255,255,.92)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.18),0 0 0 1px rgba(6,119,244,.32),0 10px 26px rgba(0,0,0,.25)!important;}
      .member-role-star,.compact-role-star,.member-status-star,.member-status-star-inline,.reputation-badge,.jp-role-star-admin,.jp-role-star-hubMember,.jp-role-star-client{box-sizing:border-box!important;display:inline-grid!important;place-items:center!important;border-radius:50%!important;aspect-ratio:1/1!important;line-height:1!important;text-align:center!important;font-weight:950!important;width:20px!important;height:20px!important;min-width:20px!important;font-size:11px!important;padding:0!important;transform:none!important;}
      .jp-role-star-admin{background:var(--jp-role-gold-gradient)!important;color:#fff!important;border:2px solid var(--jp-role-electric)!important;text-shadow:0 1px 2px rgba(0,0,0,.35)!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.48),0 0 0 1px rgba(19,140,255,.24),0 0 14px rgba(217,164,39,.28)!important;}
      .jp-role-star-hubMember{background:var(--jp-role-blue-gradient)!important;color:#fff!important;border:2px solid var(--jp-role-gold)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.25),0 0 12px rgba(217,164,39,.2)!important;}
      .jp-role-star-client{background:var(--jp-role-blue-gradient)!important;color:#fff!important;border:2px solid rgba(255,255,255,.34)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.2),0 0 10px rgba(6,119,244,.16)!important;}
      #memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton.member-status-star,#memberStatusStarInline.member-status-star-inline{display:none!important;pointer-events:none!important;}
      #memberProfileMenu{pointer-events:none!important;z-index:650!important;}
      #memberProfileMenu.open{pointer-events:auto!important;visibility:visible!important;opacity:1!important;transform:none!important;}
      #memberProfileMenu.open .profile-menu-link{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;position:relative!important;z-index:2!important;}
      #memberProfileMenu .profile-menu-link:disabled{opacity:.45!important;pointer-events:none!important;}
      body.member-profile-menu-open #mobileMenuBackdrop,body.member-profile-menu-open .mobile-menu-backdrop{pointer-events:none!important;display:none!important;}
      body.jp-profile-menu-open{overflow:hidden!important;overscroll-behavior:none!important;}
      body.jp-profile-menu-open #memberProfileMenu{overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;}
      @media(max-width:760px){#memberProfileMenu.open{position:fixed!important;left:12px!important;right:12px!important;top:calc(var(--hub-mobile-header-offset,176px) - 4px)!important;bottom:12px!important;max-height:none!important;overflow:auto!important;border-radius:22px!important;padding:10px!important;}#memberProfileButton.member-chip{width:52px!important;height:52px!important;min-width:52px!important;max-width:52px!important;min-height:52px!important;max-height:52px!important;}}
      @media(max-width:390px){#memberProfileButton.member-chip{width:48px!important;height:48px!important;min-width:48px!important;max-width:48px!important;min-height:48px!important;max-height:48px!important;}#profileMenuAvatar{width:40px!important;height:40px!important;min-width:40px!important;}}
    `;
    document.head.appendChild(style);
  }

  function installInteractionFix() {
    if (document.documentElement.dataset.jpProfileMenuRegressionFix === VERSION) return;
    document.documentElement.dataset.jpProfileMenuRegressionFix = VERSION;

    document.addEventListener("click", (event) => {
      const profileButton = event.target.closest?.("#memberProfileButton");
      if (!profileButton) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      toggleProfileMenu();
    }, true);

    document.addEventListener("click", (event) => {
      const menu = document.getElementById("memberProfileMenu");
      if (!menu?.classList.contains("open")) return;
      const link = event.target.closest?.("#memberProfileMenu .profile-menu-link");
      if (!link) return;
      if (link.id === "logoutButton") {
        closeProfileMenu();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      try {
        routeProfileMenuItem(link);
      } finally {
        closeProfileMenu();
      }
    }, true);

    document.addEventListener("click", (event) => {
      const menu = document.getElementById("memberProfileMenu");
      if (!menu?.classList.contains("open")) return;
      if (event.target.closest?.("#memberProfileMenu,#memberProfileButton")) return;
      closeProfileMenu();
    }, false);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeProfileMenu();
    }, true);
  }

  function installWrappers() {
    if (typeof renderView === "function" && !renderView.jpRoleAvatarWrapped) {
      const base = renderView;
      renderView = function renderViewWithRoleAvatarFix() {
        const result = base.apply(this, arguments);
        queueAvatarRoleUpdate();
        return result;
      };
      renderView.jpRoleAvatarWrapped = true;
    }
    if (typeof setLoggedInView === "function" && !setLoggedInView.jpRoleAvatarWrapped) {
      const base = setLoggedInView;
      setLoggedInView = function setLoggedInViewWithRoleAvatarFix() {
        const result = base.apply(this, arguments);
        queueAvatarRoleUpdate();
        return result;
      };
      setLoggedInView.jpRoleAvatarWrapped = true;
    }
  }

  function install() {
    addStyles();
    applyAvatarRolesNow();
    installInteractionFix();
    installWrappers();
    const observer = new MutationObserver(queueAvatarRoleUpdate);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("load", queueAvatarRoleUpdate);
    window.addEventListener("focus", queueAvatarRoleUpdate);
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
