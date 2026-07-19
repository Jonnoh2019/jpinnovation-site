(() => {
  "use strict";

  const VERSION = "profile-menu-avatar-regression-fix-20260719";

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { return fallback; }
  }

  function cleanEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function roleFor(user) {
    const role = String(user?.role || user?.account_type || "client").toLowerCase();
    const status = String(user?.membershipStatus || user?.membership_status || "").toLowerCase();
    if (role === "admin") return "admin";
    if (role === "member" || status === "active") return "member";
    return "client";
  }

  function currentRole() {
    const user = typeof currentUser === "function" ? currentUser() : null;
    return roleFor(user || {});
  }

  function memberRoleFromText(text) {
    const value = String(text || "").toLowerCase();
    if (value.includes("admin")) return "admin";
    if (value.includes("hub") || value.includes("member") || value.includes("verified")) return "member";
    return "client";
  }

  function closeProfileMenu() {
    const menu = document.getElementById("memberProfileMenu");
    const button = document.getElementById("memberProfileButton");
    if (typeof setMemberProfileMenuOpen === "function") {
      setMemberProfileMenuOpen(false);
    } else {
      menu?.classList.remove("open");
      menu?.setAttribute("aria-hidden", "true");
      document.body.classList.remove("member-profile-menu-open");
      button?.setAttribute("aria-expanded", "false");
    }
    document.body.classList.remove("jp-profile-regression-lock", "jp-menu-hard-lock");
    document.body.style.top = "";
  }

  function openProfileMenu() {
    const menu = document.getElementById("memberProfileMenu");
    const button = document.getElementById("memberProfileButton");
    if (typeof setNotificationsOpen === "function") setNotificationsOpen(false);
    if (typeof setMobileDashboardMenuOpen === "function") setMobileDashboardMenuOpen(false);
    if (typeof setMemberProfileMenuOpen === "function") {
      setMemberProfileMenuOpen(true);
    } else {
      menu?.classList.add("open");
      menu?.setAttribute("aria-hidden", "false");
      document.body.classList.add("member-profile-menu-open");
      button?.setAttribute("aria-expanded", "true");
    }
    document.body.classList.add("jp-profile-regression-lock");
  }

  function toggleProfileMenu() {
    const menu = document.getElementById("memberProfileMenu");
    if (menu?.classList.contains("open")) closeProfileMenu();
    else openProfileMenu();
  }

  function applyAvatarRoles() {
    const role = currentRole();
    const headerButton = document.getElementById("memberProfileButton");
    const headerInitials = document.getElementById("memberInitials");
    const menuAvatar = document.getElementById("profileMenuAvatar");

    [headerButton, headerInitials, menuAvatar].forEach((node) => {
      if (!node) return;
      node.classList.remove("avatar-admin", "avatar-member", "avatar-client", "role-admin", "role-member", "role-client", "hub", "admin", "client", "gold", "blue");
      node.classList.add(`avatar-${role}`);
    });

    headerButton?.classList.add("member-chip");
    headerButton?.querySelector("#memberAvatarRoleBadge")?.remove();
    document.getElementById("memberAvatarRoleBadge")?.remove();
    document.getElementById("reputationStatusButton")?.classList.add("hidden");
    document.getElementById("memberStatusStarInline")?.classList.add("hidden");

    document.querySelectorAll(".profile-avatar, .feature-ui-avatar, .message-avatar, .comment-avatar, .post-avatar, .notification-avatar").forEach((avatar) => {
      const text = avatar.getAttribute("data-role") || avatar.getAttribute("aria-label") || avatar.textContent;
      avatar.classList.remove("avatar-admin", "avatar-member", "avatar-client");
      avatar.classList.add(`avatar-${memberRoleFromText(text)}`);
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
    if (button.id === "logoutButton") return false;
    return false;
  }

  function addStyles() {
    if (document.getElementById("profileMenuAvatarRegressionFixStyles")) return;
    const style = document.createElement("style");
    style.id = "profileMenuAvatarRegressionFixStyles";
    style.textContent = `
      :root{--jp-avatar-blue:#0877f2;--jp-avatar-gold:#d99a16;--jp-avatar-white:#ffffff;}
      #memberProfileButton.member-chip{box-sizing:border-box!important;position:relative!important;display:grid!important;place-items:center!important;width:54px!important;height:54px!important;min-width:54px!important;max-width:54px!important;min-height:54px!important;max-height:54px!important;aspect-ratio:1/1!important;padding:0!important;border-radius:999px!important;overflow:visible!important;pointer-events:auto!important;touch-action:manipulation!important;z-index:260!important;cursor:pointer!important;}
      #memberProfileButton.member-chip #memberInitials,#profileMenuAvatar,.profile-avatar,.feature-ui-avatar,.message-avatar,.comment-avatar,.post-avatar,.notification-avatar{box-sizing:border-box!important;display:inline-grid!important;place-items:center!important;border-radius:999px!important;line-height:1!important;text-align:center!important;font-weight:950!important;color:#fff!important;background:var(--jp-avatar-blue)!important;box-shadow:0 10px 24px rgba(0,0,0,.26)!important;overflow:hidden!important;}
      #memberProfileButton.member-chip #memberInitials{width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;font-size:16px!important;letter-spacing:.01em!important;}
      #profileMenuAvatar{width:44px!important;height:44px!important;min-width:44px!important;font-size:14px!important;}
      #memberProfileButton.member-chip.avatar-admin,#memberProfileButton.member-chip #memberInitials.avatar-admin,#profileMenuAvatar.avatar-admin,.profile-avatar.avatar-admin,.feature-ui-avatar.avatar-admin,.message-avatar.avatar-admin,.comment-avatar.avatar-admin,.post-avatar.avatar-admin,.notification-avatar.avatar-admin{background:var(--jp-avatar-gold)!important;color:#fff!important;border:2px solid var(--jp-avatar-blue)!important;box-shadow:0 0 0 1px rgba(255,255,255,.18),0 10px 26px rgba(0,0,0,.3)!important;}
      #memberProfileButton.member-chip.avatar-member,#memberProfileButton.member-chip #memberInitials.avatar-member,#profileMenuAvatar.avatar-member,.profile-avatar.avatar-member,.feature-ui-avatar.avatar-member,.message-avatar.avatar-member,.comment-avatar.avatar-member,.post-avatar.avatar-member,.notification-avatar.avatar-member{background:var(--jp-avatar-blue)!important;color:#fff!important;border:2px solid var(--jp-avatar-gold)!important;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 10px 26px rgba(0,0,0,.28)!important;}
      #memberProfileButton.member-chip.avatar-client,#memberProfileButton.member-chip #memberInitials.avatar-client,#profileMenuAvatar.avatar-client,.profile-avatar.avatar-client,.feature-ui-avatar.avatar-client,.message-avatar.avatar-client,.comment-avatar.avatar-client,.post-avatar.avatar-client,.notification-avatar.avatar-client{background:var(--jp-avatar-blue)!important;color:#fff!important;border:2px solid #fff!important;box-shadow:0 0 0 1px rgba(8,119,242,.4),0 10px 26px rgba(0,0,0,.26)!important;}
      #memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton.member-status-star,#memberStatusStarInline.member-status-star-inline{display:none!important;pointer-events:none!important;}
      #memberProfileMenu{pointer-events:none!important;z-index:620!important;}
      #memberProfileMenu.open{pointer-events:auto!important;visibility:visible!important;opacity:1!important;transform:none!important;}
      #memberProfileMenu.open .profile-menu-link{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;position:relative!important;z-index:2!important;}
      #memberProfileMenu .profile-menu-link:disabled{opacity:.45!important;pointer-events:none!important;}
      body.member-profile-menu-open #mobileMenuBackdrop{pointer-events:none!important;display:none!important;}
      body.member-profile-menu-open .mobile-menu-backdrop{pointer-events:none!important;display:none!important;}
      body.jp-profile-regression-lock{overflow:hidden!important;overscroll-behavior:none!important;}
      body.jp-profile-regression-lock #memberProfileMenu{overscroll-behavior:contain!important;-webkit-overflow-scrolling:touch!important;}
      body.jp-profile-regression-lock .workspace,body.jp-profile-regression-lock .view-mount{touch-action:none!important;}
      body.jp-profile-regression-lock #memberProfileMenu,body.jp-profile-regression-lock #memberProfileMenu *{touch-action:auto!important;}
      @media(max-width:760px){#memberProfileMenu.open{position:fixed!important;left:12px!important;right:12px!important;top:calc(var(--hub-mobile-header-offset,176px) - 4px)!important;bottom:12px!important;max-height:none!important;overflow:auto!important;border-radius:22px!important;padding:10px!important;}#memberProfileButton.member-chip{width:52px!important;height:52px!important;min-width:52px!important;max-width:52px!important;min-height:52px!important;max-height:52px!important;}}
      @media(max-width:390px){#memberProfileButton.member-chip{width:48px!important;height:48px!important;min-width:48px!important;max-width:48px!important;min-height:48px!important;max-height:48px!important;}#profileMenuAvatar{width:40px!important;height:40px!important;min-width:40px!important;}}
    `;
    document.head.appendChild(style);
  }

  function installInteractionFix() {
    if (document.documentElement.dataset.jpProfileMenuRegressionFix === "1") return;
    document.documentElement.dataset.jpProfileMenuRegressionFix = "1";

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
      routeProfileMenuItem(link);
      closeProfileMenu();
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

  function install() {
    addStyles();
    applyAvatarRoles();
    installInteractionFix();
    const observer = new MutationObserver(() => applyAvatarRoles());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "aria-hidden"] });
    window.addEventListener("load", applyAvatarRoles);
    window.addEventListener("focus", applyAvatarRoles);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
