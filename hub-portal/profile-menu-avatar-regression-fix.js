(() => {
  "use strict";

  const VERSION = "profile-menu-avatar-regression-fix-20260719i";
  let avatarUpdateQueued = false;

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { return fallback; }
  }

  function roleFor(user) {
    const role = String(user?.role || user?.account_type || user?.accountType || user?.level || "").toLowerCase();
    const status = String(user?.membershipStatus || user?.membership_status || "").toLowerCase();
    const tier = String(user?.badgeTier || user?.badge_tier || "").toLowerCase();
    if (user?.isAdmin || role.includes("admin") || tier === "admin") return "admin";
    if (role === "member" || role.includes("hub") || status === "active" || tier === "gold" || tier === "blue") return "hubMember";
    return "client";
  }

  function currentRole() {
    const user = typeof currentUser === "function" ? currentUser() : null;
    const userRole = roleFor(user || {});
    const adminLink = document.getElementById("profileAdminLink");
    if (adminLink && !adminLink.classList.contains("hidden")) return "admin";
    const visibleRole = [
      document.getElementById("memberRole")?.textContent,
      document.getElementById("memberName")?.textContent,
      document.getElementById("viewTitle")?.textContent
    ].join(" ").toLowerCase();
    if (visibleRole.includes("admin")) return "admin";
    return userRole;
  }

  function initialsFor(user) {
    const source = String(user?.name || user?.full_name || user?.email || document.getElementById("memberName")?.textContent || "JP").trim();
    const words = source.split(/[\s._-]+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
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

  function roleTitle(role) {
    if (role === "admin") return "JP Admin";
    if (role === "hubMember") return "Innovation Hub Member";
    return "Client Portal";
  }

  function roleDetail(role) {
    if (role === "admin") return "Admin account with full Hub moderation and access controls.";
    if (role === "hubMember") return "Approved paid Hub member.";
    return "Free Client Portal account.";
  }

  function patchProfileView() {
    const mount = document.getElementById("viewMount");
    if (mount?.dataset.view !== "profile") return;
    const heading = mount.querySelector(".profile-reputation-card .profile-reputation-heading");
    if (!heading || heading.dataset.jpRolePatched === VERSION) return;
    const user = typeof currentUser === "function" ? currentUser() : null;
    const role = currentRole();
    const initials = initialsFor(user || {});
    heading.dataset.jpRolePatched = VERSION;
    heading.innerHTML = `
      <div class="jp-profile-role-clean">
        <div class="jp-profile-identity-row">
          <span class="jp-profile-role-avatar jp-role-avatar-${role}" aria-hidden="true">${initials}</span>
          <h2>${roleTitle(role)}</h2>
        </div>
        <p class="jp-profile-role-detail">${roleDetail(role)}</p>
        <p class="eyebrow">Member reputation</p>
      </div>
    `;
  }

  function applyAvatarRolesNow() {
    const user = typeof currentUser === "function" ? currentUser() : null;
    const role = currentRole();
    const initials = initialsFor(user || {});
    const headerButton = document.getElementById("memberProfileButton");
    const headerInitials = document.getElementById("memberInitials");
    const menuAvatar = document.getElementById("profileMenuAvatar");
    [headerButton, headerInitials, menuAvatar].forEach((node) => setVariant(node, "jp-role-avatar", role));
    if (headerInitials) headerInitials.textContent = initials;
    if (menuAvatar) {
      menuAvatar.textContent = initials;
      menuAvatar.classList.remove("has-photo");
    }
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
    patchProfileView();
  }

  function queueAvatarRoleUpdate() {
    if (avatarUpdateQueued) return;
    avatarUpdateQueued = true;
    requestAnimationFrame(() => {
      avatarUpdateQueued = false;
      applyAvatarRolesNow();
    });
  }

  function addStyles() {
    const existing = document.getElementById("profileMenuAvatarRegressionFixStyles");
    if (existing) {
      document.head.appendChild(existing);
      return;
    }
    const style = document.createElement("style");
    style.id = "profileMenuAvatarRegressionFixStyles";
    style.textContent = `
      :root{
        --jp-role-blue:#0677f4;
        --jp-role-blue-deep:#034ba8;
        --jp-role-electric:#138cff;
        --jp-role-gold-hi:#f3d36a;
        --jp-role-gold:#c89b2c;
        --jp-role-gold-mid:#a77a1c;
        --jp-role-gold-low:#8b6514;
        --jp-role-gold-gradient:radial-gradient(circle at 34% 28%,#fff1a3 0 9%,var(--jp-role-gold-hi) 16%,var(--jp-role-gold) 46%,var(--jp-role-gold-mid) 72%,var(--jp-role-gold-low) 100%);
        --jp-role-blue-gradient:linear-gradient(145deg,#0789ff 0%,var(--jp-role-blue) 45%,var(--jp-role-blue-deep) 100%);
      }
      #memberProfileButton.member-chip{box-sizing:border-box!important;position:relative!important;display:grid!important;place-items:center!important;width:54px!important;height:54px!important;min-width:54px!important;max-width:54px!important;min-height:54px!important;max-height:54px!important;aspect-ratio:1/1!important;padding:0!important;border-radius:50%!important;overflow:visible!important;pointer-events:auto!important;touch-action:manipulation!important;z-index:640!important;cursor:pointer!important;background:transparent!important;border-color:transparent!important;}
      #memberProfileButton.member-chip #memberInitials,#profileMenuAvatar,.profile-avatar,.feature-ui-avatar,.message-avatar,.comment-avatar,.post-avatar,.notification-avatar{box-sizing:border-box!important;display:inline-grid!important;place-items:center!important;border-radius:50%!important;aspect-ratio:1/1!important;line-height:1!important;text-align:center!important;font-weight:950!important;color:#05070a!important;-webkit-text-fill-color:#05070a!important;background:var(--jp-role-blue-gradient)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.22),0 10px 24px rgba(0,0,0,.26)!important;overflow:hidden!important;}
      #memberProfileButton.member-chip #memberInitials{width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;font-size:16px!important;letter-spacing:.01em!important;}
      #profileMenuAvatar{width:54px!important;height:54px!important;min-width:54px!important;min-height:54px!important;font-size:16px!important;}
      #memberProfileButton.member-chip.jp-role-avatar-admin,#memberProfileButton.member-chip.jp-role-avatar-admin #memberInitials,#memberInitials.jp-role-avatar-admin,#profileMenuAvatar.jp-role-avatar-admin,.jp-profile-role-avatar.jp-role-avatar-admin,.profile-avatar.jp-role-avatar-admin,.feature-ui-avatar.jp-role-avatar-admin,.message-avatar.jp-role-avatar-admin,.comment-avatar.jp-role-avatar-admin,.post-avatar.jp-role-avatar-admin,.notification-avatar.jp-role-avatar-admin{background:var(--jp-role-gold-gradient)!important;color:#05070a!important;-webkit-text-fill-color:#05070a!important;border:2px solid var(--jp-role-electric)!important;outline:1px solid rgba(22,139,255,.72)!important;outline-offset:1px!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.48),inset 0 -3px 5px rgba(72,42,0,.28),0 0 0 1px rgba(19,140,255,.28),0 10px 26px rgba(0,0,0,.32),0 0 18px rgba(22,139,255,.24)!important;}
      .jp-role-avatar-hubMember,#memberProfileButton.member-chip.jp-role-avatar-hubMember #memberInitials{background:var(--jp-role-blue-gradient)!important;color:#05070a!important;-webkit-text-fill-color:#05070a!important;border:2px solid var(--jp-role-gold)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.24),0 0 0 1px rgba(255,242,168,.18),0 10px 26px rgba(0,0,0,.28)!important;}
      .jp-role-avatar-client,#memberProfileButton.member-chip.jp-role-avatar-client #memberInitials{background:var(--jp-role-blue-gradient)!important;color:#05070a!important;-webkit-text-fill-color:#05070a!important;border:2px solid rgba(255,255,255,.92)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.18),0 0 0 1px rgba(6,119,244,.32),0 10px 26px rgba(0,0,0,.25)!important;}
      .member-role-star,.compact-role-star,.member-status-star,.member-status-star-inline,.reputation-badge,.jp-role-star-admin,.jp-role-star-hubMember,.jp-role-star-client{box-sizing:border-box!important;display:inline-grid!important;place-items:center!important;border-radius:50%!important;aspect-ratio:1/1!important;line-height:1!important;text-align:center!important;font-weight:950!important;width:20px!important;height:20px!important;min-width:20px!important;font-size:11px!important;padding:0!important;transform:none!important;}
      .jp-role-star-admin{background:var(--jp-role-gold-gradient)!important;color:#05070a!important;border:2px solid var(--jp-role-electric)!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.48),0 0 0 1px rgba(19,140,255,.24),0 0 14px rgba(217,164,39,.28)!important;}
      .jp-role-star-hubMember{background:var(--jp-role-blue-gradient)!important;color:#fff!important;border:2px solid var(--jp-role-gold)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.25),0 0 12px rgba(217,164,39,.2)!important;}
      .jp-role-star-client{background:var(--jp-role-blue-gradient)!important;color:#fff!important;border:2px solid rgba(255,255,255,.34)!important;box-shadow:inset 0 1px 1px rgba(255,255,255,.2),0 0 10px rgba(6,119,244,.16)!important;}
      #memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton.member-status-star,#memberStatusStarInline.member-status-star-inline{display:none!important;pointer-events:none!important;}
      #memberProfileButton.member-chip::before,#memberProfileButton.member-chip::after,#memberProfileButton.member-chip #memberInitials::before,#memberProfileButton.member-chip #memberInitials::after,#profileMenuAvatar::before,#profileMenuAvatar::after,.jp-profile-role-avatar::before,.jp-profile-role-avatar::after{display:none!important;content:none!important;}
      .profile-reputation-card .profile-reputation-heading .reputation-badge,.profile-reputation-card .profile-reputation-heading .premium-admin-badge,.profile-reputation-card .profile-reputation-heading svg{display:none!important;}
      .jp-profile-role-clean{display:grid!important;gap:8px!important;}
      .jp-profile-identity-row{display:flex!important;align-items:center!important;gap:12px!important;min-width:0!important;}
      .jp-profile-identity-row h2{margin:0!important;font-size:clamp(22px,5.4vw,30px)!important;line-height:1.05!important;color:#f7fbff!important;}
      .jp-profile-role-avatar{width:52px!important;height:52px!important;min-width:52px!important;font-size:16px!important;}
      .jp-profile-role-detail{margin:0!important;color:#dce7f5!important;font-size:15px!important;line-height:1.42!important;}
      .profile-reputation-card .profile-reputation-heading{display:block!important;}
      .profile-reputation-card .profile-reputation-heading::before,.profile-reputation-card .profile-reputation-heading::after,.profile-reputation-card .reputation-badge::before,.profile-reputation-card .reputation-badge::after{display:none!important;content:none!important;}
      #memberProfileMenu{pointer-events:none!important;z-index:650!important;}
      #memberProfileMenu.open{pointer-events:auto!important;visibility:visible!important;opacity:1!important;transform:none!important;}
      #memberProfileMenu.open .profile-menu-link{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;position:relative!important;z-index:2!important;}
      #memberProfileMenu .profile-menu-link:disabled{opacity:.45!important;pointer-events:none!important;}
      body.member-profile-menu-open #mobileMenuBackdrop,body.member-profile-menu-open .mobile-menu-backdrop{pointer-events:none!important;display:none!important;}
      @media(max-width:760px){#memberProfileMenu.open{position:fixed!important;left:12px!important;right:12px!important;top:calc(var(--hub-mobile-header-offset,176px) - 4px)!important;bottom:12px!important;max-height:none!important;overflow:auto!important;border-radius:22px!important;padding:10px!important;}#memberProfileButton.member-chip{width:52px!important;height:52px!important;min-width:52px!important;max-width:52px!important;min-height:52px!important;max-height:52px!important;}}
      @media(max-width:390px){#memberProfileButton.member-chip{width:48px!important;height:48px!important;min-width:48px!important;max-width:48px!important;min-height:48px!important;max-height:48px!important;}#profileMenuAvatar{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;}.jp-profile-role-avatar{width:48px!important;height:48px!important;min-width:48px!important;}}
    `;
    document.head.appendChild(style);
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

  function installInteractionFix() {
    document.documentElement.dataset.jpProfileMenuRegressionFix = VERSION;
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
    window.setInterval(queueAvatarRoleUpdate, 900);
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
